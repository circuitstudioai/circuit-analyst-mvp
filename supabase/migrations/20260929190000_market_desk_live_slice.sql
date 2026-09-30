-- Market Desk live-slice records are written only by trusted server code.
-- RLS without policies keeps them unavailable to anon and authenticated PostgREST roles.

create table if not exists public.market_desk_runs (
  idempotency_key text primary key,
  symbol text not null,
  status text not null check (status in ('completed', 'partial', 'failed')),
  schema_version text not null,
  inbox boolean not null default false,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.market_desk_markers (
  id text primary key,
  symbol text not null,
  evidence_id text not null,
  event_id text,
  marker_date date not null,
  label text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.market_desk_evidence (
  id text primary key,
  symbol text not null,
  content_hash text not null,
  source_url text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (symbol, content_hash)
);

create table if not exists public.market_desk_judgments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  event_id text not null,
  action text not null check (action in ('keep', 'update', 'watch')),
  condition text not null default '',
  thesis_version int,
  schema_version text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.market_desk_annotations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  symbol text not null,
  body text not null,
  chart_range text not null,
  chart_mode text not null,
  thesis_version int,
  event_id text,
  evidence_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.market_desk_monitoring_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  raw_text text not null,
  active boolean not null default false check (active = false),
  created_at timestamptz not null default now()
);

create table if not exists public.market_desk_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  decision text not null check (decision = 'not_sent'),
  reason text not null,
  created_at timestamptz not null default now()
);

alter table public.market_desk_runs enable row level security;
alter table public.market_desk_markers enable row level security;
alter table public.market_desk_evidence enable row level security;
alter table public.market_desk_judgments enable row level security;
alter table public.market_desk_annotations enable row level security;
alter table public.market_desk_monitoring_rules enable row level security;
alter table public.market_desk_notifications enable row level security;
