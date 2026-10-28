-- Milestone 1: ingestion schema.
-- The pipeline writes with the service role (bypasses RLS). Signed-in users
-- can read listings; nothing here is writable from the client.

create table sources (
  id          text primary key,
  name        text not null,
  url         text not null,
  license     text,
  attribution text not null
);

insert into sources (id, name, url, license, attribution) values
  ('zshah101', 'Automated List of Summer 2027 and Fall 2026 Tech Internships',
   'https://github.com/zshah101/Automated-List-Of-Summer-2027-and-Fall-2026-Tech-Internships',
   'MIT', 'Internship listings from zshah101 (MIT)'),
  ('simplify-newgrad', 'SimplifyJobs New-Grad-Positions',
   'https://github.com/SimplifyJobs/New-Grad-Positions',
   null, 'New-grad listings discovered via SimplifyJobs');

create table pipeline_runs (
  id          bigint generated always as identity primary key,
  trigger     text not null check (trigger in ('schedule', 'manual', 'local')),
  status      text not null default 'running'
              check (status in ('running', 'succeeded', 'partial', 'failed')),
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  counts      jsonb not null default '{}',
  errors      jsonb not null default '[]'
);

-- Latest copy of each source record. One row per (source, external id), so the
-- table grows with distinct postings, not with the number of runs.
create table raw_listings (
  id               bigint generated always as identity primary key,
  source_id        text not null references sources (id),
  external_id      text not null,
  record           jsonb not null,
  first_seen_at    timestamptz not null default now(),
  last_seen_at     timestamptz not null default now(),
  last_seen_run_id bigint references pipeline_runs (id),
  unique (source_id, external_id)
);

create table listings (
  id                    bigint generated always as identity primary key,
  identity_key          text not null unique,
  identity_kind         text not null check (identity_kind in ('ats', 'url')),
  ats                   text,
  ats_tenant            text,
  ats_req_id            text,
  company               text not null,
  title                 text not null,
  locations             text[] not null default '{}',
  apply_url             text not null,
  normalized_url        text not null,
  job_type              text not null check (job_type in ('internship', 'co-op', 'new_grad')),
  season                text,
  remote                boolean,
  posted_at             timestamptz,
  posted_at_precision   text check (posted_at_precision in ('date', 'datetime')),
  primary_source_id     text not null references sources (id),
  -- Lower wins. Copied from the pipeline's source priority so the upsert can
  -- decide which source's display fields to keep without a join.
  primary_source_priority smallint not null,
  baseline_sponsorship  text,
  status                text not null default 'open' check (status in ('open', 'closed')),
  closed_at             timestamptz,
  jd_text               text,
  jd_hash               text,
  jd_fetched_at         timestamptz,
  first_seen_at         timestamptz not null default now(),
  last_seen_at          timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  check ((identity_kind = 'ats') = (ats is not null and ats_tenant is not null and ats_req_id is not null))
);

create index listings_status_posted_idx on listings (status, posted_at desc);

-- Which source records point at which listing. missed_reads counts consecutive
-- complete reads of that source that no longer included the record; a listing
-- closes only when every one of its source records has missed_reads >= 2.
create table listing_sources (
  source_id     text not null,
  external_id   text not null,
  listing_id    bigint not null references listings (id) on delete cascade,
  missed_reads     integer not null default 0,
  first_seen_at    timestamptz not null default now(),
  last_seen_at     timestamptz not null default now(),
  last_seen_run_id bigint references pipeline_runs (id),
  primary key (source_id, external_id),
  foreign key (source_id, external_id) references raw_listings (source_id, external_id)
);

create index listing_sources_listing_idx on listing_sources (listing_id);

create table possible_duplicates (
  listing_id_a bigint not null references listings (id) on delete cascade,
  listing_id_b bigint not null references listings (id) on delete cascade,
  reason       text not null
               check (reason in ('same_company_title_season_location', 'workday_posting_suffix')),
  created_at   timestamptz not null default now(),
  primary key (listing_id_a, listing_id_b),
  check (listing_id_a < listing_id_b)
);

alter table sources             enable row level security;
alter table pipeline_runs       enable row level security;
alter table raw_listings        enable row level security;
alter table listings            enable row level security;
alter table listing_sources     enable row level security;
alter table possible_duplicates enable row level security;

create policy "signed-in users read sources" on sources
  for select to authenticated using (true);
create policy "signed-in users read listings" on listings
  for select to authenticated using (true);
create policy "signed-in users read possible duplicates" on possible_duplicates
  for select to authenticated using (true);
create policy "signed-in users read pipeline runs" on pipeline_runs
  for select to authenticated using (true);
