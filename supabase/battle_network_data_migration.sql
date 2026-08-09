-- Run this once in the Supabase SQL editor before deploying the table-backed Battle Network.
-- It preserves the existing poster_templates JSON data and copies it into the new tables.

alter table public.battle_network_agencies
  add column if not exists password text;

alter table public.battle_network_battles
  add column if not exists legacy_id text;

create unique index if not exists battle_network_battles_legacy_id_idx
  on public.battle_network_battles (legacy_id)
  where legacy_id is not null;

insert into public.battle_network_agencies (id, name, accent, logo_url, external_only, password)
values
  ('paradise', 'PARADISE', '#d6a65e', '/agency-logos/paradise.png', false, 'GEE56'),
  ('respawn', 'RESPAWN', '#28d7c3', '/agency-logos/respawn.png', false, 'NICK12'),
  ('horizon', 'HORIZON', '#f97316', '/agency-logos/horizon.png', false, 'DENS34'),
  ('trident', 'TRIDENT', '#38bdf8', '/agency-logos/trident.png', false, 'MARCY78'),
  ('first-class-dan-james', 'FIRST CLASS DAN / JAMES', '#facc15', '/world-cup-2026/agencies/first-class.png', false, 'DAN44'),
  ('honey-bloom', 'HONEY BLOOM', '#f5b942', '', false, 'ABY33'),
  ('external-agency', 'EXTERNAL AGENCY', '#94a3b8', '', false, 'BATTLE')
on conflict (id) do update set
  name = excluded.name, accent = excluded.accent, logo_url = excluded.logo_url,
  external_only = excluded.external_only, password = excluded.password;

with settings as (
  select template_json from public.poster_templates where name = 'battle-network-settings'
), agencies as (
  select jsonb_array_elements(coalesce(template_json->'agencies', '[]'::jsonb)) as agency from settings
)
insert into public.battle_network_agencies (id, name, accent, logo_url, external_only, password)
select
  lower(regexp_replace(trim(agency->>'id'), '[^a-z0-9]+', '-', 'g')),
  upper(trim(agency->>'name')),
  coalesce(nullif(agency->>'accent', ''), '#94a3b8'),
  coalesce(agency->>'logoUrl', ''),
  coalesce((agency->>'externalOnly')::boolean, false),
  coalesce(nullif(agency->>'password', ''), 'EXTERNAL')
from agencies
where coalesce(trim(agency->>'id'), '') <> '' and coalesce(trim(agency->>'name'), '') <> ''
on conflict (id) do update set
  name = excluded.name, accent = excluded.accent, logo_url = excluded.logo_url,
  external_only = excluded.external_only, password = excluded.password;

with settings as (
  select template_json from public.poster_templates where name = 'battle-network-settings'
), battles as (
  select jsonb_array_elements(coalesce(template_json->'battles', '[]'::jsonb)) as battle from settings
)
insert into public.battle_network_battles (
  id, legacy_id, agency_id, week_start, day, creator_username, manager, size, power_ups,
  requested_time, actual_time, created_at
)
select
  case when battle->>'id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then (battle->>'id')::uuid else gen_random_uuid() end,
  battle->>'id',
  lower(regexp_replace(trim(battle->>'agencyId'), '[^a-z0-9]+', '-', 'g')),
  coalesce(nullif(battle->>'weekStart', '')::date, current_date),
  coalesce(nullif(battle->>'day', ''), 'MONDAY'),
  trim(leading '@' from battle->>'creatorUsername'),
  coalesce(battle->>'manager', ''),
  coalesce(nullif(battle->>'size', ''), 'LESS THAN 1K'),
  case when upper(battle->>'powerUps') = 'NPU' then 'NPU' else 'POWER-UPS ALLOWED' end,
  coalesce(nullif(battle->>'requestedTime', '')::time, '00:00'::time),
  coalesce(nullif(battle->>'actualTime', '')::time, nullif(battle->>'requestedTime', '')::time, '00:00'::time),
  coalesce(nullif(battle->>'createdAt', '')::timestamptz, now())
from battles
where coalesce(trim(battle->>'id'), '') <> ''
  and coalesce(trim(battle->>'agencyId'), '') <> ''
  and coalesce(trim(battle->>'creatorUsername'), '') <> ''
on conflict (legacy_id) where legacy_id is not null do update set
  agency_id = excluded.agency_id, week_start = excluded.week_start, day = excluded.day,
  creator_username = excluded.creator_username, manager = excluded.manager, size = excluded.size,
  power_ups = excluded.power_ups, requested_time = excluded.requested_time,
  actual_time = excluded.actual_time;

with settings as (
  select template_json from public.poster_templates where name = 'battle-network-settings'
), battles as (
  select jsonb_array_elements(coalesce(template_json->'battles', '[]'::jsonb)) as battle from settings
)
update public.battle_network_battles target
set opponent_battle_id = opponent.id
from battles source
join public.battle_network_battles opponent on opponent.legacy_id = source.battle->>'opponentBattleId'
where target.legacy_id = source.battle->>'id'
  and coalesce(source.battle->>'opponentBattleId', '') <> '';
