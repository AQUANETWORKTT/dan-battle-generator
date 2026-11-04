"""Wait for chat readiness rather than TikTok's full-page load; retry only before Send."""
from urllib.parse import urlparse
import time
import re
from messaging_wait import WaitControl, ReadyLocator, RecipientLocator, ComposerLocator, UserStopped
from name_filter import check_profile_name


class SendClickCompleted(Exception):
    """Exit the legacy adapter after Send succeeds, without its delivery-bubble wait."""


class SendButton:
    def __init__(self, locator, state, control=None):
        self.locator, self.state, self.control = locator, state, control

    def __getattr__(self, name):
        return getattr(self.locator, name)

    def click(self, **kwargs):
        if self.state.get('name_filter_blocked'):
            raise RuntimeError('Profile name filter blocked this creator; no message sent.')
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
        if role == 'textbox' and kwargs.get('name') == 'Send a message...' and self.control:
            restriction = self.frame.get_by_text(re.compile(r'You can only send 1 message until', re.I))
            if any(restriction.nth(i).is_visible() for i in range(min(restriction.count(), 5))):
                raise UserStopped('TikTok limits this conversation to one pending message request; no additional message sent.')
            return ComposerLocator(locator, self.control)
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
    def __init__(self, element, state, control=None, page=None):
        self.element, self.state, self.control = element, state, control
        self.page = page

    def regular_messages(self):
        return self.page is not None and urlparse(self.page.url).path.rstrip('/') == '/messages'

    def current_element(self):
        return self.page.get_by_role('textbox', name='Send a message...') if self.regular_messages() else self.element

    def __getattr__(self, name):
        return getattr(self.element, name)

    @property
    def first(self):
        element = self.current_element()
        return ReadyLocator(element.first, self.control) if self.control else element.first

    def count(self):
        if not self.control:
            return self.current_element().count()
        while True:
            self.control.check()
            count = self.control.call(lambda: self.current_element().count(), "Waiting for the conversation frame.")
            if count == 1:
                return count
            self.control.pause("Waiting for a single unambiguous conversation frame.")

    @property
    def content_frame(self):
        if self.regular_messages():
            return ChatFrame(self.page, self.state, self.control)
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
        resume = self.state.get('resume')
        if resume:
            if url != resume['profile_url'] or self.page.url != resume['chat_url']:
                raise UserStopped('Refreshed conversation changed unexpectedly; skipping without Send.')
            return None
        self.state['profile_url'] = url
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
        if self.state.get('resume') and role == 'button' and kwargs.get('name') == 'Message':
            return ResumedMessageButton(self.page, self.state['resume']['chat_url'], self.control)
        if role == 'button' and kwargs.get('name') == 'Message' and urlparse(self.page.url).path.startswith('/@'):
            try:
                check_profile_name(self.page)
            except Exception as error:
                self.state['name_filter_blocked'] = str(error)
                raise RuntimeError('Profile name check failed; skipped without sending.') from error
        locator = self.page.get_by_role(role, **kwargs)
        return ReadyLocator(locator, self.control) if self.control else locator

    def wait_for_url(self, pattern, **kwargs):
        if "business-suite/messages" not in str(pattern):
            return self.page.wait_for_url(pattern, **kwargs)
        if self.control:
            # Message was clicked. Give the chat twenty seconds, including its
            # frame, recipient verification and composer readiness.
            self.control.deadline = time.monotonic() + 20
            self.state['deadline'] = self.control.deadline
        # The Message button can render the conversation before analytics/media finish loading.
        if urlparse(self.page.url).hostname not in {"www.tiktok.com", "tiktok.com", "business.tiktok.com"}:
            raise RuntimeError("The message page left TikTok; no message was sent.")
        if self.control:
            def ready_surface():
                element = self.page.get_by_role('textbox', name='Send a message...') if urlparse(self.page.url).path.rstrip('/') == '/messages' else self.page.locator(self.selector)
                element.first.wait_for(state='visible', timeout=1000)
            self.control.call(ready_surface, 'The conversation is still loading.')
        else:
            self.page.locator(self.selector).first.wait_for(state="visible", timeout=30000)

    def locator(self, selector):
        locator = self.page.locator(selector)
        return ChatElement(locator, self.state, self.control, self.page) if selector == self.selector else locator


class ResumedMessageButton:
    """Already in the refreshed recipient chat; do not click Message again."""
    def __init__(self, page, chat_url, control):
        self.page, self.chat_url, self.control = page, chat_url, control

    def click(self, **kwargs):
        if self.control:
            self.control.check()
        if self.page.url != self.chat_url:
            raise UserStopped('Refreshed conversation changed unexpectedly; skipping without Send.')


