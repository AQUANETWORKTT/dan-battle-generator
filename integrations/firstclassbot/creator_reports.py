"""Read-only TikTok profile/LIVE capture and PDF reports. No messaging imports."""
from contextlib import contextmanager
import hashlib
import json
import os
import queue
import re
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from name_filter import outside_english_letters, check_profile_name

ROOT=Path(__file__).resolve().parent
SCHEMA='firstclass-creator-report-v1'

def atomic_json(path,value):
    path=Path(path);path.parent.mkdir(parents=True,exist_ok=True)
    temporary=path.with_suffix(path.suffix+'.tmp')
    temporary.write_text(json.dumps(value,ensure_ascii=False,indent=2),encoding='utf-8')
    temporary.replace(path)

def read_manifest(filename):
    raw=Path(filename).read_bytes()
    if len(raw)>10000000:raise ValueError('Report file is too large.')
    data=json.loads(raw.decode('utf-8-sig'))
    if data.get('schema')!=SCHEMA or not re.fullmatch(r'[a-fA-F0-9-]{36}',str(data.get('id',''))):raise ValueError('Choose a report file downloaded from Creator API Search.')
    dates=data.get('dateWindow',[])
    if len(dates)!=3 or len(set(dates))!=3 or any(not re.fullmatch(r'\d{4}-\d{2}-\d{2}',str(d)) for d in dates):raise ValueError('The report needs three dated history entries.')
    rows=data.get('creators',[])
    if not isinstance(rows,list) or not rows or len(rows)>2000:raise ValueError('A report needs between 1 and 2,000 creators.')
    unique={}
    for row in rows:
        name=str(row.get('username',''))
        if not re.fullmatch(r'[a-z0-9._]{1,24}',name):raise ValueError('Report file contains an invalid username.')
        if row.get('availability',{}).get('status')!='Available' or not row.get('availability',{}).get('checkedAt'):raise ValueError('Report creators must have confirmed, dated Available results.')
        if not outside_english_letters(name,row.get('name')):unique[name]=row
    data['creators']=list(unique.values())
    if not data['creators']:raise ValueError('No creators pass the lettering filter.')
    data['fingerprint']=hashlib.sha256(raw).hexdigest()
    return data

class Cancelled(Exception):pass

class Control:
    def __init__(self):self.stop=threading.Event();self.paused=threading.Event()
    def check(self):
        while self.paused.is_set() and not self.stop.is_set():self.stop.wait(.2)
        if self.stop.is_set():raise Cancelled('Stopped. Completed work has been saved.')
    def wait(self,seconds):
        end=time.monotonic()+seconds
        while time.monotonic()<end:self.check();self.stop.wait(min(.2,max(0,end-time.monotonic())))

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs):return None

class HistoryClient:
    def __init__(self):
        self.base=os.environ.get('CREATOR_SEARCH_PORTAL_URL','https://firstclassagency.management').rstrip('/')
        parsed=urllib.parse.urlsplit(self.base)
        if parsed.hostname not in {'firstclassagency.management','www.firstclassagency.management','localhost','127.0.0.1'} or parsed.path or parsed.query or parsed.fragment or parsed.username or (parsed.scheme!='https' and not(parsed.scheme=='http' and parsed.hostname in {'localhost','127.0.0.1'})):raise ValueError('Use the First Class Management portal, or localhost for development.')
        self.token=os.environ.get('CREATOR_SEARCH_WORKER_TOKEN','')
        if len(self.token)<32:raise ValueError('Start the report builder using Start Creator Reports.cmd so its private connection key is loaded.')
        self.opener=urllib.request.build_opener(NoRedirect())
    def history(self,name,dates,control):
        for attempt in range(4):
            control.check()
            request=urllib.request.Request(self.base+'/api/creator-api-search/worker/report-history',data=json.dumps({'username':name,'dates':dates}).encode(),headers={'Authorization':'Bearer '+self.token,'Content-Type':'application/json'},method='POST')
            try:
                with self.opener.open(request,timeout=65) as response:return json.load(response)
            except urllib.error.HTTPError as error:
                try:detail=json.loads(error.read())
                except Exception:detail={}
                if detail.get('quota'):raise RuntimeError('TikLeap daily allowance reached. Stop and resume this report after the allowance resets.') from None
                if error.code in {401,403}:raise RuntimeError('Report history connection was denied. Check the report launcher configuration.') from None
                if error.code not in {429,500,502,503,504} or attempt==3:raise RuntimeError(detail.get('error') or f'History request failed (HTTP {error.code}).') from None
                delay=5*(attempt+1)
                if detail.get('retryAt'):
                    try:delay=max(1,min(120,datetime.fromisoformat(detail['retryAt'].replace('Z','+00:00')).timestamp()-time.time()))
                    except Exception:pass
                control.wait(delay)
            except (urllib.error.URLError,TimeoutError):
                if attempt==3:raise RuntimeError('History connection failed; retry this report later.') from None
                control.wait(5*(attempt+1))

