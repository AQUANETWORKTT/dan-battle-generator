"""Availability preflight only: one newline-separated submission for up to 30 creators."""
import re
from backstage_checker import BACKSTAGE_URL


class ScanStopped(Exception):
    pass


def classify_invitation(value):
    words = set(re.findall(r"[a-z]+", value.lower()))
    if "premium" in words and "regular" not in words:
        return "Premium"
    if "regular" in words and "premium" not in words:
        return "Regular"
    return "Unknown"


def classify_status(status):
    first = status.strip().splitlines()[0].strip().lower() if status.strip() else ""
    if first == "available":
        return "Available"
    if first in {"ineligible", "unsupported region", "unavailable"}:
        return "Ineligible"
    return "Pending"


def check_batch(page, usernames, max_attempts=3, should_stop=lambda: False):
    names = list(dict.fromkeys(str(name).strip().lower().lstrip("@") for name in usernames))
    if not 1 <= len(names) <= 30 or any(not re.fullmatch(r"[a-z0-9._]{1,24}", name) for name in names):
        raise ValueError("A batch requires 1–30 valid, unique usernames.")
    confirmed = {}
    review = {}
    for attempt in range(max_attempts):
        remaining = [name for name in names if name not in confirmed]
        if not remaining:
            break
        try:
            if should_stop():
                raise ScanStopped()
            page.goto(BACKSTAGE_URL, wait_until="domcontentloaded", timeout=60000)
            page.get_by_role("button", name="Invite creators", exact=True).click(timeout=15000)
            box = page.get_by_test_id("inviteHostTextArea")
            box.wait_for(state="visible", timeout=15000)
            if should_stop():
                raise ScanStopped()
            box.fill("\n".join(remaining))
            print(f"Checking {len(remaining)} usernames together (attempt {attempt + 1}/{max_attempts})...")
            dialog = page.get_by_role("dialog")
            if should_stop():
                raise ScanStopped()
            # This is the preflight Next button, never the final invite/send action.
            dialog.get_by_role("button", name="Next", exact=True).click(timeout=15000)
            rows = dialog.locator("tbody tr.semi-table-row")
            rows.first.wait_for(state="visible", timeout=30000)
            if page.get_by_text("Network error", exact=True).is_visible():
                raise RuntimeError("Backstage network error")
            matched = {}
            for index in range(rows.count()):
                cells = rows.nth(index).locator("td")
                if cells.count() < 2:
                    continue
                # First paragraph is the actual username; nickname/row order is never used.
                actual = cells.nth(0).locator("p").first.inner_text().strip().lower().lstrip("@")
                if actual in remaining:
                    invitation = classify_invitation(cells.nth(2).inner_text()) if cells.count() > 2 else "Unknown"
                    matched.setdefault(actual, []).append((cells.nth(1).inner_text().strip(), invitation))
            for name, statuses in matched.items():
                if len(statuses) != 1:
                    review[name] = {"username": name, "status": "Pending", "reason": "Multiple exact username rows require manual review."}
                    continue
                status_text, invitation = statuses[0]
                status = classify_status(status_text)
                if status != "Pending":
                    confirmed[name] = {"username": name, "status": status, "reason": status_text[:1000], "invitationType": invitation}
                else:
                    review[name] = {"username": name, "status": "Pending", "reason": "Unrecognised Backstage status requires manual review: " + status_text[:850]}
        except ScanStopped:
            raise
        except Exception as error:
            print(f"Batch check interrupted ({type(error).__name__}); retrying unresolved usernames only.")
        if attempt + 1 < max_attempts and len(confirmed) < len(names):
            page.wait_for_timeout(2000)
    if should_stop():
        raise ScanStopped()
    return [confirmed.get(name, review.get(name, {"username": name, "status": "Failed", "reason": "Exact username/status could not be confirmed after batch retries; availability was not assumed."})) for name in names]
