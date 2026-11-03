# I'm a Streamer, Get Me Out of Here! – Star Tracker

## Access and navigation

The jungle tile is next to Onboarding on `/login` (First Class Space). The tracker is `/star-tracker`, also linked from Data Space → Events. It uses the existing Leadership sign-in or Ash Onboarding password. Leadership uses its existing signed session; a successful Ash Onboarding sign-in issues an additional signed, HTTP-only session scoped only to this tracker. Previously signed-in onboarders may need to sign in once again. The tracker never grants Leadership/Data Space access. Atlas and Events deployments do not expose its API.

## Creators and storage

Creators come from the latest non-month-total `creator_daily_stats` upload, paginated beyond Supabase's 1,000-row limit. Filtering uses the stored `agency`, `team`, `group_name` and `manager-assignment-settings` affiliations, with the same legacy Respawn manager identities used by Manager Assignments. Separate agencies are excluded; usernames are never used to guess affiliation. Creator IDs are the record identity, so username changes preserve awards. Refresh adds newly uploaded creators without touching awards. Missing/invalid creator IDs are not used as substitute username identities.

Storage follows the existing Onboarding/workspace convention in `poster_templates`, using **one separate namespaced row per creator and campaign**, named `streamer-star-tracker-v1:<creator ID>:<campaign>`. These are settings records, excluded from poster-template selectors by the existing template shape filter. No SQL or new environment variables are required. The server uses the existing `SUBMISSIONS_SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUBMISSIONS_SUPABASE_URL`; the browser receives neither service credentials nor unfiltered agency data. This uses the existing table's database access model; API access additionally requires a signed Leadership/tracker session.

Starting Stars are fixed at 10. The seven campaign values are absolute, nonnegative whole-number awards (0–1,000,000), never additive mutations. The unique existing `poster_templates.name` constraint prevents duplicate creator/campaign records. A revision comparison prevents lost updates; conflicts return the current saved value rather than overwriting it. Repeating a save of the same value returns success without adding stars. Existing creator information and onboarding records are never updated by this feature.

## Editing

Fields save on blur or Enter. Save edits saves all unfinished values. Totals show valid local edits immediately; sorting updates after confirmation so a row does not jump while typing. Failed saves remain on screen with retry/use-saved controls. Local browser drafts are backed up and restored after reopening; these drafts are not confirmed awards until a successful save. Refresh is disabled while edits are unfinished. A navigation warning protects unfinished edits. A failed network request never displays a successful save. Another device's confirmed awards load on refresh/reopening.

The nine-column table scrolls inside its own region, with sticky headers and username cells; Total Stars stays in the username cell. Forty rows per page limit rendering on phones. The leaderboard and username search use the complete fetched roster.

## Assets

Prepared with the built-in imagegen tool from the supplied reference images:

- `public/star-tracker/jungle-landscape.png`: prompt: remove all original programme lettering/logo and seamlessly reconstruct the rainforest cliffs, waterfall and trees; preserve the blue sky, sunlight and scenery; no text.
- `public/star-tracker/gold-star.png`: prompt: isolate the supplied faceted gold star, remove black background and edge specks, preserve gold facets/orientation, output actual transparency. The output alpha channel is retained. Next Image optimises small star displays.

## Checks and release

Run `node scripts/test-star-tracker.cjs`, `npx tsc --noEmit`, `npm run build`. Browser verification is `scripts/check_star_tracker_ui.py` against a localhost server; it uses fixture writes, not real creator awards. The live integration check separately verifies real roster reads and a temporary record's persistence/retry/conflict handling, removing only its own temporary record afterward.

Deploy the existing repository to the existing First Class Management Vercel project. No separate site, project or database is needed. If CLI deployment credentials are unavailable, commit/push these changes to the existing production branch and let its existing Vercel integration deploy them.