def unknown_history(dates,reason):
    return {'days':[{'date':date,'diamonds':None} for date in dates],'knownDays':0,'knownTotal':0,'threeDayTotal':None,'error':reason}

def priority(row):
    history=row.get('history',{});total=history.get('threeDayTotal')
    return (total is None,-(total if isinstance(total,(int,float)) else history.get('knownTotal',0)),row['username'])

def profile_matches(url,name,live=False):
    value=urllib.parse.urlsplit(url)
    expected='/@'+name+('/live' if live else '')
    return value.hostname in {'www.tiktok.com','tiktok.com'} and value.path.rstrip('/').lower()==expected.lower()

def challenge(page):
    try:
        markers=page.locator('iframe[src*="captcha"], [id*="captcha-verify"], [data-e2e="captcha"]')
        return any(markers.nth(i).is_visible() for i in range(min(markers.count(),8)))
    except Exception:return False

def capture_creator(page,row,folder,control):
    name=row['username'];result={'capturedAt':datetime.now(timezone.utc).isoformat(),'profileStatus':'Unavailable','liveStatus':'Unavailable'}
    if hasattr(page,'add_init_script') and not getattr(page,'_creator_reports_muted',False):
        page.add_init_script("document.addEventListener('play',e=>{if(e.target instanceof HTMLMediaElement)e.target.muted=true;},true)")
        page._creator_reports_muted=True
    control.check()
    try:
        page.goto('https://www.tiktok.com/@'+name,wait_until='domcontentloaded',timeout=25000)
        control.check()
        if not profile_matches(page.url,name):raise RuntimeError('TikTok did not open the requested profile.')
        if challenge(page):raise RuntimeError('TikTok verification appeared. No challenge was bypassed.')
        try:check_profile_name(page,name)
        except RuntimeError as error:
            if 'letters outside' in str(error):return {**result,'excluded':True,'reason':'Current nickname contains letters outside A-Z.'}
            raise
        note='Profile verified.'
        try:page.locator('a[href*="/video/"]').first.wait_for(state='visible',timeout=7000)
        except Exception:note='Profile verified; posts were unavailable or no posts were visible.'
        control.check();page.evaluate('window.scrollTo(0,0)')
        filename=name+'-profile.jpg';page.screenshot(path=str(folder/filename),type='jpeg',quality=80,full_page=False,timeout=10000)
        result.update(profileStatus='Captured',profileImage=filename,profileNote=note)
    except Cancelled:raise
    except Exception as error:
        result['profileNote']=str(error)[:300]
        return result
    control.check()
    try:
        page.goto('https://www.tiktok.com/@'+name+'/live',wait_until='domcontentloaded',timeout=25000)
        control.check()
        if challenge(page):raise RuntimeError('TikTok verification appeared; LIVE capture skipped.')
        if not profile_matches(page.url,name,True):raise RuntimeError('LIVE page changed to a different destination; no screenshot saved.')
        deadline=time.monotonic()+15
        while time.monotonic()<deadline:
            control.check()
            offline=page.get_by_text(re.compile(r'(not currently live|isn.t LIVE|LIVE (?:has ended|is over|isn.t available)|host is currently offline)',re.I))
            if any(offline.nth(i).is_visible() for i in range(min(offline.count(),6))):
                result.update(liveStatus='Offline',liveNote='TikTok explicitly reported that this LIVE is offline or ended.');return result
            # Verify a link in the LIVE host header, not a recommended creator tile.
            hosts=page.locator('[data-e2e="live-room-user-info"] a[href], a[data-e2e="live-room-user-name"], [data-e2e="live-room-user-name"] a[href]')
            owner=any(profile_matches(urllib.parse.urljoin(page.url,hosts.nth(i).get_attribute('href') or ''),name) for i in range(min(hosts.count(),8)))
            # Verified against TikTok's current LIVE hydration structure. The
            # header now renders a nickname rather than a clickable username.
            embedded_owner=page.evaluate("()=>{try{return JSON.parse(document.getElementById('SIGI_STATE')?.textContent||'{}').LiveRoom?.liveRoomUserInfo?.user?.uniqueId||null;}catch{return null;}}")
            owner=owner or (isinstance(embedded_owner,str) and embedded_owner.lower()==name.lower())
            videos=page.locator('video')
            ready=any(videos.nth(i).is_visible() and videos.nth(i).evaluate('v=>v.readyState>=2 && v.videoWidth>0') for i in range(min(videos.count(),8)))
            if owner and ready:
                page.evaluate('document.querySelectorAll("video").forEach(v=>{v.muted=true;v.play().catch(()=>{});})')
                page.wait_for_timeout(800);control.check()
                filename=name+'-live.jpg';page.screenshot(path=str(folder/filename),type='jpeg',quality=80,full_page=False,timeout=10000)
                result.update(liveStatus='Captured',liveImage=filename,liveNote='LIVE owner and visible video verified.');return result
            page.wait_for_timeout(300)
        raise RuntimeError('LIVE video or host identity could not be verified. The creator was not assumed offline.')
    except Cancelled:raise
    except Exception as error:result['liveNote']=str(error)[:300]
    return result

