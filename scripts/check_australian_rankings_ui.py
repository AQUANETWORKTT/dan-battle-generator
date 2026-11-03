"""Local-only browser check. Rankings/worker requests are fixtures; no paid scan or messages."""
import json
import os
import tempfile
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright, expect

base = os.environ.get('AU_UI_BASE', 'http://localhost:3106')
assert urlparse(base).hostname in ('localhost', '127.0.0.1')
stamp = '2026-11-03T12:00:00Z'
requests = []

def run(region, complete=True):
    names = ['au_one', 'au_two'] if region == 'AU' else ['uk_only']
    rows = [{'username': name, 'league': 'A1', 'rank': i+1, 'diamonds': (i+1)*100} for i, name in enumerate(names)]
    status = 'complete' if complete else 'running'
    return {'id': region+'-fixture', 'created_at': stamp, 'updated_at': stamp, 'status': status,
            'payload': {'region': region, 'status': status, 'leagues': [{'code': 'A1', 'status': 'complete', 'expected': len(rows), 'attempts': 0}] if complete else [], 'results': {'A1': rows} if complete else {}, 'calls': 2},
            'eligibility': {name: {'username': name, 'status': 'Available', 'invitationType': 'Premium' if i else 'Regular', 'checkedAt': stamp} for i, name in enumerate(names)} if complete else {}}

def fixture(route):
    request = route.request
    url = urlparse(request.url)
    path = url.path.split('/api/creator-api-search/')[-1]
    query = parse_qs(url.query)
    requests.append((request.method, path, query))
    if path == 'config':
        data = {'apiConfigured': True, 'databaseConfigured': True, 'workerConfigured': False, 'storageError': None}
    elif path == 'contacts':
        data = {'rows': [], 'syncedAt': None, 'nextCursor': None}
    elif path == 'changes':
        assert query['region'][0] in ('AU', 'GB')
        data = {'changes': [], 'diamondTotals': {}, 'confirmedChecks': 0, 'scans': 0}
    elif path == 'runs':
        region = query['region'][0]
        data = {'runs': [] if region == 'AU' else [run('GB')]}
    elif path == 'scans':
        assert request.method == 'POST' and request.post_data_json == {'region': 'AU'}
        data = {'run': run('AU', False)}
    elif path.startswith('runs/AU-fixture'):
        data = {'run': run('AU')}
    elif path == 'runs/GB-fixture':
        data = {'run': run('GB')}
    else:
        raise AssertionError('Unexpected request: '+request.method+' '+path)
    route.fulfill(status=200, content_type='application/json', body=json.dumps(data))

with sync_playwright() as p:
    browser = p.chromium.launch()
    context = browser.new_context(accept_downloads=True)
    assert context.request.post(base+'/api/login', data={'password': 'Dan44', 'role': 'leadership'}).ok
    context.add_init_script("sessionStorage.setItem('first-class-data-access','D')")
    context.route('**/api/creator-api-search/**', fixture)
    page = context.new_page()
    page.goto(base+'/data/creator-api-search/australia')
    expect(page.get_by_role('heading', name='Australian Rankings Scan', exact=True)).to_be_visible()
    page.get_by_role('button', name='New Scan', exact=True).click()
    expect(page.get_by_role('link', name='@au_one', exact=True)).to_be_visible()
    search = page.get_by_role('textbox', name='Search ranking usernames')
    search.fill('au_two')
    expect(page.get_by_role('link', name='@au_one', exact=True)).to_have_count(0)
    expect(page.get_by_role('link', name='@au_two', exact=True)).to_be_visible()
    search.fill('')
    with page.expect_download() as download_event:
        page.get_by_text('All Available', exact=True).locator('..').get_by_role('button', name='TXT', exact=True).click()
    download = download_event.value
    assert download.suggested_filename.startswith('au-all-available-')
    with tempfile.TemporaryDirectory() as folder:
        target = os.path.join(folder, 'results.txt')
        download.save_as(target)
        with open(target, encoding='utf-8-sig') as saved:
            assert saved.read().splitlines() == ['au_two', 'au_one']
    page.get_by_role('link', name='UK Rankings', exact=True).click()
    expect(page.get_by_role('heading', name='UK Rankings Scan', exact=True)).to_be_visible()
    expect(page.get_by_role('link', name='@uk_only', exact=True)).to_be_visible()
    expect(page.get_by_role('link', name='@au_one', exact=True)).to_have_count(0)
    assert any(path == 'runs' and query.get('region') == ['AU'] for _, path, query in requests)
    assert any(path == 'runs' and query.get('region') == ['GB'] for _, path, query in requests)
    browser.close()
print('PASS: Australian tab, AU new-scan request, searchable results, diamond-sorted AU TXT, and switching back to isolated UK results. No live API scan, Backstage checks or messages.')
