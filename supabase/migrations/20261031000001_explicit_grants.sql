-- Explicit table privileges for the API roles. Local Supabase grants anon and
-- authenticated everything on public tables and relies on RLS alone; the
-- hosted project grants nothing by default. Granting exactly what the app
-- needs makes both behave the same, and RLS still filters rows on top.

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- Shared pipeline output: signed-in users read, only the pipeline writes.
grant select on sources, listings, listing_sources, possible_duplicates, pipeline_runs, requirements to authenticated;

-- Per-user tables; RLS limits every statement to the user's own rows.
grant select, insert, update, delete on profiles, applications to authenticated;
grant select, insert on verdict_feedback to authenticated;

-- Server-side code using the secret key (bypasses RLS by design).
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- anon (signed-out visitors) gets nothing.
