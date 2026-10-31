"""User-started pasted-list messaging. Importing this module never launches or sends."""
import importlib.util
import os
import re
import sqlite3
from contextlib import closing
from pathlib import Path
from contact_history import read_contacts

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


def blocked_names(database):
    blocked = {row["username"] for row in read_contacts(database)}
    with closing(sqlite3.connect(Path(database).resolve().as_uri() + "?mode=ro", uri=True, timeout=15)) as db:
        exists = db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='message_log'").fetchone()
        if exists:
            blocked.update(str(row[0]).strip().lower().lstrip("@") for row in db.execute("SELECT username FROM message_log"))
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
    return bot


def send_one(bot, context, name, message):
    """Reservation is atomic; uncertain sends are never retried automatically."""
    if name in blocked_names(BOT_FOLDER / "creators.db") or bot.logged_message(name):
        return "SKIPPED", "Already contacted or logged; skipped."
    bot.MESSAGE_TEXT = message
    bot.add_creator(name)
    if not bot.reserve_message(name):
        return "SKIPPED", "Another process reserved this creator; skipped."
    try:
        status, detail = bot.try_send_message(context, name)
    except Exception:
        status, detail = "UNKNOWN", "Messaging interrupted; verify the conversation before attempting again."
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

    def run(names, message):
        try:
            from playwright.sync_api import sync_playwright
            bot = load_existing_bot()
            bot.init_database()
            with sync_playwright() as playwright:
                # A separate persistent profile avoids competing with the availability checker.
                context = playwright.chromium.launch_persistent_context(str(ROOT / "browser_profile_messaging_list"), headless=False, viewport={"width": 1500, "height": 900})
                try:
                    tiktok = context.pages[0] if context.pages else context.new_page()
                    tiktok.goto("https://www.tiktok.com/", wait_until="domcontentloaded", timeout=60000)
                    report("Sign into your intended TikTok account. Then click Continue after sign-in here. Your pasted list will not be checked in Backstage again.")
                    events.put(("login", None))
                    while not signed_in.wait(0.25):
                        if stop.is_set():
                            return
                    for name in names:
                        if stop.is_set():
                            break
                        status, detail = send_one(bot, context, name, message)
                        report(f"@{name}: {status} — {detail}")
                        if status not in {"SENT", "SKIPPED"}:
                            report("Stopped because delivery was not confirmed. Review this conversation in TikTok; it will not be retried automatically.")
                            stop.set()
                            break
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
        signed_in.clear()
        start_button.configure(state="disabled")
        names_box.configure(state="disabled")
        message_box.configure(state="disabled")
        threading.Thread(target=run, args=(fresh, message), daemon=True).start()

    start_button = tk.Button(controls, text="Review list & start", command=start, bg="#ffe447", padx=15, pady=8)
    start_button.pack(side="left")
    login_button = tk.Button(controls, text="Continue after sign-in", state="disabled", command=signed_in.set, padx=12, pady=8)
    login_button.pack(side="left", padx=8)
    tk.Button(controls, text="Stop after current creator", command=stop.set, padx=12, pady=8).pack(side="left")

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
                state["running"] = False
                start_button.configure(state="normal")
                login_button.configure(state="disabled")
                names_box.configure(state="normal")
                message_box.configure(state="normal")
        window.after(150, drain)

    def close():
        if state["running"]:
            stop.set()
            messagebox.showinfo("Stopping", "Stopping after the current creator. Wait for the stopped message, then close this window.")
        else:
            window.destroy()

    window.protocol("WM_DELETE_WINDOW", close)
    window.after(150, drain)
    window.mainloop()


if __name__ == "__main__":
    main()
