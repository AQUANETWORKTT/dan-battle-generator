"""No-send tests for pasted-list parsing, duplicate protection and send recording."""
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "integrations" / "firstclassbot"))
import list_messaging as sender


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


if __name__ == "__main__":
    unittest.main()
