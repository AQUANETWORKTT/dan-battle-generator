"""Local browser fixtures only. Never starts a real report or a paid history lookup."""
import json
import os
import tempfile
from playwright.sync_api import sync_playwright,expect
base='http://localhost:3165'
calls=[]
def fixture(route):
    path=route.request.url.split('/api/creator-api-search/')[-1]
    if path.startswith('runs?'):
        payload={'runs':[{'id':'12345678-1234-1234-1234-123456789012','created_at':'2026-11-04T12:00:00Z','status':'complete'}]}
    elif path=='reports/manifest':
        body=route.request.post_data_json;calls.append(body)
        assert body['kind']=='premium' and body['usernames']==['demo_creator']
        payload={'schema':'firstclass-creator-report-v1','id':'12345678-1234-1234-1234-123456789012','dateWindow':['2026-11-03','2026-11-02','2026-11-01'],'creators':[{'username':'demo_creator'}]}
    else:raise AssertionError('Unexpected report request: '+path)
    route.fulfill(status=200,content_type='application/json',body=json.dumps(payload))
with sync_playwright() as p:
    browser=p.chromium.launch()
    for width in [1440,390]:
        context=browser.new_context(viewport={'width':width,'height':1000},accept_downloads=True)
        assert context.request.post(base+'/api/login',data={'password':'Dan44','role':'leadership'}).ok
        context.add_init_script("sessionStorage.setItem('first-class-data-access','D')")
        context.route('**/api/creator-api-search/**',fixture)
        page=context.new_page();page.goto(base+'/data/creator-api-search/reports?region=AU')
        expect(page.get_by_role('combobox',name='Report region')).to_have_value('AU')
        expect(page.get_by_role('link',name='Profile + LIVE Reports',exact=True)).to_have_attribute('aria-current','page')
        page.get_by_role('combobox',name='Report availability type').select_option('premium')
        page.get_by_role('textbox',name='Report usernames').fill('@demo_creator')
        with page.expect_download() as event:page.get_by_role('button',name='Download report file',exact=True).click()
        download=event.value
        with tempfile.TemporaryDirectory() as temp:
            path=os.path.join(temp,'report.json');download.save_as(path)
            with open(path,encoding='utf-8') as source:assert json.load(source)['schema']=='firstclass-creator-report-v1'
        expect(page.get_by_role('status')).to_contain_text('Report file ready: 1 creators')
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        context.close()
    browser.close()
print('PASS: integrated report tab, AU context, Premium selection, pasted shortlist, report-file download, and phone/desktop layout. No actual report capture or paid lookup started.')
