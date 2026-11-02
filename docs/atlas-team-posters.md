# Atlas team poster downloads

`/atlas/data/team-posters` now follows the original First Class Team Diamonds Yesterday downloader layout: a full-width Download All Atlas button, saved preset cards grouped by Manager Assignments, Preview and individual Download buttons on every card, and a responsive poster preview. The existing Atlas Team Poster Builder remains linked at `/atlas/generator?workspace=posters`; it already shares the Dan generator's editor structure. Saved templates are preserved without changing their positions, backgrounds, fonts or data-source selection.

Choose an uploaded data date. Preview or Download on a preset fills that preset from its assigned manager (or all Atlas creators). An individual download does not require building a preview first. Download All Atlas produces one ZIP; each group also has a batch action. Errors and skipped presets are reported, and batch ZIPs include skipped-layouts/missing-pictures reports when needed. Missing pictures are explicitly warned about; a poster can still download with an empty picture slot, matching the prior behavior. Use the Atlas builder to correct a picture or retry a preview.

Data remains scoped to signed Atlas routes and the Atlas database. Daily statistics use the existing `posterDate` calculation so cumulative exports receive the same daily adjustment as before. Excluded/deleted managers are omitted, duplicate creator IDs do not fill multiple ranks, diamonds and live hours are ranked independently, and unused ranked slots are cleared instead of showing stale sample names. Request and image waits are bounded, with progress and cancellation available.

`/atlas/data/manager-assignments` now uses the original dark board/card structure with Atlas blue accents. New Managers spans the board width. Full manager emails appear as readable labels on each card, with full-address hover text and a Copy action. Dragging, mobile Move, renaming, and the existing saved assignment payload are retained. Email labels also appear on manager-specific poster cards.

No new environment variables, SQL migration or data migration is required. No production templates or manager assignments were modified during validation.

Validation:

- `npm run test:atlas-posters` — source matching, exclusions, ranking, pictures, stale-slot clearing and template preservation.
- `npm run test:atlas` — existing Atlas isolation, import and authentication fixtures.
- `npx tsc --noEmit` and `npm run build`.
- `scripts/check_atlas_posters_ui.py` against a localhost production server with `ATLAS_TEST_PASSWORD` and optionally `ATLAS_TEST_URL`: fixture preset cards, direct individual PNG, all-Atlas ZIP, manager filtering, mobile overflow, email visibility, Move persistence and Atlas-only requests. Screenshots/downloads are placed in `tmp/atlas-posters-ui`.

Changed implementation: the two Atlas page files, `lib/atlas-team-posters.ts`, package test command, and the fixture/UI checks. First Class pages and APIs are unchanged.
