-- Milestone 2: JD fetch status and LLM extraction.
-- Like M1, everything is written by the pipeline's service role.

-- Outcome of the last attempt to fetch each listing's job description.
-- Null means never attempted. Anything other than 'ok' leads to Not checked.
alter table listings
  add column jd_fetch_status text
    check (jd_fetch_status in (
      'ok',                -- text fetched and non-empty
      'robots_disallowed', -- robots.txt forbids the path
      'blocked',           -- 401 or 403
      'not_found',         -- 404 or 410 (posting likely removed)
      'unsupported',       -- no fetcher for this ATS or host
      'empty',             -- fetched, but no readable text
      'error'              -- network failure or 5xx after retries
    )),
  add column jd_fetch_error    text,
  add column jd_fetch_attempts integer not null default 0;

create index listings_jd_hash_idx on listings (jd_hash);

create table extraction_runs (
  id             bigint generated always as identity primary key,
  model          text not null,
  prompt_version text not null,
  status         text not null default 'running'
                 check (status in ('running', 'succeeded', 'partial', 'failed', 'cap_reached')),
  started_at     timestamptz not null default now(),
  finished_at    timestamptz,
  counts         jsonb not null default '{}',
  input_tokens   bigint not null default 0,
  output_tokens  bigint not null default 0,
  cost_usd       numeric(10, 6) not null default 0,
  errors         jsonb not null default '[]'
);

-- One extraction per distinct JD text, prompt version, and model. Keyed on the
-- JD hash rather than the listing so duplicate requisitions with identical text
-- share one result; a listing finds its row through listings.jd_hash.
create table requirements (
  id                bigint generated always as identity primary key,
  jd_hash           text not null,
  prompt_version    text not null,
  model             text not null,
  extraction_status text not null
                    check (extraction_status in ('ok', 'llm_failed', 'schema_invalid')),
  -- Validated output with field statuses already downgraded to 'unverified'
  -- where a quote failed the substring check. Null unless status is 'ok'.
  extracted         jsonb,
  quote_failures    integer not null default 0,
  error             text,
  -- Cost of producing this row, including the one schema retry if it happened.
  input_tokens      integer not null default 0,
  output_tokens     integer not null default 0,
  cost_usd          numeric(10, 6) not null default 0,
  latency_ms        integer,
  run_id            bigint references extraction_runs (id),
  extracted_at      timestamptz not null default now(),
  unique (jd_hash, prompt_version, model),
  check ((extraction_status = 'ok') = (extracted is not null))
);

-- The daily spend cap sums cost over today's runs, not over requirements rows:
-- a re-extraction overwrites its row, which would hide the earlier spend. Runs
-- update cost_usd after every call, so a crashed run still counts.
create index extraction_runs_started_at_idx on extraction_runs (started_at);

alter table extraction_runs enable row level security;
alter table requirements    enable row level security;

create policy "signed-in users read requirements" on requirements
  for select to authenticated using (true);
