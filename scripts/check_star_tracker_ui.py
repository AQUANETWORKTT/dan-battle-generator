"""Local-only browser fixtures. Does not write real awards."""
import copy
import json
import os
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

base=os.environ.get('STAR_TRACKER_TEST_URL','http://127.0.0.1:3105')
assert urlsplit(base).hostname in {'localhost','127.0.0.1'}
out=Path(__file__).resolve().parents[1]/'tmp/star-tracker-ui'
out.mkdir(parents=True,exist_ok=True)
creators=[{'id':str(10001+i),'username':'alpha' if i==0 else 'zulu' if i==50 else 'creator_'+str(i).zfill(2),'awards':{}} for i in range(51)]
fail=False
conflict=False
patches=[]

def fixture(route):
    global fail,conflict
    if route.request.method=='GET':
        route.fulfill(status=200,content_type='application/json',body=json.dumps({'creators':creators,'latestDate':'2026-11-02'}))
        return
    assert route.request.method=='PATCH'
    b=route.request.post_data_json
    patches.append(b)
    row=next(c for c in creators if c['id']==b['creatorId'])
    if fail:
        route.fulfill(status=503,content_type='application/json',body=json.dumps({'error':'Temporary network failure. Your edit is still here.'}))
        return
    if conflict:
        conflict=False
        award={'creatorId':row['id'],'campaign':b['campaign'],'stars':9,'revision':7,'updatedAt':'2026-11-03T10:00:00Z'}
        row['awards'][b['campaign']]=award
        route.fulfill(status=409,content_type='application/json',body=json.dumps({'error':'This award changed on another device. Review the saved value before trying again.','award':award}))
        return
    assert b['revision']==row['awards'].get(b['campaign'],{}).get('revision',0)
    award={'creatorId':row['id'],'campaign':b['campaign'],'stars':b['stars'],'revision':b['revision']+1,'updatedAt':'2026-11-03T10:00:00Z'}
    row['awards'][b['campaign']]=award
    route.fulfill(status=200,content_type='application/json',body=json.dumps({'award':award}))

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=1)
    assert context.request.get(base+'/api/star-tracker').status==401
    login=context.request.post(base+'/api/login',data={'area':'onboarding','password':'ash1'})
    assert login.ok
    assert any(c['name']=='first-class-star-tracker-auth' and c['httpOnly'] for c in context.cookies())
    assert not any(c['name']=='first-class-space-auth' for c in context.cookies())
    assert context.request.get(base+'/data/menu',max_redirects=0).status in {303,307,308}
    page=context.new_page()
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.on('dialog',lambda dialog:dialog.accept())
    page.goto(base+'/login')
    tile=page.locator('a[href="/star-tracker"]')
    assert tile.count()==1
    tile.scroll_into_view_if_needed()
    page.screenshot(path=str(out/'front-mobile.png'),full_page=True)
    page.route('**/api/star-tracker',fixture)
    tile.click()
    page.get_by_role('region',name='Scrollable campaign awards').wait_for()
    assert page.get_by_role('columnheader').count()==9
    assert page.get_by_role('columnheader').all_text_contents()==['Creator’s username','Starting Stars','Valid Days 1st','Gift Gallery','Crocodile Countdown','The Jungle Marathon','Jungle Giants','Jungle Ambush','Venemous Victory']
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), 'Page overflowed phone width'
    assert page.locator('tbody tr').count()==40
    gift=page.get_by_label('Gift Gallery stars for alpha',exact=True)
    gift.fill('10')
    gift.press('Enter')
    page.wait_for_function("document.querySelector('[data-total=\"10001\"]').textContent==='20'")
    page.get_by_role('button',name='All changes saved',exact=True).wait_for()
    assert creators[0]['awards']['gift-gallery']['stars']==10
    page.reload()
    page.get_by_role('region',name='Scrollable campaign awards').wait_for()
    assert page.get_by_label('Gift Gallery stars for alpha',exact=True).input_value()=='10'
    gift=page.get_by_label('Gift Gallery stars for alpha',exact=True)
    gift.fill('0');gift.press('Enter')
    page.get_by_role('button',name='All changes saved',exact=True).wait_for()
    assert creators[0]['awards']['gift-gallery']['stars']==0
    before=len(patches)
    gift.fill('-1');gift.press('Enter')
    page.get_by_text('Enter a whole number from 0 to 1,000,000.',exact=False).wait_for()
    assert len(patches)==before
    page.get_by_role('button',name='Use saved value (0)',exact=True).click()
    fail=True
    gift.fill('8');gift.press('Enter')
    page.get_by_text('Temporary network failure.',exact=False).wait_for()
    assert page.evaluate("Object.keys(JSON.parse(localStorage.getItem('first-class-star-tracker-drafts-v1'))).length")==1
    page.reload()
    page.get_by_text('Your unfinished edits have been restored.',exact=False).wait_for()
    assert page.get_by_label('Gift Gallery stars for alpha',exact=True).input_value()=='8'
    fail=False
    page.get_by_role('button',name='Save edits (1)',exact=True).click()
    page.get_by_role('button',name='All changes saved',exact=True).wait_for()
    assert creators[0]['awards']['gift-gallery']['stars']==8
    conflict=True
    gift=page.get_by_label('Gift Gallery stars for alpha',exact=True)
    gift.fill('11');gift.press('Enter')
    page.get_by_text('This award changed on another device.',exact=False).wait_for()
    page.get_by_role('button',name='Retry my value',exact=True).click()
    page.get_by_role('button',name='All changes saved',exact=True).wait_for()
    assert patches[-1]['revision']==7 and creators[0]['awards']['gift-gallery']['stars']==11
    region=page.get_by_role('region',name='Scrollable campaign awards')
    region.evaluate('element=>{element.scrollLeft=900;element.scrollTop=250;}')
    first=page.locator('tbody tr').nth(4).locator('th')
    box=first.bounding_box();outer=region.bounding_box()
    assert abs(box['x']-outer['x'])<3, 'Username column did not stay sticky'
    page.screenshot(path=str(out/'tracker-mobile.png'),full_page=True)
    region.evaluate('element=>{element.scrollLeft=0;element.scrollTop=0;}')
    page.get_by_role('searchbox',name='Find a creator').fill('zulu')
    assert page.locator('tbody tr').count()==1
    page.get_by_role('searchbox',name='Find a creator').fill('')
    page.get_by_role('button',name='Leaderboard',exact=True).click()
    assert '@alpha' in page.locator('ol li').first.inner_text()
    page.screenshot(path=str(out/'leaderboard-mobile.png'),full_page=True)
    page.set_viewport_size({'width':1440,'height':1000})
    page.get_by_role('button',name='Campaign tracker',exact=True).click()
    page.screenshot(path=str(out/'tracker-desktop.png'),full_page=True)
    assert not errors,errors
    browser.close()
print('Star Tracker browser checks passed: front tile, signed onboarder access, phone width, nine columns, sticky names, 40-row paging, search across all creators, edit/save/reload, zero, validation, offline draft recovery, conflicts and leaderboard.')
