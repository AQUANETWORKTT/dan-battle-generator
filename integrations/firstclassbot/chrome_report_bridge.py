"""Private loopback connection for the user-installed normal Chrome extension."""
import base64
import io
import json
import re
import secrets
import threading
from datetime import datetime,timezone
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from PIL import Image
from name_filter import outside_english_letters


class ChromeReportBridge:
    def __init__(self,control):
        self.control=control;self.lock=threading.Lock();self.command=None;self.answer=None
        self.prefix='/'+secrets.token_urlsafe(32)+'/'
        owner=self
        class Handler(BaseHTTPRequestHandler):
            def log_message(self,*args):pass
            def reply(self,status,data):
                payload=json.dumps(data).encode();self.send_response(status)
                self.send_header('Content-Type','application/json');self.send_header('Cache-Control','no-store')
                self.send_header('Content-Length',str(len(payload)));self.end_headers();self.wfile.write(payload)
            def allowed(self):
                origin=self.headers.get('Origin','')
                return self.headers.get('Host')==f'127.0.0.1:{owner.server.server_port}' and (not origin or re.fullmatch(r'chrome-extension://[a-p]{32}',origin))
            def do_GET(self):
                if not self.allowed() or self.path!=owner.prefix+'state':return self.reply(403,{})
                with owner.lock:
                    paused=owner.control.paused.is_set();stopped=owner.control.stop.is_set()
                    self.reply(200,{'command':None if paused or stopped else owner.command,'paused':paused,'stopped':stopped})
            def do_POST(self):
                if not self.allowed() or self.path!=owner.prefix+'result':return self.reply(403,{})
                try:
                    length=int(self.headers.get('Content-Length','0'))
                    if not 0<length<=16_000_000:raise ValueError('Invalid result size')
                    body=json.loads(self.rfile.read(length))
                    with owner.lock:
                        if owner.control.stop.is_set() or not owner.command or body.get('id')!=owner.command['id']:return self.reply(409,{'error':'This capture is no longer active.'})
                        if owner.answer is not None:return self.reply(200,{'saved':True})
                        # Validation and decoding happen before acknowledging the result.
                        owner.answer=owner.validate(body,owner.command['username'])
                    self.reply(200,{'saved':True})
                except (ValueError,TypeError,KeyError,OSError) as error:self.reply(400,{'error':str(error)[:200]})
        self.server=ThreadingHTTPServer(('127.0.0.1',0),Handler);self.server.daemon_threads=True
        self.url=f'http://127.0.0.1:{self.server.server_port}'+self.prefix
    def __enter__(self):
        threading.Thread(target=self.server.serve_forever,daemon=True).start();return self
    def __exit__(self,*args):self.server.shutdown();self.server.server_close()
    @staticmethod
    def validate(body,name):
        if body.get('username')!=name:raise ValueError('Wrong creator in capture result')
        result={'source':'normal-chrome','capturedAt':datetime.now(timezone.utc).isoformat(),'profileStatus':'Unavailable','liveStatus':'Unavailable'}
        nickname=body.get('nickname','')
        if outside_english_letters(name,nickname):return {**result,'excluded':True,'reason':'Current nickname contains letters outside A-Z.'}
        for section in ['profile','live']:
            data=body.get(section,{})
            if not isinstance(data,dict):raise ValueError('Invalid capture result')
            status=data.get('status','Unavailable')
            if status not in (['Captured','Unavailable'] if section=='profile' else ['Captured','Offline','Unavailable']):raise ValueError('Invalid capture status')
            if status in {'Captured','Offline'}:
                expected='https://www.tiktok.com/@'+name+('/live' if section=='live' else '')
                if data.get('url','').split('?')[0].rstrip('/').lower()!=expected.lower():raise ValueError('Capture URL does not match the requested creator')
            if status=='Captured':
                if data.get('verified') is not True:raise ValueError('Unverified capture')
                raw=data.get('image','')
                if not isinstance(raw,str) or not raw.startswith('data:image/jpeg;base64,'):raise ValueError('Expected a JPEG screenshot')
                decoded=base64.b64decode(raw.split(',',1)[1],validate=True)
                with Image.open(io.BytesIO(decoded)) as image:
                    if image.format!='JPEG' or not 100<=image.width<=5000 or not 100<=image.height<=5000:raise ValueError('Invalid screenshot dimensions')
                    image.verify()
                result[section+'Bytes']=decoded
            result[section+'Status']=status;result[section+'Note']=str(data.get('note',''))[:300]
        return result
    def capture(self,row,folder):
        with self.lock:self.command={'id':secrets.token_hex(16),'username':row['username']};self.answer=None
        try:
            while True:
                self.control.wait(.2)
                with self.lock:
                    if self.answer is not None:result=dict(self.answer);break
            for section in ['profile','live']:
                raw=result.pop(section+'Bytes',None)
                if raw:
                    filename=row['username']+'-'+section+'-chrome.jpg';target=Path(folder)/filename
                    temporary=target.with_suffix('.tmp');temporary.write_bytes(raw);temporary.replace(target)
                    result[section+'Image']=filename
            return result
        finally:
            with self.lock:self.command=None;self.answer=None
