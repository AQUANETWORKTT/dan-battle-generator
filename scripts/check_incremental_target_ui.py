"""Local browser fixture: no real agency target or daily history is changed."""
import json
from playwright.sync_api import sync_playwright,expect
saved={'target':56706633}
def fixture(route):
    if route.request.method=='PATCH':
        saved['target']=route.request.post_data_json['agencyTarget']
        payload={'agencyTarget':saved['target']}
    else:
        payload={'agencyTarget':saved['target'],'entries':[{'day':30,'diamonds':50000000,'prediction':14,'targetLabel':'14% TARGET','savedAt':'2026-11-01'}]}
    route.fulfill(status=200,content_type='application/json',body=json.dumps(payload))
with sync_playwright() as p:
    browser=p.chromium.launch()
    context=browser.new_context(viewport={'width':390,'height':900})
    assert context.request.post('http://localhost:3112/api/login',data={'password':'Dan44','role':'leadership'}).ok
    context.add_init_script("sessionStorage.setItem('first-class-data-access','D')")
    context.route('**/api/data/incremental-tracking*',fixture)
    page=context.new_page();page.goto('http://localhost:3112/data/incremental-data-tracking')
    field=page.get_by_role('textbox',name='Input agency target',exact=True)
    expect(field).to_have_value('56,706,633')
    field.fill('50m');page.get_by_role('button',name='SET AGENCY TARGET',exact=True).click()
    expect(field).to_have_value('50,000,000')
    page.get_by_text('VIEW ALL 13 TARGET THRESHOLDS',exact=True).click()
    expect(page.get_by_role('row')).to_have_count(14)
    expect(page.get_by_role('row').filter(has=page.get_by_role('rowheader',name='9%',exact=True))).to_contain_text('50,000,000')
    expect(page.locator('svg title')).to_have_text('DAY 30: 50,000,000 · 9.00%')
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.reload();expect(field).to_have_value('50,000,000')
    field.fill('oops');page.get_by_role('button',name='SET AGENCY TARGET',exact=True).click()
    expect(page.get_by_role('status')).to_contain_text('ENTER A POSITIVE DIAMOND TARGET')
    assert saved['target']==50000000
    browser.close()
print('PASS: mobile target input, save/reload, all thresholds, recomputed saved chart, validation and no page overflow. Fixture storage only.')

