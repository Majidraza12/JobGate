-- Security audit 2026-11-10. A signed-in user can call the REST API directly
-- with their own session, skipping the app's form validation, so every limit
-- the app relies on is also enforced here.

-- Size limits on user-written text. The app already caps these at 2000.
alter table applications
  add constraint applications_notes_len check (char_length(notes) <= 2000);

alter table verdict_feedback
  add constraint verdict_feedback_comment_len check (char_length(comment) <= 2000),
  add constraint verdict_feedback_verdict_check
    check (verdict_shown in ('not_eligible', 'not_checked', 'check', 'eligible', 'no_restrictions_found')),
  add constraint verdict_feedback_field_len check (field is null or char_length(field) <= 64),
  add constraint verdict_feedback_prompt_len check (prompt_version is null or char_length(prompt_version) <= 32);

-- Profile arrays: known job types only, bounded lists, and no empty start
-- term (matching rejects one, which would break that user's feed).
alter table profiles
  add constraint profiles_job_types_check check (job_types <@ array['internship', 'co-op', 'new_grad']::text[]),
  add constraint profiles_starts_check
    check (cardinality(starts) <= 20 and char_length(array_to_string(starts, ',')) <= 1000 and not ('' = any (starts))),
  add constraint profiles_locations_check
    check (cardinality(locations) <= 20 and char_length(array_to_string(locations, ',')) <= 2000);

-- Feedback is append-only, so without a cap one account could fill the table.
-- 50 reports a day is far above honest use. The count lives in a function
-- because a policy on verdict_feedback that queries verdict_feedback directly
-- is rejected by Postgres as infinitely recursive. SECURITY DEFINER lets it
-- count without re-entering the policies; it only ever counts the caller's own
-- rows and returns one number. VOLATILE on purpose: it then sees rows added
-- earlier in the same statement, so one bulk insert can't slip past the cap.
create index verdict_feedback_user_created_idx on verdict_feedback (user_id, created_at);

create function public.my_feedback_count_today()
returns bigint
language sql
volatile
security definer
set search_path = ''
as $$
  select count(*) from public.verdict_feedback f
  where f.user_id = (select auth.uid()) and f.created_at > now() - interval '1 day'
$$;

revoke execute on function public.my_feedback_count_today() from public, anon;
grant execute on function public.my_feedback_count_today() to authenticated;

drop policy "users file their own feedback" on verdict_feedback;
create policy "users file their own feedback" on verdict_feedback
  for insert to authenticated
  with check ((select auth.uid()) = user_id and public.my_feedback_count_today() < 50);

-- Signed-in users need the run status and the extracted requirements, not the
-- pipeline's internal error logs, token counts, or costs.
revoke select on pipeline_runs, requirements from authenticated;
grant select (id, status, started_at, finished_at) on pipeline_runs to authenticated;
grant select (jd_hash, prompt_version, model, extraction_status, extracted, extracted_at) on requirements to authenticated;

-- The apply link is rendered as a link in the app, so it must be a web URL.
-- The adapters already reject anything else; this is the backstop. NOT VALID:
-- enforced for every new or changed row without scanning the existing ones.
alter table listings
  add constraint listings_apply_url_http check (apply_url ~* '^https?://') not valid;
