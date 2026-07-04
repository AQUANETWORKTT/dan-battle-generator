create table if not exists public.mature_creator_month_totals (
  month text not null,
  creator_username text not null,
  agency text not null default 'First Class',
  team text not null default 'Unassigned',
  diamonds numeric not null default 0,
  source_filename text,
  uploaded_at timestamptz not null default now(),
  primary key (month, creator_username)
);

create index if not exists mature_creator_month_totals_month_idx
  on public.mature_creator_month_totals (month);

create index if not exists mature_creator_month_totals_diamonds_idx
  on public.mature_creator_month_totals (month, diamonds desc);

alter table public.mature_creator_month_totals enable row level security;

drop policy if exists "Allow mature creator month totals read" on public.mature_creator_month_totals;
create policy "Allow mature creator month totals read"
  on public.mature_creator_month_totals
  for select
  to anon
  using (true);

drop policy if exists "Allow mature creator month totals write" on public.mature_creator_month_totals;
create policy "Allow mature creator month totals write"
  on public.mature_creator_month_totals
  for all
  to anon
  using (true)
  with check (true);

delete from public.creator_daily_stats
where data_period = 'mature_month_total';
