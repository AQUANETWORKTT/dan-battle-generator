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

“Fetch All UK Rankings” discovers the leagues returned by `GET /leagues?region=GB`, then fetches every discovered league. It does not invent leagues that the provider does not list. Results save after every successful request, deduplicate usernames and retain all returned league memberships.

Each fetch creates a timestamped database record. Closing the page stops automatic processing; reopen the saved fetch and resume. Another device can open the same saved history. A lease prevents simultaneous requests from overwriting one fetch. Partial league failures, missing leagues, retries and quota exhaustion stay visible. CSV/TXT exports include all deduplicated usernames, not only the table's current page.

The official league documentation does not list pagination filters. The implementation follows explicit same-endpoint next links or `next_cursor` if returned. If the reported `users_count` exceeds the returned unique usernames without pagination information, it flags the league as incomplete rather than claiming all creators were fetched. No undocumented page/limit filters are guessed.

## Creator lookup

Uses only documented **GET** endpoints for profile, performance history, tracked streams, stream details/events and gift-gallery periods/details. It does not start stream tracking, alter watchlists, send messages or send invitations. History pagination uses the documented cursor. Every successful response, its request path, timestamp and quota headers remain available in the raw-response section, including all loaded history pages.

Missing values remain “Not returned”; earnings come from the API rather than an invented diamonds conversion. Provider package restrictions and individual endpoint failures are displayed separately so successful sections remain visible. Fields and history depth depend on your TikLeap package. Stream data is whatever TikLeap has already tracked; this page does not initiate paid tracking.

Primary reference: [official TikLeap API documentation](https://www.tikleap.com/api-docs). The public API origin and unauthenticated 401 response were checked, and the documented response fields/wrapper were inspected. **Authenticated live requests have not been verified because an official Bearer key is not configured locally.** Once configured, test a lookup and a rankings fetch and inspect per-league errors/raw fields before relying on the results.

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

A dedicated browser profile opens. Sign into Backstage manually, then press Enter in the worker terminal. Its profile is separate from your running FirstClassBot and excluded from Git. Keep this computer/worker open while checking. The page reports “connected” only after a recent ready heartbeat; a configured token alone does not imply Backstage is connected. **No live Backstage checks were run during implementation.**

The page queues batches of at most 30. Each creator's confirmed result saves immediately against the exact normalized username. Interrupted jobs resume after the ten-minute lease expires, retaining already saved results. Use “Retry Failed” after fixing network/login issues; Pending manual-review results can be selected and checked again. “Export Available” includes confirmed Available results only. Eligibility is a timestamped check, not a promise that availability cannot change.

### Worker backend contract

All worker requests use `Authorization: Bearer <CREATOR_SEARCH_WORKER_TOKEN>`. The token never reaches the frontend.

- `POST /api/creator-api-search/worker/claim` with `{"ready":true}` returns `{"job":null}` or a leased job containing `id`, `lease_token`, `usernames` (1–30), and any previously saved `results`. Sending `ready:false` records an offline/not-ready heartbeat and claims nothing.
- `POST /api/creator-api-search/worker/results/{job-id}` with `{"leaseToken":"<job lease UUID>","results":[{"username":"example","status":"Available","reason":"Exact row confirmed"}]}` saves partial progress. Valid statuses are Available, Ineligible, Pending and Failed. The server supplies timestamps and rejects usernames outside the leased batch, duplicates, expired leases or more than 30 results. HTTP 409 means stop using that lease.

The worker initiates outbound requests to the portal; Vercel never needs to reach a private localhost address.

## Validation

```powershell
npm run test:creator-api-search
python scripts/test_creator_api_worker.py
npm run build
```

Fixtures exercise official response parsing, pagination, deduplication, partial persistence/retries, quota/rate responses, key redaction, signed leadership/worker authentication, exact username mapping and 30-person batches. Python fixtures check the reused Backstage logic and conservative status mapping without opening a browser or contacting anyone. These tests do not substitute for configuring and verifying your live provider account.
