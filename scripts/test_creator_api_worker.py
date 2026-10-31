"""Fixture-only checks: no browser, login, real creators or network requests."""
import importlib.util
import sys
import types
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKER_DIR = ROOT / "integrations" / "firstclassbot"
sys.path.insert(0, str(WORKER_DIR))
playwright = types.ModuleType("playwright.sync_api")


class Timeout(Exception):
    pass


playwright.TimeoutError = Timeout
sys.modules["playwright.sync_api"] = playwright
from backstage_checker import check_creator
from worker import outcome


class Locator:
    def __init__(self, page, kind, name=""):
        self.page, self.kind, self.name = page, kind, name

    def click(self, **kwargs):
        self.page.clicks.append(self.name)

    def fill(self, value):
        self.page.requested = value

    def wait_for(self, **kwargs):
        if self.kind == "row" and self.page.actual != self.page.requested:
            raise Timeout("Wrong username must not match")

    def filter(self, **kwargs):
        if "has_text" in kwargs:
            self.name = kwargs["has_text"]
        return self

    def locator(self, kind):
        return Locator(self.page, "cells")

    def count(self):
        return 2 if self.kind == "cells" else 1

    def nth(self, index):
        return self

    def inner_text(self):
        return self.page.status

    def is_visible(self):
        return self.name == "Network error" and self.page.network


class Page:
    def __init__(self, status="Available", actual="fixture_user", network=False):
        self.status, self.actual, self.network = status, actual, network
        self.requested, self.clicks, self.visits = "", [], 0

    def goto(self, *args, **kwargs):
        self.visits += 1

    def get_by_role(self, role, name):
        return Locator(self, role, name)

    def get_by_test_id(self, name):
        return Locator(self, "input", name)

    def locator(self, selector):
        return Locator(self, "row" if selector == "tr.semi-table-row" else "button")

    def get_by_text(self, name, **kwargs):
        return Locator(self, "text", name)

    def wait_for_timeout(self, milliseconds):
        pass


class WorkerTests(unittest.TestCase):
    def test_confirmed_available_and_no_contact_actions(self):
        page = Page()
        self.assertEqual(check_creator(page, "@fixture_user"), "AVAILABLE")
        self.assertEqual(page.clicks, ["Invite creators", "Next"])

    def test_other_username_never_available(self):
        page = Page(actual="different_user")
        self.assertEqual(check_creator(page, "fixture_user"), "CHECK_FAILED")
        self.assertEqual(page.visits, 3)

    def test_network_error_retries_not_ineligible(self):
        page = Page(network=True)
        result = check_creator(page, "fixture_user")
        self.assertEqual(result, "CHECK_FAILED")
        self.assertEqual(page.visits, 3)
        self.assertEqual(outcome("fixture_user", result)["status"], "Failed")

    def test_review_stays_pending(self):
        page = Page(status="")
        self.assertEqual(outcome("fixture_user", check_creator(page, "fixture_user"))["status"], "Pending")

    def test_confirmed_ineligible(self):
        page = Page(status="Not eligible")
        self.assertEqual(outcome("fixture_user", check_creator(page, "fixture_user"))["status"], "Ineligible")

    def test_unknown_result_never_available(self):
        self.assertEqual(outcome("fixture_user", "UNVERIFIED")["status"], "Failed")


if __name__ == "__main__":
    unittest.main()
