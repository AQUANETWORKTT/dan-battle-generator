-- Additive First Class migration. Run in the existing project's SQL editor.
-- No existing rows, assignments, permissions or import routines are changed.
create index if not exists bulk_creator_username_latest
 on public.creator_daily_stats ((lower(ltrim(btrim(creator_username), '@'))), stat_date desc, id desc)
 where data_period is distinct from 'mature_month_total';
create index if not exists bulk_creator_id_latest
 on public.creator_daily_stats (creator_id, stat_date desc, id desc)
 where data_period is distinct from 'mature_month_total';

create or replace function public.bulk_creator_lookup(usernames text[])
returns table (lookup_username text, creator_id text, creator_username text,
 stat_date date, manager_email text, email text)
language sql stable security invoker set search_path = public
as $$
 select requested.name, current_row.creator_id, current_row.creator_username,
 current_row.stat_date, current_row.manager_email, current_row.email
 from (select distinct lower(ltrim(btrim(n), '@')) as name from unnest(usernames) n) requested
 cross join lateral (
  select case when s.creator_id ~ '^[0-9]{10,}$' then s.creator_id else null end as creator_id, s.id from public.creator_daily_stats s
  where lower(ltrim(btrim(s.creator_username), '@')) = requested.name
   and s.data_period is distinct from 'mature_month_total'
  order by s.stat_date desc, s.id desc limit 1
 ) matched
 cross join lateral (
  select candidate.* from (
   (select s.creator_id, s.creator_username, s.stat_date, s.manager_email, s.email from public.creator_daily_stats s
    where matched.creator_id is not null and s.creator_id = matched.creator_id
     and s.data_period is distinct from 'mature_month_total'
    order by s.stat_date desc, s.id desc limit 1)
   union all
   (select s.creator_id, s.creator_username, s.stat_date, s.manager_email, s.email from public.creator_daily_stats s
    where matched.creator_id is null and s.id = matched.id)
  ) candidate
 ) current_row;
$$;
revoke all on function public.bulk_creator_lookup(text[]) from public, anon, authenticated;
grant execute on function public.bulk_creator_lookup(text[]) to service_role;
notify pgrst, 'reload schema';
