# Available Creators

Leadership entry: `/data/available-creators`, next to Creator API Search in Data Space.

## Daily operation

1. Open the existing local Backstage Checker and leave it running and signed in.
2. Open Creator API Search, select the relevant UK/Australian scan, select creators, and press Check Backstage Availability. New ranking fetches remain in that section too.
3. The checker continues using its existing safe 30-creator batches. This feature never invites or messages anyone.
4. Results automatically appear in Available Creators. Run checks twice a day if desired; no automatic twice-daily scan is configured.
5. Copy manager link gives a signed, read-only link lasting 30 days. Anyone possessing that link can view this directory, but cannot open the wider portal, use paid API actions, or operate the checker. Generate a new link when it expires. Existing links remain valid until expiry or rotation of the existing signing secret.

The panel refreshes saved results every 30 seconds while visible. Server results are cached for 20 seconds. Last Backstage check means the latest actual result received, not a claim that the whole directory was checked at that moment. Every card has its own timestamp; results over 12 hours old are labelled and can be filtered out. Availability may change after a check. Failed latest observations conservatively remove a creator until a successful Available check returns. Pending jobs without an observation do not overwrite the last completed result.

## Data and performance

- Reads existing `creator_api_search_jobs` and referenced `creator_api_search_runs`, paginating jobs to avoid the Supabase default row cap.
- Resolves latest checked results across scans, with Creator ID used where provided. Latest Ineligible/Failed results remove previously Available entries. Region comes from the matching scan, never guessed from display text.
- Existing non-English lettering exclusions apply to checked nickname, rankings and cached profile. Legacy results without Backstage nicknames remain visibly labelled; recheck them to obtain that missing field.
- Browsing performs no TikLeap API calls. Ranking diamonds are labelled snapshots. Three-day values use only the last three completed London dates, reusing the report history cache; missing days remain unknown.
- Leadership can click Update photos & performance for matching creators, or update a single card in Details. This may use up to two requests per uncached creator. Profile responses are cached one hour under `poster_templates` name `available-creator-profile-v1:<username>`; report history cache remains six hours. Already saved progress survives stopping or quota/provider errors. Stop finishes the current request before exiting; the browser must stay open while updating.
- LIVE status is explicitly a timestamped snapshot, not a continuous live monitor. The live filter includes only Live snapshots less than 15 minutes old. A cached one-hour profile may not qualify; no false Offline state is inferred for unknown profiles.
- Cards use cached API avatars; failures fall back to initials. No bulk screenshot or browser automation starts from the directory.
- Manager views can search, filter, sort, copy/download matching usernames and open TikTok profiles/live links. They read only saved data; no contact/message history is exposed.

## Configuration and validation

No SQL migration or new environment variables. Uses existing `SUBMISSIONS_SUPABASE_SERVICE_ROLE_KEY`, submissions database URL, `TIKLEAP_API_KEY`, and optional `CREATOR_SEARCH_SESSION_SECRET` (falls back to the existing server service key, as Creator API Search already does). No server secrets go to the client.

The read-only manager link is domain-specific signed scope `available-creators`; it is not accepted as a leadership session. API/page isolation retains Atlas/events boundaries. Responses are private/no-store and the manager page sends no referrer.

Checks: `node scripts/test-available-creators.cjs`; `python scripts/check_available_creators_ui.py`; production build. UI checks use mocked results and do not spend API credits or start Backstage.
