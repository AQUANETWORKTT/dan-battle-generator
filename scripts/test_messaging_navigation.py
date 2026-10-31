"""Fixture-only checks: no TikTok, browser or real messages."""
import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'integrations' / 'firstclassbot'))
from messaging_navigation import send_with_navigation_retry

SELECTOR = 'iframe[data-testid^="message-index-"]'


class Locator:
    def __init__(self, page): self.page = page
    @property
    def first(self): return self
    @property
    def content_frame(self): return self
    def wait_for(self, **kwargs): self.page.ready_checks += 1
    def get_by_role(self, *args, **kwargs): return self
    def is_visible(self): return True
    def is_enabled(self): return True
    def click(self, **kwargs):
        self.page.send_calls += 1
        if self.page.ambiguous: raise TimeoutError('Click outcome uncertain')


class Page:
    url = 'https://www.tiktok.com/business-suite/messages'
    def __init__(self): self.closed, self.send_calls, self.ready_checks, self.ambiguous = False, 0, 0, False
    def is_closed(self): return self.closed
    def close(self): self.closed = True
    def locator(self, selector): return Locator(self)
    def wait_for_url(self, *args, **kwargs): raise AssertionError('Must not wait for full messaging-page navigation')
    def wait_for_timeout(self, milliseconds): pass


class Context:
    def __init__(self): self.page, self.opened = Page(), 0
    def new_page(self): self.opened += 1; return self.page


def clicked(context, name):
    page = context.new_page()
    page.wait_for_url('**/business-suite/messages**', timeout=30000)
    page.locator(SELECTOR).content_frame.get_by_role('button', name='Send', exact=True).click()
    page.close()
    return 'UNKNOWN', 'Send clicked, confirmation not verifiable'


class NavigationTests(unittest.TestCase):
    def test_chat_readiness_and_one_tab_reused_for_multiple_recipients(self):
        context, session = Context(), {}
        self.assertEqual(send_with_navigation_retry(clicked, context, 'one', SELECTOR, session=session)[0], 'SEND_ATTEMPTED')
        self.assertEqual(send_with_navigation_retry(clicked, context, 'two', SELECTOR, session=session)[0], 'SEND_ATTEMPTED')
        self.assertEqual(context.opened, 1)
        self.assertEqual(context.page.send_calls, 2)
        self.assertEqual(context.page.ready_checks, 2)
        self.assertFalse(context.page.closed)

    def test_pre_send_timeout_retries_once_without_duplicate_send(self):
        calls = []
        def original(context, name):
            calls.append(name)
            if len(calls) == 1: return 'FAILED', 'Timeout 30000ms exceeded before chat appeared'
            return clicked(context, name)
        context = Context()
        self.assertEqual(send_with_navigation_retry(original, context, 'one', SELECTOR)[0], 'SEND_ATTEMPTED')
        self.assertEqual(len(calls), 2)
        self.assertEqual(context.page.send_calls, 1)

    def test_completed_click_does_not_wait_eight_seconds_for_delivery(self):
        after_click = []
        def legacy(context, name):
            page = context.new_page()
            try:
                page.locator(SELECTOR).content_frame.get_by_role('button', name='Send', exact=True).click()
                after_click.append('legacy delivery wait would run here')
                return 'SENT', 'should not claim this'
            except Exception as error:
                return 'FAILED', str(error)
            finally:
                page.close()
        context = Context()
        self.assertEqual(send_with_navigation_retry(legacy, context, 'one', SELECTOR)[0], 'SEND_ATTEMPTED')
        self.assertEqual(context.page.send_calls, 1)
        self.assertEqual(after_click, [])

    def test_ambiguous_send_click_never_retried(self):
        context = Context()
        context.page.ambiguous = True
        self.assertEqual(send_with_navigation_retry(clicked, context, 'one', SELECTOR)[0], 'SEND_ATTEMPTED')
        self.assertEqual(context.page.send_calls, 1)

    def test_wrong_recipient_never_treated_as_a_send(self):
        context = Context()
        result = send_with_navigation_retry(lambda *_: ('UNKNOWN', 'Recipient could not be independently verified'), context, 'one', SELECTOR)
        self.assertEqual(result[0], 'UNKNOWN')
        self.assertEqual(context.page.send_calls, 0)

    def test_external_navigation_stops_before_send(self):
        context = Context()
        context.page.url = 'https://example.com/messages'
        self.assertEqual(send_with_navigation_retry(clicked, context, 'one', SELECTOR)[0], 'FAILED')
        self.assertEqual(context.page.send_calls, 0)

    def test_recipient_error_returns_once_so_list_can_continue(self):
        calls = []
        def original(context, name):
            context.new_page()
            calls.append(name)
            return 'UNKNOWN', 'Recipient could not be independently verified in conversation'
        context = Context()
        result = send_with_navigation_retry(original, context, 'one', SELECTOR, max_attempts=None, should_stop=lambda: len(calls)>=5)
        self.assertEqual(result[0], 'UNKNOWN')
        self.assertEqual(len(calls), 1)
        self.assertEqual(context.page.send_calls, 0)

    def test_composer_mismatch_returns_without_sending_or_retrying(self):
        calls = []
        def original(context, name):
            calls.append(name)
            context.new_page()
            return 'UNKNOWN', 'Composer text mismatch'
        context = Context()
        self.assertEqual(send_with_navigation_retry(original, context, 'one', SELECTOR, max_attempts=None, should_stop=lambda: False), ('UNKNOWN', 'Composer text mismatch'))
        self.assertEqual(calls, ['one'])
        self.assertEqual(context.page.send_calls, 0)

    def test_recipient_count_waits_in_place_until_visible_or_stopped(self):
        from messaging_wait import WaitControl, RecipientLocator, UserStopped
        class Recipient:
            def __init__(self): self.calls = 0
            def count(self): self.calls += 1; return 1 if self.calls >= 6 else 0
            def nth(self, index): return self
            def is_visible(self): return True
        locator = Recipient()
        self.assertEqual(RecipientLocator(locator, WaitControl(Page(), lambda: False)).count(), 1)
        self.assertEqual(locator.calls, 6)
        locator = Recipient()
        with self.assertRaises(UserStopped):
            RecipientLocator(locator, WaitControl(Page(), lambda: locator.calls >= 3)).count()
        self.assertEqual(locator.calls, 3)

    def test_slow_profile_navigation_is_not_restarted(self):
        from messaging_navigation import ChatPage
        from messaging_wait import WaitControl
        class SlowPage(Page):
            def __init__(self): super().__init__(); self.navigations = 0; self.polls = 0
            def goto(self, *args, **kwargs): self.navigations += 1; raise TimeoutError('still connecting')
            def wait_for_url(self, *args, **kwargs):
                self.polls += 1
                if self.polls < 5: raise TimeoutError('still loading')
        page = SlowPage()
        ChatPage(page, SELECTOR, {}, WaitControl(page, lambda: False)).goto('https://www.tiktok.com/@one')
        self.assertEqual(page.navigations, 1)
        self.assertEqual(page.polls, 5)

    def test_stop_after_send_keeps_attempt_recorded(self):
        context = Context()
        result = send_with_navigation_retry(clicked, context, 'one', SELECTOR, max_attempts=None, should_stop=lambda: context.page.send_calls > 0)
        # Stop during/after clicking cannot relabel an attempted send as retryable cancellation.
        self.assertEqual(result[0], 'SEND_ATTEMPTED')
        self.assertEqual(context.page.send_calls, 1)


if __name__ == '__main__': unittest.main()