def friendly_date(value,include_time=True):
    try:
        from zoneinfo import ZoneInfo
        date=datetime.fromisoformat(str(value).replace('Z','+00:00'))
        if date.tzinfo is None:date=date.replace(tzinfo=timezone.utc)
        try:date=date.astimezone(ZoneInfo('Europe/London'))
        except Exception:date=date.astimezone()
        day=date.day;suffix='th' if 11<=day%100<=13 else {1:'st',2:'nd',3:'rd'}.get(day%10,'th')
        return f'{day}{suffix} {date.strftime("%B")}' + (date.strftime(', %H:%M') if include_time else '')
    except Exception:return 'Date not recorded'


def write_pdf(manifest,state,folder):
    from reportlab.pdfgen import canvas
    from reportlab.lib.colors import HexColor
    from reportlab.lib.pagesizes import A4,landscape
    from reportlab.lib.utils import ImageReader
    from reportlab.platypus import Paragraph
    from reportlab.lib.styles import ParagraphStyle
    from xml.sax.saxutils import escape
    width,height=landscape(A4);gold=HexColor('#c69c38');ink=HexColor('#152019');muted=HexColor('#657367')
    filename=folder/'available-creator-report.pdf';temporary=folder/'available-creator-report.tmp.pdf'
    pdf=canvas.Canvas(str(temporary),pagesize=(width,height),pageCompression=1)
    pdf.setTitle('Available Creator Report | First Class Agency');pdf.setAuthor('First Class Agency')
    style=ParagraphStyle('body',fontName='Helvetica',fontSize=9,leading=13,textColor=muted)
    def text(value,x,y,max_width,size=9,color=ink):
        block=Paragraph(escape(str(value)),ParagraphStyle('line',parent=style,fontSize=size,leading=size+4,textColor=color));_,h=block.wrap(max_width,200);block.drawOn(pdf,x,y-h);return h
    def heading(title,subtitle,creator=False):
        pdf.setFillColor(ink);pdf.rect(0,height-94,width,94,fill=1,stroke=0)
        pdf.setFillColor(gold);pdf.setFont('Helvetica-Bold',10);pdf.drawString(30,height-25,'FIRST CLASS AGENCY')
        pdf.setFont('Helvetica',8);pdf.drawRightString(width-30,height-25,'AVAILABLE CREATOR REPORT')
        text(title,30,height-37,width-(220 if creator else 60),24,HexColor('#ffffff'))
        text(subtitle,30,height-72,width-60,9,HexColor('#e0d6b8'))
    def footer(index,total):
        pdf.setFillColor(muted);pdf.setFont('Helvetica',7);pdf.drawString(30,18,'FIRST CLASS AGENCY');pdf.drawRightString(width-30,18,f'{index} / {total}')
    rows=sorted([row for row in state['creators'].values() if not row.get('capture',{}).get('excluded')],key=priority)
    heading('Available Creator Report','Prepared '+friendly_date(manifest['generatedAt']))
    text(f'{len(rows)} available creators',35,height-125,width-70,29)
    text('Diamonds: '+' / '.join(friendly_date(date,False) for date in manifest['dateWindow']),35,height-177,width-70,12)
    text('Profiles, live snapshots and recent diamond performance in one place.',35,height-220,width-70,13)
    notes=['Use View Profile on any creator page to open their TikTok profile.','Creators with complete three-day diamond totals appear first, highest to lowest.','Missing figures are shown as Not available. Live screenshots show the moment they were captured.']
    y=height-277
    for note in notes:y-=text(note,35,y,width-70,12)+18
    excluded=sum(bool(row.get('capture',{}).get('excluded')) for row in state['creators'].values())
    if excluded:text(f'{excluded} accounts were removed by the lettering filter.',35,y-10,width-70,10)
    footer(1,len(rows)+1);pdf.showPage()
    for index,row in enumerate(rows,1):
        name=row['username'];availability=row['availability'];history=row.get('history',unknown_history(manifest['dateWindow'],'History not fetched.'));capture=row.get('capture',{})
        invitation=availability.get('invitationType','Unknown')
        if invitation=='Unknown':invitation='Type not recorded'
        heading('@'+name,f'{invitation}  |  Backstage available  |  Checked '+friendly_date(availability.get('checkedAt')),True)
        profile_url='https://www.tiktok.com/@'+name
        pdf.linkURL(profile_url,(28,height-69,width-190,height-35),relative=0,thickness=0)
        button_x=width-156;button_y=height-65
        pdf.setFillColor(gold);pdf.roundRect(button_x,button_y,126,29,7,fill=1,stroke=0)
        pdf.setFillColor(ink);pdf.setFont('Helvetica-Bold',10);pdf.drawCentredString(button_x+63,button_y+10,'View Profile')
        pdf.linkURL(profile_url,(button_x,button_y,button_x+126,button_y+29),relative=0,thickness=0)
        total=history.get('threeDayTotal')
        summary=f'{total:,.0f} diamonds over 3 days' if total is not None else (f'{history.get("knownTotal",0):,.0f} diamonds / {history.get("knownDays",0)} of 3 days available' if history.get('knownDays') else 'Diamond history not available')
        text(summary,30,height-110,width-60,16)
        latest=row.get('rankingDiamonds')
        if latest is not None:text(f'Latest ranking snapshot: {latest:,.0f} diamonds',30,height-137,width-60,9)
        panel_width=(width-76)/2;panel_y=118;panel_h=292
        for side,label,status_key,image_key in [(0,'Profile','profileStatus','profileImage'),(1,'Live','liveStatus','liveImage')]:
            x=30+side*(panel_width+16)
            pdf.setFillColor(HexColor('#f1f4ee'));pdf.roundRect(x,panel_y,panel_width,panel_h,9,fill=1,stroke=0)
            pdf.setFillColor(gold);pdf.setFont('Helvetica-Bold',10);pdf.drawString(x+13,panel_y+panel_h-21,label)
            image=capture.get(image_key)
            valid_image=image==name+('-profile.jpg' if side==0 else '-live.jpg') and (folder/image).is_file()
            if valid_image:
                try:pdf.drawImage(ImageReader(str(folder/image)),x+9,panel_y+10,width=panel_width-18,height=panel_h-46,preserveAspectRatio=True,anchor='c',mask='auto')
                except Exception:text('Screenshot not available',x+20,panel_y+165,panel_width-40,13)
            else:
                message='Profile screenshot not available' if side==0 else 'Not live at capture' if capture.get(status_key)=='Offline' else 'Live screenshot not available'
                text(message,x+20,panel_y+165,panel_width-40,13)
            pdf.linkURL(profile_url+('/live' if side else ''),(x,panel_y,x+panel_width,panel_y+panel_h),relative=0,thickness=0)
        for i,day in enumerate(history.get('days',[])):
            x=30+i*(width-60)/3
            text(friendly_date(day['date'],False),x,99,(width-72)/3,9)
            text('Not available' if day.get('diamonds') is None else f'{day["diamonds"]:,.0f} diamonds',x,78,(width-72)/3,14)
        footer(index+1,len(rows)+1);pdf.showPage()
    pdf.save();temporary.replace(filename);return filename


