-- Password reset limits. Supabase already allows one reset email per address
-- per minute and caps the whole project per hour, and Resend's free tier caps
-- the day. These limits sit in front, so one person can't use them all up:
--   3 requests per email address per day (a real user needs one, maybe two)
--   10 requests per IP address per hour (stops one person spraying addresses)
-- Only SHA-256 hashes of the email and IP are stored, never the raw values,
-- and rows older than two days are deleted as new requests come in.

create table password_reset_requests (
  id bigint generated always as identity primary key,
  email_hash text not null,
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index password_reset_requests_email_idx on password_reset_requests (email_hash, created_at);
create index password_reset_requests_ip_idx on password_reset_requests (ip_hash, created_at);

-- RLS on with no policies and no grants: only the function below touches it.
alter table password_reset_requests enable row level security;
revoke all on password_reset_requests from anon, authenticated;

-- Returns 'ok' (and records the request), 'email_limit', or 'ip_limit'.
-- SECURITY DEFINER so signed-out visitors can call it without any access to
-- the table; it reads and writes only the hashed values it was given.
create function public.claim_password_reset(p_email text, p_ip text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  e text := encode(sha256(convert_to(lower(trim(p_email)), 'UTF8')), 'hex');
  i text := encode(sha256(convert_to(coalesce(nullif(trim(p_ip), ''), 'unknown'), 'UTF8')), 'hex');
begin
  if char_length(p_email) > 320 or char_length(coalesce(p_ip, '')) > 100 then
    raise exception 'input too long';
  end if;

  -- Serialize requests for the same address, so two at once can't both pass.
  perform pg_advisory_xact_lock(hashtextextended(e, 0));

  delete from public.password_reset_requests where created_at < now() - interval '2 days';

  if (select count(*) from public.password_reset_requests r where r.email_hash = e and r.created_at > now() - interval '1 day') >= 3 then
    return 'email_limit';
  end if;
  if (select count(*) from public.password_reset_requests r where r.ip_hash = i and r.created_at > now() - interval '1 hour') >= 10 then
    return 'ip_limit';
  end if;

  insert into public.password_reset_requests (email_hash, ip_hash) values (e, i);
  return 'ok';
end;
$$;

revoke execute on function public.claim_password_reset(text, text) from public;
grant execute on function public.claim_password_reset(text, text) to anon, authenticated;
