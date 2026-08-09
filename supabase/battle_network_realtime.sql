-- Lets Battle Network clients receive changes made by other agencies.
-- Safe to run once through the Supabase SQL editor or migration runner.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'poster_templates'
  ) then
    alter publication supabase_realtime add table public.poster_templates;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'battle_network_battles'
  ) then
    alter publication supabase_realtime add table public.battle_network_battles;
  end if;
end $$;
