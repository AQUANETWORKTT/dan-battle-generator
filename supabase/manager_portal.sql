-- Run in the First Class submissions database, not Atlas.
create table if not exists public.manager_portal_accounts (
 id uuid primary key default gen_random_uuid(),
 number bigint generated always as identity unique,
 manager_key text not null unique,
 display_name text not null,
 username text not null unique,
 password_hash text,
 enabled boolean not null default true,
 version integer not null default 0,
 password_changed_at timestamptz,
 updated_at timestamptz not null default now()
);
create or replace function public.manager_portal_username() returns trigger language plpgsql set search_path=public as $$
begin
 if new.username = '' then
  new.username := upper(trim(regexp_replace(new.display_name,'^Team\s+','','i')));
  if new.username = '' then new.username := 'MANAGER ' || new.number::text; end if;
 end if;
 return new;
end $$;
drop trigger if exists manager_portal_username on public.manager_portal_accounts;
create trigger manager_portal_username before insert on public.manager_portal_accounts for each row execute function public.manager_portal_username();
create table if not exists public.manager_portal_sessions (
 token_hash text primary key,
 account_id uuid not null references public.manager_portal_accounts(id) on delete cascade,
 version integer not null,
 expires_at timestamptz not null
);
create table if not exists public.manager_portal_limits (
 key text primary key, started_at timestamptz not null default now(), attempts integer not null default 1
);
create or replace function public.manager_portal_attempt(bucket text) returns boolean language plpgsql security definer set search_path=public as $$
declare n integer;
begin
 insert into manager_portal_limits as l(key) values(bucket)
 on conflict(key) do update set attempts=case when l.started_at < now()-interval '15 minutes' then 1 else l.attempts+1 end,
 started_at=case when l.started_at < now()-interval '15 minutes' then now() else l.started_at end returning attempts into n;
 return n<=10;
end $$;
alter table public.manager_portal_accounts enable row level security;
alter table public.manager_portal_sessions enable row level security;
alter table public.manager_portal_limits enable row level security;
revoke all on public.manager_portal_accounts,public.manager_portal_sessions,public.manager_portal_limits from anon,authenticated;
revoke all on function public.manager_portal_attempt(text) from public,anon,authenticated;
grant execute on function public.manager_portal_attempt(text) to service_role;
grant all on public.manager_portal_accounts,public.manager_portal_sessions,public.manager_portal_limits to service_role;
grant usage,select on sequence public.manager_portal_accounts_number_seq to service_role;
