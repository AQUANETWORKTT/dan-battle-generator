"""Local profile-only review. This module never imports the messaging adapter."""
import queue
import sqlite3
import threading
import time
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit
from name_filter import outside_english_letters

ROOT = Path(__file__).resolve().parent


def wait_for_posts(page, stop, timeout=10):
    """Wait for actual visible video tiles, not just the profile HTML shell."""
    if getattr(page, 'inspect_available', True) is False:
        return 'opened'
    deadline = time.monotonic() + timeout
    while not stop.is_set() and not page.is_closed():
        error = page.get_by_text('Something went wrong', exact=True)
        if any(error.nth(i).is_visible() for i in range(min(error.count(), 5))):
            return 'error'
        videos = page.locator('a[href*="/video/"]')
        if any(videos.nth(i).is_visible() for i in range(min(videos.count(), 30))):
            return 'ready'
        if time.monotonic() >= deadline:
            return 'unconfirmed'
        page.wait_for_timeout(200)
    return 'stopped'


class ReviewStore:
    def __init__(self, filename):
        self.filename = Path(filename)
        self.filename.parent.mkdir(parents=True, exist_ok=True)
        with closing(sqlite3.connect(self.filename)) as db, db:
            db.execute('CREATE TABLE IF NOT EXISTS reviews(username TEXT PRIMARY KEY, gender TEXT, foreign_profile INTEGER NOT NULL DEFAULT 0, potential INTEGER NOT NULL DEFAULT 0, viewed_at TEXT NOT NULL, completed INTEGER NOT NULL DEFAULT 0)')
            if 'completed' not in {row[1] for row in db.execute('PRAGMA table_info(reviews)')}:
                db.execute('ALTER TABLE reviews ADD COLUMN completed INTEGER NOT NULL DEFAULT 0')
            if 'gamer' not in {row[1] for row in db.execute('PRAGMA table_info(reviews)')}:
                db.execute('ALTER TABLE reviews ADD COLUMN gamer INTEGER NOT NULL DEFAULT 0')

    def viewed(self, username):
        with closing(sqlite3.connect(self.filename)) as db, db:
            db.execute('INSERT INTO reviews(username,viewed_at) VALUES(?,?) ON CONFLICT(username) DO UPDATE SET viewed_at=excluded.viewed_at', (username, datetime.now(timezone.utc).isoformat()))

    def tag(self, username, field):
        if field not in {'girl', 'boy', 'foreign_profile', 'potential', 'gamer'}:
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

    def clear(self):
        with closing(sqlite3.connect(self.filename)) as db, db:
            db.execute('DELETE FROM reviews')

    def rows(self, category='All', potential_only=False, completed_only=False):
        with closing(sqlite3.connect(self.filename)) as db:
            db.row_factory = sqlite3.Row
            rows = [dict(row) for row in db.execute('SELECT * FROM reviews ORDER BY username')]
        return [r for r in rows if (category == 'All' or category == 'Girls' and r['gender'] == 'girl' or category == 'Boys' and r['gender'] == 'boy' or category == 'Foreign' and r['foreign_profile'] or category == 'Gamer' and r['gamer'] or category == 'Unmarked' and not r['gender'] and not r['foreign_profile'] and not r['potential'] and not r['gamer']) and (not potential_only or r['potential']) and (not completed_only or r['completed'])]


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
            posts = wait_for_posts(page, stop)
            if posts == 'error':
                if not publish('retry_posts', name):
                    break
                page.reload(wait_until='domcontentloaded', timeout=20000)
                if urlsplit(page.url).path.rstrip('/').lower() != '/@' + name.lower():
                    raise RuntimeError('Profile changed during refresh.')
                posts = wait_for_posts(page, stop)
            if posts == 'stopped':
                break
        except Exception:
            if not publish('error', name):
                break
            index += 1
            continue
        if not publish('profile', (name, index + 1, len(names))):
            break
        if posts == 'opened':
            if not publish('normal_browser', name):
                break
        elif posts != 'ready':
            if not publish('posts_warning', name):
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
            if posts in {'ready','opened'} and auto_advance is not None and auto_advance.is_set() and elapsed >= seconds and not paused.is_set():
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
    window.geometry('490x910+10+40')
    window.configure(bg='#101015')
    try:
        store = ReviewStore(ROOT / 'profile_review_data' / 'reviews.sqlite3')
    except Exception as error:
        messagebox.showerror('Could not open saved reviews', str(error), parent=window)
        window.destroy()
        return
    stop, paused, auto_advance = threading.Event(), threading.Event(), threading.Event()
    commands, events = queue.Queue(), queue.Queue()
    state = {'running': False, 'current': None, 'error': None}
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
    tag_labels = {'girl':'Girl','boy':'Boy','foreign_profile':'Foreign','potential':'High potential','gamer':'Gamer'}

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

    for index, (field, label) in enumerate(tag_labels.items()):
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
            from normal_browser_review import NormalBrowserReview
            events.put(('browser_setup', None, None))
            with NormalBrowserReview(stop) as page:
                review_profiles(page, names, stop, paused, commands, publish, auto_advance=auto_advance)
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
        state['error'] = None
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
    dropdown = ttk.Combobox(filters, textvariable=category, values=['All','Girls','Boys','Foreign','Gamer','Unmarked'], state='readonly', width=14)
    dropdown.pack(side='left')
    dropdown.bind('<<ComboboxSelected>>', lambda event: refresh_tags())
    tk.Checkbutton(filters, text='High potential only', variable=potential_only, command=refresh_tags).pack(side='left', padx=8)
    saved_count = tk.StringVar()
    tk.Label(window, textvariable=saved_count, bg='#101015', fg='white').pack(anchor='w', padx=15, pady=7)

    def copy_list():
        window.clipboard_clear()
        window.clipboard_append(grouped_review_text(store.rows(completed_only=True)))
        status.set('Copied all completed results in five sections. Foreign creators excluded.')

    def export():
        filename = filedialog.asksaveasfilename(parent=window, defaultextension='.txt', filetypes=[('Grouped results','*.txt'),('Grouped results table','*.csv')], initialfile='reviewed-creators.txt')
        if filename:
            try:
                export_reviews(filename, store.rows(completed_only=True))
                status.set('Saved all completed results in five sections. Foreign creators excluded.')
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

    def clear_reviews():
        if state['running']:
            messagebox.showinfo('Stop viewing first', 'Press Stop and wait for viewing to finish, then clear saved reviews.', parent=window)
            return
        if not messagebox.askyesno('Clear saved reviews?', 'Remove all saved viewing tags and completed reviews?\n\nThis empties the Boys, Girls, High potential and Gamers result lists. Messaging history and downloaded files are not changed.', parent=window, default='no'):
            return
        try:
            store.clear()
            state['current'] = None
            category.set('All')
            potential_only.set(False)
            title.set('Saved reviews cleared')
            status.set('Your viewing lists are empty. Paste a list to start a fresh review.')
            refresh_tags()
        except Exception as error:
            messagebox.showerror('Could not clear reviews', str(error), parent=window)

    tk.Button(window, text='Clear saved reviews', command=clear_reviews, fg='#a81717', pady=7).pack(anchor='w', padx=15, pady=(10,0))
    tk.Label(window, text='Copy/download includes all completed reviews in five sections, regardless of these filters. Foreign creators are always excluded. High potential creators have their own sections; Gamer tags also appear under Gamers.', bg='#101015', fg='#b8b8bf', wraplength=455, justify='left').pack(anchor='w', padx=15, pady=15)

    def drain():
        while not events.empty():
            kind, value, ack = events.get()
            try:
                if kind == 'loading':
                    state['current'] = None
                    title.set(f'Loading @{value[0]}')
                    status.set(f'{value[1]} of {value[2]} · if prompted, click Open profile window in the Chrome controller tab')
                elif kind == 'profile':
                    store.viewed(value[0])
                    state['current'] = value[0]
                    title.set('@' + value[0])
                    status.set(f'{value[1]} of {value[2]} · tick tags, then Complete & next')
                elif kind == 'error':
                    state['current'] = None
                    status.set(f'Could not load @{value}; moving to the next profile.')
                elif kind == 'retry_posts':
                    status.set('TikTok could not load the posts. Refreshing this profile once…')
                elif kind == 'posts_warning':
                    status.set('Posts could not be confirmed: TikTok may have an error, or this profile may be private/empty. Auto-advance is held; use Next to skip or Complete & next after reviewing.')
                elif kind == 'normal_browser':
                    status.set('Opened in your normal Chrome. Inspect the posts, tick tags, then Complete & next. Keep the controller tab open.')
                elif kind == 'browser_setup':
                    status.set('Opening normal Chrome. Click Open profile window once in its controller tab, then keep that tab open.')
                elif kind == 'fatal':
                    state['error'] = value
                    status.set('Stopped: ' + value)
                elif kind == 'done':
                    state['running'] = False
                    paused.clear()
                    start_button.configure(state='normal')
                    pause_button.configure(text='Pause')
                    names_box.configure(state='normal')
                    status.set('Stopped: ' + state['error'] if state['error'] else 'Viewing stopped or finished. Your tags are saved.')
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


