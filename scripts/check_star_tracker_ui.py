"""Local-only browser fixtures. Does not write real awards."""
import copy
import json
import os
from pathlib import Path
from urllib.parse import urlsplit,parse_qs
from playwright.sync_api import sync_playwright

base=os.environ.get('STAR_TRACKER_TEST_URL','http://127.0.0.1:3105')
assert urlsplit(base).hostname in {'localhost','127.0.0.1'}
out=Path(__file__).resolve().parents[1]/'tmp/star-tracker-ui'
out.mkdir(parents=True,exist_ok=True)
creators=[{'id':str(10001+i),'username':'alpha' if i==0 else 'zulu' if i==50 else 'creator_'+str(i).zfill(2),'awards':{}} for i in range(51)]
fail=False
conflict=False
patches=[]
bulk_operations={}
bulk_fail_once=False

def fixture(route):
    global fail,conflict,bulk_fail_once
    if parse_qs(urlsplit(route.request.url).query).get('backup')==['1']:
        route.fulfill(status=200,content_type='application/json',headers={'Content-Disposition':'attachment; filename="star-tracker-backup.json"'},body=json.dumps({'format':'first-class-star-tracker-backup-v1','creators':creators}))
        return
    if route.request.method=='GET':
        route.fulfill(status=200,content_type='application/json',body=json.dumps({'creators':creators,'latestDate':'2026-11-02'}))
        return
    if route.request.method=='POST':
        b=route.request.post_data_json
        if b['operationId'] not in bulk_operations:
            awards=[]
            missing=[]
            for name in set(n.lower().lstrip('@') for n in b['usernames']):
                c=next((c for c in creators if c['username'].lower()==name),None)
                if c is None:
                    missing.append(name)
                    continue
                prior=c['awards'].get(b['campaign'],{})
                award={'creatorId':c['id'],'campaign':b['campaign'],'stars':max(0,prior.get('stars',0)+b['delta']),'revision':prior.get('revision',0)+1,'updatedAt':'2026-11-03T10:00:00Z'}
                c['awards'][b['campaign']]=award
                awards.append(award)
            bulk_operations[b['operationId']]={'operationId':b['operationId'],'done':True,'total':len(awards),'completed':len(awards),'awards':awards,'errors':[],'missingUsernames':missing}
        if bulk_fail_once:
            bulk_fail_once=False
            route.fulfill(status=503,content_type='application/json',body=json.dumps({'error':'Test interrupted response. Resume safely.'}))
        else:route.fulfill(status=200,content_type='application/json',body=json.dumps(bulk_operations[b['operationId']]))
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
    assert context.request.get(base+'/api/star-tracker').ok
    assert not context.cookies(), 'Fresh visitor should need no login or cached session'
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
    page.route('**/api/star-tracker*',fixture)
    tile.click()
    page.get_by_role('region',name='Scrollable campaign awards').wait_for()
    assert page.get_by_role('columnheader').count()==25
    headings=page.get_by_role('columnheader').all_text_contents()
    assert headings[:9]==['Creator’s username','Starting Stars','Valid Days 1st','Gift Gallery','Crocodile Countdown','The Jungle Marathon','Jungle Giants','The Jungle Ambush','Venomous Victory']
    assert headings.count('Jungle Treasure Gift')==1
    assert headings[-2:]==['Jungle Costume Challenge','Manual Star Adjustments']
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
    gift.fill('');gift.press('Enter')
    page.get_by_role('button',name='All changes saved',exact=True).wait_for()
    assert page.get_by_label('Gift Gallery stars for alpha',exact=True).input_value()=='0'
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
    assert page.get_by_text('STARS COLLECTED',exact=True).count()==0
    assert page.locator('tbody th').get_by_text('Total Stars',exact=True).count()==0
    page.get_by_role('heading',name='Get Me OUTTA Here!',exact=False).wait_for()
    page.get_by_role('button',name='Bulk stars',exact=False).click()
    names=page.get_by_label('Bulk creator usernames',exact=True)
    names.fill('@alpha\ncreator_01\n@alpha\nnot_a_creator')
    assert page.get_by_role('button',name='Submit bulk stars',exact=True).is_enabled()
    page.get_by_text('These creators are missing:',exact=False).wait_for()
    page.get_by_label('Bulk stars per creator',exact=True).fill('5')
    bulk_fail_once=True
    page.get_by_role('button',name='Submit bulk stars',exact=True).click()
    page.get_by_text('Test interrupted response.',exact=False).wait_for()
    page.reload()
    page.get_by_role('button',name='Resume bulk edit',exact=True).wait_for()
    page.get_by_role('button',name='Resume bulk edit',exact=True).click()
    page.get_by_role('button',name='Bulk edit saved',exact=True).wait_for()
    assert creators[0]['awards']['gift-gallery']['stars']==16
    assert creators[1]['awards']['gift-gallery']['stars']==5
    page.get_by_text('1 missing and skipped.',exact=False).wait_for()
    assert len(bulk_operations)==1
    page.get_by_role('button',name='New bulk edit',exact=True).click()
    page.get_by_label('Bulk creator usernames',exact=True).fill('alpha\ncreator_01')
    page.get_by_label('Bulk star action',exact=True).select_option('remove')
    page.get_by_label('Bulk stars per creator',exact=True).fill('20')
    page.get_by_role('button',name='Submit bulk stars',exact=True).click()
    page.get_by_role('button',name='Bulk edit saved',exact=True).wait_for()
    assert creators[0]['awards']['gift-gallery']['stars']==0
    assert creators[1]['awards']['gift-gallery']['stars']==0
    with page.expect_download() as download:
        page.get_by_role('link',name='Download backup',exact=True).click()
    download.value.save_as(out/'backup.json')
    assert json.loads((out/'backup.json').read_text())['format']=='first-class-star-tracker-backup-v1'
    creators[0]['username']='alpha_new'
    page.get_by_role('button',name='Refresh creators',exact=False).click()
    renamed=page.get_by_label('Gift Gallery stars for alpha_new',exact=True)
    renamed.wait_for()
    assert renamed.input_value()=='0'
    renamed.fill('3');renamed.press('Enter')
    page.get_by_role('button',name='All changes saved',exact=True).wait_for()
    assert creators[0]['id']=='10001' and creators[0]['awards']['gift-gallery']['stars']==3
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
    assert region.evaluate('element=>element.scrollWidth>element.clientWidth'), 'Campaign columns did not scroll'
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), 'Desktop page overflowed'
    region.evaluate('element=>element.scrollLeft=element.scrollWidth')
    page.get_by_label('Jungle Costume Challenge stars for alpha_new',exact=True).fill('4')
    page.get_by_label('Jungle Costume Challenge stars for alpha_new',exact=True).press('Enter')
    page.get_by_role('button',name='All changes saved',exact=True).wait_for()
    assert creators[0]['awards']['jungle-costume-challenge']['stars']==4
    assert creators[0]['awards']['gift-gallery']['stars']==3
    manual=page.get_by_label('Manual Star Adjustments stars for alpha_new',exact=True)
    assert manual.input_value()=='0'
    page.get_by_role('button',name='Increase manual stars for alpha_new',exact=True).click()
    page.get_by_role('button',name='All changes saved',exact=True).wait_for()
    assert manual.input_value()=='1'
    page.get_by_role('button',name='Decrease manual stars for alpha_new',exact=True).click()
    page.get_by_role('button',name='All changes saved',exact=True).wait_for()
    page.get_by_role('button',name='Decrease manual stars for alpha_new',exact=True).click()
    page.get_by_role('button',name='All changes saved',exact=True).wait_for()
    assert manual.input_value()=='-1'
    page.get_by_role('button',name='Decrease manual stars for creator_01',exact=True).click()
    page.get_by_role('button',name='All changes saved',exact=True).wait_for()
    assert page.get_by_label('Manual Star Adjustments stars for creator_01',exact=True).is_visible(), 'Row jumped away while using arrows'
    page.get_by_role('button',name='Increase manual stars for creator_01',exact=True).click()
    page.get_by_role('button',name='All changes saved',exact=True).wait_for()
    page.reload()
    page.get_by_role('region',name='Scrollable campaign awards').wait_for()
    assert page.get_by_label('Manual Star Adjustments stars for alpha_new',exact=True).input_value()=='-1'
    assert creators[0]['awards']['manual-star-adjustments']['stars']==-1
    assert abs(page.locator('tbody tr').first.locator('th').bounding_box()['x']-region.bounding_box()['x'])<3
    assert page.locator('main > div').first.evaluate('element=>getComputedStyle(element).position')=='fixed'
    page.screenshot(path=str(out/'tracker-desktop.png'),full_page=True)
    assert not errors,errors
    browser.close()
print('Star Tracker browser checks passed: front tile, password-free fresh-visitor access, phone width, 25 scrollable columns and saved manual adjustment arrows, sticky names, 40-row paging, search across all creators, edit/save/reload, zero, validation, offline draft recovery, conflicts and leaderboard.')
