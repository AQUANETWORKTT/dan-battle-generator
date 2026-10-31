"""Keep the active conversation visible for explicit user review after an uncertain send."""


class RetainedPage:
    def __init__(self, page):
        self.page = page

    def __getattr__(self, name):
        return getattr(self.page, name)

    def close(self):
        # The reused adapter always closes in finally. The caller owns review/cleanup.
        pass


class ReviewContext:
    def __init__(self, context):
        self.context, self.pages = context, []

    def __getattr__(self, name):
        return getattr(self.context, name)

    def new_page(self):
        page = self.context.new_page()
        self.pages.append(page)
        return RetainedPage(page)

    def close_review_pages(self):
        for page in self.pages:
            if not page.is_closed():
                page.close()
