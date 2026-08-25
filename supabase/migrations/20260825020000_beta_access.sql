create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  beta_role text not null default 'tester' check (beta_role in ('tester', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists user_watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null default 'My Watchlist',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists user_watchlist_items (
  watchlist_id uuid not null references user_watchlists(id) on delete cascade,
  symbol text not null check (symbol ~ '^[A-Z][A-Z.]{0,8}$'),
  created_at timestamptz not null default now(),
  primary key (watchlist_id, symbol)
);

create table if not exists user_usage_daily (
  user_id uuid not null references profiles(id) on delete cascade,
  usage_date date not null default current_date,
  analysis_count int not null default 0 check (analysis_count >= 0),
  symbol_count int not null default 0 check (symbol_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);

create table if not exists analysis_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  run_id bigint references analysis_runs(id) on delete set null,
  symbols text[] not null,
  status text not null check (status in ('started', 'completed', 'partial', 'failed', 'cached')),
  duration_ms int,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists feedback_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  run_id bigint references analysis_runs(id) on delete set null,
  symbol text,
  helpful boolean not null,
  reason text check (reason in ('actionable', 'too_generic', 'wrong_data', 'unclear', 'missing_catalyst', 'other')),
  comment text check (char_length(comment) <= 1000),
  created_at timestamptz not null default now()
);

create index if not exists idx_user_watchlists_user on user_watchlists(user_id);
create index if not exists idx_watchlist_items_watchlist on user_watchlist_items(watchlist_id);
create index if not exists idx_analysis_requests_user_created on analysis_requests(user_id, created_at desc);
create index if not exists idx_feedback_user_created on feedback_events(user_id, created_at desc);

alter table profiles enable row level security;
alter table user_watchlists enable row level security;
alter table user_watchlist_items enable row level security;
alter table user_usage_daily enable row level security;
alter table analysis_requests enable row level security;
alter table feedback_events enable row level security;

create policy "profiles_select_own" on profiles for select to authenticated using (id = auth.uid());
create policy "profiles_update_own" on profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "watchlists_own_all" on user_watchlists for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "watchlist_items_own_all" on user_watchlist_items for all to authenticated
  using (exists (select 1 from user_watchlists w where w.id = watchlist_id and w.user_id = auth.uid()))
  with check (exists (select 1 from user_watchlists w where w.id = watchlist_id and w.user_id = auth.uid()));
create policy "usage_select_own" on user_usage_daily for select to authenticated using (user_id = auth.uid());
create policy "requests_select_own" on analysis_requests for select to authenticated using (user_id = auth.uid());
create policy "feedback_own_all" on feedback_events for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.handle_new_beta_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  profile_name text;
  new_watchlist_id uuid;
begin
  profile_name := coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1));
  insert into profiles (id, email, display_name)
  values (new.id, new.email, nullif(profile_name, ''))
  on conflict (id) do nothing;

  insert into user_watchlists (user_id, name)
  values (new.id, 'My Watchlist')
  on conflict (user_id, name) do update set updated_at = now()
  returning id into new_watchlist_id;

  insert into user_watchlist_items (watchlist_id, symbol)
  select new_watchlist_id, symbol
  from unnest(array['NVDA','AMD','SOFI']) as symbol
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_beta_user();

create or replace function public.claim_analysis_quota(
  p_user_id uuid,
  p_symbol_count int,
  p_max_analyses int default 3,
  p_max_symbols int default 24
)
returns table (allowed boolean, analysis_count int, symbol_count int)
language plpgsql
security definer set search_path = public
as $$
declare
  next_analysis_count int;
  next_symbol_count int;
begin
  if p_symbol_count < 1 or p_symbol_count > 12 then
    return query select false, 0, 0;
    return;
  end if;

  insert into user_usage_daily (user_id, usage_date, analysis_count, symbol_count)
  values (p_user_id, current_date, 0, 0)
  on conflict (user_id, usage_date) do nothing;

  select u.analysis_count + 1, u.symbol_count + p_symbol_count
  into next_analysis_count, next_symbol_count
  from user_usage_daily u
  where u.user_id = p_user_id and u.usage_date = current_date
  for update;

  if next_analysis_count > p_max_analyses or next_symbol_count > p_max_symbols then
    return query select false, next_analysis_count - 1, next_symbol_count - p_symbol_count;
    return;
  end if;

  update user_usage_daily
  set analysis_count = next_analysis_count,
      symbol_count = next_symbol_count,
      updated_at = now()
  where user_id = p_user_id and usage_date = current_date;

  return query select true, next_analysis_count, next_symbol_count;
end;
$$;

revoke all on function public.claim_analysis_quota(uuid, int, int, int) from public, anon, authenticated;
grant execute on function public.claim_analysis_quota(uuid, int, int, int) to service_role;

-- Backfill profiles for users created before this migration.
insert into profiles (id, email, display_name)
select id, email, nullif(split_part(coalesce(email, ''), '@', 1), '')
from auth.users
on conflict (id) do nothing;
