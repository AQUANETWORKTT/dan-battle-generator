# Australian rankings

Open Data Space → Creator API Search → **Australian Rankings** (`/data/creator-api-search/australia`). It uses the same protected interface and server-only `TIKLEAP_API_KEY` as UK Rankings, with `region=AU` for league discovery, every league and pagination.

Scans retain their country in the existing run payload. Older scans without a region remain UK (`GB`), so no SQL migration is required. Each tab loads only its own country's latest scan, availability-change history and ranking results. Starting a new Australian scan cannot stop a UK scan. Messaging history remains global to avoid repeated contact across regions. Export filenames are prefixed `au-` or `gb-`. Backstage checks retain the existing worker and A1-downwards batches of at most 30; no invitations or messages are sent by these pages.

The live official `GET https://api.tikleap.com/leagues?region=AU` request returned HTTP 200 with AU league records, including A1, A2 and A3. Existing API credentials work; no new key is needed. A full scan uses the normal existing API allowance and is started by the user, rather than fetching every league automatically during setup.
