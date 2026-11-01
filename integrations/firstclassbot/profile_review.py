"""Local profile-only review. This module never imports the messaging adapter."""
import queue
import sqlite3
import threading
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent


class ReviewStore:
    def __init__(self, filename):
        self.filename = Path(filename)
        self.filename.parent.mkdir(parents=True, exist_ok=True)
        with closing(sqlite3.connect(self.filename)) as db, db:
            db.execute('CREATE TABLE IF NOT EXISTS reviews(username TEXT PRIMARY KEY, gender TEXT, foreign_profile INTEGER NOT NULL DEFAULT 0, potential INTEGER NOT NULL DEFAULT 0, viewed_at TEXT NOT NULL, completed INTEGER NOT NULL DEFAULT 0)')
            if 'completed' not in {row[1] for row in db.execute('PRAGMA table_info(reviews)')}:
                db.execute('ALTER TABLE reviews ADD COLUMN completed INTEGER NOT NULL DEFAULT 0')

    def viewed(self, username):
        with closing(sqlite3.connect(self.filename)) as db, db:
            db.execute('INSERT INTO reviews(username,viewed_at) VALUES(?,?) ON CONFLICT(username) DO UPDATE SET viewed_at=excluded.viewed_at', (username, datetime.now(timezone.utc).isoformat()))

    def tag(self, username, field):
        if field not in {'girl', 'boy', 'foreign_profile', 'potential'}:
            raise ValueError('Unknown review tag')
        # Update one field only so other tags and the viewed date are preserved.
        self.viewed(username)
        with closing(sqlite3.connect(self.filename)) as db, db:
            if field in {'girl', 'boy'}:
                db.execute('UPDATE reviews SET gender=CASE WHEN gender=? THEN NULL ELSE ? END WHERE username=?', (field, field, username))
            else:
                db.execute(f'UPDATE reviews SET {field}=1-{field} WHERE username=?', (username,))

    def complete(self, username):
        self.viewed(username)
        with closing(sqlite3.connect(self.filename)) as db, db:
            db.execute('UPDATE reviews SET completed=1 WHERE username=?', (username,))

    def rows(self, category='All', potential_only=False, completed_only=False):
        with closing(sqlite3.connect(self.filename)) as db:
            db.row_factory = sqlite3.Row
            rows = [dict(row) for row in db.execute('SELECT * FROM reviews ORDER BY username')]
        return [r for r in rows if (category == 'All' or category == 'Girls' and r['gender'] == 'girl' or category == 'Boys' and r['gender'] == 'boy' or category == 'Foreign' and r['foreign_profile'] or category == 'Unmarked' and not r['gender'] and not r['foreign_profile'] and not r['potential']) and (not potential_only or r['potential']) and (not completed_only or r['completed'])]


def review_profiles(page, names, stop, paused, commands, publish, seconds=2, auto_advance=None):
    """Navigate only to profiles; await Next unless optional auto mode is enabled.

    publish synchronizes the panel with navigation, preventing tags from being
    applied to the preceding creator while the next profile is opening.
    """
    index = 0
    while index < len(names) and not stop.is_set():
        if page.is_closed():
            break
        name = names[index]
        if not publish('loading', (name, index + 1, len(names))):
            break
        try:
            page.goto('https://www.tiktok.com/@' + name, wait_until='domcontentloaded', timeout=20000)
            if urlsplit(page.url).path.rstrip('/').lower() != '/@' + name.lower():
                raise RuntimeError('TikTok did not open the requested profile.')
        except Exception:
            if not publish('error', name):
                break
            index += 1
            continue
        if not publish('profile', (name, index + 1, len(names))):
            break
        elapsed, direction = 0.0, 1
        while not stop.is_set():
            if page.is_closed():
                return
            try:
                direction = commands.get_nowait()
                break
            except queue.Empty:
                pass
            if auto_advance is not None and auto_advance.is_set() and elapsed >= seconds and not paused.is_set():
                break
            # Pump Playwright events even while paused. Time spent paused does
            # not consume the viewing interval.
            page.wait_for_timeout(100)
            if not paused.is_set():
                elapsed += 0.1
        index = max(0, index + direction)


