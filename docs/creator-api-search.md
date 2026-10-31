# Creator API Search — existing First Class Data Space

The new tile is in Data Space → Creator Recruitment. It opens two pages inside the existing portal:

- `/data/creator-api-search/rankings`
- `/data/creator-api-search/lookup`

No separate website is required. Atlas and existing Data Space tools are unchanged.

## Configure the existing portal

Add these **server-side** environment variables to the existing First Class Vercel project (and `.env.local` for local development):

| Variable | Value |
| --- | --- |
| `TIKLEAP_API_KEY` | Official Bearer key from your TikLeap account's API section. The key normally starts `tlk_`. A TikLeap website cookie is not an API key. |
| `NEXT_PUBLIC_SUBMISSIONS_SUPABASE_URL` | Existing **First Class** Supabase project URL. This is the same database used by this portal, not Atlas. |
| `SUBMISSIONS_SUPABASE_SERVICE_ROLE_KEY` | Server-only service-role key from that First Class Supabase project's API settings. Never put this key in a `NEXT_PUBLIC_` variable. |
| `CREATOR_SEARCH_WORKER_TOKEN` | A new private random secret, at least 32 characters. Set the same value on the portal and the Backstage worker. Required only to connect Backstage. |
| `CREATOR_SEARCH_SESSION_SECRET` | Optional independent random session secret, at least 32 characters. Otherwise the database server key signs the feature's session. |
| `TIKLEAP_MIN_INTERVAL_MS` | Optional request spacing, minimum 2100 milliseconds. The default stays below the documented 30-request/minute Premium burst limit. |

Generate a fresh random secret locally with `python -c "import secrets; print(secrets.token_hex(32))"`. Keep API keys, worker secrets and browser profiles private. Do not commit them or paste them into chat.

In the **First Class database's SQL editor**, run only [`supabase/creator_api_search.sql`](../supabase/creator_api_search.sql). This creates three new private tables and three service-role-only functions. It does **not** alter existing creator stats, posters, onboarding data, policies or Atlas settings. This migration has not been applied automatically.

Redeploy/restart after configuring the environment. Sign into the existing **Leadership** login again to receive the protected Creator API Search session, then use the existing Data Space access gate. There is no separate feature password. The signed, HTTP-only session prevents someone from accessing these private endpoints using only the legacy plain portal cookie. Other login roles do not receive this session.

## UK rankings and saved history

“New Scan” discovers the leagues returned by `GET /leagues?region=GB`, fetches every discovered league, then queues availability checks when the worker is configured. Results save after successful requests, deduplicate usernames and retain league memberships. The previous-scan dropdown has been removed; only the current scan is presented.

The current scan is stored so a refresh or another device can recover it. A lease prevents concurrent overwrites. “Stop Scan” cancels the selected run's ranking loop and queued/running jobs, invalidates their leases and keeps saved results exportable. A request already in flight may finish reading but cannot save after cancellation. “New Scan” stops only the displayed previous run; permanent contact history is retained. Partial league failures, missing leagues, retries and quotas remain visible. Exports cover all matches, not just the visible page.

The official league documentation does not list pagination filters. The implementation follows explicit same-endpoint next links or `next_cursor` if returned. If the reported `users_count` exceeds the returned unique usernames without pagination information, it flags the league as incomplete rather than claiming all creators were fetched. No undocumented page/limit filters are guessed.

## Creator lookup

Uses only documented **GET** endpoints for profile, performance history, tracked streams, stream details/events and gift-gallery periods/details. It does not start stream tracking, alter watchlists, send messages or send invitations. History pagination uses the documented cursor. Every successful response, its request path, timestamp and quota headers remain available in the raw-response section, including all loaded history pages.

Missing values remain “Not returned”; earnings come from the API rather than an invented diamonds conversion. Provider package restrictions and individual endpoint failures are displayed separately so successful sections remain visible. Fields and history depth depend on your TikLeap package. Stream data is whatever TikLeap has already tracked; this page does not initiate paid tracking.

