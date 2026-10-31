"""User-started pasted-list messaging. Importing this module never launches or sends."""
import importlib.util
import os
import re
import sqlite3
from contextlib import closing
from pathlib import Path
from contact_history import read_contacts
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parent
BOT_FOLDER = Path(os.environ.get("CREATOR_SEARCH_BOT_FOLDER", str(Path.home() / "OneDrive" / "Desktop" / "FirstClassBot")))


def parse_names(text):
    names, invalid, seen = [], [], set()
    for value in re.split(r"[\s,;]+", text):
        value = value.strip().strip('"\'')
        if not value:
            continue
        match = re.fullmatch(r"https?://(?:www\.)?tiktok\.com/@([a-zA-Z0-9._]{1,24})(?:[/?#].*)?", value)
        name = (match.group(1) if match else value).lstrip("@").lower()
        if not re.fullmatch(r"[a-z0-9._]{1,24}", name):
            invalid.append(value)
        elif name not in seen:
            seen.add(name)
            names.append(name)
    return names, invalid


def old_navigation_failure(status, note):
    status, note = str(status).upper(), str(note)
    return (status == "FAILED" and 'waiting for navigation to "**/business-suite/messages**"' in note and "timeout" in note.lower()) or (status == "UNKNOWN" and note == "Recipient could not be independently verified in conversation") or (status == "CANCELLED" and note == "Stopped by you before Send.")


def blocked_names(database):
    contacts = read_contacts(database)
    blocked = {row["username"] for row in contacts}
    confirmed = {row["username"] for row in contacts if row["status"] == 'SENT'}
    with closing(sqlite3.connect(Path(database).resolve().as_uri() + "?mode=ro", uri=True, timeout=15)) as db:
        exists = db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='message_log'").fetchone()
        if exists:
            columns = {row[1] for row in db.execute("PRAGMA table_info(message_log)")}
            note = "note" if "note" in columns else "''"
            for name, status, detail in db.execute(f"SELECT username,status,{note} FROM message_log"):
                name = str(name).strip().lower().lstrip("@")
                if old_navigation_failure(status, detail) and name not in confirmed:
                    blocked.discard(name)
                else:
                    blocked.add(name)
    return blocked


def load_existing_bot():
    import sys
    filename = BOT_FOLDER / "bot.py"
    if not filename.is_file():
        raise FileNotFoundError("The existing FirstClassBot/bot.py could not be found.")
    sys.path.insert(0, str(BOT_FOLDER))
    os.chdir(BOT_FOLDER)  # Existing database.py uses a relative creators.db path.
    spec = importlib.util.spec_from_file_location("firstclass_existing_message_adapter", filename)
    bot = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(bot)
    from messaging_navigation import send_with_navigation_retry
    original = bot.try_send_message
    session = {}
    bot.list_messaging_session = session
    bot.try_send_message = lambda context, username: send_with_navigation_retry(original, context, username, bot.MESSAGE_IFRAME_SELECTOR, max_attempts=None, session=session, should_stop=session.get('should_stop'), report=session.get('report'))
    return bot


def navigation_retry_record(database, name):
    with closing(sqlite3.connect(Path(database).resolve().as_uri() + "?mode=ro", uri=True, timeout=15)) as db:
        columns = {row[1] for row in db.execute("PRAGMA table_info(message_log)")}
        if "note" not in columns:
            return None
        row = db.execute("SELECT status,note FROM message_log WHERE username=?", (name,)).fetchone()
        return row if row and old_navigation_failure(*row) else None


def reserve_navigation_retry(database, name, message, previous):
    with closing(sqlite3.connect(Path(database).resolve().as_uri() + "?mode=rw", uri=True, timeout=15)) as db:
        with db:
            return db.execute("UPDATE message_log SET status='PENDING',message_text=?,attempted_at=?,confirmed_at=NULL,note=? WHERE username=? AND status=? AND note=?", (message, datetime.now(timezone.utc).isoformat(), "Retrying a verified pre-send readiness failure; previous attempt did not reach Send.", name, previous[0], previous[1])).rowcount == 1


