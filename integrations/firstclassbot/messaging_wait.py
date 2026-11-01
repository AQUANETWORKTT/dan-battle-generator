"""Cancellable readiness waits with a shared per-recipient deadline."""
import time
import re
import unicodedata


class UserStopped(Exception):
    pass


class ReadinessExpired(UserStopped):
    pass


class WaitControl:
    def __init__(self, page, should_stop, report=None, deadline=None):
        self.page, self.should_stop, self.report = page, should_stop, report
        self.deadline = deadline
        self.last_report = 0

    def check(self):
        if self.should_stop() or self.page.is_closed():
            raise UserStopped("Stopped by you.")
        if self.deadline is not None and time.monotonic() >= self.deadline:
            raise ReadinessExpired('Readiness wait expired before Send.')

    def pause(self, reason):
        self.check()
        if self.report and time.monotonic() - self.last_report > 15:
            self.report(reason + " Chat has a six-second limit, then one refresh before skipping. You can also use Skip person or Stop.")
            self.last_report = time.monotonic()
        self.page.wait_for_timeout(200)
        self.check()

    def call(self, action, reason):
        while True:
            self.check()
            try:
                return action()
            except UserStopped:
                raise
            except Exception:
                self.pause(reason)


class ReadyLocator:
    def __init__(self, locator, control):
        self.locator, self.control = locator, control

    def __getattr__(self, name):
        return getattr(self.locator, name)

    @property
    def first(self):
        return ReadyLocator(self.locator.first, self.control)

    def wait_for(self, **kwargs):
        kwargs["timeout"] = 1000
        return self.control.call(lambda: self.locator.wait_for(**kwargs), "The conversation is still loading.")

    def click(self, **kwargs):
        kwargs.update(timeout=1000, no_wait_after=True)
        return self.control.call(lambda: self.locator.click(**kwargs), "Waiting for the Message button.")

    def fill(self, value, **kwargs):
        kwargs["timeout"] = 1000
        return self.control.call(lambda: self.locator.fill(value, **kwargs), "Waiting for the message composer.")


def comparable_message(value):
    # contenteditable innerText can collapse paragraph breaks and NBSPs.
    # Preserve actual words, punctuation and emoji; normalize whitespace only.
    return re.sub(r'\s+', ' ', unicodedata.normalize('NFC', value or '')).strip()


class ComposerLocator(ReadyLocator):
    def fill(self, value, **kwargs):
        self.expected = value
        return super().fill(value, **kwargs)

    def inner_text(self, **kwargs):
        actual = self.locator.inner_text(timeout=1000, **kwargs)
        expected = getattr(self, 'expected', None)
        return expected if expected is not None and comparable_message(actual) == comparable_message(expected) else actual


class RecipientLocator(ReadyLocator):
    def count(self):
        while True:
            self.control.check()
            try:
                count = self.locator.count()
                if any(self.locator.nth(index).is_visible() for index in range(min(count, 10))):
                    return count
            except UserStopped:
                raise
            except Exception:
                pass
            self.control.pause("Waiting to verify the intended recipient.")