Primary reference: [official TikLeap API documentation](https://www.tikleap.com/api-docs). Authenticated UK league requests were verified on 31 October 2026. One D2 record contained invisible formatting characters in its username. The parser now retains other valid records while flagging unsupported names for review, rather than stripping characters and risking a match to a different account. This does not claim every creator-lookup endpoint or package allowance has been tested live.

## Connect your existing Backstage checker

`integrations/firstclassbot/backstage_checker.py` reuses the eligibility implementation found at `C:/Users/james/OneDrive/Desktop/FirstClassBot/backstage_checker.py`. Its original source remains untouched. The new worker imports only that eligibility module, never `bot.py` or the message/invitation senders.

The checker opens Backstage's “Invite creators” preflight, enters a username, presses “Next” and reads the exact username row's status. It does not press any final invite/send action. Ambiguous matches stay Pending, and exhausted network/time-out retries become Failed.

Run the worker on a trusted Windows computer with Python and a browser; it cannot run as a persistent browser inside Vercel. In PowerShell from the repository:

```powershell
python -m pip install -r integrations/firstclassbot/requirements.txt
python -m playwright install chromium
$env:CREATOR_SEARCH_PORTAL_URL = 'https://firstclassagency.management'
$env:CREATOR_SEARCH_WORKER_TOKEN = '<same private secret configured on the portal>'
python integrations/firstclassbot/worker.py
```

Use the final canonical HTTPS portal origin, without a path. Local development may use `http://localhost:3000`. Redirects are rejected so the token cannot be forwarded to another host.

A dedicated browser profile opens. Sign into Backstage manually, then press Enter in the worker terminal. Its profile is separate from your running FirstClassBot and excluded from Git. Keep this computer/worker open while checking. The page reports “connected” only after a recent ready heartbeat. Real 30-username preflight batches were verified on 31 October 2026; no invitation or message was sent. The checker reads only the invitation dialog's result table, excluding background manager tables.

The checker enters up to 30 usernames together, one per line, in a single Backstage preflight. Results are matched by actual username, never nickname or row order, and saved once per batch. Network retries submit unresolved names only. Failed means the result could not be read, not that eligibility was rejected. Select failed/uncertain rows and press “Check Backstage Availability” to recheck them. Interrupted jobs can resume after their ten-minute lease, unless Stop Scan cancelled them.

## Available lists and messaging history

Run `supabase/creator_api_search_workflow.sql` after the original migration. It adds one private contacts table, one sync timestamp and service-role-only scan/history functions. It does not modify creator stats or the original bot database. This upgrade was applied to the existing First Class project during setup.

The three manager exports are All Available, All Available (Premium), and All Available (Regular), each in CSV/TXT. They ignore message history. Premium/Regular comes strictly from Backstage's Invitation type column, never league or estimated diamonds; missing/ambiguous labels remain Unknown and appear only in All Available.

Available — Not Previously Messaged excludes both confirmed sends and uncertain attempts. It requires a complete successful history sync within five minutes; unknown or stale history cannot silently become an empty exclusion list. Previously Messaged displays/exports the complete confirmed-send history independently of scans. Checking availability, starting a scan or downloading a list never marks someone as messaged.

The local worker reads `FirstClassBot/creators.db` in SQLite read-only mode every 60 seconds. Only normalized usernames, send statuses and recorded dates are synced; message bodies are neither read nor copied. SENT/MESSAGED/DELIVERED are confirmed. PENDING/UNKNOWN/SEND_ATTEMPTED/UNCERTAIN are held for review and excluded from the fresh list. Failed/not_sent or merely discovered creators are not treated as messages. A confirmed send cannot be downgraded by a later uncertain import. The history is only as complete as this bot's records and cannot infer messages sent outside it or reliably link renamed accounts without a saved ID.

The default source is `C:/Users/james/OneDrive/Desktop/FirstClassBot/creators.db`. Override it locally with `CREATOR_SEARCH_BOT_DB` or `--contacts-db`. Do not set this local filename as a Vercel database connection. To sync without opening Backstage or scanning:

```powershell
node integrations/firstclassbot/start-checker.cjs --sync-only
```

For normal use, double-click `integrations/firstclassbot/Start Backstage Checker.cmd`.

### Worker backend contract

All worker requests use `Authorization: Bearer <CREATOR_SEARCH_WORKER_TOKEN>`. The token never reaches the frontend.

- `POST /api/creator-api-search/worker/claim` with `{"ready":true}` returns `{"job":null}` or a leased job containing `id`, `lease_token`, `usernames` (1–30), and any previously saved `results`. Sending `ready:false` records an offline/not-ready heartbeat and claims nothing.
- `POST /api/creator-api-search/worker/results/{job-id}` with `{"leaseToken":"<job lease UUID>","results":[{"username":"example","status":"Available","reason":"Exact row confirmed"}]}` saves partial progress. Valid statuses are Available, Ineligible, Pending and Failed. The server supplies timestamps and rejects usernames outside the leased batch, duplicates, expired leases or more than 30 results. HTTP 409 means stop using that lease.

The worker initiates outbound requests to the portal; Vercel never needs to reach a private localhost address.

## Validation

```powershell
npm run test:creator-api-search
python scripts/test_creator_api_worker.py
python scripts/test_creator_api_batch.py
python scripts/test_creator_api_contacts.py
npm run build
```

Fixtures exercise official response parsing, pagination, deduplication, partial persistence/retries, quota/rate responses, key redaction, signed leadership/worker authentication, exact username mapping and 30-person batches. Python fixtures check the reused Backstage logic and conservative status mapping without opening a browser or contacting anyone. These tests do not substitute for configuring and verifying your live provider account.
