"""Local capture connection tests; no TikTok/API activity or real PDF generation."""
import base64,io,json,sys,tempfile,threading,time,unittest,urllib.request,urllib.error
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'integrations'/'firstclassbot'))
from PIL import Image
import creator_reports as reports
from chrome_report_bridge import ChromeReportBridge

def jpeg():
    output=io.BytesIO();Image.new('RGB',(300,200),'green').save(output,format='JPEG');return 'data:image/jpeg;base64,'+base64.b64encode(output.getvalue()).decode()
def result(id):return {'id':id,'username':'demo_creator','nickname':'Demo ⭐','profile':{'status':'Captured','verified':True,'url':'https://www.tiktok.com/@demo_creator','image':jpeg()},'live':{'status':'Offline','url':'https://www.tiktok.com/@demo_creator/live'}}
def send(url,body=None,origin=None):
    headers={'Content-Type':'application/json'}
    if origin:headers['Origin']=origin
    with urllib.request.urlopen(urllib.request.Request(url,data=json.dumps(body).encode() if body else None,headers=headers),timeout=3) as response:return json.load(response)

class Tests(unittest.TestCase):
    def test_validation(self):
        good=result('id');self.assertEqual(ChromeReportBridge.validate(good,'demo_creator')['liveStatus'],'Offline')
        good['profile']['url']='https://www.tiktok.com/@wrong'
        with self.assertRaises(ValueError):ChromeReportBridge.validate(good,'demo_creator')
        good=result('id');good['profile']['image']='data:image/jpeg;base64,abcd'
        with self.assertRaises((ValueError,OSError)):ChromeReportBridge.validate(good,'demo_creator')
        good=result('id');good['nickname']='محمد';self.assertTrue(ChromeReportBridge.validate(good,'demo_creator')['excluded'])
    def test_roundtrip_and_access(self):
        control=reports.Control()
        with tempfile.TemporaryDirectory() as folder,ChromeReportBridge(control) as bridge:
            received=[];thread=threading.Thread(target=lambda:received.append(bridge.capture({'username':'demo_creator'},folder)));thread.start()
            try:
                for _ in range(50):
                    command=send(bridge.url+'state')['command']
                    if command:break
                    time.sleep(.02)
                for url,origin in [(bridge.url.replace(bridge.prefix,'/wrong/')+'state',None),(bridge.url+'state','https://untrusted.example')]:
                    with self.assertRaises(urllib.error.HTTPError) as caught:send(url,origin=origin)
                    self.assertEqual(caught.exception.code,403)
                control.paused.set();self.assertIsNone(send(bridge.url+'state')['command']);control.paused.clear()
                with self.assertRaises(urllib.error.HTTPError) as caught:send(bridge.url+'result',result('old-command'))
                self.assertEqual(caught.exception.code,409)
                send(bridge.url+'result',result(command['id']));thread.join(3)
                self.assertFalse(thread.is_alive());self.assertEqual(received[0]['source'],'normal-chrome')
                self.assertTrue((Path(folder)/received[0]['profileImage']).is_file())
                self.assertNotIn('profileBytes',received[0]);self.assertIsNone(send(bridge.url+'state')['command'])
            finally:control.stop.set();thread.join(3)
    def test_resume_reuses_history_and_retakes_old_capture(self):
        row={'username':'demo_creator','history':{'threeDayTotal':10},'capture':{'profileStatus':'Captured','liveStatus':'Offline'}}
        manifest={'fingerprint':'same','dateWindow':[],'creators':[row]}
        class History:
            def history(self,*args):raise AssertionError('Saved history was requested again')
        class Bridge:
            url='local-test';calls=0
            def __init__(self,*args):pass
            def __enter__(self):return self
            def __exit__(self,*args):pass
            def capture(self,*args):Bridge.calls+=1;return {'source':'normal-chrome','profileStatus':'Captured','liveStatus':'Offline'}
        with tempfile.TemporaryDirectory() as folder,patch('chrome_report_bridge.ChromeReportBridge',Bridge),patch.object(reports,'write_pdf',return_value='fixture.pdf'):
            reports.atomic_json(Path(folder)/'progress.json',{'fingerprint':'same','creators':{'demo_creator':row}})
            for _ in range(2):reports.run_report(manifest,folder,reports.Control(),lambda value:None,lambda value:None,history_client=History(),normal_chrome=lambda url:None)
            self.assertEqual(Bridge.calls,1)

if __name__=='__main__':unittest.main()
