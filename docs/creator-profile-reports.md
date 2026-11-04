# Creator profile + LIVE PDF reports

## Use

1. Open **Data Space → Creator API Search → Profile + LIVE Reports**, or the report button on a rankings page.
2. Choose the saved UK/Australian scan and All Available, Premium or Regular. Optionally paste a shortlist. Only confirmed, dated Available results passing the lettering filter are exported.
3. Download the JSON report file. It contains public creator data and the saved Backstage result, not credentials.
4. Double-click `Start Creator Reports.cmd` in the project root. Alternatively use **Profile + LIVE PDF reports** in the List Messaging panel.
5. Load the downloaded file. The default output is `integrations/firstclassbot/profile_report_data/<report-id>/`; an output folder can be selected.
6. Start. Daily history is retrieved first. The separate TikTok report browser then opens; sign in if needed and click **Continue after sign-in**. Keep it open during capture.
7. Use **Open PDF** when finished. Each creator has a landscape page with profile/LIVE captures, clickable TikTok links, dated diamonds, a verified three-day total where complete and the dated Backstage status.

Pause/Resume and Stop are available. Stop takes effect between current network/browser operations. Progress and screenshots are saved after every creator. To resume, load the exact same report file and output folder. Enable the retry checkbox to retry failed history or captures; offline captures remain historical observations. A per-folder OS lock prevents simultaneous writers, and atomic progress/PDF replacement preserves completed work after an interruption.

## History and sorting

The window is the three completed London calendar days preceding report preparation. The official API was verified to return `period`, `type: daily` and numeric `diamonds` from `/creators/{username}/history`. Only matching daily records are summed; monthly records are ignored. Repeated identical daily records are deduplicated; conflicting duplicates become unknown. Missing days stay unknown rather than becoming zero. Complete totals sort descending first; partial histories follow by the sum of their known days. Ranking snapshots are separately labelled and never added as daily totals.

History uses up to one official API call per uncached creator, through the existing server-side key, rate limiter and allowance handling. Results are cached for six hours in isolated `poster_templates` records named `creator-profile-report-history-v1:*`. No SQL migration or new environment variable is needed. The local launcher loads the existing private `CREATOR_SEARCH_WORKER_TOKEN` from the project environment into the child process; it is never written to a report file or browser frontend. Daily allowance/authentication failures preserve progress and stop the run for later resumption.

## Capture boundaries

This tool has no message, invitation or contact-history imports. It does not click Follow, Message, gift, likes or chat controls. Its separate persistent browser profile is not the user's normal Chrome profile. Chrome is used when installed, with Playwright Chromium as a fallback. Profile handles are checked exactly against the requested username; nickname/title roles are identified by exact handle matching rather than assuming which TikTok heading is which. Non-A–Z nicknames are excluded from the PDF, with an aggregate exclusion count on the cover. Emojis/symbols remain allowed.

LIVE capture verifies both the requested URL and the LIVE owner from TikTok's current `SIGI_STATE.LiveRoom.liveRoomUserInfo.user.uniqueId` (or a matching owner-header profile link), and requires a visible ready video. Explicit ended/offline messages are labelled Offline. Unknown ownership, CAPTCHA/login blocks, timeouts and missing video are labelled unavailable, with no screenshot of a different stream substituted. No CAPTCHA bypass is attempted. Captures are muted. A profile can be captured while its posts are unavailable, but the page is explicitly labelled accordingly. Backstage status is the saved check at its stated time, not a promise that eligibility remains unchanged.

## Setup and checks

Python dependencies: `python -m pip install -r integrations/firstclassbot/requirements.txt`; install Playwright Chromium if Chrome is unavailable. The current machine's PDF dependency has been installed. Launch via the provided CMD file so the existing private connection settings are loaded.

Checks include the saved-scan manifest/auth/lettering tests in `scripts/test-creator-api-search.cjs`, `scripts/test_backstage_nickname_filter.py`, `scripts/test_creator_reports.py`, `scripts/check_creator_reports_ui.py`, and the production build. The PDF suite checks 400 creator pages plus a cover, interruption/resume, lock/fingerprint protection, sorting, unknown data, offline detection and wrong-owner rejection. The sample PDF in `output/pdf/creator-report-sample/` uses explicitly synthetic screenshots/data; its pages were rendered and visually inspected. Real public profile/offline capture and current LIVE identity/video structures were also checked without sending messages.

Older Backstage checks discarded nicknames. Restart the checker and recheck those creators once to populate the new nickname field; existing saved eligibility history is preserved rather than overwritten or falsely reclassified as Ineligible.

The PDF is titled Available Creator Report and has an explicit View Profile button on each creator page, linking directly to that username in the reader’s normal browser. Checked dates use ordinal London dates (e.g. Checked 4th November, 17:10). Technical capture captions are retained in local progress for troubleshooting but are not printed. Offline lives read Not live at capture; missing screenshots use simple friendly placeholders. The filename is available-creator-report.pdf. Open PDF automatically opens the new file after rebuilding; existing captured images/progress remain reusable. This update does not change screenshot capture to the ordinary-Chrome controller; the user selected direct profile opening from the PDF.

To update an already-finished report to the new design, reopen the builder, load the same manifest/output folder, and choose Rebuild PDF from saved captures. This does not open TikTok or fetch history again.
