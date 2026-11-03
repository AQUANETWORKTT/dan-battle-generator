"""Local-only responsive UI verification. No database writes or real profile scraping."""
import json
import os
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

base=os.environ.get('STAR_UI_BASE','http://localhost:3107')
assert urlparse(base).hostname in ('localhost','127.0.0.1')
rows=[{'username':f'creator{i:03}', 'team':'Team Lauren', 'stars':120 if i<2 else 80 if i<4 else 10, 'rank':1 if i<2 else 2 if i<4 else 3, 'joint':True} for i in range(103)]
rows[0]['username']='a_very_long_creator_name1'
rows[0]['team']='Team Dump Creators (CROSS AGENCY)'
rows[1]['team']='Team INDI (OWNER)'
rows[2]['team']='Team KJB'
picture='<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56"><rect width="56" height="56" fill="#46634f"/><circle cx="28" cy="20" r="11" fill="#d6c18d"/><ellipse cx="28" cy="50" rx="21" ry="17" fill="#bbae8c"/></svg>'
with sync_playwright() as p:
    browser=p.chromium.launch()
    for width,height in [(1440,1100),(390,900),(320,850)]:
        context=browser.new_context(viewport={'width':width,'height':height},device_scale_factor=1)
        context.route('**/api/star-leaderboard',lambda route:route.fulfill(status=200,content_type='application/json',body=json.dumps({'standings':rows,'updatedAt':'2026-11-03T16:20:00Z'})))
        context.route('**/api/star-leaderboard/avatar?*',lambda route:route.fulfill(status=200,content_type='image/svg+xml',body=picture))
        page=context.new_page()
        page.goto(base+'/star-leaderboard',wait_until='domcontentloaded')
        listing=page.get_by_role('list',name='Top 100 creators')
        expect(listing.get_by_role('listitem')).to_have_count(100)
        expect(page.get_by_label('Joint rank 1',exact=True)).to_have_count(2)
        expect(page.get_by_label('Joint rank 2',exact=True)).to_have_count(2)
        assert page.locator('a').count()==0
        expect(page.get_by_text('Team Mike / Indi',exact=True)).to_have_count(2)
        expect(page.get_by_text('Team Dan / James',exact=True)).to_have_count(1)
        assert page.get_by_text('Chase the stars.',exact=True).count()==0
        assert page.get_by_text('THE JUNGLE STANDINGS',exact=True).count()==0
        assert page.get_by_text('LIVE STANDINGS',exact=True).count()==0
        assert page.get_by_text('JOINT STARS, JOINT RANK',exact=True).count()==0
        assert page.locator('main').evaluate("e=>getComputedStyle(e).textTransform")=="uppercase"
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
        page.evaluate('window.scrollTo(0,600)')
        page.wait_for_function("document.querySelector('[aria-hidden=true]').style.getPropertyValue('--scenery-shift')!=='0px'")
        page.emulate_media(reduced_motion='reduce')
        page.wait_for_function("document.querySelector('[aria-hidden=true]').style.getPropertyValue('--scenery-shift')==='0px'")
        page.evaluate('window.scrollTo(0,0)')
        page.emulate_media(reduced_motion='no-preference')
        page.get_by_text('@a_very_long_creator_name1',exact=True).click()
        assert page.url==base+'/star-leaderboard'
        search=page.get_by_role('searchbox',name='Search all creators')
        search.fill('@creator102')
        expect(page.get_by_role('listitem')).to_have_count(1)
        expect(page.get_by_label('Joint rank 3',exact=True)).to_be_visible()
        expect(page.get_by_text('@creator102',exact=True)).to_be_visible()
        search.fill('no_creator_matches')
        expect(page.get_by_role('heading',name='No creator found',exact=True)).to_be_visible()
        page.get_by_role('button',name='Back to the top 100',exact=True).click()
        expect(listing.get_by_role('listitem')).to_have_count(100)
        Path('tmp/star-leaderboard-ui').mkdir(parents=True,exist_ok=True)
        page.screenshot(path=f'tmp/star-leaderboard-ui/{width}.png')
        context.close()
    browser.close()
print('PASS: 1440px / 390px / 320px layouts, no page overflow, top 100, dense joint ranks, full-roster search, team subtitles, profile images, and no navigation links or click redirects.')
