-- When an opponent battle is removed (manual/external cancellation), safely
-- clear the matching opponent reference instead of blocking the deletion.
alter table public.battle_network_battles
  drop constraint if exists battle_network_battles_opponent_battle_id_fkey;

alter table public.battle_network_battles
  add constraint battle_network_battles_opponent_battle_id_fkey
  foreign key (opponent_battle_id)
  references public.battle_network_battles(id)
  on delete set null;
