"""No-send tests for pasted-list parsing, duplicate protection and send recording."""
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "integrations" / "firstclassbot"))
import list_messaging as sender
from message_review import ReviewContext


class FakeBot:
    def __init__(self, reserved=True, result="SENT"):
        self.calls, self.reserved, self.result = [], reserved, result

    def logged_message(self, name):
        return None

    def add_creator(self, name):
        self.calls.append("add")

    def reserve_message(self, name):
        self.calls.append("reserve")
        return self.reserved

    def try_send_message(self, context, name):
        self.calls.append("send")
        return self.result, "fixture result only"

    def record_message(self, name, status, note):
        self.calls.append("record:" + status)


class MessagingTests(unittest.TestCase):
    def setUp(self):
        root = Path(__file__).resolve().parents[1] / "tmp"
        root.mkdir(exist_ok=True)
        self.folder = tempfile.TemporaryDirectory(dir=root)
        self.previous = sender.BOT_FOLDER
        sender.BOT_FOLDER = Path(self.folder.name)
        db = sqlite3.connect(sender.BOT_FOLDER / "creators.db")
        db.execute("CREATE TABLE creators(username TEXT,message_status TEXT,messaged_at TEXT)")
        db.execute("CREATE TABLE message_log(username TEXT,status TEXT)")
        db.execute("INSERT INTO creators VALUES('already_sent','sent',NULL)")
        db.execute("INSERT INTO message_log VALUES('uncertain','UNKNOWN')")
        db.commit()
        db.close()

    def tearDown(self):
        sender.BOT_FOLDER = self.previous
        self.folder.cleanup()

    def test_paste_preserves_order_deduplicates_and_rejects_bad_names(self):
        names, invalid = sender.parse_names("@One\nTWO\none\nhttps://www.tiktok.com/@third\nbad/name")
        self.assertEqual(names, ["one", "two", "third"])
        self.assertEqual(invalid, ["bad/name"])

    def test_prior_and_uncertain_contacts_never_send(self):
        for name in ("already_sent", "uncertain"):
            bot = FakeBot()
            self.assertEqual(sender.send_one(bot, None, name, "approved fixture")[0], "SKIPPED")
            self.assertEqual(bot.calls, [])

    def test_reservation_must_succeed_before_send(self):
        bot = FakeBot(reserved=False)
        self.assertEqual(sender.send_one(bot, None, "fresh", "approved fixture")[0], "SKIPPED")
        self.assertEqual(bot.calls, ["add", "reserve"])

    def test_confirmed_and_uncertain_results_keep_actual_status(self):
        for status in ("SENT", "UNKNOWN", "FAILED"):
            bot = FakeBot(result=status)
            self.assertEqual(sender.send_one(bot, None, "fresh", "approved fixture")[0], status)
            self.assertEqual(bot.calls, ["add", "reserve", "send", "record:" + status])
            self.assertEqual(bot.MESSAGE_TEXT, "approved fixture")

    def test_template_is_exact_user_approved_message(self):
        text = (sender.ROOT / "approved-message.txt").read_text(encoding="utf-8").strip()
        self.assertTrue(text.startswith("I just joined your live and you’re good 👀"))
        self.assertIn("some huge creators on here 🤝", text)
        self.assertIn("🚀", text)
        self.assertTrue(text.endswith("if you’re interested 🙌"))

    def test_uncertain_conversation_is_kept_open_until_review_cleanup(self):
        class Page:
            closed = False
            def is_closed(self): return self.closed
            def close(self): self.closed = True
        class Context:
            def new_page(self): return Page()
        review = ReviewContext(Context())
        proxy = review.new_page()
        proxy.close()
        self.assertFalse(proxy.is_closed())
        review.close_review_pages()
        self.assertTrue(proxy.is_closed())

    def test_completed_send_click_continues_without_faking_delivery(self):
        self.assertEqual(sender.normalise_send_result("UNKNOWN", "Send clicked, confirmation not verifiable")[0], "SEND_ATTEMPTED")
        for detail in ("Recipient could not be independently verified in conversation", "Composer text mismatch", "Messaging interrupted; verify the conversation before attempting again."):
            self.assertEqual(sender.normalise_send_result("UNKNOWN", detail), ("UNKNOWN", detail))
        bot = FakeBot(result="UNKNOWN")
        bot.try_send_message = lambda context, name: ("UNKNOWN", "Send clicked, confirmation not verifiable")
        self.assertEqual(sender.send_one(bot, None, "fresh", "approved fixture")[0], "SEND_ATTEMPTED")
        self.assertEqual(bot.calls, ["add", "reserve", "record:SEND_ATTEMPTED"])

    def test_only_proven_old_pre_send_navigation_failure_can_be_reserved_again(self):
        note = 'Timeout 30000ms exceeded. waiting for navigation to "**/business-suite/messages**" until load'
        self.assertTrue(sender.old_navigation_failure('FAILED', note))
        self.assertFalse(sender.old_navigation_failure('UNKNOWN', note))
        self.assertTrue(sender.old_navigation_failure('UNKNOWN', 'Recipient could not be independently verified in conversation'))
        self.assertFalse(sender.old_navigation_failure('UNKNOWN', 'Send clicked, confirmation not verifiable'))
        db_path = sender.BOT_FOLDER / 'creators.db'
        db = sqlite3.connect(db_path)
        for name in ('note','message_text','attempted_at','confirmed_at'):
            db.execute(f'ALTER TABLE message_log ADD COLUMN {name} TEXT')
        db.execute('INSERT INTO message_log(username,status,note) VALUES(?,?,?)', ('navigation_failed','FAILED',note))
        db.commit(); db.close()
        self.assertNotIn('navigation_failed', sender.blocked_names(db_path))
        previous = sender.navigation_retry_record(db_path, 'navigation_failed')
        self.assertTrue(sender.reserve_navigation_retry(db_path, 'navigation_failed', 'fixture', previous))
        self.assertFalse(sender.reserve_navigation_retry(db_path, 'navigation_failed', 'fixture', previous))
        self.assertIn('navigation_failed', sender.blocked_names(db_path))

    def test_known_pre_send_recipient_failure_is_retryable_but_confirmed_send_is_not(self):
        db_path = sender.BOT_FOLDER / 'creators.db'
        with sqlite3.connect(db_path) as db:
            db.execute('ALTER TABLE message_log ADD COLUMN note TEXT')
            note = 'Recipient could not be independently verified in conversation'
            db.execute('INSERT INTO message_log VALUES(?,?,?)', ('recipient_failed','UNKNOWN',note))
            db.execute('INSERT INTO message_log VALUES(?,?,?)', ('already_sent','UNKNOWN',note))
        db.close()
        blocked = sender.blocked_names(db_path)
        self.assertNotIn('recipient_failed', blocked)
        self.assertIn('already_sent', blocked)


if __name__ == "__main__":
    unittest.main()
