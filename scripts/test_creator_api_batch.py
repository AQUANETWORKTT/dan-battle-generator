"""Batch fixtures: reversed result order, exact identities, retries and no send actions."""
import sys
import types
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "integrations" / "firstclassbot"))
module = types.ModuleType("playwright.sync_api")
module.TimeoutError = TimeoutError
sys.modules["playwright.sync_api"] = module
from backstage_batch import check_batch, classify_invitation, ScanStopped


class Node:
    def __init__(self, page, kind, index=0):
        self.page, self.kind, self.index = page, kind, index

    @property
    def first(self):
        return self

    def filter(self, **kwargs):
        return self

    def click(self, **kwargs):
        self.page.clicks.append(self.kind)

    def wait_for(self, **kwargs):
        pass

    def fill(self, value):
        self.page.submitted.append(value.splitlines())

    def count(self):
        return len(self.page.rows) if self.kind == "rows" else 2

    def nth(self, index):
        return Node(self.page, "row", index) if self.kind == "rows" else Node(self.page, "username" if index == 0 else "status", self.index)

    def locator(self, selector):
        if selector.endswith("tr.semi-table-row"):
            return Node(self.page, "rows")
        return Node(self.page, "cells", self.index) if selector == "td" else self

    def get_by_role(self, role, name=None, **kwargs):
        return Node(self.page, "preflight_next")

    def inner_text(self):
        return self.page.rows[self.index][0 if self.kind == "username" else 1]

    def is_visible(self):
        return self.page.network


class Page:
    def __init__(self, rows, network=False):
        self.rows, self.network, self.submitted, self.clicks = rows, network, [], []

    def goto(self, *args, **kwargs):
        pass

    def get_by_role(self, role, name=None, **kwargs):
        return Node(self, name)

    def get_by_test_id(self, name):
        return Node(self, "input")

    def get_by_text(self, *args, **kwargs):
        return Node(self, "network")

    def locator(self, selector):
        raise AssertionError("Result queries must be scoped to the eligibility dialog, excluding background manager tables")

    def wait_for_timeout(self, milliseconds):
        pass


class BatchTests(unittest.TestCase):
    def test_thirty_in_one_submission_matched_by_username(self):
        names = [f"fixture_{i}" for i in range(30)]
        page = Page([(name, "Available" if i == 0 else "Ineligible\nIn another Creator Network") for i, name in reversed(list(enumerate(names)))])
        results = check_batch(page, names)
        self.assertEqual(page.submitted, [names])
        self.assertEqual([row["username"] for row in results], names)
        self.assertEqual(results[0]["status"], "Available")
        self.assertTrue(all(row["status"] == "Ineligible" for row in results[1:]))
        self.assertEqual(page.clicks, ["Invite creators", "preflight_next"])

    def test_wrong_username_never_available(self):
        page = Page([("different_account", "Available")])
        result = check_batch(page, ["fixture_user"])
        self.assertEqual(result[0]["status"], "Failed")
        self.assertEqual(len(page.submitted), 3)

    def test_network_error_never_uses_stale_available_rows(self):
        result = check_batch(Page([("fixture_user", "Available")], network=True), ["fixture_user"])
        self.assertEqual(result[0]["status"], "Failed")

    def test_unknown_and_duplicate_statuses_require_review(self):
        result = check_batch(Page([("one", "Loading"), ("two", "Available"), ("two", "Available")]), ["one", "two"])
        self.assertTrue(all(row["status"] == "Pending" for row in result))

    def test_never_submits_more_than_thirty(self):
        page = Page([])
        with self.assertRaises(ValueError):
            check_batch(page, [f"name_{i}" for i in range(31)])
        self.assertEqual(page.submitted, [])

    def test_premium_regular_require_actual_invitation_label(self):
        self.assertEqual(classify_invitation("Premium invitation"), "Premium")
        self.assertEqual(classify_invitation("Regular"), "Regular")
        self.assertEqual(classify_invitation("-"), "Unknown")
        self.assertEqual(classify_invitation("Premium / Regular"), "Unknown")

    def test_stopped_scan_never_submits_names(self):
        page = Page([])
        with self.assertRaises(ScanStopped):
            check_batch(page, ["fixture_user"], should_stop=lambda: True)
        self.assertEqual(page.submitted, [])
        self.assertEqual(page.clicks, [])


if __name__ == "__main__":
    unittest.main()
