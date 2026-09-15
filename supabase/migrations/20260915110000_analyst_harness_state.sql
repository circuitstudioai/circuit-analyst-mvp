-- Durable stage checkpoints and user-owned analyst conversations.

create table if not exists analysis_stages (
  id bigserial primary key,
  run_id bigint not null references analysis_runs(id) on delete cascade,
  ticker text not null,
  stage_name text not null check (stage_name in ('research','challenge','synthesis')),
  status text not null check (status in ('running','complete','failed')),
  output_payload jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(run_id, ticker, stage_name)
);

create table if not exists research_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  symbols text[] not null default '{}',
  thesis_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists research_messages (
  id bigserial primary key,
  thread_id uuid not null references research_threads(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  run_id bigint references analysis_runs(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_analysis_stages_run
  on analysis_stages(run_id, ticker);
create index if not exists idx_research_threads_user
  on research_threads(user_id, updated_at desc);
create index if not exists idx_research_messages_thread
  on research_messages(thread_id, created_at);
