"""Cancellable readiness waits: no overall deadline and no recipient-verification bypass."""
import time


class UserStopped(Exception):
    pass


class WaitControl:
    def __init__(self, page, should_stop, report=None):
        self.page, self.should_stop, self.report = page, should_stop, report
        self.last_report = 0

    def check(self):
        if self.should_stop() or self.page.is_closed():
            raise UserStopped("Stopped by you.")

    def pause(self, reason):
        self.check()
        if self.report and time.monotonic() - self.last_report > 15:
            self.report(reason + " Waiting until ready. Use Skip person to move on, or Stop to end the list.")
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
