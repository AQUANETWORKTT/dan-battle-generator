"""Outbound-only eligibility worker. Never imports invitation/message senders."""
import argparse
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, file_pointer, code, message, headers, new_url):
        # Never forward the private worker token to a redirected host.
        return None


def outcome(username, value):
    mapping = {
        "AVAILABLE": ("Available", "Exact Backstage creator row confirmed Available."),
        "UNAVAILABLE": ("Ineligible", "Exact Backstage creator row returned a non-Available status."),
        "REVIEW": ("Pending", "Exact creator/status could not be confirmed. Manual review is required."),
        "INVALID": ("Failed", "Invalid username."),
        "CHECK_FAILED": ("Failed", "Backstage check failed after its built-in network/timeout retries."),
    }
    status, reason = mapping.get(value, ("Failed", "Checker returned an unknown result; availability was not assumed."))
    return {"username": username, "status": status, "reason": reason}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--profile", default=str(Path(__file__).parent / "browser_profile_api_search"))
    args = parser.parse_args()
    base = os.environ.get("CREATOR_SEARCH_PORTAL_URL", "https://firstclassagency.management").rstrip("/")
    token = os.environ.get("CREATOR_SEARCH_WORKER_TOKEN", "")
    parsed = urllib.parse.urlparse(base)
    if not parsed.hostname or parsed.path or parsed.query or parsed.fragment or parsed.username or parsed.password or (parsed.scheme != "https" and not (parsed.scheme == "http" and parsed.hostname in {"localhost", "127.0.0.1"})):
        raise SystemExit("Use your HTTPS portal address, or localhost for development.")
    if len(token) < 32:
        raise SystemExit("Set CREATOR_SEARCH_WORKER_TOKEN to the same private 32+ character value used by the portal.")

    opener = urllib.request.build_opener(NoRedirect())

    def api(path, payload):
        for attempt in range(3):
            request = urllib.request.Request(base + "/api/creator-api-search/worker/" + path,
                data=json.dumps(payload).encode(), method="POST",
                headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"})
            try:
                with opener.open(request, timeout=40) as response:
                    return json.load(response)
            except urllib.error.HTTPError as error:
                if error.code not in {429, 500, 502, 503, 504} or attempt == 2:
                    raise RuntimeError(f"Portal returned HTTP {error.code}; no availability result was fabricated.") from None
            except (urllib.error.URLError, TimeoutError):
                if attempt == 2:
                    raise RuntimeError("Portal connection failed; saved job results remain on the server.") from None
            time.sleep(min(30, 3 * (2 ** attempt)))

    # This is the audited eligibility module only. No bot.py/message_sender import.
    from backstage_checker import BACKSTAGE_URL, check_creator
    from playwright.sync_api import sync_playwright
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch_persistent_context(
            user_data_dir=str(Path(args.profile).resolve()), headless=False,
            viewport={"width": 1500, "height": 900})
        page = browser.pages[0] if browser.pages else browser.new_page()
        page.goto(BACKSTAGE_URL, wait_until="domcontentloaded", timeout=60000)
        print("Sign into Backstage in this dedicated browser. This worker checks eligibility only.")
        input("When the Invite creators button is visible, press ENTER here to begin polling: ")
        print("Polling for queued batches (up to 30). No invitations or messages will be sent.")
        try:
            while True:
                try:
                    ready = page.get_by_role("button", name="Invite creators", exact=True).is_visible()
                    # The eligibility dialog may still be open after a previous job.
                    if not ready:
                        page.goto(BACKSTAGE_URL, wait_until="domcontentloaded", timeout=60000)
                        ready = page.get_by_role("button", name="Invite creators", exact=True).is_visible()
                    job = api("claim", {"ready": ready}).get("job")
                    if not ready:
                        print("Backstage login/page is not ready. Sign in or clear the page issue; jobs stay queued.")
                    if not job:
                        time.sleep(5)
                        continue
                    names = job.get("usernames", [])
                    if not isinstance(names, list) or not 1 <= len(names) <= 30:
                        raise RuntimeError("Portal returned an invalid batch.")
                    for name in names:
                        if job.get("results", {}).get(name, {}).get("checkedAt"):
                            continue
                        try:
                            value = check_creator(page, name, max_attempts=3)
                        except Exception:
                            value = "CHECK_FAILED"
                        result = outcome(name, value)
                        api("results/" + job["id"], {"leaseToken": job["lease_token"], "results": [result]})
                        print(f"Saved @{name}: {result['status']}")
                except Exception as error:
                    print(str(error))
                    print("Pausing before retry; unreported results remain Pending and expired jobs can resume.")
                    time.sleep(15)
        except KeyboardInterrupt:
            print("Worker stopped. Remaining queued work stays saved.")
        finally:
            browser.close()


if __name__ == "__main__":
    main()
