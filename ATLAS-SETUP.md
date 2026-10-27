# Atlas Creator Network generator

Local entry: `/atlas/login`. The complete copied generator lives at
`/atlas/generator`, including its single, bulk, 2v2 and team template editors.

No First Class templates or creator records are copied. Atlas templates and
defaults are held in the dedicated `atlas-generator-workspace-v1` record;
uploaded backgrounds use random paths under `atlas/` in poster-backgrounds.
The browser has no direct Supabase connection. Its adapter calls only the
authenticated Atlas API. First Class's existing template routes are unchanged.

The supplied Atlas password is stored as a server-side SHA-256 verifier, not in
the client bundle. To rotate it, set `ATLAS_PASSWORD_SHA256`. Set a long random
`ATLAS_SESSION_SECRET` on the Atlas deployment before public launch.

Deploy this repository separately with `SITE_MODE=atlas` for the future Atlas
domain. Root `/` and `/generator` lead to Atlas; other First Class tools are
blocked on that deployment. Keep the existing database variables for the
namespaced storage, or supply a separate database with the same poster_templates
table and poster-backgrounds bucket. Do not expose database service-role keys.

The logo and domain remain unset. No First Class logo/background is used.
Fonts and generic image helpers are shared code, not agency data.

First Class data imports, calendars and event feeds are deliberately not linked.
Manual poster entry and downloads work without them. Atlas's own live feeds can
be connected separately later. No new website has been published yet.
