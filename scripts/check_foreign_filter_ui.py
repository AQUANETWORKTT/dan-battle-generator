"""Fixture-only verification of visible exclusions and safe Available exports."""
import json
import tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
base='http://localhost:3170'
stamp='2026-11-04T12:00:00Z'
native={'username':'excluded_example','name':'محمد ⭐','excludedForName':True,'league':'A1','rank':1,'diamonds':5000}
allowed={'username':'allowed_example','name':'Sam .𖥔 ݁ ཐི༏ཋྀ .𖥔 ݁','league':'A1','rank':2,'diamonds':1000}
run={'id':'fixture','created_at':stamp,'updated_at':stamp,'status':'complete','payload':{'region':'GB','status':'complete','leagues':[{'code':'A1','status':'complete'},{'code':'A2','status':'complete'}],'results':{'A1':[native,allowed],'A2':[{**native,'name':'older duplicate','excludedForName':False,'league':'A2'}]}},'eligibility':{row['username']:{'username':row['username'],'name':row['name'],'status':'Available','invitationType':'Regular','checkedAt':stamp,'reason':'Available','excludedForName':row.get('excludedForName',False)} for row in [native,allowed]}}
def fixture(route):
    path=route.request.url.split('/api/creator-api-search/')[-1]
    if path=='config':data={'apiConfigured':True,'databaseConfigured':True,'workerConfigured':True,'workerOnline':False}
    elif path.startswith('runs?'):data={'runs':[run]}
    elif path=='runs/fixture':data={'run':run}
    elif path=='contacts':data={'rows':[],'syncedAt':None,'nextCursor':None}
    elif path.startswith('changes?'):data={'changes':[],'diamondTotals':{},'confirmedChecks':0,'scans':0}
    else:raise AssertionError('Unexpected operation: '+path)
    route.fulfill(status=200,content_type='application/json',body=json.dumps(data))
with sync_playwright() as p:
    browser=p.chromium.launch();context=browser.new_context(accept_downloads=True)
    assert context.request.post(base+'/api/login',data={'password':'Dan44','role':'leadership'}).ok
    context.add_init_script("sessionStorage.setItem('first-class-data-access','D')")
    context.route('**/api/creator-api-search/**',fixture)
    page=context.new_page();page.goto(base+'/data/creator-api-search/rankings')
    expect(page.get_by_role('button',name='Foreign: 1',exact=True)).to_be_visible()
    expect(page.get_by_role('button',name='Available: 1',exact=True)).to_be_visible()
    expect(page.get_by_role('checkbox',name='Select excluded_example',exact=True)).to_be_disabled()
    page.get_by_role('button',name='Foreign: 1',exact=True).click()
    expect(page.get_by_role('combobox',name='Eligibility result filter')).to_have_value('Foreign')
    expect(page.get_by_text('محمد ⭐',exact=True)).to_be_visible()
    expect(page.get_by_role('link',name='@allowed_example',exact=True)).to_have_count(0)
    expect(page.get_by_role('button',name='Check Backstage Availability',exact=True)).to_be_disabled()
    expect(page.get_by_text('Backstage: Available',exact=False)).to_be_visible()
    with page.expect_download() as event:page.get_by_text('All Available (Regular)',exact=True).locator('..').get_by_role('button',name='TXT',exact=True).click()
    with tempfile.TemporaryDirectory() as temp:
        output=Path(temp)/'available.txt';event.value.save_as(output);assert output.read_text(encoding='utf-8-sig').splitlines()==['allowed_example']
    page.get_by_role('button',name='Available: 1',exact=True).click()
    expect(page.get_by_role('link',name='@allowed_example',exact=True)).to_be_visible()
    expect(page.get_by_role('link',name='@excluded_example',exact=True)).to_have_count(0)
    browser.close()
print('PASS: Foreign count is unique across leagues, visible nickname/reason, underlying Backstage result, disabled checking/selection, allowed ornaments, and clean Regular TXT exports.')
