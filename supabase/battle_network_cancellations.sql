-- Run after battle_network_data_migration.sql.
alter table public.battle_network_battles
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by text;

create index if not exists battle_network_battles_cancelled_at_idx
  on public.battle_network_battles (cancelled_at)
  where cancelled_at is not null;

-- Removes the accidental test agencies created by the old manual-pair flow,
-- including their dependent battle rows so the foreign key remains valid.
delete from public.battle_network_battles
where agency_id in ('jamesvisit', 'jamestest');

delete from public.battle_network_agencies
where id in ('jamesvisit', 'jamestest')
  and external_only = true;
