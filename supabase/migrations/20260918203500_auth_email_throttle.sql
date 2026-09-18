create table if not exists auth_email_requests (
  id bigint generated always as identity primary key,
  email_hash text not null check (char_length(email_hash) = 64),
  ip_hash text not null check (char_length(ip_hash) = 64),
  created_at timestamptz not null default now()
);

create index if not exists idx_auth_email_requests_email_created
  on auth_email_requests(email_hash, created_at desc);
create index if not exists idx_auth_email_requests_ip_created
  on auth_email_requests(ip_hash, created_at desc);

alter table auth_email_requests enable row level security;

create or replace function public.claim_auth_email_request(
  p_email_hash text,
  p_ip_hash text,
  p_max_email_requests int default 3,
  p_max_ip_requests int default 10
)
returns table (allowed boolean, retry_after_seconds int)
language plpgsql
security definer set search_path = public
as $$
declare
  email_requests int;
  ip_requests int;
  oldest_request timestamptz;
begin
  if char_length(p_email_hash) <> 64 or char_length(p_ip_hash) <> 64 then
    return query select false, 900;
    return;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_email_hash || ':' || p_ip_hash, 0));

  select count(*), min(created_at)
  into email_requests, oldest_request
  from auth_email_requests
  where email_hash = p_email_hash
    and created_at >= now() - interval '15 minutes';

  select count(*)
  into ip_requests
  from auth_email_requests
  where ip_hash = p_ip_hash
    and created_at >= now() - interval '15 minutes';

  if email_requests >= p_max_email_requests or ip_requests >= p_max_ip_requests then
    return query select false,
      greatest(1, ceil(extract(epoch from (coalesce(oldest_request, now()) + interval '15 minutes' - now())))::int);
    return;
  end if;

  insert into auth_email_requests (email_hash, ip_hash) values (p_email_hash, p_ip_hash);
  return query select true, 0;
end;
$$;

revoke all on function public.claim_auth_email_request(text, text, int, int) from public, anon, authenticated;
grant execute on function public.claim_auth_email_request(text, text, int, int) to service_role;
