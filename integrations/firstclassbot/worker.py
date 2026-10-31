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
    parser.add_argument("--contacts-db", default=os.environ.get("CREATOR_SEARCH_BOT_DB", str(Path.home() / "OneDrive" / "Desktop" / "FirstClassBot" / "creators.db")))
    parser.add_argument("--sync-only", action="store_true", help="Sync contact history read-only, without opening Backstage or checking creators.")
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

    from contact_history import read_contacts

    def sync_history():
        records = read_contacts(args.contacts_db)
        for offset in range(0, len(records), 500):
            api("contacts", {"records": records[offset:offset + 500], "complete": False})
        api("contacts", {"records": [], "complete": True})
        print(f"Synced {len(records)} contact-history records; no message text was read or uploaded.")

    if args.sync_only:
        sync_history()
        return

    # This is the audited eligibility module only. No bot.py/message_sender import.
    from backstage_checker import BACKSTAGE_URL
    from backstage_batch import check_batch, ScanStopped
    from playwright.sync_api import sync_playwright
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch_persistent_context(
            user_data_dir=str(Path(args.profile).resolve()), headless=False,
            viewport={"width": 1500, "height": 900})
        page = browser.pages[0] if browser.pages else browser.new_page()
        page.goto(BACKSTAGE_URL, wait_until="domcontentloaded", timeout=60000)
        print("Sign into Backstage in this dedicated browser. This worker checks eligibility only.")
        print("After signing in, the checker connects automatically. No Enter key is required.")
        print("Polling for queued batches (up to 30). No invitations or messages will be sent.")
        history_synced_at = 0
        try:
            while True:
                try:
                    if page.is_closed():
                        print("The checker browser was closed. Run Start Backstage Checker again when needed.")
                        break
                    if time.monotonic() - history_synced_at >= 60:
                        try:
                            sync_history()
                        except Exception as error:
                            print(f"Message history not synced: {error}")
                        history_synced_at = time.monotonic()
                    ready = page.get_by_role("button", name="Invite creators", exact=True).is_visible()
                    # Never reload a login page while the user is signing in.
                    job = api("claim", {"ready": ready}).get("job")
                    if not ready:
                        print("Backstage login/page is not ready. Sign in or clear the page issue; jobs stay queued.")
                    if not job:
                        time.sleep(5)
                        continue
                    names = job.get("usernames", [])
                    if not isinstance(names, list) or not 1 <= len(names) <= 30:
                        raise RuntimeError("Portal returned an invalid batch.")
                    remaining = [name for name in names if not job.get("results", {}).get(name, {}).get("checkedAt")]
                    if remaining:
                        def stopped():
                            return not api("active/" + job["id"], {"leaseToken": job["lease_token"]}).get("active", False)
                        results = check_batch(page, remaining, max_attempts=3, should_stop=stopped)
                        api("results/" + job["id"], {"leaseToken": job["lease_token"], "results": results})
                        counts = {status: sum(row["status"] == status for row in results) for status in ("Available", "Ineligible", "Pending", "Failed")}
                        print(f"Saved batch of {len(results)}: {counts}")
                except ScanStopped:
                    print("Scan stopped from the portal. No further results or batches for that scan will be submitted.")
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
