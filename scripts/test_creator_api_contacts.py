"""Private messaging-history fixtures; no actual message content or network access."""
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "integrations" / "firstclassbot"))
from contact_history import read_contacts
TEMP_ROOT = Path(__file__).resolve().parents[1] / 'tmp'
TEMP_ROOT.mkdir(exist_ok=True)


class ContactTests(unittest.TestCase):
    def test_confirmed_sends_uncertain_attempts_and_never_scanned_only(self):
        with tempfile.TemporaryDirectory(dir=TEMP_ROOT) as folder:
            path = Path(folder) / "creators.db"
            with sqlite3.connect(path) as db:
                db.execute("CREATE TABLE creators(username TEXT,message_status TEXT,messaged_at TEXT)")
                db.execute("CREATE TABLE message_log(username TEXT,status TEXT,confirmed_at TEXT,attempted_at TEXT,message_text TEXT)")
                db.executemany("INSERT INTO creators VALUES(?,?,?)", [("@ALREADY_SENT", "sent", "2026-10-30 12:30:00"), ("scanned_only", "not_sent", None), ("uncertain", "pending", None), ("failed", "failed", None)])
                db.executemany("INSERT INTO message_log VALUES(?,?,?,?,?)", [("already_sent", "UNKNOWN", None, None, "PRIVATE MUST NOT BE INCLUDED"), ("delivered", "DELIVERED", "2026-10-30T13:30:00Z", None, "PRIVATE MUST NOT BE INCLUDED"), ("not/safe", "SENT", None, None, "PRIVATE")])
            db.close()
            records = read_contacts(path)
            self.assertEqual([row["username"] for row in records], ["already_sent", "delivered", "uncertain"])
            self.assertEqual(records[0]["status"], "SENT")
            self.assertEqual(records[1]["status"], "SENT")
            self.assertEqual(records[2]["status"], "UNCERTAIN")
            self.assertIsNone(records[2]["messaged_at"])
            self.assertNotIn("PRIVATE", str(records))
            with sqlite3.connect(path) as db:
                self.assertEqual(db.execute("SELECT count(*) FROM creators").fetchone()[0], 4)
            db.close()

    def test_missing_database_is_not_created_or_marked_synced(self):
        with tempfile.TemporaryDirectory(dir=TEMP_ROOT) as folder:
            path = Path(folder) / "missing.db"
            with self.assertRaises(FileNotFoundError):
                read_contacts(path)
            self.assertFalse(path.exists())

    def test_unknown_schema_does_not_claim_empty_message_history(self):
        with tempfile.TemporaryDirectory(dir=TEMP_ROOT) as folder:
            path = Path(folder) / "empty.db"
            sqlite3.connect(path).close()
            with self.assertRaises(ValueError):
                read_contacts(path)


if __name__ == "__main__":
    unittest.main()
