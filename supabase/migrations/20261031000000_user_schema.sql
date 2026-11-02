-- Milestone 3: per-user data. Every row belongs to one auth user, and RLS lets
-- each user read and write only their own rows (CLAUDE.md section 13).
-- Work-authorization answers are sensitive: never log or copy them elsewhere.

-- One row per user. Eligibility fields mirror EligibilityProfile
-- (src/core/profile.ts); the rest are feed preferences, not eligibility.
create table profiles (
  id                                 uuid primary key references auth.users (id) on delete cascade,
  grad_month                         text not null check (grad_month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  degree                             text not null check (degree in ('bs', 'ms', 'phd')),
  us_citizen                         boolean not null,
  permanent_resident                 boolean not null,
  authorized_now_without_sponsorship boolean not null,
  needs_sponsorship_future           boolean not null,
  clearance_status                   text not null check (clearance_status in ('active', 'none', 'prefer_not_to_say')),
  clearance_level                    text check (clearance_level in ('secret', 'top_secret', 'ts_sci')),
  starts                             text[] not null default '{}', -- e.g. {"Summer 2027"}
  job_types                          text[] not null default '{internship,co-op,new_grad}',
  locations                          text[] not null default '{}',
  remote_ok                          boolean not null default true,
  created_at                         timestamptz not null default now(),
  updated_at                         timestamptz not null default now(),
  check ((clearance_status = 'active') = (clearance_level is not null))
);

create table applications (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  listing_id bigint not null references listings (id) on delete cascade,
  status     text not null default 'applied'
             check (status in ('applied', 'online_assessment', 'interview', 'offer', 'rejected')),
  notes      text not null default '',
  applied_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, listing_id)
);

-- "Wrong verdict?" reports. Stores what the user saw, so a report stays
-- meaningful after the extraction or matching code changes.
create table verdict_feedback (
  id             bigint generated always as identity primary key,
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  listing_id     bigint not null references listings (id) on delete cascade,
  verdict_shown  text not null,
  prompt_version text,
  field          text, -- null = the verdict as a whole
  comment        text not null default '',
  created_at     timestamptz not null default now()
);

create index applications_user_idx on applications (user_id);
create index verdict_feedback_listing_idx on verdict_feedback (listing_id);

alter table profiles         enable row level security;
alter table applications     enable row level security;
alter table verdict_feedback enable row level security;

-- (select auth.uid()) is evaluated once per query, not once per row.
create policy "users manage their own profile" on profiles
  for all to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "users manage their own applications" on applications
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
-- Feedback is write-once from the app: users can file and see their reports,
-- not edit or delete them.
create policy "users read their own feedback" on verdict_feedback
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "users file their own feedback" on verdict_feedback
  for insert to authenticated with check ((select auth.uid()) = user_id);

-- The feed reads which source each listing came from, to pick its job type.
create policy "signed-in users read listing sources" on listing_sources
  for select to authenticated using (true);
