-- Run in the EXISTING First Class / Dan Vault database.
-- Adds ONLY three new feature tables/functions. Never alters existing tables,
-- their policies, creator records, poster templates, uploads or RLS settings.
begin;
create table if not exists public.creator_api_search_runs(
 id uuid primary key default gen_random_uuid(),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 status text not null default 'running',payload jsonb not null,summary jsonb not null default '{}',
 lease_token uuid,leased_until timestamptz
);
create table if not exists public.creator_api_search_jobs(
 id uuid primary key default gen_random_uuid(),run_id uuid not null references public.creator_api_search_runs(id),
 usernames jsonb not null check(jsonb_typeof(usernames)='array' and jsonb_array_length(usernames) between 1 and 30),
 results jsonb not null default '{}',status text not null default 'queued' check(status in ('queued','running','completed')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),lease_token uuid,leased_until timestamptz
);
create index if not exists creator_api_jobs_run on public.creator_api_search_jobs(run_id,created_at);
create index if not exists creator_api_jobs_queue on public.creator_api_search_jobs(status,created_at);
create table if not exists public.creator_api_search_control(id text primary key,next_api_at timestamptz not null default now(),last_worker_seen_at timestamptz,worker_ready boolean not null default false);
insert into public.creator_api_search_control(id) values('tikleap') on conflict do nothing;
alter table public.creator_api_search_runs enable row level security;
alter table public.creator_api_search_jobs enable row level security;
alter table public.creator_api_search_control enable row level security;
revoke all on public.creator_api_search_runs,public.creator_api_search_jobs,public.creator_api_search_control from anon,authenticated;
grant all on public.creator_api_search_runs,public.creator_api_search_jobs,public.creator_api_search_control to service_role;
create or replace function public.creator_api_claim_run(run_id uuid,claim_token uuid) returns setof public.creator_api_search_runs language sql security invoker set search_path=public,pg_temp as $$
 update public.creator_api_search_runs set lease_token=claim_token,leased_until=now()+interval '90 seconds'
 where id=run_id and (lease_token is null or leased_until<now()) returning *;
$$;
create or replace function public.creator_api_reserve_slot(spacing_ms integer) returns timestamptz language plpgsql security invoker set search_path=public,pg_temp as $$
declare slot timestamptz;
begin
 select greatest(next_api_at,now()) into slot from public.creator_api_search_control where id='tikleap' for update;
 if slot>now()+interval '9 seconds' then return slot; end if;
 update public.creator_api_search_control set next_api_at=slot+(greatest(2100,least(spacing_ms,60000))*interval '1 millisecond') where id='tikleap';
 return slot;
end $$;
create or replace function public.creator_api_claim_job(claim_token uuid) returns setof public.creator_api_search_jobs language sql security invoker set search_path=public,pg_temp as $$
 update public.creator_api_search_jobs set status='running',lease_token=claim_token,leased_until=now()+interval '10 minutes',updated_at=now()
 where id=(select id from public.creator_api_search_jobs where status='queued' or (status='running' and leased_until<now()) order by created_at for update skip locked limit 1) returning *;
$$;
revoke all on function public.creator_api_claim_run(uuid,uuid),public.creator_api_reserve_slot(integer),public.creator_api_claim_job(uuid) from public,anon,authenticated;
grant execute on function public.creator_api_claim_run(uuid,uuid),public.creator_api_reserve_slot(integer),public.creator_api_claim_job(uuid) to service_role;
commit;