def open_review(parent, initial_text=''):
    import tkinter as tk
    from tkinter import filedialog, messagebox, scrolledtext, ttk
    from list_messaging import parse_names

    window = tk.Toplevel(parent)
    window.title('First Class — View mode')
    window.geometry('490x810+10+40')
    window.configure(bg='#101015')
    try:
        store = ReviewStore(ROOT / 'profile_review_data' / 'reviews.sqlite3')
    except Exception as error:
        messagebox.showerror('Could not open saved reviews', str(error), parent=window)
        window.destroy()
        return
    stop, paused, auto_advance = threading.Event(), threading.Event(), threading.Event()
    commands, events = queue.Queue(), queue.Queue()
    state = {'running': False, 'current': None}
    title = tk.StringVar(value='Paste profiles, then start viewing')
    status = tk.StringVar(value='Tick your tags, then Complete & next')
    auto_enabled = tk.BooleanVar(value=False)
    category, potential_only = tk.StringVar(value='All'), tk.BooleanVar(value=False)
    tk.Label(window, text='VIEW MODE', bg='#101015', fg='#ffe447', font=('Arial', 17, 'bold')).pack(anchor='w', padx=15, pady=(14, 3))
    tk.Label(window, text='Profiles only · tags save on this computer', bg='#101015', fg='white').pack(anchor='w', padx=15)
    names_box = scrolledtext.ScrolledText(window, height=8, font=('Arial', 11))
    names_box.pack(fill='x', padx=15, pady=10)
    names_box.insert('1.0', initial_text)
    controls = tk.Frame(window, bg='#101015')
    controls.pack(fill='x', padx=15)
    tk.Label(window, textvariable=title, bg='#101015', fg='#ffe447', font=('Arial', 15, 'bold'), wraplength=455).pack(anchor='w', padx=15, pady=(18, 4))
    tk.Label(window, textvariable=status, bg='#101015', fg='white', wraplength=455).pack(anchor='w', padx=15)
    tag_frame = tk.Frame(window, bg='#101015')
    tag_frame.pack(fill='x', padx=15, pady=12)
    tag_buttons = {}
    tag_labels = {'girl':'Girl','boy':'Boy','foreign_profile':'Foreign','potential':'High potential'}

    def filtered():
        return store.rows(category.get(), potential_only.get(), completed_only=True)

    def refresh_tags():
        current = state['current']
        row = next((r for r in store.rows() if r['username'] == current), {})
        for field, button in tag_buttons.items():
            active = row.get('gender') == field if field in {'girl', 'boy'} else bool(row.get(field))
            button.configure(state='normal' if current else 'disabled', bg='#ffe447' if active else '#eeeeee', text=('✓ ' if active else '□ ') + tag_labels[field])
        saved_count.set(f'{len(filtered())} completed profiles in this saved list')

    def tag(field):
        current = state['current']
        if current:
            try:
                store.tag(current, field)
                refresh_tags()
            except Exception as error:
                messagebox.showerror('Tag not saved', str(error), parent=window)

    for index, (field, label) in enumerate([('girl', 'Girl'), ('boy', 'Boy'), ('foreign_profile', 'Foreign'), ('potential', 'High potential')]):
        button = tk.Button(tag_frame, text=label, command=lambda f=field: tag(f), state='disabled', padx=10, pady=10)
        button.grid(row=index // 2, column=index % 2, sticky='ew', padx=3, pady=3)
        tag_buttons[field] = button
    tag_frame.columnconfigure((0, 1), weight=1)

    def publish(kind, value):
        ack = threading.Event()
        events.put((kind, value, ack))
        while not ack.wait(0.1):
            if stop.is_set():
                return False
        return not stop.is_set()

    def worker(names):
        try:
            from playwright.sync_api import sync_playwright
            with sync_playwright() as p:
                context = p.chromium.launch_persistent_context(str(ROOT / 'browser_profile_review'), headless=False, viewport={'width':1000,'height':850}, args=['--window-position=510,40'])
                try:
                    page = context.pages[0] if context.pages else context.new_page()
                    review_profiles(page, names, stop, paused, commands, publish, auto_advance=auto_advance)
                finally:
                    context.close()
        except Exception as error:
            events.put(('fatal', str(error), None))
        finally:
            events.put(('done', None, None))

    def start():
        if state['running']:
            return
        names, invalid = parse_names(names_box.get('1.0', 'end'))
        if invalid or not names:
            messagebox.showerror('Check the list', 'Paste valid usernames or TikTok profile links. Invalid: ' + ', '.join(invalid[:5]), parent=window)
            return
        stop.clear()
        paused.clear()
        while not commands.empty():
            commands.get_nowait()
        state['running'] = True
        start_button.configure(state='disabled')
        pause_button.configure(text='Pause')
        names_box.configure(state='disabled')
        threading.Thread(target=worker, args=(names,), daemon=True).start()

    def pause():
        if state['running']:
            if paused.is_set():
                paused.clear()
                pause_button.configure(text='Pause')
            else:
                paused.set()
                pause_button.configure(text='Resume')

    start_button = tk.Button(controls, text='Start viewing', command=start, bg='#ffe447', pady=8)
    start_button.pack(side='left')
    pause_button = tk.Button(controls, text='Pause', command=pause, pady=8)
    pause_button.pack(side='left', padx=6)
    tk.Button(controls, text='Previous', command=lambda: commands.put(-1) if state['running'] else None, pady=8).pack(side='left')
    tk.Button(controls, text='Next', command=lambda: commands.put(1) if state['running'] else None, pady=8).pack(side='left', padx=6)
    tk.Button(controls, text='Stop', command=stop.set, pady=8).pack(side='left')

    def complete_next():
        current = state['current']
        if current:
            try:
                store.complete(current)
                if state['running']:
                    state['current'] = None
                    commands.put(1)
                status.set('Review saved. Opening the next profile.')
                refresh_tags()
            except Exception as error:
                messagebox.showerror('Review not saved', str(error), parent=window)

    tk.Button(window, text='✓ Complete & next', command=complete_next, bg='#ffe447', font=('Arial',12,'bold'), pady=10).pack(fill='x', padx=15, pady=(12,0))
    def set_auto():
        auto_advance.set() if auto_enabled.get() else auto_advance.clear()
    tk.Checkbutton(window, text='Optional: auto-advance every 2 seconds', variable=auto_enabled, command=set_auto).pack(anchor='w', padx=15, pady=6)

    tk.Label(window, text='SAVED LISTS', bg='#101015', fg='#ffe447', font=('Arial', 12, 'bold')).pack(anchor='w', padx=15, pady=(14, 5))
    filters = tk.Frame(window, bg='#101015')
    filters.pack(fill='x', padx=15)
    dropdown = ttk.Combobox(filters, textvariable=category, values=['All','Girls','Boys','Foreign','Unmarked'], state='readonly', width=14)
    dropdown.pack(side='left')
    dropdown.bind('<<ComboboxSelected>>', lambda event: refresh_tags())
    tk.Checkbutton(filters, text='High potential only', variable=potential_only, command=refresh_tags).pack(side='left', padx=8)
    saved_count = tk.StringVar()
    tk.Label(window, textvariable=saved_count, bg='#101015', fg='white').pack(anchor='w', padx=15, pady=7)

    def copy_list():
        window.clipboard_clear()
        window.clipboard_append('\n'.join(r['username'] for r in filtered()))
        status.set('Copied the filtered saved list.')

    def export():
        filename = filedialog.asksaveasfilename(parent=window, defaultextension='.txt', filetypes=[('Username list','*.txt'),('Results with tags','*.csv')], initialfile='reviewed-creators.txt')
        if filename:
            try:
                export_reviews(filename, filtered())
                status.set('Saved the filtered username list.')
            except Exception as error:
                messagebox.showerror('Export failed', str(error), parent=window)

    def load_filtered():
        if not state['running']:
            names_box.delete('1.0', 'end')
            names_box.insert('1.0', '\n'.join(r['username'] for r in filtered()))

    exports = tk.Frame(window, bg='#101015')
    exports.pack(fill='x', padx=15)
    tk.Button(exports, text='Copy list', command=copy_list, pady=7).pack(side='left')
    tk.Button(exports, text='Download results', command=export, pady=7).pack(side='left', padx=7)
    tk.Button(exports, text='View filtered list', command=load_filtered, pady=7).pack(side='left')
    tk.Label(window, text='Girl / Boy are mutually exclusive. Foreign and High potential can be combined with either. Click a highlighted tag again to remove it.', bg='#101015', fg='#b8b8bf', wraplength=455, justify='left').pack(anchor='w', padx=15, pady=15)

    def drain():
        while not events.empty():
            kind, value, ack = events.get()
            try:
                if kind == 'loading':
                    state['current'] = None
                    title.set(f'Loading @{value[0]}')
                    status.set(f'{value[1]} of {value[2]} · tags disabled until this profile loads')
                elif kind == 'profile':
                    store.viewed(value[0])
                    state['current'] = value[0]
                    title.set('@' + value[0])
                    status.set(f'{value[1]} of {value[2]} · tick tags, then Complete & next')
                elif kind == 'error':
                    state['current'] = None
                    status.set(f'Could not load @{value}; moving to the next profile.')
                elif kind == 'fatal':
                    status.set('Stopped: ' + value)
                elif kind == 'done':
                    state['running'] = False
                    paused.clear()
                    start_button.configure(state='normal')
                    pause_button.configure(text='Pause')
                    names_box.configure(state='normal')
                    status.set('Viewing stopped or finished. Your tags are saved.')
                refresh_tags()
            except Exception as error:
                stop.set()
                status.set('Review could not be saved: ' + str(error))
            finally:
                if ack:
                    ack.set()
        if window.winfo_exists():
            window.after(60, drain)

    def close():
        stop.set()
        window.destroy()

    window.protocol('WM_DELETE_WINDOW', close)
    refresh_tags()
    window.after(60, drain)
    return window


def export_reviews(filename, rows):
    if Path(filename).suffix.lower() == '.csv':
        import csv
        with Path(filename).open('w', encoding='utf-8-sig', newline='') as output:
            writer = csv.writer(output)
            writer.writerow(['Username','Girl / Boy','Foreign','High potential'])
            writer.writerows((r['username'], r['gender'] or '', 'Yes' if r['foreign_profile'] else 'No', 'Yes' if r['potential'] else 'No') for r in rows)
    else:
        names = [r['username'] for r in rows]
        Path(filename).write_text('\n'.join(names) + ('\n' if names else ''), encoding='utf-8')


if __name__ == '__main__':
    import tkinter as tk
    root = tk.Tk()
    root.withdraw()
    review = open_review(root)
    if review:
        review.bind('<Destroy>', lambda event: root.destroy() if event.widget is review else None)
        root.mainloop()
    else:
        root.destroy()
