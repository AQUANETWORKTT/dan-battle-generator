"""Profile-only fixtures: no TikTok, messaging adapter or real browser."""
import queue
import sqlite3
import sys
import tempfile
import threading
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'integrations/firstclassbot'))
from profile_review import ReviewStore, review_profiles, export_reviews, wait_for_posts, grouped_review_text, grouped_review_sections


class PostReadinessTests(unittest.TestCase):
    def test_visible_error_is_distinct_from_visible_posts(self):
        class Marker:
            def __init__(self, visible): self.visible=visible
            def count(self): return 1
            def nth(self, index): return self
            def is_visible(self): return self.visible
        class Page:
            error = True
            def is_closed(self): return False
            def get_by_text(self, *args, **kwargs): return Marker(self.error)
            def locator(self, selector): return Marker(not self.error)
        page = Page()
        self.assertEqual(wait_for_posts(page,threading.Event()), 'error')
        page.error = False
        self.assertEqual(wait_for_posts(page,threading.Event()), 'ready')

    def test_empty_grid_is_not_claimed_as_loaded_posts(self):
        class Marker:
            def count(self): return 0
        class Page:
            def is_closed(self): return False
            def get_by_text(self, *args, **kwargs): return Marker()
            def locator(self, selector): return Marker()
        self.assertEqual(wait_for_posts(Page(),threading.Event(),timeout=0), 'unconfirmed')