def normalise_send_result(status, detail):
    # This exact adapter result occurs only after its Send click completed.
    # Recipient/composer failures are handled by the cancellable pre-send waits.
    if status == "UNKNOWN" and detail == "Send clicked, confirmation not verifiable":
        return "SEND_ATTEMPTED", "Send clicked; continuing automatically. Delivery unverified; no automatic resend."
    return status, detail


def send_one(bot, context, name, message):
    """Reservation is atomic; uncertain sends are never retried automatically."""
    database = BOT_FOLDER / "creators.db"
    previous = bot.logged_message(name)
    retry = navigation_retry_record(database, name) if previous else None
    if name in blocked_names(database) or (previous and not retry):
        return "SKIPPED", "Already contacted or logged; skipped."
    bot.MESSAGE_TEXT = message
    bot.add_creator(name)
    reserved = reserve_navigation_retry(database, name, message, retry) if retry else bot.reserve_message(name)
    if not reserved:
        return "SKIPPED", "Another process reserved this creator; skipped."
    try:
        status, detail = bot.try_send_message(context, name)
    except Exception:
        status, detail = "UNKNOWN", "Messaging interrupted; verify the conversation before attempting again."
    status, detail = normalise_send_result(status, detail)
    bot.record_message(name, status, detail)
    return status, detail


