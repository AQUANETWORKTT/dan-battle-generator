-- First Class Creator API Search upgrade only. No changes to creator stats,
-- onboarding, posters or any existing bot database. No messages are stored here.
begin;
create table if not exists public.creator_api_search_contacts (
 username text primary key,
 status text not null check(status in ('SENT','UNCERTAIN')),
 messaged_at timestamptz,
 source text not null default 'FirstClassBot',
 synced_at timestamptz not null default now()
);
alter table public.creator_api_search_contacts enable row level security;
revoke all on public.creator_api_search_contacts from anon,authenticated;
grant all on public.creator_api_search_contacts to service_role;
alter table public.creator_api_search_control add column if not exists contacts_synced_at timestamptz;

create or replace function public.creator_api_stop_scan(target_run uuid) returns void
language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 update public.creator_api_search_runs
 set payload=jsonb_set(payload,'{status}','"stopped"'::jsonb),status='stopped',
     lease_token=null,leased_until=null,updated_at=now()
 where id=target_run;
 update public.creator_api_search_jobs
 set status='completed',results=results || '{"$scanStopped":true}'::jsonb,
     lease_token=null,leased_until=null,updated_at=now()
 where run_id=target_run and status in ('queued','running');
end $$;

create or replace function public.creator_api_new_scan() returns setof public.creator_api_search_runs
language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 perform 1 from public.creator_api_search_control where id='tikleap' for update;
 return query insert into public.creator_api_search_runs(payload,status)
 values('{"leagues":[],"results":{},"discovered":false,"discoveryAttempts":0,"status":"running"}'::jsonb,'running') returning *;
end $$;

create or replace function public.creator_api_claim_job(claim_token uuid) returns setof public.creator_api_search_jobs
language sql security invoker set search_path=public,pg_temp as $$
 update public.creator_api_search_jobs set status='running',lease_token=claim_token,
 leased_until=now()+interval '10 minutes',updated_at=now()
 where id=(select j.id from public.creator_api_search_jobs j
 where (j.status='queued' or (j.status='running' and j.leased_until<now()))
 and exists(select 1 from public.creator_api_search_runs r where r.id=j.run_id and r.status<>'stopped')
 order by j.created_at for update of j skip locked limit 1) returning *;
$$;

create or replace function public.creator_api_sync_contacts(records jsonb,finished boolean default false) returns void
language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 insert into public.creator_api_search_contacts(username,status,messaged_at,source)
 select x.username,x.status,x.messaged_at,'FirstClassBot'
 from jsonb_to_recordset(records) as x(username text,status text,messaged_at timestamptz)
 on conflict(username) do update set
 status=case when creator_api_search_contacts.status='SENT' then 'SENT' else excluded.status end,
 messaged_at=coalesce(creator_api_search_contacts.messaged_at,excluded.messaged_at),synced_at=now();
 if finished then
 update public.creator_api_search_control set contacts_synced_at=now() where id='tikleap';
 end if;
end $$;
revoke all on function public.creator_api_stop_scan(uuid),public.creator_api_new_scan(),public.creator_api_sync_contacts(jsonb,boolean),public.creator_api_claim_job(uuid) from public,anon,authenticated;
grant execute on function public.creator_api_stop_scan(uuid),public.creator_api_new_scan(),public.creator_api_sync_contacts(jsonb,boolean),public.creator_api_claim_job(uuid) to service_role;
commit;
