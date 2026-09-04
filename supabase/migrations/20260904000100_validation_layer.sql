-- Two-week beta validation layer: onboarding, named cohorts, and product events.
alter table profiles
  add column if not exists experience_level text
    check (experience_level in ('beginner', 'self_directed', 'active')),
  add column if not exists watchlist_size text
    check (watchlist_size in ('1_5', '6_15', '16_30', '31_plus')),
  add column if not exists investing_horizon text
    check (investing_horizon in ('days', 'weeks', 'months', 'years')),
  add column if not exists primary_job text
    check (primary_job in ('screen_ideas', 'monitor_watchlist', 'validate_decision', 'manage_risk')),
  add column if not exists onboarding_completed_at timestamptz;

create table if not exists beta_cohorts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  starts_on date not null,
  ends_on date not null,
  target_size int not null default 10 check (target_size > 0),
  status text not null default 'recruiting'
    check (status in ('recruiting', 'active', 'complete')),
  created_at timestamptz not null default now()
);

create table if not exists beta_cohort_members (
  cohort_id uuid not null references beta_cohorts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  invited_at timestamptz not null default now(),
  activated_at timestamptz,
  cycle_completed_at timestamptz,
  exit_feedback_completed_at timestamptz,
  willingness_to_pay text check (willingness_to_pay in ('no', 'maybe', 'yes_10_20', 'yes_20_plus')),
  loss_reaction text check (loss_reaction in ('not_disappointed', 'somewhat_disappointed', 'very_disappointed')),
  primary key (cohort_id, user_id)
);

create table if not exists product_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  event_name text not null check (event_name in (
    'session_started',
    'onboarding_completed',
    'watchlist_saved',
    'analysis_completed',
    'report_opened',
    'decision_brief_used',
    'beta_feedback_sent'
  )),
  run_id bigint references analysis_runs(id) on delete set null,
  symbol text,
  properties jsonb not null default '{}',
  occurred_at timestamptz not null default now()
);

create index if not exists idx_product_events_user_time
  on product_events(user_id, occurred_at desc);
create index if not exists idx_product_events_name_time
  on product_events(event_name, occurred_at desc);
create index if not exists idx_beta_cohort_members_user
  on beta_cohort_members(user_id);

alter table beta_cohorts enable row level security;
alter table beta_cohort_members enable row level security;
alter table product_events enable row level security;

create policy "cohort_members_select_own" on beta_cohort_members
  for select to authenticated using (user_id = auth.uid());
create policy "events_select_own" on product_events
  for select to authenticated using (user_id = auth.uid());

insert into beta_cohorts (slug, name, starts_on, ends_on, target_size)
values ('beta-2026-09', 'September 2026 validation cohort', '2026-09-07', '2026-09-20', 10)
on conflict (slug) do nothing;

-- Testers are assigned to the active cohort when they complete onboarding.
-- This deliberately avoids placing existing internal/test accounts in the cohort.
