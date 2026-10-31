"""Record an explicit user confirmation of a previously uncertain send; never sends messages."""
import argparse
import re
import sqlite3
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path


def confirm(database, username):
    if not re.fullmatch(r"[a-z0-9._]{1,24}", username):
        raise ValueError("Invalid username")
    with closing(sqlite3.connect(Path(database).resolve().as_uri() + "?mode=rw", uri=True, timeout=15)) as db:
        with db:
            row = db.execute("SELECT status,attempted_at FROM message_log WHERE username=?", (username,)).fetchone()
            if not row:
                raise ValueError("No recorded send found; nothing changed.")
            if row[0] == "SENT":
                return "Already confirmed SENT; no changes or resend."
            if row[0] not in {"UNKNOWN", "SEND_ATTEMPTED", "PENDING", "UNCERTAIN"}:
                raise ValueError("This record is not an uncertain send; nothing changed.")
            now = datetime.now(timezone.utc).isoformat()
            changed = db.execute("UPDATE message_log SET status='SENT',confirmed_at=?,note=? WHERE username=? AND status=?", (now, "Confirmed by the user in the TikTok conversation; no resend.", username, row[0])).rowcount
            if changed != 1:
                raise RuntimeError("Send record changed concurrently; nothing confirmed.")
            db.execute("UPDATE creators SET message_status='sent',messaged_at=coalesce(messaged_at,?) WHERE username=?", (row[1] or now, username))
    return "Confirmed SENT from the user's report; no message was resent."


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("username")
    parser.add_argument("--user-confirmed", action="store_true", required=True)
    parser.add_argument("--database", default=str(Path.home() / "OneDrive" / "Desktop" / "FirstClassBot" / "creators.db"))
    args = parser.parse_args()
    print(confirm(args.database, args.username))
