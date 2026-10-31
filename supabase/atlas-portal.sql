-- Run ONCE in a NEW Atlas Supabase project's SQL Editor, never in First Class.
-- Creator IDs are text: TikTok IDs exceed JavaScript's safe integer range.
create table if not exists public.creator_daily_stats (
  id uuid primary key default gen_random_uuid(),
  stat_date date,
  data_period text,
  creator_id text,
  creator_username text not null,
  email text,
  group_name text,
  agency text not null,
  team text not null,
  manager_email text,
  join_time text,
  diamonds numeric not null default 0,
  live_duration text,
  live_hours numeric not null default 0,
  valid_live_days numeric not null default 0,
  new_followers numeric not null default 0,
  matches numeric not null default 0,
  live_streams numeric not null default 0,
  followers numeric not null default 0,
  days_since_joining numeric not null default 0,
  diamonds_last_month numeric not null default 0,
  live_hours_last_month numeric not null default 0,
  valid_days_last_month numeric not null default 0,
  followers_last_month numeric not null default 0,
  live_streams_last_month numeric not null default 0,
  diamonds_percentage_achieved numeric not null default 0,
  live_hours_percentage_achieved numeric not null default 0,
  valid_days_percentage_achieved numeric not null default 0,
  followers_percentage_achieved numeric not null default 0,
  live_streams_percentage_achieved numeric not null default 0,
  diamonds_vs_last_month numeric not null default 0,
  live_hours_vs_last_month numeric not null default 0,
  valid_days_vs_last_month numeric not null default 0,
  followers_vs_last_month numeric not null default 0,
  live_streams_vs_last_month numeric not null default 0,
  diamonds_from_matches numeric not null default 0,
  new_live_creators text,
  diamonds_from_multiguest numeric not null default 0,
  diamonds_from_multiguest_host numeric not null default 0,
  diamonds_from_multiguest_guest numeric not null default 0,
  graduation_status text,
  tier_status text,
  new_fans numeric not null default 0,
  fan_club_diamonds numeric not null default 0,
  fan_contribution_percentage numeric not null default 0,
  total_fans numeric not null default 0,
  active_fans numeric not null default 0,
  status text,
  uploaded_at timestamptz not null default now()
);
create index if not exists atlas_stats_date on public.creator_daily_stats(stat_date);
create index if not exists atlas_creator_history on public.creator_daily_stats(creator_id,stat_date);
create index if not exists atlas_username_history on public.creator_daily_stats(lower(creator_username),stat_date);
create index if not exists atlas_manager_history on public.creator_daily_stats(manager_email,stat_date);
create table if not exists public.poster_templates (
 id uuid primary key default gen_random_uuid(), name text not null unique,
 background_url text, template_json jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.mature_creator_month_totals (
 month text not null, creator_id text, creator_username text not null,
 agency text not null default 'Atlas', team text not null default 'Atlas',
 diamonds numeric not null default 0, source_filename text, uploaded_at timestamptz not null default now(),
 primary key(month,creator_username)
);
alter table public.creator_daily_stats enable row level security;
alter table public.poster_templates enable row level security;
alter table public.mature_creator_month_totals enable row level security;
-- There are deliberately no anonymous table policies. Only the server key writes.
grant all on public.creator_daily_stats, public.poster_templates, public.mature_creator_month_totals to service_role;
insert into storage.buckets(id,name,public) values('poster-backgrounds','poster-backgrounds',true) on conflict(id) do nothing;
-- A whole upload commits atomically. A failed row cannot erase an existing day.
create or replace function public.atlas_import_daily_stats(payload jsonb, dates date[]) returns void
language plpgsql security invoker set search_path = public,pg_temp as $$
begin
 if jsonb_typeof(payload) <> 'array' or jsonb_array_length(payload)=0 or cardinality(dates)=0 then raise exception 'Upload contains no daily records'; end if;
 if exists(select 1 from jsonb_array_elements(payload) r where not ((r->>'stat_date')::date = any(dates))) then raise exception 'Upload dates do not match the records'; end if;
 perform pg_advisory_xact_lock(hashtext('atlas-daily-import'));
 delete from public.creator_daily_stats where stat_date = any(dates);
 insert into public.creator_daily_stats (stat_date, data_period, creator_id, creator_username, email, group_name, agency, team, manager_email, join_time, diamonds, live_duration, live_hours, valid_live_days, new_followers, matches, live_streams, followers, days_since_joining, diamonds_last_month, live_hours_last_month, valid_days_last_month, followers_last_month, live_streams_last_month, diamonds_percentage_achieved, live_hours_percentage_achieved, valid_days_percentage_achieved, followers_percentage_achieved, live_streams_percentage_achieved, diamonds_vs_last_month, live_hours_vs_last_month, valid_days_vs_last_month, followers_vs_last_month, live_streams_vs_last_month, diamonds_from_matches, new_live_creators, diamonds_from_multiguest, diamonds_from_multiguest_host, diamonds_from_multiguest_guest, graduation_status, tier_status, new_fans, fan_club_diamonds, fan_contribution_percentage, total_fans, active_fans, status) select stat_date, data_period, creator_id, creator_username, email, group_name, agency, team, manager_email, join_time, diamonds, live_duration, live_hours, valid_live_days, new_followers, matches, live_streams, followers, days_since_joining, diamonds_last_month, live_hours_last_month, valid_days_last_month, followers_last_month, live_streams_last_month, diamonds_percentage_achieved, live_hours_percentage_achieved, valid_days_percentage_achieved, followers_percentage_achieved, live_streams_percentage_achieved, diamonds_vs_last_month, live_hours_vs_last_month, valid_days_vs_last_month, followers_vs_last_month, live_streams_vs_last_month, diamonds_from_matches, new_live_creators, diamonds_from_multiguest, diamonds_from_multiguest_host, diamonds_from_multiguest_guest, graduation_status, tier_status, new_fans, fan_club_diamonds, fan_contribution_percentage, total_fans, active_fans, status from jsonb_populate_recordset(null::public.creator_daily_stats,payload);
end $$;
create or replace function public.atlas_import_mature_totals(target_month text,payload jsonb) returns void
language plpgsql security invoker set search_path = public,pg_temp as $$
begin
 if target_month !~ '^\\d{4}-(0[1-9]|1[0-2])$' or jsonb_typeof(payload)<>'array' then raise exception 'Invalid mature totals upload'; end if;
 if exists(select 1 from jsonb_array_elements(payload) r where r->>'month' <> target_month) then raise exception 'Month does not match the records'; end if;
 perform pg_advisory_xact_lock(hashtext('atlas-mature-import'));
 delete from public.mature_creator_month_totals where month=target_month;
 insert into public.mature_creator_month_totals(month,creator_id,creator_username,agency,team,diamonds,source_filename,uploaded_at)
 select month,creator_id,creator_username,agency,team,diamonds,source_filename,uploaded_at from jsonb_populate_recordset(null::public.mature_creator_month_totals,payload);
end $$;
revoke all on function public.atlas_import_daily_stats(jsonb,date[]), public.atlas_import_mature_totals(text,jsonb) from public,anon,authenticated;
grant execute on function public.atlas_import_daily_stats(jsonb,date[]), public.atlas_import_mature_totals(text,jsonb) to service_role;

