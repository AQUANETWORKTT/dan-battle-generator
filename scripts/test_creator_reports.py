"""Fixture-only PDF/capture/resume checks. No TikTok connection or real messages."""
import copy
import json
import re
import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'integrations'/'firstclassbot'))
import creator_reports as reports
from PIL import Image,ImageDraw

def picture(path,label='TEST FIXTURE - NOT A REAL PROFILE'):
    image=Image.new('RGB',(1460,1000),'#e6ece4');draw=ImageDraw.Draw(image)
    draw.rectangle((0,0,1460,150),fill='#12271c');draw.text((45,55),label,fill='#e4c46e',font_size=35)
    draw.ellipse((75,210,300,435),fill='#657c67');draw.text((340,240),'@demo_creator',fill='#102719',font_size=55)
    for x in range(60,1300,310):draw.rectangle((x,510,x+270,920),fill='#759681')
    image.save(path,quality=80)

def creator(name,total=60000):
    return {'username':name,'name':'Demo Creator','rankingDiamonds':10000,'snapshotAt':'2026-11-03T20:00:00Z','availability':{'status':'Available','invitationType':'Premium','checkedAt':'2026-11-03T20:00:00Z'},'history':{'days':[{'date':date,'diamonds':total//3} for date in ['2026-11-03','2026-11-02','2026-11-01']],'knownDays':3,'knownTotal':total,'threeDayTotal':total}}
def manifest(rows):return {'schema':reports.SCHEMA,'id':'12345678-1234-1234-1234-123456789012','generatedAt':'2026-11-04T12:00:00Z','region':'GB','dateWindow':['2026-11-03','2026-11-02','2026-11-01'],'creators':rows,'fingerprint':'fixture-only'}

class Locator:
    def __init__(self,page,kind):self.page=page;self.kind=kind
    @property
    def first(self):return self
    def wait_for(self,**kwargs):pass
    def inner_text(self,**kwargs):return self.page.nickname if self.kind=='nickname' else self.page.name
    def count(self):return 0 if self.kind=='challenge' else 1
    def nth(self,index):return self
    def is_visible(self):return self.page.offline if self.kind=='offline' else True
    def evaluate(self,expression):return True
    def get_attribute(self,name):return '/@'+self.page.host
class Page:
    def __init__(self,name='demo_creator',nickname='Demo ⭐',offline=False,host=None):self.name=name;self.nickname=nickname;self.offline=offline;self.host=host or name;self.url='';self.shots=0
    def goto(self,url,**kwargs):self.url=url
    def locator(self,selector):
        kind='nickname' if 'user-title' in selector else 'title' if 'user-subtitle' in selector else 'challenge' if 'captcha' in selector else 'host' if 'live-room' in selector else 'video' if selector=='video' else 'posts'
        return Locator(self,kind)
    def get_by_text(self,*args):return Locator(self,'offline')
    def evaluate(self,*args):pass
    def wait_for_timeout(self,*args):pass
    def screenshot(self,path,**kwargs):self.shots+=1;picture(path)
class Context:
    def __init__(self):self.pages=[Page()]
    def close(self):pass
class Manager:
    def __enter__(self):return object()
    def __exit__(self,*args):pass

class Tests(unittest.TestCase):
    def test_friendly_checked_dates(self):
        self.assertEqual(reports.friendly_date('2026-11-04T17:10:00Z'),'4th November, 17:10')
        self.assertEqual(reports.friendly_date('2026-11-11T12:00:00Z',False),'11th November')
        self.assertEqual(reports.friendly_date('2026-11-21T12:00:00Z',False),'21st November')
    def test_profile_live_offline_foreign_and_wrong_host(self):
        with tempfile.TemporaryDirectory() as temp:
            folder=Path(temp);row=creator('demo_creator');page=Page()
            capture=reports.capture_creator(page,row,folder,reports.Control())
            self.assertEqual(capture['profileStatus'],'Captured');self.assertEqual(capture['liveStatus'],'Captured');self.assertEqual(page.shots,2)
            self.assertEqual(reports.capture_creator(Page(offline=True),row,folder,reports.Control())['liveStatus'],'Offline')
            foreign=Page(nickname='محمد ⭐');self.assertTrue(reports.capture_creator(foreign,row,folder,reports.Control())['excluded']);self.assertEqual(foreign.shots,0)
            clock=iter(range(0,1000,8))
            with patch.object(reports.time,'monotonic',side_effect=lambda:next(clock)):
                self.assertEqual(reports.capture_creator(Page(host='someone_else'),row,folder,reports.Control())['liveStatus'],'Unavailable')
    def test_sort_and_missing_days(self):
        complete=creator('complete',30);partial=creator('partial',100000);partial['history']['threeDayTotal']=None
        self.assertEqual(sorted([partial,complete],key=reports.priority)[0]['username'],'complete')
        self.assertTrue(all(d['diamonds'] is None for d in reports.unknown_history(['a','b','c'],'Failed')['days']))
    def test_lock_and_fingerprint(self):
        with tempfile.TemporaryDirectory() as temp:
            with reports.report_lock(temp):
                with self.assertRaises(RuntimeError):
                    with reports.report_lock(temp):pass
            reports.atomic_json(Path(temp)/'progress.json',{'fingerprint':'other','creators':{}})
            with self.assertRaises(ValueError):reports.run_report(manifest([creator('demo')]),temp,reports.Control(),lambda _:None,lambda _:None,history_client=object())
    def test_stop_resume_without_repeating_completed_creators(self):
        fake_module=types.ModuleType('playwright.sync_api');fake_module.sync_playwright=lambda:Manager()
        fake_package=types.ModuleType('playwright');fake_package.sync_api=fake_module
        with tempfile.TemporaryDirectory() as temp,patch.dict(sys.modules,{'playwright':fake_package,'playwright.sync_api':fake_module}):
            rows=[creator('one'),creator('two')]
            for row in rows:row.pop('history')
            data=manifest(rows);control=reports.Control();calls=[];lookups=[]
            class Client:
                def history(self,name,dates,ctrl):lookups.append(name);return creator(name)['history']
            def capture(page,row,folder,ctrl):
                if row['username']=='two' and len(calls)==1:ctrl.stop.set();ctrl.check()
                calls.append(row['username']);return {'profileStatus':'Unavailable','liveStatus':'Unavailable','profileNote':'Fixture capture.'}
            with self.assertRaises(reports.Cancelled):reports.run_report(data,temp,control,lambda _:None,lambda _:None,history_client=Client(),capture_fn=capture,browser_factory=lambda _:Context())
            self.assertEqual(calls,['one']);self.assertTrue((Path(temp)/'available-creator-report.pdf').is_file())
            def finish(page,row,folder,ctrl):calls.append(row['username']);return {'profileStatus':'Unavailable','liveStatus':'Unavailable'}
            reports.run_report(data,temp,reports.Control(),lambda _:None,lambda _:None,history_client=Client(),capture_fn=finish,browser_factory=lambda _:Context())
            self.assertEqual(calls,['one','two']);self.assertEqual(lookups,['one','two'])
    def test_400_creator_pdf_and_clickable_links(self):
        with tempfile.TemporaryDirectory() as temp:
            rows=[creator('demo'+str(i),i*3) for i in range(400)]
            result=reports.write_pdf(manifest(rows),{'creators':{r['username']:r for r in rows}},Path(temp))
            raw=result.read_bytes();self.assertEqual(len(re.findall(rb'/Type\s*/Page\b',raw)),401);self.assertIn(b'https://www.tiktok.com/@demo399',raw)

def sample():
    folder=Path('output/pdf/creator-report-sample');folder.mkdir(parents=True,exist_ok=True)
    row=creator('demo_creator');picture(folder/'demo_creator-profile.jpg');picture(folder/'demo_creator-live.jpg','LIVE CAPTURE FIXTURE - NOT A REAL STREAM')
    row['capture']={'profileStatus':'Captured','liveStatus':'Captured','profileImage':'demo_creator-profile.jpg','liveImage':'demo_creator-live.jpg','capturedAt':'2026-11-04T12:00:00Z','profileNote':'Demonstration image, not a real profile.','liveNote':'Demonstration image, not a real LIVE.'}
    missing=creator('demo_partial');missing['history']=reports.unknown_history(['2026-11-03','2026-11-02','2026-11-01'],'Demonstration of unavailable data.');missing['capture']={'profileStatus':'Unavailable','liveStatus':'Offline','profileNote':'Demonstration of a capture failure.','liveNote':'Demonstration of an offline LIVE.'}
    path=reports.write_pdf(manifest([row,missing]),{'creators':{r['username']:r for r in [row,missing]}},folder);print('Layout sample:',path)

if __name__=='__main__':
    result=unittest.TextTestRunner().run(unittest.defaultTestLoader.loadTestsFromTestCase(Tests))
    if not result.wasSuccessful():raise SystemExit(1)
    sample()
