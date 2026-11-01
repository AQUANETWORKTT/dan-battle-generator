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
from profile_review import ReviewStore, review_profiles, export_reviews


class ReviewTests(unittest.TestCase):
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
            self.assertEqual(len(reopened.rows('Boys', True, True)), 1)
            self.assertEqual(len(reopened.rows('Foreign')), 1)
            with sqlite3.connect(filename) as db:
                tables = {r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
            db.close()
            self.assertEqual(tables, {'reviews'})
            export_reviews(Path(folder)/'names.txt', reopened.rows())
            export_reviews(Path(folder)/'tags.csv', reopened.rows())
            self.assertEqual((Path(folder)/'names.txt').read_text(), 'one\n')
            self.assertIn('one,boy,Yes,Yes', (Path(folder)/'tags.csv').read_text(encoding='utf-8-sig'))

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