def main():
    import queue
    import threading
    import tkinter as tk
    from tkinter import messagebox, scrolledtext

    window = tk.Tk()
    window.title("First Class — Send a pasted list")
    window.geometry("860x850")
    window.configure(bg="#101015")
    events, stop, signed_in = queue.Queue(), threading.Event(), threading.Event()
    paused = threading.Event()
    skip_person = threading.Event()
    state = {"running": False}
    tk.Label(window, text="Paste usernames — one per line", bg="#101015", fg="#ffe447", font=("Arial", 16, "bold")).pack(anchor="w", padx=18, pady=(15, 7))
    names_box = scrolledtext.ScrolledText(window, height=9, font=("Arial", 11))
    names_box.pack(fill="both", padx=18)
    tk.Label(window, text="Message — review before starting", bg="#101015", fg="white", font=("Arial", 12, "bold")).pack(anchor="w", padx=18, pady=(14, 7))
    message_box = scrolledtext.ScrolledText(window, height=10, font=("Arial", 11), wrap="word")
    message_box.pack(fill="both", padx=18)
    message_box.insert("1.0", (ROOT / "approved-message.txt").read_text(encoding="utf-8").strip())
    controls = tk.Frame(window, bg="#101015")
    controls.pack(fill="x", padx=18, pady=12)
    log = scrolledtext.ScrolledText(window, height=13, font=("Consolas", 10), state="disabled")
    log.pack(fill="both", expand=True, padx=18, pady=(0, 15))

    def report(text):
        events.put(("log", text))

    def should_stop():
        while paused.is_set() and not stop.is_set() and not skip_person.is_set():
            stop.wait(0.2)
        return stop.is_set() or skip_person.is_set()

    def run(names, message):
        try:
            from playwright.sync_api import sync_playwright
            bot = load_existing_bot()
            bot.init_database()
            bot.list_messaging_session.update(should_stop=should_stop, report=report)
            with sync_playwright() as playwright:
                # A separate persistent profile avoids competing with the availability checker.
                context = playwright.chromium.launch_persistent_context(str(ROOT / "browser_profile_messaging_list"), headless=False, viewport={"width": 1500, "height": 900})
                try:
                    tiktok = context.pages[0] if context.pages else context.new_page()
                    report("Sign into your intended TikTok account. Then click Continue after sign-in here. Your pasted list will not be checked in Backstage again.")
                    events.put(("login", None))
                    try:
                        tiktok.goto("https://www.tiktok.com/business-suite/messages", wait_until="commit", timeout=1000)
                    except Exception:
                        report('TikTok is still opening. The browser stays open; sign in or refresh it, then press Continue. Stop cancels the run.')
                    while not signed_in.wait(0.25):
                        if stop.is_set():
                            return
                    # Use the signed-in inbox tab itself. Do not leave TikTok's video
                    # feed playing in another tab while every conversation loads.
                    bot.list_messaging_session["page"] = tiktok
                    for extra in list(context.pages):
                        if extra != tiktok:
                            extra.close()
                    for name in names:
                        if should_stop():
                            break
                        state['current_person'] = name
                        status, detail = send_one(bot, context, name, message)
                        state['current_person'] = None
                        report(f"@{name}: {status} — {detail}")
                        if skip_person.is_set() and not stop.is_set():
                            skip_person.clear()
                            report('Skipped this person. Moving to the next username; any attempted send remains recorded.')
                            continue
                        if status == 'CANCELLED':
                            break
                        if status not in {"SENT", "SEND_ATTEMPTED", "SKIPPED"}:
                            report("Recorded this recipient's error. Moving to the next person without retrying this message.")
                        if stop.wait(4):
                            break
                    report("List finished or stopped. Confirmed/uncertain attempts were recorded in the existing bot database.")
                finally:
                    context.close()
        except Exception as error:
            report("Stopped: " + str(error))
        finally:
            events.put(("done", None))

    def start():
        if state["running"]:
            return
        names, invalid = parse_names(names_box.get("1.0", "end"))
        message = message_box.get("1.0", "end").strip()
        if invalid or not names or not message:
            messagebox.showerror("Check the list", "Add valid usernames and a message. Invalid entries: " + ", ".join(invalid[:10]))
            return
        try:
            blocked = blocked_names(BOT_FOLDER / "creators.db")
        except Exception as error:
            messagebox.showerror("History unavailable", str(error))
            return
        fresh = [name for name in names if name not in blocked]
        if not fresh:
            messagebox.showinfo("Nothing to send", "All pasted creators are already contacted or logged.")
            return
        if not messagebox.askyesno("Start this list?", f"{len(fresh)} unique creators to message; {len(names)-len(fresh)} already logged and skipped.\n\nThis uses your pasted list directly, without another Backstage check.\n\nMessage:\n{message}\n\nContinue with this list and message?"):
            return
        state["running"] = True
        stop.clear()
        skip_person.clear()
        paused.clear()
        pause_button.configure(text='Pause')
        signed_in.clear()
        start_button.configure(state="disabled")
        names_box.configure(state="disabled")
        message_box.configure(state="disabled")
        threading.Thread(target=run, args=(fresh, message), daemon=True).start()

    start_button = tk.Button(controls, text="Review list & start", command=start, bg="#ffe447", padx=15, pady=8)
    start_button.pack(side="left")
    login_button = tk.Button(controls, text="Continue after sign-in", state="disabled", command=signed_in.set, padx=12, pady=8)
    login_button.pack(side="left", padx=8)
    tk.Button(controls, text="Stop", command=stop.set, padx=12, pady=8).pack(side="left")

    def toggle_pause():
        if not state['running']:
            return
        if paused.is_set():
            paused.clear()
            pause_button.configure(text='Pause')
            report('Resuming the list.')
        else:
            paused.set()
            pause_button.configure(text='Resume')
            report('Pausing before the next action. If TikTok shows a CAPTCHA, solve it in the browser, then press Resume. No automatic refresh or CAPTCHA solving.')

    pause_button = tk.Button(controls, text='Pause', command=toggle_pause, padx=12, pady=8)
    pause_button.pack(side='left', padx=8)

    def skip_current():
        if state['running'] and state.get('current_person'):
            skip_person.set()
            report('Skipping the current person as soon as the active check returns.')

    tk.Button(controls, text='Skip person', command=skip_current, padx=12, pady=8).pack(side='left')

    def drain():
        while not events.empty():
            kind, value = events.get()
            if kind == "log":
                log.configure(state="normal")
                log.insert("end", value + "\n")
                log.see("end")
                log.configure(state="disabled")
            elif kind == "login":
                login_button.configure(state="normal")
            elif kind == "done":
                state['current_person'] = None
                skip_person.clear()
                paused.clear()
                pause_button.configure(text='Pause')
                state["running"] = False
                start_button.configure(state="normal")
                login_button.configure(state="disabled")
                names_box.configure(state="normal")
                message_box.configure(state="normal")
        window.after(150, drain)

    def close():
        if state["running"]:
            stop.set()
            messagebox.showinfo("Stopping", "Cancelling the current wait. Wait for the stopped message, then close this window.")
        else:
            window.destroy()

    window.protocol("WM_DELETE_WINDOW", close)
    window.after(150, drain)
    window.mainloop()


if __name__ == "__main__":
    main()
