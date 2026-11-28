# Bulk Creator Lookup setup

Apply `bulk_creator_lookup.sql` once in the existing First Class Supabase SQL
Editor before rollout. This adds two partial indexes and a read-only function;
it does not replace tables or change creator uploads. The function is callable
only with the server service role, behind the app's signed leadership login.

Without the migration the app uses paginated, literal case-insensitive bulk
queries. That compatibility path is functional but reads matching history rows
and cannot provide the same indexed performance guarantee. No admin SQL access
is available through the app's existing database key, so deployment must apply
this file separately.

Lookup matches exact recorded usernames, including historical names, then uses
the most recently saved assignment for that account ID. It resolves display
names, aliases and deleted managers using the existing manager assignment model.
It does not infer managers from a creator's diamonds or change any assignments.
If a username was reused by multiple accounts, its latest recorded account wins.

History is loaded only when expanded. It reports observed manager changes from
saved uploads, with current configured team labels; it cannot reconstruct label
changes made between uploads. It is excluded from copied results.

Run `node scripts/test-bulk-creator-lookup.cjs` for isolated checks or add
`--live` for a read-only check against configured First Class data.
