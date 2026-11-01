"""Local browser check with fixture avatars/templates; no production writes.

Run a local build/server first, then set TEST_PORTAL_PASSWORD and optionally
H2H_TEST_URL. Downloads and screenshots are written under tmp/h2h-ui.
"""
import csv
import io
import json
import os
from pathlib import Path
from urllib.parse import parse_qs, urlsplit
from zipfile import ZipFile
from playwright.sync_api import sync_playwright

base = os.environ.get('H2H_TEST_URL', 'http://127.0.0.1:3100')
if urlsplit(base).hostname not in {'localhost','127.0.0.1'}:
    raise SystemExit('This check only runs against localhost.')
password = os.environ.get('TEST_PORTAL_PASSWORD')
if not password:
    raise SystemExit('Set TEST_PORTAL_PASSWORD for your local portal login.')
output = Path(__file__).resolve().parents[1] / 'tmp/h2h-ui'
output.mkdir(parents=True, exist_ok=True)
template = {'id':'local-h2h-fixture','name':'Local H2H fixture','background_url':'/posters/dan-battle/background.png','template_json':{'backgroundUrl':'/posters/dan-battle/background.png'}}
lookups = []

def image(name):
    color = '#d53030' if name == 'penii1722' else '#218fd3'
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="{color}"/><text x="200" y="210" text-anchor="middle" fill="white" font-size="25">{name}</text></svg>'

def fixture(route):
    path = urlsplit(route.request.url).path
    if path == '/api/poster-templates':
        value = {'templates':[template],'defaults':{}}
    elif path == '/api/tiktok-avatar':
        name = route.request.post_data_json['username']
        lookups.append(name)
        if name == 'no_photo':
            route.fulfill(status=404,content_type='application/json',body='{"error":"Fixture picture unavailable"}')
            return
        value = {'avatar':'/h2h-test-avatar.svg?name='+name}
    elif path == '/api/team-poster-templates': value = {'templates':[]}
    elif path == '/api/data-analysis/fallback-avatars': value = {'avatars':[]}
    else: value = {'groups':[],'managers':[],'data':[],'settings':{}}
    route.fulfill(status=200,content_type='application/json',body=json.dumps(value))

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width':1500,'height':1000},accept_downloads=True)
    assert context.request.post(base+'/api/login',data={'password':password}).ok
    page = context.new_page()
    page.route('**/api/**',fixture)
    page.route('**/h2h-test-avatar.svg?*', lambda route:route.fulfill(status=200,content_type='image/svg+xml',body=image(parse_qs(urlsplit(route.request.url).query)['name'][0])))
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto(base+'/generator?mode=h2h',wait_until='domcontentloaded')
    page.get_by_role('heading',name='Head-to-head posters',exact=True).wait_for()
    page.get_by_role('button',name='Load your 16 matchups',exact=False).click()
    assert page.get_by_role('button',name='Download all 32 posters').is_disabled()
    assert page.get_by_label('Time for penii1722 vs dad.of.286').input_value() == '20:05'
    page.get_by_label('H2H interval minutes').fill('7')
    assert page.get_by_label('Time for penii1722 vs dad.of.286').input_value() == '20:05'
    page.get_by_label('H2H event month').select_option('1')
    page.get_by_label('H2H event day').select_option('31')
    page.get_by_label('H2H event month').select_option('2')
    assert page.get_by_label('H2H event day').input_value() == '28'
    page.get_by_label('H2H event month').select_option('11')
    page.get_by_label('H2H event day').select_option('2')
    page.get_by_role('button',name='Preview all 32 posters',exact=True).click()
    page.wait_for_function("document.querySelectorAll('[data-h2h-preview]').length === 32")
    page.wait_for_function("Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='Download all 32 posters'&&!b.disabled)")
    assert len(lookups) == 32
    assert len(set(lookups)) == 32
    assert page.get_by_text('DENS2511',exact=True).count() >= 2
    page.get_by_label('H2H matchups',exact=True).fill('20:07\tpenii1722\tdad.of.286')
    page.get_by_role('button',name='Preview all 2 posters',exact=True).click()
    page.get_by_role('button',name='Download all 2 posters',exact=True).wait_for()
    page.wait_for_function("Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='Download all 2 posters'&&!b.disabled)")
    assert len(lookups) == 32  # changing the preview reuses already loaded pictures
    assert page.get_by_role('heading',name='PENII1722 vs DAD.OF.286 · MONDAY 2ND NOVEMBER┃8:07PM',exact=True).count() == 1
    page.screenshot(path=str(output/'preview.png'),full_page=True)
    with page.expect_download(timeout=120000) as download:
        page.get_by_role('button',name='Download all 2 posters',exact=True).click()
    download.value.save_as(output/'posters.zip')
    with ZipFile(output/'posters.zip') as archive:
        names=archive.namelist()
        pngs=[name for name in names if name.endswith('.png')]
        assert len(pngs)==2
        manifest=list(csv.DictReader(io.StringIO(archive.read('matchups.csv').decode())))
        assert [(r['Creator 1'],r['Creator 2'],r['Time']) for r in manifest] == [('PENII1722','DAD.OF.286','8:07PM'),('DAD.OF.286','PENII1722','8:07PM')]
        for index,name in enumerate(pngs):
            (output/f'orientation-{index+1}.png').write_bytes(archive.read(name))
    page.get_by_label('H2H matchups',exact=True).fill('20:09\tno_photo\tdad.of.286')
    page.get_by_role('button',name='Preview all 2 posters',exact=True).click()
    page.get_by_role('button',name='Preview all 2 posters',exact=True).wait_for(state='visible')
    page.wait_for_function("Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='Preview all 2 posters'&&!b.disabled)")
    assert page.get_by_role('button',name='Download all 2 posters',exact=True).is_disabled()
    page.locator('[data-h2h-photo="no_photo"]').evaluate('''element => {
      const transfer = new DataTransfer();
      transfer.items.add(new File(['<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#99dd11"/></svg>'],'replacement.svg',{type:'image/svg+xml'}));
      element.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer}));
    }''')
    page.wait_for_function("Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='Download all 2 posters'&&!b.disabled)")
    sources = page.locator('[data-h2h-preview] img').evaluate_all('images => images.map(image=>image.src)')
    import base64
    assert sum('#99dd11' in base64.b64decode(src.split(',')[1]).decode() for src in sources if src.startswith('data:')) == 2
    page.get_by_label('H2H matchups',exact=True).fill('20:07\tpenii1722\tdad.of.286\n20:07\tdad.of.286\tpenii1722')
    page.get_by_role('alert').get_by_text('duplicate matchup',exact=False).wait_for()
    assert page.get_by_role('button',name='Download all 4 posters').is_disabled()
    # The existing single and 2v2 modes still open after using H2H.
    page.get_by_role('button',name='Single Poster',exact=True).click()
    page.get_by_role('heading',name='Single Poster',exact=True).wait_for()
    page.get_by_role('button',name='2v2 Poster',exact=True).click()
    page.get_by_role('heading',name='2v2 Poster',exact=True).wait_for()
    assert not errors, errors
    browser.close()
print('H2H browser check passed: day/month dropdowns, 32 automatic full previews, uppercase text, exact 8:07PM, mirrored PNG ZIP, missing-photo drag/drop on both sides, duplicates, Single and 2v2 modes.')
