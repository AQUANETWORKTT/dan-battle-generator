"""Wait for chat readiness rather than TikTok's full-page load; retry only before Send."""
from urllib.parse import urlparse
from messaging_wait import WaitControl, ReadyLocator, RecipientLocator, UserStopped


class SendClickCompleted(Exception):
    """Exit the legacy adapter after Send succeeds, without its delivery-bubble wait."""


class SendButton:
    def __init__(self, locator, state, control=None):
        self.locator, self.state, self.control = locator, state, control

    def __getattr__(self, name):
        return getattr(self.locator, name)

    def click(self, **kwargs):
        if self.control:
            while True:
                self.control.check()
                ready = self.control.call(lambda: self.locator.is_visible() and self.locator.is_enabled(), 'Waiting for Send to become ready.')
                if ready:
                    break
                self.control.pause('Waiting for Send to become ready.')
            if self.state.get('recipient') is not None:
                RecipientLocator(self.state['recipient'], self.control).count()
            self.control.check()
            kwargs.update(timeout=1000, no_wait_after=True)
        self.state["attempted"] = True
        result = self.locator.click(**kwargs)
        self.state["completed"] = True
        # The outer wrapper records SEND_ATTEMPTED, not confirmed delivery.
        # The legacy adapter catches this and cleans up; it cannot send twice.
        raise SendClickCompleted("Send click completed; skip the legacy delivery wait.")


class ChatFrame:
    def __init__(self, frame, state, control=None):
        self.frame, self.state, self.control = frame, state, control

    def __getattr__(self, name):
        return getattr(self.frame, name)

    def get_by_role(self, role, **kwargs):
        locator = self.frame.get_by_role(role, **kwargs)
        if role == "button" and kwargs.get("name") == "Send":
            if self.control:
                self.control.check()
            return SendButton(locator, self.state, self.control)
        return ReadyLocator(locator, self.control) if self.control else locator

    def get_by_text(self, text, **kwargs):
        locator = self.frame.get_by_text(text, **kwargs)
        self.state['recipient'] = locator
        return RecipientLocator(locator, self.control) if self.control else locator


class ChatElement:
    def __init__(self, element, state, control=None):
        self.element, self.state, self.control = element, state, control

    def __getattr__(self, name):
        return getattr(self.element, name)

    @property
    def first(self):
        return ReadyLocator(self.element.first, self.control) if self.control else self.element.first

    def count(self):
        if not self.control:
            return self.element.count()
        while True:
            self.control.check()
            count = self.control.call(self.element.count, "Waiting for the conversation frame.")
            if count == 1:
                return count
            self.control.pause("Waiting for a single unambiguous conversation frame.")

    @property
    def content_frame(self):
        return ChatFrame(self.element.content_frame, self.state, self.control)


class ChatPage:
    def __init__(self, page, selector, state, control=None):
        self.page, self.selector, self.state, self.control = page, selector, state, control

    def __getattr__(self, name):
        return getattr(self.page, name)

    def close(self):
        # The legacy adapter closes after each recipient. Keep our shared tab instead.
        pass

    def goto(self, url, **kwargs):
        if not self.control:
            return self.page.goto(url, **kwargs)
        self.control.check()
        try:
            self.page.goto(url, wait_until="commit", timeout=1000)
        except Exception as error:
            if "timeout" not in type(error).__name__.lower():
                self.control.call(lambda: self.page.goto(url, wait_until="commit", timeout=1000), "Waiting for TikTok to connect.")
        # Do not restart a slow navigation every second: wait on that navigation.
        return self.control.call(lambda: self.page.wait_for_url(url, wait_until="domcontentloaded", timeout=1000), "TikTok is still loading the profile.")

    def get_by_role(self, role, **kwargs):
        locator = self.page.get_by_role(role, **kwargs)
        return ReadyLocator(locator, self.control) if self.control else locator

    def wait_for_url(self, pattern, **kwargs):
        if "business-suite/messages" not in str(pattern):
            return self.page.wait_for_url(pattern, **kwargs)
        # The Message button can render the conversation before analytics/media finish loading.
        if urlparse(self.page.url).hostname not in {"www.tiktok.com", "tiktok.com", "business.tiktok.com"}:
            raise RuntimeError("The message page left TikTok; no message was sent.")
        locator = self.page.locator(self.selector).first
        if self.control:
            ReadyLocator(locator, self.control).wait_for(state="visible")
        else:
            locator.wait_for(state="visible", timeout=30000)

    def locator(self, selector):
        locator = self.page.locator(selector)
        return ChatElement(locator, self.state, self.control) if selector == self.selector else locator


class ChatContext:
    def __init__(self, context, selector, session, should_stop=None, report=None):
        self.context, self.selector, self.session = context, selector, session
        self.should_stop, self.report = should_stop, report
        self.state = {"attempted": False, "completed": False}

    def __getattr__(self, name):
        return getattr(self.context, name)

    def new_page(self):
        page = self.session.get("page")
        if page is None or page.is_closed():
            page = self.context.new_page()
            self.session["page"] = page
        control = WaitControl(page, self.should_stop, self.report) if self.should_stop else None
        return ChatPage(page, self.selector, self.state, control)


def send_with_navigation_retry(original, context, username, selector, max_attempts=2, session=None, should_stop=None, report=None):
    session = session if session is not None else {}
    attempt = 0
    while max_attempts is None or attempt < max_attempts:
        if should_stop and should_stop():
            return 'CANCELLED', 'Stopped by you before Send.'
        attempt += 1
        tracked = ChatContext(context, selector, session, should_stop, report)
        try:
            status, detail = original(tracked, username)
        except Exception as error:
            status, detail = "FAILED", str(error)
        if tracked.state["completed"]:
            return (status, detail) if status == "SENT" else ("SEND_ATTEMPTED", "Send clicked; delivery unverified. Continuing without resending.")
        if tracked.state["attempted"]:
            return "SEND_ATTEMPTED", "Send was invoked but completion is uncertain; continuing without retry."
        if should_stop and should_stop():
            return 'CANCELLED', 'Stopped by you before Send.'
        if max_attempts is None and status not in {'SENT','SEND_ATTEMPTED','SKIPPED'}:
            page = session.get('page')
            if page is not None and page.is_closed():
                return 'CANCELLED', 'You closed the messaging browser.'
            # Readiness waits remain cancellable and unbounded inside the proxies.
            # A completed adapter failure (such as mismatched composer text) is
            # recorded once and returned so the list can move to the next name.
            return status, detail
        if status == "FAILED" and "timeout" in detail.lower() and attempt < max_attempts:
            continue
        return status, detail
    return "FAILED", "The messaging page did not become ready before Send."