def _run_report_unlocked(manifest,folder,control,report,sign_in,history_client=None,capture_fn=capture_creator,browser_factory=None,retry_failed=False):
    folder=Path(folder);folder.mkdir(parents=True,exist_ok=True);state_file=folder/'progress.json'
    if state_file.is_file():
        state=json.loads(state_file.read_text(encoding='utf-8'))
        if state.get('fingerprint')!=manifest['fingerprint']:raise ValueError('This folder belongs to a different report file. Choose another folder.')
    else:state={'fingerprint':manifest['fingerprint'],'creators':{row['username']:dict(row) for row in manifest['creators']}}
    client=history_client or HistoryClient()
    try:
        for index,row in enumerate(state['creators'].values(),1):
            control.check()
            if 'history' in row and not(retry_failed and row['history'].get('error')):continue
            report(f'History {index}/{len(state["creators"])}: @{row["username"]}')
            try:row['history']=client.history(row['username'],manifest['dateWindow'],control)
            except Cancelled:raise
            except RuntimeError as error:
                if 'allowance reached' in str(error) or 'connection was denied' in str(error):raise
                row['history']=unknown_history(manifest['dateWindow'],str(error))
            atomic_json(state_file,state)
        pending=[row for row in sorted(state['creators'].values(),key=priority) if 'capture' not in row or (retry_failed and (row['capture'].get('profileStatus')!='Captured' or row['capture'].get('liveStatus') not in {'Captured','Offline'}) and not row['capture'].get('excluded'))]
        if pending:
            from playwright.sync_api import sync_playwright
            with sync_playwright() as playwright:
                chrome=Path(os.environ.get('PROGRAMFILES','C:/Program Files'))/'Google/Chrome/Application/chrome.exe'
                context=browser_factory(playwright) if browser_factory else playwright.chromium.launch_persistent_context(str(ROOT/'browser_profile_reports'),headless=False,viewport={'width':1460,'height':1000},locale='en-GB',chromium_sandbox=True,**({'channel':'chrome'} if chrome.is_file() else {}))
                try:
                    page=context.pages[0] if context.pages else context.new_page()
                    page.goto('https://www.tiktok.com/',wait_until='domcontentloaded',timeout=25000)
                    report('Sign into TikTok in the report browser. Then press Continue after sign-in. No messages will be sent.')
                    sign_in(control)
                    for index,row in enumerate(pending,1):
                        control.check();report(f'Capture {index}/{len(pending)}: @{row["username"]}')
                        row['capture']=capture_fn(page,row,folder,control);atomic_json(state_file,state)
                finally:context.close()
    except Exception:
        atomic_json(state_file,state)
        if state['creators']:
            try:write_pdf(manifest,state,folder)
            except Exception:pass
        raise
    atomic_json(state_file,state);report('Building PDF…');return write_pdf(manifest,state,folder)

