# Prepared morning posters

Successful daily-data uploads queue a durable poster generation in `poster_templates` (`prepared-team-posters-state-v1`). Saved designs, assignments, download exclusions and fallback-picture changes also queue a new generation. No browser tab is needed after the upload response.

The worker runs in Next.js `after()`, with a five-minute route allowance. It freezes the uploaded day, daily diamond/hour values and saved designs, fetches photos and embeds fonts/images into PNGs at 1024 × 1536. It saves progress after each poster. A compare-and-swap revision and expiring lease prevent overlapping workers or an older upload from replacing newer results. Longer runs continue through separately authenticated server requests; interrupted leases can resume from the saved snapshot.

Files and snapshots live in the private Supabase Storage bucket `prepared-team-posters`, created automatically using the existing service-role key. The browser receives neither the service-role key nor the private snapshot. Prepared-file downloads require the signed leadership session, current generation, latest uploaded date and yesterday's UK calendar date. Ready images never fetch photos or render again during download.

The Data Space Team Posters page offers only First Class: Dan/James, Mike/Indi and Whole Agencies, using Manager Assignments. Sub-agencies such as Paradise, Respawn and Horizon are excluded. Individual buttons are red until their current-day PNG exists and green when ready. Teams without creator data display “Team missed”. On Chromium desktop, a batch download asks for a folder and saves separate PNGs. Other browsers download separate files and may request permission for multiple downloads. No ZIP is required. Missing photos are listed explicitly. Presets with no creators in that day's upload are listed separately and do not block usable posters. Failed renders remain visible and require a retry.

## Hosting

- Existing `SUBMISSIONS_SUPABASE_SERVICE_ROLE_KEY` is required for the private storage bucket and job leases.
- `playwright-core` and `@sparticuz/chromium` provide the server renderer. Linux serverless bundles include Chromium through `next.config.ts`; local Windows development uses installed Chrome or Edge. `POSTER_CHROME_EXECUTABLE` optionally selects a persistent host's Chrome executable.
- All seven worker entry points explicitly trace the complete browser packages, including Playwright's dynamically loaded `browsers.json`. Run `npm run build` followed by `node scripts/test-poster-renderer-bundle.cjs` to check the deployment manifests and load the traced Playwright package in an isolated folder. A successful development render alone does not verify the deployed package.
- Server continuation calls the upload request's origin. A preview deployment with hosting-level password protection must allow these authenticated callbacks (or run the resume endpoint from a trusted scheduler).
- For additional recovery after a host is terminated, a scheduler can call `GET /api/team-poster-preparation/run` with `Authorization: Bearer <CRON_SECRET>`. The endpoint only resumes an existing pending job and does not create new generations. No external scheduler is provisioned by this change.
- The web server must stay running for local preparation. Production preparation runs on the deployed server.
- Old generations stay private in Storage. Apply the normal storage retention policy to historical generation folders if required; the application only serves the current generation.

Checks: `node scripts/test-team-poster-preparation.cjs`, `node scripts/test-team-poster-preparation-api.cjs`, `node scripts/test-prepared-poster-status.cjs`, `node scripts/test-team-poster-loading.cjs`, and `npx tsc --noEmit`. After a production build, also run `node scripts/test-poster-renderer-bundle.cjs`.
