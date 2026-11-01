"""Profile navigation in ordinary Chrome via a private localhost controller.

No browser automation flags, personal-profile access, cookies, or TikTok DOM
access. The user opens the profile window once from the controller page.
"""
import json
import os
import re
import secrets
import subprocess
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


HTML = '''<!doctype html><meta charset="utf-8"><title>First Class · Profile viewer</title>
<style>body{background:#101015;color:#eee;font:17px Arial;max-width:650px;margin:55px auto;padding:25px}button{background:#ffe447;border:0;border-radius:8px;padding:16px;font-weight:bold;font-size:18px;cursor:pointer}p{line-height:1.6}#name{color:#ffe447}</style>
<h1>Use your normal Chrome</h1><p>This page keeps the profile window connected to your View mode panel. It uses the TikTok account signed into this Chrome profile.</p>
<button id="open">Open profile window</button><h2 id="name">Waiting for the review panel…</h2>
<p id="status">Click Open profile window once. Keep this controller tab open, and use the separate View mode panel to tag and complete creators.</p>
<p>No messages are sent. This controller cannot read your TikTok posts or cookies.</p>
<script>
let viewer=null,last=0,busy=false,current=null;
const endpoint=location.pathname;
async function ack(id,ok){await fetch(endpoint+'ack',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,ok})});}
function openViewer(){viewer=window.open('about:blank','firstclass-profile-review','popup,width=1050,height=900,left=510,top=40');last=0;document.getElementById('status').textContent=viewer?'Profile window opened. Keep this controller tab open.':'Chrome blocked the window. Click Open profile window again.';}
document.getElementById('open').onclick=openViewer;
async function poll(){if(busy)return;busy=true;try{
 const r=await fetch(endpoint+'state',{cache:'no-store'});if(!r.ok)throw Error('Viewer disconnected');const s=await r.json();current=s;
 if(s.url){document.getElementById('name').textContent='@'+s.url.split('/@')[1];}
 if(s.id && s.id!==last && viewer){
  if(viewer.closed){viewer=null;document.getElementById('status').textContent='Profile window disconnected or closed. Click Open profile window to reconnect.';}
  else{try{viewer.location.href=s.url;last=s.id;await ack(s.id,true);document.getElementById('status').textContent='Profile opened. Tick your tags in View mode, then Complete & next.';}catch(e){await ack(s.id,false);document.getElementById('status').textContent='Could not navigate the profile window. Click Open profile window to reconnect.';}}
 }
}catch(e){document.getElementById('status').textContent='Review panel stopped or disconnected. You can close this controller tab.';}finally{busy=false;}}
setInterval(poll,400);poll();
</script>'''


class NormalBrowserReview:
    inspect_available = False

    def __init__(self, stop):
        self.stop = stop
        self.url = ''
        self.lock = threading.Lock()
        self.state = {'id': 0, 'url': ''}
        self.acknowledged = 0
        self.failed = 0
        self.first_open = True
        self.prefix = '/' + secrets.token_urlsafe(32) + '/'
        owner = self

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *args): pass

            def reply(self, status, value, content_type='application/json'):
                body = value.encode('utf-8') if isinstance(value, str) else json.dumps(value).encode('utf-8')
                self.send_response(status)
                self.send_header('Content-Type', content_type + '; charset=utf-8')
                self.send_header('Cache-Control', 'no-store')
                self.send_header('X-Content-Type-Options', 'nosniff')
                self.send_header('Referrer-Policy', 'no-referrer')
                self.end_headers()
                self.wfile.write(body)

            def allowed(self):
                expected = f'127.0.0.1:{owner.server.server_port}'
                return self.headers.get('Host') == expected and self.headers.get('Origin', 'http://' + expected) == 'http://' + expected

            def do_GET(self):
                if not self.allowed():
                    return self.reply(403, {})
                if self.path == owner.prefix:
                    return self.reply(200, HTML, 'text/html')
                if self.path == owner.prefix + 'state':
                    with owner.lock:
                        return self.reply(200, dict(owner.state))
                self.reply(404, {})

            def do_POST(self):
                if not self.allowed() or self.path != owner.prefix + 'ack':
                    return self.reply(403, {})
                try:
                    size = int(self.headers.get('Content-Length', '0'))
                    if not 0 < size <= 512:
                        raise ValueError()
                    value = json.loads(self.rfile.read(size))
                    with owner.lock:
                        if type(value.get('id')) is not int or value['id'] != owner.state['id']:
                            return self.reply(409, {})
                        if value.get('ok') is True:
                            owner.acknowledged = value['id']
                        else:
                            owner.failed = value['id']
                    self.reply(200, {})
                except (ValueError, TypeError):
                    self.reply(400, {})

        self.server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        self.server.daemon_threads = True
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)

    def __enter__(self):
        self.thread.start()
        chrome = next((path for path in [Path(os.environ.get('PROGRAMFILES', 'C:/Program Files'))/'Google/Chrome/Application/chrome.exe', Path(os.environ.get('PROGRAMFILES(X86)', 'C:/Program Files (x86)'))/'Google/Chrome/Application/chrome.exe', Path.home()/'AppData/Local/Google/Chrome/Application/chrome.exe'] if path.is_file()), None)
        if not chrome:
            self.__exit__(None, None, None)
            raise RuntimeError('Installed Google Chrome was not found.')
        # Ordinary Chrome launch: no private user-data directory, debugging port,
        # automation flags, security-setting changes or copied credentials.
        subprocess.Popen([str(chrome), f'http://127.0.0.1:{self.server.server_port}{self.prefix}'])
        return self

    def __exit__(self, *args):
        self.server.shutdown()
        self.server.server_close()

    def is_closed(self):
        return self.stop.is_set()

    def goto(self, url, **kwargs):
        if not re.fullmatch(r'https://www\.tiktok\.com/@[a-zA-Z0-9._]{1,24}', url):
            raise ValueError('Only TikTok profile URLs can be opened in View mode.')
        with self.lock:
            self.state = {'id': self.state['id'] + 1, 'url': url}
            target = self.state['id']
        # The first navigation waits for the user's one-time popup click.
        deadline = None if self.first_open else time.monotonic() + 20
        while not self.stop.wait(0.1):
            with self.lock:
                if self.acknowledged == target:
                    self.url = url
                    self.first_open = False
                    return
                if self.failed == target:
                    raise RuntimeError('The normal Chrome profile window could not navigate.')
            if deadline is not None and time.monotonic() >= deadline:
                raise RuntimeError('Normal Chrome did not acknowledge the next profile.')
        raise RuntimeError('Viewing stopped.')

    def wait_for_timeout(self, milliseconds):
        self.stop.wait(milliseconds / 1000)
