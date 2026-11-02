"""Local Atlas UI fixture check. Never reads/writes production data."""
import base64
import io
import json
import os
from pathlib import Path
from urllib.parse import urlsplit
from zipfile import ZipFile
from playwright.sync_api import sync_playwright

base=os.environ.get('ATLAS_TEST_URL','http://127.0.0.1:3100')
if urlsplit(base).hostname not in {'127.0.0.1','localhost'}: raise SystemExit('Localhost only.')
password=os.environ.get('ATLAS_TEST_PASSWORD')
if not password: raise SystemExit('Set ATLAS_TEST_PASSWORD.')
output=Path(__file__).resolve().parents[1]/'tmp/atlas-posters-ui'
output.mkdir(parents=True,exist_ok=True)
svg='<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" fill="#158cd4"/></svg>'
background='data:image/svg+xml;base64,'+base64.b64encode(svg.encode()).decode()
def template(name,manager):
    return {'name':name,'template_json':{'backgroundUrl':background,'managerKey':manager,'elements':[
        {'id':'title','kind':'text','x':30,'y':30,'width':900,'height':90,'value':'ATLAS TEAM','fontSize':70},
        {'id':'username-1','kind':'username','x':30,'y':200,'width':900,'height':90,'value':''},
        {'id':'diamonds-1','kind':'diamonds','x':30,'y':300,'width':900,'height':90,'value':''},
        {'id':'avatar-1','kind':'avatar','x':100,'y':400,'width':250,'height':250,'value':''},
        {'id':'username-hours-1','kind':'username','x':30,'y':800,'width':900,'height':90,'value':''},
        {'id':'hours-1','kind':'hours','x':30,'y':900,'width':900,'height':90,'value':''}]}}
assignments={'managerGroups':{'manageroneatlastest':'Atlas','managertwoatlastest':'New Managers'},'managerNames':{},'deletedManagers':[]}
managers=[{'key':'manageroneatlastest','email':'manager.one@atlas.test','name':'Manager One','group':'Atlas'},{'key':'managertwoatlastest','email':'manager.two@atlas.test','name':'Manager Two','group':'New Managers'}]
saved=[]
def route_fixture(route):
    path=urlsplit(route.request.url).path
    if path.endswith('/team-poster-templates'): value={'templates':[template('atlas-team-poster','atlas-all'),template('team-poster-manager-one','manager.one@atlas.test')]}
    elif path.endswith('/data-analysis/manager-assignments'):
        if route.request.method=='PUT': saved.append(route.request.post_data_json);value={'success':True,'assignments':saved[-1]['assignments']}
        else: value={'assignments':assignments,'managers':managers,'groups':['New Managers','Atlas','Excluded']}
    elif path.endswith('/data-analysis/daily-stats'):
        value={'rows':[{'creator_username':'one_creator','creator_id':'1','manager_email':'manager.one@atlas.test','stat_date':'2026-11-01','diamonds':12500,'live_hours':2},{'creator_username':'two_creator','creator_id':'2','manager_email':'manager.two@atlas.test','stat_date':'2026-11-01','diamonds':25000,'live_hours':8.5}]}
    elif path.endswith('/tiktok-avatar'): value={'avatar':'https://fixture.invalid/avatar.svg'}
    elif path.endswith('/tiktok-avatar-image'):route.fulfill(status=200,content_type='image/svg+xml',body=svg);return
    else: value={}
    route.fulfill(status=200,content_type='application/json',body=json.dumps(value))

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    context=browser.new_context(viewport={'width':1500,'height':1000},accept_downloads=True)
    assert context.request.post(base+'/api/atlas/login',data={'password':password}).ok
    page=context.new_page();page.route('**/api/atlas/**',route_fixture)
    requests=[];page.on('request',lambda r:requests.append(r.url))
    page.goto(base+'/atlas/data/team-posters',wait_until='domcontentloaded')
    page.get_by_role('button',name='Preview manager one',exact=True).wait_for()
    page.get_by_label('Atlas poster data date').fill('2026-11-01')
    assert page.get_by_text('manager.one@atlas.test',exact=True).count()>=1
    # Individual download must work without building a preview first.
    with page.expect_download(timeout=60000) as download:
        page.get_by_role('button',name='Download manager one ↓',exact=True).click()
    download.value.save_as(output/'manager-one.png')
    assert page.locator('[data-poster-element="username-1"]').inner_text()=='ONE_CREATOR'
    assert page.locator('[data-poster-element="diamonds-1"]').inner_text()=='12.5K'
    assert page.locator('[data-poster-element="hours-1"]').inner_text()=='2H'
    page.screenshot(path=str(output/'desktop.png'),full_page=True)
    with page.expect_download(timeout=60000) as download:
        page.get_by_role('button',name='Download All Atlas ↓',exact=True).first.click()
    download.value.save_as(output/'atlas.zip')
    with ZipFile(output/'atlas.zip') as archive:
        assert len([name for name in archive.namelist() if name.endswith('.png')])==2
    page.set_viewport_size({'width':390,'height':844})
    page.screenshot(path=str(output/'mobile.png'),full_page=True)
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.goto(base+'/atlas/data/manager-assignments',wait_until='domcontentloaded')
    page.get_by_text('manager.one@atlas.test',exact=True).wait_for()
    assert page.get_by_text('manager.one@atlas.test',exact=True).get_attribute('title')=='manager.one@atlas.test'
    page.get_by_label('Move Manager One').select_option('New Managers')
    page.get_by_role('status').get_by_text('Assignments saved.',exact=True).wait_for()
    assert saved[-1]['assignments']['managerGroups']['manageroneatlastest']=='New Managers'
    page.screenshot(path=str(output/'managers-mobile.png'),full_page=True)
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    assert not any('/api/' in url and '/api/atlas/' not in url for url in requests)
    browser.close()
print('Atlas browser checks passed: preset cards, full manager emails, direct individual PNG, all-Atlas ZIP, correct manager data, mobile layout, saved Move and Atlas-only requests.')
