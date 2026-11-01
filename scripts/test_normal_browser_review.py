"""Local controller integration tests; no browser is launched or TikTok contacted."""
import json
import sys
import threading
import unittest
import urllib.error
import urllib.request
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'integrations/firstclassbot'))
from normal_browser_review import NormalBrowserReview


class NormalBrowserTests(unittest.TestCase):
    def test_controller_uses_ordinary_chrome_and_only_opens_profile_urls(self):
        stop = threading.Event()
        with patch('normal_browser_review.Path.is_file', return_value=True), patch('normal_browser_review.subprocess.Popen') as launch:
            with NormalBrowserReview(stop) as page:
                args = launch.call_args.args[0]
                self.assertEqual(len(args), 2)
                self.assertFalse(any('--' in arg for arg in args))
                base = args[1]
                with urllib.request.urlopen(base, timeout=3) as response:
                    self.assertIn('Open profile window', response.read().decode())
                error = []
                def navigate():
                    try: page.goto('https://www.tiktok.com/@one')
                    except Exception as exc: error.append(str(exc))
                thread = threading.Thread(target=navigate, daemon=True)
                thread.start()
                # Read until the worker has published the pending profile.
                for _ in range(30):
                    with urllib.request.urlopen(base+'state', timeout=3) as response:
                        state = json.load(response)
                    if state['id']: break
                    stop.wait(0.01)
                request = urllib.request.Request(base+'ack', data=json.dumps({'id':state['id'],'ok':True}).encode(), headers={'Content-Type':'application/json'}, method='POST')
                with urllib.request.urlopen(request, timeout=3): pass
                thread.join(3)
                self.assertFalse(thread.is_alive())
                self.assertEqual(error, [])
                self.assertEqual(page.url, 'https://www.tiktok.com/@one')
                self.assertFalse(page.inspect_available)
                for wrong in ('https://www.tiktok.com/messages', 'https://other.example/@one'):
                    with self.assertRaises(ValueError): page.goto(wrong)
                with self.assertRaises(urllib.error.HTTPError) as missing:
                    urllib.request.urlopen(base.replace(page.prefix,'/wrong/'),timeout=3)
                missing.exception.close()
                evil = urllib.request.Request(base+'state', headers={'Origin':'https://other.example'})
                with self.assertRaises(urllib.error.HTTPError) as error:
                    urllib.request.urlopen(evil,timeout=3)
                self.assertEqual(error.exception.code, 403)
                error.exception.close()


if __name__ == '__main__': unittest.main()
