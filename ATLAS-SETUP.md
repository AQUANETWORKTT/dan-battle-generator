# Atlas Creator Network leadership portal

Domain: https://atlasagency.space. Root opens /atlas/leadership; the existing Atlas password still applies. The transparent logo, favicon and home-screen icon are in public/atlas/.

## Required database setup

1. Create a **new Supabase project for Atlas**. Do not run this setup in First Class.
2. In the new project's SQL Editor, run [supabase/atlas-portal.sql](supabase/atlas-portal.sql). This creates creator history, private settings/templates, mature month totals, atomic import functions and the poster background bucket.
3. On the **Atlas Vercel project**, set these environment variables:

   SITE_MODE=atlas
   ATLAS_SITE_URL=https://atlasagency.space
   ATLAS_SUPABASE_URL=<new Atlas project URL>
   ATLAS_SUPABASE_SERVICE_ROLE_KEY=<new Atlas project server service-role key>
   ATLAS_SESSION_SECRET=<long random secret for signed login sessions>

   Never prefix the service-role key with NEXT_PUBLIC_, paste it into chat, or commit it. ATLAS_PASSWORD_SHA256 is optional if rotating the existing password.
4. Deploy/redeploy from this repository's root (./), using the Next.js preset, and attach atlasagency.space. Keep SITE_MODE=atlas off the First Class deployment.
5. Log into Atlas and open Upload Backstage Data. Choose the export month and the day for each file. After upload, Manager Assignments automatically lists new manager emails in New Managers. Rename/move them there; the poster builder uses these labels.

Without Atlas's two Supabase variables the portal and login build/open, but data tools show a setup message. There is **no fallback to First Class's keys or database**. All Atlas data APIs require Atlas's own signed login. Tables use RLS with server-only access. Poster background artwork is in a public image bucket; creator records, notes, strikes and template records are private.

## Included tools

- Agency Tools: original entry library, generator, single/bulk/2v2 editors.
- Team Posters: selected-day preview, individual PNG and Download All Atlas ZIP.
- Team Poster Builder: saved layouts for each manager or the whole Atlas network.
- Daily Backstage uploads/status and separate mature creator full-month totals.
- Manager Assignments, Manager Strikes and shared Notepad.
- Graduation Tracker, original Mature Creators maintain/rank-up tracker, Incremental Tracking and Creator ID Lookup/history.

No calendar, Telegram, Tasks Space, recruitment tools, onboarding, public diamond/universal leaderboards or other agency target pages are linked. The generator's leaderboard poster layout editor stays as a poster tool.

Daily import replacements commit atomically: a bad file cannot erase existing days. Empty files and duplicate creator IDs are rejected before the import. Creator IDs are stored as text to preserve long TikTok identifiers. Replacing one date keeps all other dates.

Mature totals require a final full-month export; only creators at 200,000+ diamonds are stored in that separate table. Daily data still drives graduation and account history. Incremental thresholds start blank: enter and save Atlas's own monthly thresholds. No First Class figures are preloaded.

## Existing Atlas layouts from the generator-only version

Earlier Atlas layouts were held in the namespaced atlas-generator-workspace-v1 row of the old database's poster_templates table. If any were saved there, export/copy **only that named row** into the new database before switching. Existing background URLs point at the old bucket until the images are copied and URLs updated. The old record is untouched; there is no automatic cross-database fallback or migration. New layouts and images save only to Atlas.

## Verification

- npm run test:atlas: real XLSX parsing, exact IDs, atomic import calls, bad upload rejection, separate mature totals, pagination, manager detection, signed authentication, origin checks, cross-agency template rejection and no First Class browser data calls. Tests use only in-memory fixtures.
- npx tsc --noEmit --incremental false
- SITE_MODE=atlas npm run build
- Live Supabase upload/download verification must be completed after the new project is configured. This checkout has no Atlas database credentials.
