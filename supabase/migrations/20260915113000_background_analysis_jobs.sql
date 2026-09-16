create table if not exists analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  run_id bigint references analysis_runs(id) on delete set null,
  status text not null default 'queued' check (status in ('queued','running','completed','partial','failed')),
  current_stage text not null default 'queued',
  request_payload jsonb not null default '{}'::jsonb,
  result_payload jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists idx_analysis_jobs_user_created
  on analysis_jobs(user_id, created_at desc);

alter table analysis_jobs enable row level security;

create policy "analysis_jobs_select_own"
  on analysis_jobs for select to authenticated
  using (user_id = auth.uid());
