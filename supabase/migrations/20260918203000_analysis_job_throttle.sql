create or replace function public.create_analysis_job_if_allowed(
  p_user_id uuid,
  p_request_payload jsonb,
  p_max_jobs_per_hour int default 6
)
returns table (allowed boolean, job_id uuid, retry_after_seconds int)
language plpgsql
security definer set search_path = public
as $$
declare
  recent_jobs int;
  active_jobs int;
  oldest_recent timestamptz;
  created_job_id uuid;
begin
  -- Serialize job creation per user so concurrent requests cannot bypass limits.
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select count(*), min(created_at)
  into recent_jobs, oldest_recent
  from analysis_jobs
  where user_id = p_user_id
    and created_at >= now() - interval '1 hour';

  select count(*)
  into active_jobs
  from analysis_jobs
  where user_id = p_user_id
    and status in ('queued', 'running')
    and created_at >= now() - interval '10 minutes';

  if active_jobs >= 1 then
    return query select false, null::uuid, 15;
    return;
  end if;

  if recent_jobs >= p_max_jobs_per_hour then
    return query select false, null::uuid,
      greatest(1, ceil(extract(epoch from (oldest_recent + interval '1 hour' - now())))::int);
    return;
  end if;

  insert into analysis_jobs (user_id, request_payload)
  values (p_user_id, coalesce(p_request_payload, '{}'::jsonb))
  returning id into created_job_id;

  return query select true, created_job_id, 0;
end;
$$;

revoke all on function public.create_analysis_job_if_allowed(uuid, jsonb, int) from public, anon, authenticated;
grant execute on function public.create_analysis_job_if_allowed(uuid, jsonb, int) to service_role;