@contextmanager
def report_lock(folder):
    folder=Path(folder);folder.mkdir(parents=True,exist_ok=True)
    with (folder/'report.lock').open('a+b') as handle:
        if handle.tell()==0:handle.write(b'1');handle.flush()
        handle.seek(0)
        try:
            if os.name=='nt':
                import msvcrt
                msvcrt.locking(handle.fileno(),msvcrt.LK_NBLCK,1)
            else:
                import fcntl
                fcntl.flock(handle.fileno(),fcntl.LOCK_EX|fcntl.LOCK_NB)
        except OSError:raise RuntimeError('This report is already open in another builder. Stop that run first.') from None
        try:yield
        finally:
            handle.seek(0)
            if os.name=='nt':msvcrt.locking(handle.fileno(),msvcrt.LK_UNLCK,1)
            else:fcntl.flock(handle.fileno(),fcntl.LOCK_UN)

def run_report(manifest,folder,control,report,sign_in,**kwargs):
    with report_lock(folder):return _run_report_unlocked(manifest,folder,control,report,sign_in,**kwargs)


def main():
    import tkinter as tk
    from tkinter import filedialog,messagebox,scrolledtext
    window=tk.Tk();window.title('First Class — Available Creator Reports');window.geometry('880x760');window.configure(bg='#101510')
    selected={'file':None,'folder':None,'manifest':None,'running':False,'pdf':None};control=Control();signed_in=threading.Event();events=queue.Queue()
    def log(value):events.put(('log',value))
    tk.Label(window,text='AVAILABLE CREATOR REPORTS',bg='#101510',fg='#f5d571',font=('Arial',20,'bold')).pack(anchor='w',padx=20,pady=(20,8))
    tk.Label(window,text='Load the report file downloaded from Creator API Search. Captures never send messages or invitations.',bg='#101510',fg='white',wraplength=800,justify='left').pack(anchor='w',padx=20)
    summary=tk.StringVar(value='No report file selected.')
    tk.Label(window,textvariable=summary,bg='#101510',fg='#c7d9c6',wraplength=800,justify='left').pack(anchor='w',padx=20,pady=12)
    actions=tk.Frame(window,bg='#101510');actions.pack(fill='x',padx=20)
    def load():
        if selected['running']:return
        filename=filedialog.askopenfilename(title='Select downloaded creator report file',filetypes=[('Creator report JSON','*.json')])
        if not filename:return
        try:
            manifest=read_manifest(filename);selected.update(file=filename,manifest=manifest,folder=ROOT/'profile_report_data'/manifest['id']);summary.set(f'{len(manifest["creators"])} creators | up to {len(manifest["creators"])} uncached TikLeap history lookups | '+', '.join(manifest['dateWindow'])+'\nOutput: '+str(selected['folder']))
        except Exception as error:messagebox.showerror('Report file',str(error),parent=window)
    def choose_folder():
        if selected['running']:return
        value=filedialog.askdirectory(title='Choose report output folder')
        if value:selected['folder']=Path(value);summary.set('Output: '+value)
    def worker(retry_failed):
        try:
            def sign_in(ctrl):
                while not signed_in.wait(.2):ctrl.check()
            output=run_report(selected['manifest'],selected['folder'],control,log,sign_in,retry_failed=retry_failed);selected['pdf']=output;log('Finished. PDF saved to '+str(output))
        except Cancelled:log('Stopped. Reload this report file and Start again to resume. Any partial PDF is saved in the output folder.')
        except Exception as error:log(str(error)+' Completed work remains saved; resume the same file and folder.')
        finally:events.put(('done',None))
    def start():
        if selected['running']:return
        if not selected['manifest'] or not selected['folder']:messagebox.showinfo('Load a report','Load a report file first.',parent=window);return
        selected['running']=True;control.stop.clear();control.paused.clear();signed_in.clear();threading.Thread(target=worker,args=(retry.get(),),daemon=True).start()
    def toggle_pause():
        if control.paused.is_set():control.paused.clear();pause_button.configure(text='Pause')
        else:control.paused.set();pause_button.configure(text='Resume')
    def open_pdf():
        path=selected.get('pdf') or (selected['folder']/'available-creator-report.pdf' if selected.get('folder') else None)
        if path and path.is_file():os.startfile(str(path))
        else:messagebox.showinfo('PDF','No PDF has been generated yet.',parent=window)
    for title,callback in [('Load report file',load),('Output folder',choose_folder),('Start / resume',start),('Continue after sign-in',signed_in.set),('Stop',control.stop.set),('Open PDF',open_pdf)]:tk.Button(actions,text=title,command=callback,padx=9,pady=8).pack(side='left',padx=(0,5),pady=5)
    def rebuild_pdf():
        if selected['running']:
            messagebox.showinfo('Report is running','Stop the current run before rebuilding the PDF.',parent=window);return
        if not selected['manifest'] or not selected['folder']:
            messagebox.showinfo('Load your report','Load the same report file and output folder first.',parent=window);return
        try:
            with report_lock(selected['folder']):
                state=json.loads((selected['folder']/'progress.json').read_text(encoding='utf-8'))
                if state.get('fingerprint')!=selected['manifest']['fingerprint']:raise ValueError('Choose the output folder for this report file.')
                selected['pdf']=write_pdf(selected['manifest'],state,selected['folder'])
            log('PDF updated using saved screenshots. No new captures or API lookups were needed. '+str(selected['pdf']))
        except FileNotFoundError:messagebox.showinfo('No saved captures','Run the report first, or choose its existing output folder.',parent=window)
        except Exception as error:messagebox.showerror('Could not rebuild PDF',str(error),parent=window)
    secondary=tk.Frame(window,bg='#101510');secondary.pack(fill='x',padx=20,pady=5)
    pause_button=tk.Button(secondary,text='Pause',command=toggle_pause,padx=15,pady=7);pause_button.pack(side='left')
    tk.Button(secondary,text='Rebuild PDF from saved captures',command=rebuild_pdf,padx=15,pady=7,bg='#dfc977').pack(side='left',padx=8)
    retry=tk.BooleanVar(value=False);tk.Checkbutton(window,text='Retry failed history / profile captures when resuming',variable=retry,bg='#101510',fg='white',selectcolor='#263e29').pack(anchor='w',padx=20)
    tk.Label(window,text='History is collected first; the TikTok browser opens when capture begins. Leave that browser open. Offline or unverified LIVE screens are labelled. Stop preserves work. No messaging history is changed.',bg='#101510',fg='#a9bca9',wraplength=800,justify='left').pack(anchor='w',padx=20,pady=12)
    output=scrolledtext.ScrolledText(window,state='disabled',font=('Consolas',10));output.pack(fill='both',expand=True,padx=20,pady=(0,20))
    def drain():
        while True:
            try:kind,value=events.get_nowait()
            except queue.Empty:break
            if kind=='done':selected['running']=False
            else:output.configure(state='normal');output.insert('end',str(value)+'\n');output.see('end');output.configure(state='disabled')
        window.after(150,drain)
    def close():
        if selected['running']:control.stop.set();messagebox.showinfo('Stopping','Wait for the stopped log entry, then close this window.',parent=window)
        else:window.destroy()
    window.protocol('WM_DELETE_WINDOW',close);window.after(150,drain);window.mainloop()

if __name__=='__main__':main()
