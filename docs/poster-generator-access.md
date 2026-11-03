# First Class Poster Generator entry

## Choosing manager templates

In Leadership → Agency Tools, use **Manager Poster Generator · Template Access** below the generator. Tick saved designs and press **Save Manager Template Access**. Selections are shared across devices, using the existing `poster_templates` settings store; no SQL migration is needed. New designs are private until enabled. Unchecking a design removes it from subsequent manager loads, without changing or deleting the design. With no designs enabled, the manager generator displays an explanatory message rather than a fallback design. Managers should refresh after a selection changes; already downloaded posters cannot be withdrawn.

The First Class Space selection page links to `/login/poster-generator`, password **FC1** (case sensitive). It opens `/poster-generator` with Single, 2v2 and H2H generation, automatic creator pictures, saved-design selection and downloads. Mass is available only in the existing Leadership generator.

Both entrances share `app/generator/BattleGenerator.tsx`. Leadership → Agency Tools → `/generator` keeps its existing template editor. The FC1 entrance has no template editor, positioning controls, default-setting controls, template saves/deletes or Data Space access. It does not synchronise posters to the battle calendar.

The separate signed, HTTP-only session permits only the read-only template/photo endpoints under `/api/poster-generator`. Use `POSTER_GENERATOR_SESSION_SECRET` with at least 32 random characters, or the existing configured server signing/service-role secret is used. No database migration is required; it uses the existing First Class saved templates and avatar service.

Checks: `node scripts/test-poster-generator-access.cjs`, `npx tsc --noEmit`, `npm run build`, and the localhost-only browser check `scripts/check_poster_generator_ui.py`.
