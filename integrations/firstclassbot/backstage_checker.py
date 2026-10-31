"""Eligibility-only copy of FirstClassBot/backstage_checker.py. No messaging modules. """

from playwright.sync_api import TimeoutError as PlaywrightTimeout

BACKSTAGE_URL = "https://live-backstage.tiktok.com/portal/overview"

MAX_ATTEMPTS = 3


def check_creator_once(page, username):
    """Check the exact creator's eligibility in Backstage."""

    username = username.strip().lower().lstrip("@")

    if not username:
        return "INVALID"

    try:
        page.goto(
            BACKSTAGE_URL,
            wait_until="domcontentloaded",
            timeout=60000
        )

        # Open invitation checker
        page.get_by_role(
            "button",
            name="Invite creators"
        ).click(timeout=15000)

        # Enter username
        username_box = page.get_by_test_id(
            "inviteHostTextArea"
        )

        username_box.wait_for(
            state="visible",
            timeout=15000
        )

        username_box.fill(username)

        print(f"Checking @{username}...")

        # Submit
        page.locator("button").filter(
            has_text="Next"
        ).click(timeout=15000)

        # Find the exact creator row
        row = page.locator("tr.semi-table-row").filter(
            has=page.get_by_text(
                username,
                exact=True
            )
        )

        row.wait_for(
            state="visible",
            timeout=20000
        )

        if row.count() != 1:
            print("Multiple matching rows found.")
            return "REVIEW"

        print("Matching creator row found.")

        # Read status from the row's Status column
        cells = row.locator("td")

        if cells.count() < 2:
            return "REVIEW"

        status = cells.nth(1).inner_text().strip()

        print("Username:", username)
        print("Backstage status:", status)

        if status.lower() == "available":
            return "AVAILABLE"

        if not status:
            return "REVIEW"

        return "UNAVAILABLE"

    except PlaywrightTimeout:
        print(f"Timeout checking @{username}")
        return "CHECK_FAILED"

    except Exception as error:
        print("Backstage error:", error)
        return "CHECK_FAILED"


def check_creator(page, username, max_attempts=MAX_ATTEMPTS):
    """Retry eligibility checks after loading failures."""

    for attempt in range(1, max_attempts + 1):
        print(
            f"\nBACKSTAGE CHECK {attempt}/{max_attempts}"
        )

        result = check_creator_once(page, username)

        # Check for network errors
        try:
            network_error = page.get_by_text(
                "Network error",
                exact=True
            ).is_visible()
        except Exception:
            network_error = False

        if network_error:
            print("Network error detected.")
            result = "CHECK_FAILED"

        if result != "CHECK_FAILED":
            return result

        if attempt < max_attempts:
            print("Retrying eligibility check...")

            page.wait_for_timeout(2000)

    return "CHECK_FAILED"
