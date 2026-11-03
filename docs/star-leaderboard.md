# Public creator star leaderboard

`https://firstclassagency.space/star-leaderboard` is a standalone, password-free, read-only creator page. No navigation links, TikTok links or admin tools are shown. The existing Star Tracker remains unchanged.

The first 100 creators appear by total stars, with alphabetical ordering inside a tie. Dense ranks are shared: 1, 1, 2, 2, 3. Search covers the entire current First Class roster and preserves each creator's overall rank. Totals reuse the Star Tracker calculation, including the starting 10 stars and manual adjustments. Latest uploaded usernames and saved manager display names are resolved by creator ID.

The creator deployment proxies the fixed Management `/api/star-leaderboard` endpoint server-side. It returns only public usernames, team names, totals, ranks and an update timestamp. No new database, migration or environment variables are required. The creator endpoint exposes GET only; admin history, emails and edit controls are not returned. The page refreshes every 30 seconds while visible and retains the last successful standings if a refresh fails.

Pictures use saved poster fallback avatars first, otherwise TikTok profile scraping, with lazy image loading and cached image responses. TikTok may withhold an image; matching initials remain visible if it cannot be loaded. Neither pictures nor usernames navigate away from the leaderboard.

Checks: `node scripts/test-star-leaderboard.cjs`, `python scripts/check_star_leaderboard_ui.py`, and `npm run build`.
