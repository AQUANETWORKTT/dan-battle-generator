"""Local fixture checks: no TikLeap requests, scans, or database writes."""
import json
import os
import tempfile
from pathlib import Path
from datetime import datetime,timezone,timedelta
from playwright.sync_api import sync_playwright,expect

base=os.environ.get('AVAILABLE_UI_BASE','http://localhost:3172')
stamp=datetime.now(timezone.utc).isoformat()
old=(datetime.now(timezone.utc)-timedelta(hours=25)).isoformat()
rows=[{'username':f'creator{i:03}','name':'Example Creator','league':'A1' if i<10 else 'B2','rank':i+1,'diamonds':100000-i*1000,'region':'GB','invitationType':'Premium' if i%2==0 else 'Regular','checkedAt':old if i==2 else stamp,'snapshotAt':stamp,'nameVerified':True,'live':True if i==0 else None,'profileAt':stamp if i==0 else None} for i in range(30)]
rows[0]['history']={'days':[{'date':f'2026-11-0{i}','diamonds':i*1000} for i in [3,2,1]],'threeDayTotal':6000,'knownDays':3,'fetchedAt':stamp}
rows[0]['avatar']='https://images.example.test/avatar.png'
rows.append({**rows[-1],'username':'australia_example','region':'AU'})
data={'rows':rows,'lastCheck':stamp,'excluded':3,'stale':1,'refreshedAt':stamp,'dateWindow':['2026-11-03','2026-11-02','2026-11-01']}

with sync_playwright() as p:
    browser=p.chromium.launch()
    admin=browser.new_context(permissions=['clipboard-read','clipboard-write'])
    assert admin.request.post(base+'/api/login',data={'password':'Dan44'}).ok
    share=admin.request.post(base+'/api/available-creators',data={'action':'share'}).json()['path']
    assert browser.new_context().request.get(base+'/api/available-creators').status==401
    for width in [1440,390,320]:
        context=browser.new_context(viewport={'width':width,'height':1000},accept_downloads=True)
        calls=[]
        def fixture(route):
            calls.append(route.request.method)
            assert route.request.method=='GET','Read-only manager page tried to write'
            route.fulfill(status=200,content_type='application/json',body=json.dumps(data))
        context.route('**/api/available-creators?*',fixture)
        context.route('**/avatar.png',lambda route:route.fulfill(status=404))
        page=context.new_page();page.goto(base+share)
        expect(page.get_by_role('heading',name='Available Creators',exact=True)).to_be_visible()
        cards=page.get_by_role('region',name='Available creator cards')
        expect(cards.locator('article')).to_have_count(24)
        assert page.get_by_role('button',name='Copy manager link').count()==0
        assert page.get_by_role('link',name='Run Backstage checks').count()==0
        page.get_by_role('button',name='Details',exact=True).first.click()
        expect(page.get_by_text('Daily diamonds · 3/3 days returned')).to_be_visible()
        page.get_by_label('Availability',exact=True).select_option('Premium')
        expect(cards.locator('article')).to_have_count(15)
        page.get_by_label('Checked within 12 hours').check()
        expect(cards.locator('article')).to_have_count(14)
        page.get_by_label('Find a creator').fill('creator000')
        expect(cards.locator('article')).to_have_count(1)
        expect(cards.get_by_role('link',name='View profile')).to_have_attribute('href','https://www.tiktok.com/@creator000')
        with page.expect_download() as event:page.get_by_role('button',name='Download TXT').click()
        with tempfile.TemporaryDirectory() as directory:
            output=Path(directory)/'names.txt';event.value.save_as(output);assert output.read_text()=='creator000'
        assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth'),f'Overflow at {width}'
        output=Path('tmp/available-creators-ui');output.mkdir(parents=True,exist_ok=True)
        page.screenshot(path=str(output/f'directory-{width}.png'),full_page=True)
        page.get_by_label('Find a creator').fill('')
        page.get_by_label('Availability',exact=True).select_option('All')
        page.get_by_label('Checked within 12 hours').uncheck()
        page.get_by_label('Country',exact=True).select_option('AU')
        expect(cards.locator('article')).to_have_count(1)
        expect(page.get_by_role('link',name='@australia_example',exact=True)).to_be_visible()
        assert calls and set(calls)=={'GET'}
        context.close()
    admin.add_init_script("sessionStorage.setItem('first-class-data-access','D')")
    admin.route('**/api/available-creators',lambda route:route.fulfill(status=200,content_type='application/json',body=json.dumps(data)))
    page=admin.new_page();page.goto(base+'/data/available-creators')
    expect(page.get_by_role('button',name='Copy manager link')).to_be_visible()
    expect(page.get_by_role('button',name='Update photos & performance · 30')).to_be_visible()
    page.goto(base+'/data/menu')
    expect(page.get_by_role('link').filter(has=page.get_by_role('heading',name='Available Creators',exact=True))).to_have_count(1)
    browser.close()
print('PASS: manager link without login, no paid/write actions while browsing, desktop/mobile/320px fit, paging, country/type/freshness filters, profile links, daily diamonds, TXT export and integrated leadership menu.')