class ReviewTests(unittest.TestCase):
    def setUp(self):
        mocked = patch('profile_review.wait_for_posts', return_value='ready')
        self.posts = mocked.start()
        self.addCleanup(mocked.stop)

    def test_post_error_refreshes_once_then_holds_for_manual_next(self):
        self.posts.side_effect = ['error','error']
        stop, commands = threading.Event(), queue.Queue()
        class Page:
            url = ''
            refreshes = 0
            def is_closed(self): return False
            def goto(self, url, **kwargs): self.url = url
            def reload(self, **kwargs): self.refreshes += 1
            def wait_for_timeout(self, milliseconds): stop.set()
        page, events = Page(), []
        review_profiles(page,['one'],stop,threading.Event(),commands,lambda k,v: events.append(k) or True)
        self.assertEqual(page.refreshes, 1)
        self.assertIn('retry_posts', events)
        self.assertIn('posts_warning', events)

    def test_tags_persist_and_complete_controls_exports_without_message_history(self):
        scratch = Path(__file__).resolve().parents[1] / 'tmp'
        scratch.mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory(dir=scratch) as folder:
            filename = Path(folder) / 'reviews.sqlite3'
            store = ReviewStore(filename)
            store.viewed('one')
            store.tag('one','girl')
            store.tag('one','potential')
            self.assertEqual(store.rows(completed_only=True), [])
            store.complete('one')
            reopened = ReviewStore(filename)
            self.assertEqual(len(reopened.rows('Girls', True, True)), 1)
            reopened.viewed('one')
            self.assertEqual(reopened.rows()[0]['gender'], 'girl')
            reopened.tag('one','boy')
            self.assertEqual(reopened.rows('Girls'), [])
            reopened.tag('one','foreign_profile')
            reopened.tag('one','gamer')
            self.assertEqual(len(ReviewStore(filename).rows('Gamer', completed_only=True)), 1)
            self.assertEqual(len(reopened.rows('Boys', True, True)), 1)
            self.assertEqual(len(reopened.rows('Foreign')), 1)
            with sqlite3.connect(filename) as db:
                tables = {r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
            db.close()
            self.assertEqual(tables, {'reviews'})
            export_reviews(Path(folder)/'names.txt', reopened.rows())
            export_reviews(Path(folder)/'tags.csv', reopened.rows())
            self.assertNotIn('one', (Path(folder)/'names.txt').read_text())
            self.assertNotIn('one', (Path(folder)/'tags.csv').read_text(encoding='utf-8-sig'))
            reopened.tag('one','gamer')
            self.assertEqual(reopened.rows('Gamer'), [])

    def test_grouped_copy_and_download_always_exclude_foreign_and_uncompleted(self):
        rows = [
            dict(username='boy', gender='boy', potential=0, gamer=0, completed=1),
            dict(username='girl', gender='girl', potential=0, gamer=0, completed=1),
            dict(username='hp_boy', gender='boy', potential=1, gamer=0, completed=1),
            dict(username='hp_girl', gender='girl', potential=1, gamer=1, completed=1),
            dict(username='foreign', gender='boy', potential=1, gamer=1, foreign_profile=1, completed=1),
            dict(username='unfinished', gender='girl', potential=1, gamer=1, completed=0),
        ]
        sections = dict(grouped_review_sections(rows))
        self.assertEqual(list(sections), ['Boys','Girls','High potential boys','High potential girls','Gamers'])
        self.assertEqual(sections['Boys'], ['boy'])
        self.assertEqual(sections['High potential boys'], ['hp_boy'])
        self.assertEqual(sections['Gamers'], ['hp_girl'])
        text = grouped_review_text(rows)
        self.assertNotIn('foreign', text)
        self.assertNotIn('unfinished', text)
        self.assertIn('High potential girls\nhp_girl', text)
        scratch = Path(__file__).resolve().parents[1] / 'tmp'
        with tempfile.TemporaryDirectory(dir=scratch) as folder:
            export_reviews(Path(folder)/'results.txt',rows)
            export_reviews(Path(folder)/'results.csv',rows)
            self.assertEqual((Path(folder)/'results.txt').read_text(),text)
            csv = (Path(folder)/'results.csv').read_text(encoding='utf-8-sig')
            self.assertIn('Gamers,hp_girl',csv)
            self.assertNotIn('foreign',csv)

    def test_navigation_only_visits_profiles_and_waits_for_next_by_default(self):
        stop, paused, commands = threading.Event(), threading.Event(), queue.Queue()
        events, urls = [], []
        class Page:
            url = ''
            ticks = 0
            def is_closed(self): return False
            def goto(self, url, **kwargs): self.url=url; urls.append(url)
            def wait_for_timeout(self, milliseconds):
                self.ticks += 1
                if self.ticks == 35: commands.put(1)
        page = Page()
        def publish(kind, value):
            events.append((kind,value))
            if kind == 'profile' and value[0] == 'two': stop.set()
            return True
        review_profiles(page, ['one','two'], stop, paused, commands, publish)
        self.assertEqual(page.ticks, 35)
        self.assertEqual(urls, ['https://www.tiktok.com/@one','https://www.tiktok.com/@two'])

    def test_optional_auto_advances_after_two_seconds_and_pause_holds_timer(self):
        stop, paused, auto, commands = threading.Event(), threading.Event(), threading.Event(), queue.Queue()
        auto.set(); paused.set()
        class Page:
            url = ''
            ticks = 0
            def is_closed(self): return False
            def goto(self, url, **kwargs): self.url=url
            def wait_for_timeout(self, milliseconds):
                self.ticks += 1
                if self.ticks == 10: paused.clear()
        page = Page()
        profiles = []
        def publish(kind, value):
            if kind == 'profile':
                profiles.append(value[0])
                if value[0] == 'two': stop.set()
            return True
        review_profiles(page,['one','two'],stop,paused,commands,publish,auto_advance=auto)
        self.assertEqual(profiles,['one','two'])
        self.assertGreaterEqual(page.ticks,29)

    def test_redirect_is_not_presented_as_a_loaded_creator(self):
        stop = threading.Event()
        class Page:
            url = 'https://www.tiktok.com/login'
            def is_closed(self): return False
            def goto(self, *args, **kwargs): pass
        events = []
        review_profiles(Page(), ['one'], stop, threading.Event(), queue.Queue(), lambda k,v: events.append(k) or True)
        self.assertEqual(events,['loading','error'])


if __name__ == '__main__': unittest.main()
