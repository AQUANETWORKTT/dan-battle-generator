"""Read only username/send status/date from FirstClassBot; never reads or sends message text."""
import re
import sqlite3
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path

CONFIRMED = {"SENT", "MESSAGED", "DELIVERED"}
UNCERTAIN = {"PENDING", "UNKNOWN", "SEND_ATTEMPTED", "UNCERTAIN"}


def iso_date(value):
    if not value:
        return None
    try:
        date = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        if date.tzinfo is None:
            date = date.replace(tzinfo=timezone.utc)
        return date.astimezone(timezone.utc).isoformat()
    except (ValueError, TypeError):
        return None


def read_contacts(filename):
    path = Path(filename).resolve()
    if not path.is_file():
        raise FileNotFoundError("FirstClassBot creators.db was not found; message history is not synced.")
    records = {}
    with closing(sqlite3.connect(path.as_uri() + "?mode=ro", uri=True, timeout=15)) as db:
        db.row_factory = sqlite3.Row
        tables = {row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        if not {"creators", "message_log"}.intersection(tables):
            raise ValueError("No recognised bot contact-history table; history was not marked synced.")
        for table, status_column, dates in (
            ("creators", "message_status", ["messaged_at"]),
            ("message_log", "status", ["confirmed_at", "attempted_at"]),
        ):
            if table not in tables:
                continue
            columns = {row[1] for row in db.execute(f"PRAGMA table_info({table})")}
            if not {"username", status_column}.issubset(columns):
                raise ValueError("Bot contact-history columns are missing; history was not marked synced.")
            wanted = ["username", status_column] + [date for date in dates if date in columns]
            for row in db.execute(f"SELECT {','.join(wanted)} FROM {table}"):
                name = str(row["username"] or "").strip().lower().lstrip("@")
                status = str(row[status_column] or "").strip().upper()
                if not re.fullmatch(r"[a-z0-9._]{1,24}", name) or status not in CONFIRMED | UNCERTAIN:
                    continue
                kind = "SENT" if status in CONFIRMED else "UNCERTAIN"
                date = next((iso_date(row[key]) for key in dates if key in row.keys() and iso_date(row[key])), None) if kind == "SENT" else None
                prior = records.get(name)
                if prior and prior["status"] == "SENT":
                    continue
                records[name] = {"username": name, "status": kind, "messaged_at": date}
    return sorted(records.values(), key=lambda row: row["username"])
