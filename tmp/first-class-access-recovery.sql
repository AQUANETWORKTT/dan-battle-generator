-- Pending explicit approval. Do not run automatically.
-- Target: aqua-admin / dxupgmsscysvztxdtaku, creator_daily_stats only.
-- Reverses the RLS toggle from the accidental Atlas setup.
-- Existing anon permissions allow SELECT, INSERT, UPDATE and DELETE.
-- Disabling RLS reopens those operations to anyone with the public API key.
-- No records, tables, policies, other access settings or Atlas helpers are removed.
ALTER TABLE public.creator_daily_stats DISABLE ROW LEVEL SECURITY;
