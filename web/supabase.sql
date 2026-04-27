-- Run in Supabase SQL editor

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
  created_at timestamptz not null default now()
);

create index if not exists idx_signals_run_id on signals(run_id);
create index if not exists idx_signals_symbol on signals(symbol);