class ChatContext:
    def __init__(self, context, selector, session, should_stop=None, report=None, deadline=None, resume=None):
        self.context, self.selector, self.session = context, selector, session
        self.should_stop, self.report = should_stop, report
        self.deadline = deadline
        self.state = {"attempted": False, "completed": False, 'resume': resume}

    def __getattr__(self, name):
        return getattr(self.context, name)

    def new_page(self):
        page = self.session.get("page")
        if page is None or page.is_closed():
            page = self.context.new_page()
            self.session["page"] = page
        control = WaitControl(page, self.should_stop, self.report, deadline=self.deadline) if self.should_stop else None
        return ChatPage(page, self.selector, self.state, control)


def visible_challenge(page):
    """Best-effort visible challenge check. Unknown detection prevents refresh."""
    try:
        for frame in page.frames:
            markers = (
                frame.locator('iframe[src*="recaptcha"], iframe[src*="hcaptcha"], [id*="captcha"], [class*="captcha"]'),
                frame.get_by_text(re.compile(r'recaptcha|verify (?:that )?you(?: are|’re|\'re) human|complete the captcha', re.I)),
            )
            for marker in markers:
                if any(marker.nth(index).is_visible() for index in range(min(marker.count(), 10))):
                    return True
        return False
    except Exception:
        return None


def send_with_navigation_retry(original, context, username, selector, max_attempts=2, session=None, should_stop=None, report=None):
    session = session if session is not None else {}
    attempt = 0
    refreshed = False
    resume = None
    deadline = time.monotonic() + 45 if should_stop else None
    while max_attempts is None or attempt < max_attempts:
        if should_stop and should_stop():
            return 'CANCELLED', 'Stopped by you before Send.'
        attempt += 1
        tracked = ChatContext(context, selector, session, should_stop, report, deadline, resume)
        try:
            status, detail = original(tracked, username)
        except Exception as error:
            status, detail = "FAILED", str(error)
        if tracked.state.get('name_filter_blocked') and not tracked.state['attempted']:
            return 'FAILED', tracked.state['name_filter_blocked']
        if tracked.state["completed"]:
            return (status, detail) if status == "SENT" else ("SEND_ATTEMPTED", "Send clicked; delivery unverified. Continuing without resending.")
        if tracked.state["attempted"]:
            return "SEND_ATTEMPTED", "Send was invoked but completion is uncertain; continuing without retry."
        if should_stop and should_stop():
            return 'CANCELLED', 'Stopped by you before Send.'
        active_deadline = tracked.state.get('deadline', deadline)
        if active_deadline is not None and time.monotonic() >= active_deadline:
            page = session.get('page')
            challenge = visible_challenge(page) if page is not None and not page.is_closed() else None
            if challenge:
                return 'FAILED', 'Visible CAPTCHA challenge; skipping creator without refreshing or sending.'
            if not refreshed and challenge is False:
                refreshed = True
                if report:
                    report('Readiness wait expired (20 seconds for chat). Refreshing once, then trying this creator again.')
                try:
                    parsed = urlparse(page.url)
                    profile_url = tracked.state.get('profile_url') or (resume or {}).get('profile_url')
                    if parsed.hostname in {'www.tiktok.com', 'tiktok.com'} and parsed.path in {'/messages', '/business-suite/messages'} and profile_url:
                        resume = {'profile_url': profile_url, 'chat_url': page.url}
                    page.reload(wait_until='commit', timeout=1000)
                except Exception as error:
                    if 'timeout' not in type(error).__name__.lower():
                        return 'FAILED', 'Refresh failed before Send; moving to the next creator.'
                deadline = time.monotonic() + 45
                continue
            return 'FAILED', 'Readiness wait expired (20 seconds for chat); no Send invoked. Moving to next creator.'
        if max_attempts is None and status not in {'SENT','SEND_ATTEMPTED','SKIPPED'}:
            page = session.get('page')
            if page is not None and page.is_closed():
                return 'CANCELLED', 'You closed the messaging browser.'
            # Readiness waits share the per-recipient deadline inside the proxies.
            # A completed adapter failure (such as mismatched composer text) is
            # recorded once and returned so the list can move to the next name.
            return status, detail
        if status == "FAILED" and "timeout" in detail.lower() and attempt < max_attempts:
            continue
        return status, detail
    return "FAILED", "The messaging page did not become ready before Send."
