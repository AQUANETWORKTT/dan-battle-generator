# First Class Manager Portal

## Enable manager accounts

1. Open the **First Class submissions** Supabase project (not Atlas).
2. Open SQL Editor → New query.
3. Paste the contents of `supabase/manager_portal.sql` and run it once. This creates three new private tables; it does not replace existing uploads, onboarding records or assignments.
4. Deploy these changes, then sign in through Leadership and open **Data Space → Manager Access**.
5. Accounts are populated from Manager Assignments, including detected active managers. The username is their manager name without the leading “Team”. Duplicate names receive a number to keep logins unique. You can edit the username and set/reset the password on each account.
6. Managers enter at `/login/manager`. They cannot change their password. Owners control passwords and enabled status.

No new environment variables are required. The existing `NEXT_PUBLIC_SUBMISSIONS_SUPABASE_URL` and server-only `SUBMISSIONS_SUPABASE_SERVICE_ROLE_KEY` must point to that same project. Leadership authentication uses the existing signed leadership cookie. Passwords are salted scrypt hashes; sessions are opaque tokens stored hashed in the private database. Username/password/enabled changes invalidate prior sessions.

## Portal

- `/manager`: daily overview and priority check-ins.
- `/manager/creators`: latest assigned roster, pictures and monthly stats.
- `/manager/posters`: approved single-poster designs only. Original Agency Tools keeps the full builder. Existing `/poster-generator` links go to the new manager portal.
- `/data/manager-access`: owner account controls.
- Data Space also has the First Class daily briefing.

Advice uses the latest uploaded day, not real-time LIVE status. It follows permanent creator IDs across name changes, uses the current roster, and excludes multi-day aggregate rows to avoid double counting. Month comparisons are withheld when daily uploads are incomplete. Priorities focus on creators with at least 20,000 diamonds this or last month. There is no to-do list yet.

## Validation performed

- `npx tsc --noEmit --pretty false`
- `node scripts/test-manager-portal.cjs`: manager isolation, transfers, name changes, duplicate rows, aggregate rows, missing days, password hashing and owner access.
- `node scripts/test-h2h-posters.cjs`: existing poster parsing regression checks.
- `node scripts/check-manager-portal-data.cjs`: read-only real-upload summary check. Latest upload 10 November 2026, 791 current First Class creators. Account table check confirmed migration is still required.
- Local login HTTP 200 and desktop/mobile visual checks.
- Favicon uses an RGBA PNG inside ICO; outside-ring alpha confirmed transparent.

Live account creation/login cannot be tested until the migration is applied. No migration has been applied, no manager passwords set, and no deployment performed by this task.

## Branding

Entrance now has Leadership, Manager Portal and the streamer card with five stars. Onboarding and Battle Network entrance cards were removed; historical records and their underlying tools were not deleted.

Generated with the built-in image tool from the supplied logos:

- `public/branding/first-class-space.png`: preserve FIRST CLASS, metallic gold angular lettering and black background; replace AGENCY with widely spaced SPACE centred below.
- `public/branding/first-class-managers.png`: same prompt, replacing AGENCY with MANAGERS.
- `public/branding/first-class-ring-transparent.png`: remove only the area outside the gold ring, retaining the black centre and gold lettering.

Ribbons are native SVG/CSS with slow motion and a reduced-motion fallback, not a video from Kling. The favicon and Apple icon are generated from the transparent-ring asset.