def grouped_review_sections(rows):
    eligible = {r['username']: r for r in rows if r.get('completed') and not r.get('foreign_profile') and not outside_english_letters(r['username'], r.get('nickname'))}
    ordered = [eligible[name] for name in sorted(eligible)]
    return [
        ('Boys', [r['username'] for r in ordered if r.get('gender') == 'boy' and not r.get('potential')]),
        ('Girls', [r['username'] for r in ordered if r.get('gender') == 'girl' and not r.get('potential')]),
        ('High potential boys', [r['username'] for r in ordered if r.get('gender') == 'boy' and r.get('potential')]),
        ('High potential girls', [r['username'] for r in ordered if r.get('gender') == 'girl' and r.get('potential')]),
        ('Gamers', [r['username'] for r in ordered if r.get('gamer')]),
    ]


def grouped_review_text(rows):
    return '\n\n'.join(heading + '\n' + '\n'.join(names) for heading, names in grouped_review_sections(rows)).rstrip() + '\n'


def export_reviews(filename, rows):
    sections = grouped_review_sections(rows)
    if Path(filename).suffix.lower() == '.csv':
        import csv
        with Path(filename).open('w', encoding='utf-8-sig', newline='') as output:
            writer = csv.writer(output)
            writer.writerow(['Section','Username'])
            writer.writerows((heading, name) for heading, names in sections for name in names)
    else:
        Path(filename).write_text(grouped_review_text(rows), encoding='utf-8')


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
