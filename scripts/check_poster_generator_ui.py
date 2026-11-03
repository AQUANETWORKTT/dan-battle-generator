"""Local-only FC1 access and poster download checks. No production writes."""
import json
import os
from pathlib import Path
from urllib.parse import urlsplit
from zipfile import ZipFile
from playwright.sync_api import sync_playwright

base=os.environ.get('POSTER_TEST_URL','http://127.0.0.1:3103')
assert urlsplit(base).hostname in {'localhost','127.0.0.1'}
output=Path(__file__).resolve().parents[1]/'tmp/poster-generator-ui'
output.mkdir(parents=True,exist_ok=True)
template={'id':'saved-poster-fixture','name':'Local saved design','template_json':{'backgroundUrl':'/posters/dan-battle/background.png'}}
seen=[]
manager_empty=False
svg='<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#218fd3"/></svg>'

def fixture(route):
    path=urlsplit(route.request.url).path
    seen.append(path)
    assert path.startswith('/api/poster-generator/'), 'Unexpected request: '+path
    if path.endswith('/templates'):
        assert route.request.method=='GET'
        data={'templates':[] if manager_empty else [template,{**template,'id':'second','name':'Second saved design'}],'defaults':{}}
    elif path.endswith('/fallback-avatars'): data={'avatars':[]}
    elif path.endswith('/avatar'):
        assert route.request.method=='POST'
        data={'avatar':'https://p16.tiktokcdn.com/test.jpeg'}
    elif path.endswith('/avatar-image'):
        route.fulfill(status=200,content_type='image/svg+xml',body=svg)
        return
    else: raise AssertionError(path)
    route.fulfill(status=200,content_type='application/json',body=json.dumps(data))

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    context=browser.new_context(viewport={'width':1500,'height':1000},accept_downloads=True)
    page=context.new_page()
    page.goto(base+'/poster-generator')
    assert urlsplit(page.url).path=='/login/poster-generator'
    page.goto(base+'/login')
    assert page.get_by_role('link',name='POSTER GENERATOR',exact=False).count()==1
    assert page.get_by_text('CREATOR MANAGERS',exact=True).count()==0
    page.get_by_role('link',name='POSTER GENERATOR',exact=False).click()
    page.get_by_label('Password',exact=True).fill('fc1')
    page.get_by_role('button',name='Open Poster Generator').click()
    page.locator('p[role="alert"]').wait_for()
    assert page.locator('p[role="alert"]').inner_text()=='Incorrect password.',page.locator('p[role="alert"]').inner_text()
    page.get_by_label('Password',exact=True).fill('FC1')
    page.get_by_role('button',name='Open Poster Generator').click()
    page.wait_for_url(base+'/poster-generator')
    cookies=context.cookies()
    assert any(c['name']=='first-class-poster-generator-auth' and c['httpOnly'] for c in cookies)
    assert not any(c['name']=='first-class-space-auth' for c in cookies)
    assert context.request.post(base+'/api/poster-generator/templates',data={}).status==403
    assert context.request.post(base+'/api/poster-templates',data={},max_redirects=0).status in {303,307,308}
    assert context.request.get(base+'/data/menu',max_redirects=0).status in {303,307,308}
    # Check the real saved design endpoint before using deterministic photo fixtures.
    live=context.request.get(base+'/api/poster-generator/templates')
    assert live.ok, 'Saved designs could not load: '+str(live.status)
    assert isinstance(live.json().get('templates'),list)
    print('Real saved-design endpoint responded successfully.')
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.route('**/api/**',fixture)
    page.goto(base+'/poster-generator?workspace=posters&mode=manager')
    page.get_by_role('heading',name='Single Poster',exact=True).wait_for()
    assert page.get_by_role('button',name='Mass Poster Generator',exact=True).count()==0
    assert page.get_by_role('button',name='Poster Template',exact=True).count()==0
    assert page.get_by_role('button',name='Set Single Default',exact=True).count()==0
    page.locator('select').filter(has=page.locator('option[value="second"]')).first.select_option('second')
    page.get_by_role('button',name='2v2 Poster',exact=True).click()
    page.get_by_role('heading',name='2v2 Poster',exact=True).wait_for()
    assert page.get_by_role('button',name='Move 2v2 Sections',exact=True).count()==0
    page.get_by_role('button',name='H2H Posters',exact=True).click()
    page.get_by_role('heading',name='Head-to-head posters',exact=True).wait_for()
    page.get_by_label('H2H matchups',exact=True).fill('20:07\tpenii1722\tdad.of.286')
    page.get_by_label('H2H event month').select_option('11')
    page.get_by_label('H2H event day').select_option('2')
    page.get_by_role('button',name='Preview all 2 posters',exact=True).click()
    page.wait_for_function("Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='Download all 2 posters'&&!b.disabled)")
    assert page.locator('[data-h2h-preview]').count()==2
    page.screenshot(path=str(output/'h2h.png'),full_page=True)
    with page.expect_download(timeout=120000) as download:
        page.get_by_role('button',name='Download all 2 posters',exact=True).click()
    download.value.save_as(output/'posters.zip')
    with ZipFile(output/'posters.zip') as archive:
        assert len([name for name in archive.namelist() if name.endswith('.png')])==2
    assert not errors,errors
    assert '/api/poster-generator/avatar' in seen
    assert '/api/poster-generator/avatar-image' in seen
    manager_empty=True
    page.reload()
    page.get_by_text('No poster templates have been enabled for managers yet.',exact=False).wait_for()
    assert page.get_by_role('button',name='Single Poster',exact=True).count()==0
    # The original leadership entry still has its template authoring controls.
    leader=browser.new_context()
    leader.add_cookies([{'name':'first-class-space-auth','value':'true','url':base}])
    old=leader.new_page()
    manager_ids=[]
    def admin_fixture(route):
        if route.request.method=='PATCH':
            assert urlsplit(route.request.url).path=='/api/poster-templates'
            manager_ids[:]=route.request.post_data_json['allowedIds']
            value={'managerTemplateIds':manager_ids}
        else:value={'templates':[template],'defaults':{},'avatars':[],'groups':[],'managers':[],'managerTemplateIds':manager_ids}
        route.fulfill(status=200,content_type='application/json',body=json.dumps(value))
    old.route('**/api/**',admin_fixture)
    old.goto(base+'/generator')
    old.get_by_role('button',name='Poster Template',exact=True).wait_for()
    assert old.get_by_role('button',name='Mass Poster Generator',exact=True).count()==1
    old.get_by_role('button',name='Poster Template',exact=True).click()
    old.get_by_role('heading',name='Poster Template',exact=True).wait_for()
    checkbox=old.get_by_label('Allow managers to use Local saved design',exact=True)
    assert not checkbox.is_checked()
    checkbox.check()
    old.get_by_role('button',name='Save Manager Template Access',exact=True).click()
    old.get_by_text('Manager access saved.',exact=False).wait_for()
    assert manager_ids==['saved-poster-fixture']
    old.reload()
    assert old.get_by_label('Allow managers to use Local saved design',exact=True).is_checked()
    old.get_by_label('Allow managers to use Local saved design',exact=True).uncheck()
    old.get_by_role('button',name='Save Manager Template Access',exact=True).click()
    old.get_by_text('Manager access saved.',exact=False).wait_for()
    assert manager_ids==[]
    browser.close()
print('FC1 browser checks passed: isolated login, Single/2v2/H2H only, saved designs, mirrored photo PNG downloads, restricted writes and unchanged leadership editor.')
