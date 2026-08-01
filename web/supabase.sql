-- Core tables
create table if not exists analysis_runs (
  id bigserial primary key,
  as_of timestamptz not null,
  regime_score double precision not null,
  watchlist text[] not null,
  created_at timestamptz not null default now()
);

create table if not exists signals (
  id bigserial primary key,
  run_id bigint not null references analysis_runs(id) on delete cascade,
  symbol text not null,
  decision text not null check (decision in ('BUY','HOLD','SELL')),
  confidence double precision not null,
  score double precision not null,
  last_price double precision not null,
  reasons text[] not null,
  ai_explanation text,
  raw_payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- New M2-lite engine aggregation layer
create table if not exists engine_outputs (
  id bigserial primary key,
  run_id bigint references analysis_runs(id) on delete set null,
  ticker text not null,
  market text not null default 'US',
  run_timestamp timestamptz not null,
  engine_name text not null,
  direction text not null check (direction in ('bullish','neutral','bearish')),
  confidence int not null check (confidence >= 0 and confidence <= 100),
  time_horizon text not null default 'swing',
  thesis_summary text,
  bull_case text[] not null default '{}',
  bear_case text[] not null default '{}',
  risk_flags text[] not null default '{}',
  catalysts text[] not null default '{}',
  suggested_next_action text,
  raw_payload jsonb,
  raw_payload_ref text,
  source_tag text,
  created_at timestamptz not null default now()
);

create table if not exists consensus_signals (
  id bigserial primary key,
  run_id bigint references analysis_runs(id) on delete cascade,
  ticker text not null,
  market text not null default 'US',
  direction text not null check (direction in ('bullish','neutral','bearish')),
  agreement_score double precision not null,
  confidence_score double precision not null,
  freshness_score double precision not null,
  conflict_flag boolean not null default false,
  engines_total int not null,
  engines_bullish int not null,
  engines_neutral int not null,
  engines_bearish int not null,
  rationale text,
  next_action text,
  created_at timestamptz not null default now()
);

create table if not exists daily_briefs (
  id bigserial primary key,
  run_id bigint references analysis_runs(id) on delete cascade,
  brief_date date not null,
  title text not null,
  summary text not null,
  top_conviction jsonb not null default '[]',
  high_conflict jsonb not null default '[]',
  key_catalysts jsonb not null default '[]',
  markdown text,
  created_at timestamptz not null default now(),
  unique(brief_date)
);

-- SaaS-ready tables for the later account layer.
-- The public demo does not require auth, but these keep the data model ready
-- for saved watchlists, reports, refreshes, and provider-cost controls.
create table if not exists profiles (
  id uuid primary key,
  email text,
  display_name text,
  plan text not null default 'free',
  created_at timestamptz not null default now()
);

create table if not exists user_watchlists (
  id bigserial primary key,
  user_id uuid references profiles(id) on delete cascade,
  name text not null default 'Watchlist',
  symbols text[] not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists saved_reports (
  id bigserial primary key,
  user_id uuid references profiles(id) on delete cascade,
  run_id bigint references analysis_runs(id) on delete set null,
  title text not null,
  symbols text[] not null,
  report_payload jsonb not null,
  reminder_date date,
  created_at timestamptz not null default now()
);

create table if not exists provider_usage (
  id bigserial primary key,
  user_id uuid references profiles(id) on delete set null,
  provider text not null,
  route text not null,
  units int not null default 1,
  cost_usd numeric(10, 4) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_signals_run_id on signals(run_id);
create index if not exists idx_engine_outputs_ticker_ts on engine_outputs(ticker, run_timestamp desc);
create index if not exists idx_engine_outputs_engine on engine_outputs(engine_name);
create index if not exists idx_consensus_ticker_created on consensus_signals(ticker, created_at desc);
create index if not exists idx_daily_briefs_date on daily_briefs(brief_date desc);
create index if not exists idx_user_watchlists_user on user_watchlists(user_id);
create index if not exists idx_saved_reports_user on saved_reports(user_id, created_at desc);
create index if not exists idx_provider_usage_created on provider_usage(created_at desc);
