-- Analyst harness persistence is accessed only by trusted server-side code via
-- the service-role client. Enabling RLS without public policies keeps these
-- tables unavailable through PostgREST's anon and authenticated roles.

alter table public.analysis_stages enable row level security;
alter table public.research_threads enable row level security;
alter table public.research_messages enable row level security;

