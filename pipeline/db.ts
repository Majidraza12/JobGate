import pg from "pg";
import { SOURCE_PRIORITY, type CanonicalListing, type DuplicateCandidate, type PossibleDuplicate } from "./dedupe";
import type { RawListing, SourceId } from "./types";

export const LOCAL_DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

// Arbitrary constant shared by every pipeline process. A second run that can't
// take it exits instead of overlapping (the workflow concurrency group is the
// first guard; this is the second).
const PIPELINE_LOCK = 7_243_001;

const CHUNK = 1000;

export async function connect(url = process.env.DATABASE_URL ?? LOCAL_DATABASE_URL) {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  return client;
}

export async function tryLock(db: pg.Client): Promise<boolean> {
  const r = await db.query<{ ok: boolean }>("select pg_try_advisory_lock($1) as ok", [PIPELINE_LOCK]);
  return r.rows[0]!.ok;
}

export async function startRun(db: pg.Client, trigger: "schedule" | "manual" | "local"): Promise<number> {
  const r = await db.query<{ id: string }>("insert into pipeline_runs (trigger) values ($1) returning id", [trigger]);
  return Number(r.rows[0]!.id);
}

export async function finishRun(
  db: pg.Client,
  runId: number,
  status: "succeeded" | "partial" | "failed",
  counts: object,
  errors: object[],
) {
  await db.query(
    "update pipeline_runs set status = $2, finished_at = now(), counts = $3, errors = $4 where id = $1",
    [runId, status, JSON.stringify(counts), JSON.stringify(errors)],
  );
}

function chunks<T>(xs: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += CHUNK) out.push(xs.slice(i, i + CHUNK));
  return out;
}

export async function upsertRawListings(db: pg.Client, runId: number, records: RawListing[]) {
  for (const part of chunks(records)) {
    const rows = part.map((r) => ({ source_id: r.sourceId, external_id: r.externalId, record: r.record }));
    await db.query(
      `insert into raw_listings (source_id, external_id, record, last_seen_run_id)
       select x.source_id, x.external_id, x.record, $2
       from jsonb_to_recordset($1::jsonb) as x(source_id text, external_id text, record jsonb)
       on conflict (source_id, external_id) do update
         set record = excluded.record, last_seen_at = now(), last_seen_run_id = excluded.last_seen_run_id`,
      [JSON.stringify(rows), runId],
    );
  }
}

// Insert or refresh canonical listings. Display fields are only overwritten by
// a source of equal or higher priority, so a lower-priority source can't
// clobber a better one when the better source failed this run. Nullable fields
// are filled from whichever side has a value. Seeing a listing again reopens it.
const WIN = "excluded.primary_source_priority <= l.primary_source_priority";
const take = (col: string) => `${col} = case when ${WIN} then excluded.${col} else l.${col} end`;
const fill = (col: string) =>
  `${col} = case when ${WIN} then coalesce(excluded.${col}, l.${col}) else coalesce(l.${col}, excluded.${col}) end`;

const LISTING_COLS = `identity_key text, identity_kind text, ats text, ats_tenant text, ats_req_id text,
  company text, title text, locations text[], apply_url text, normalized_url text, job_type text,
  season text, remote boolean, posted_at timestamptz, posted_at_precision text, primary_source_id text,
  primary_source_priority smallint, baseline_sponsorship text`;
const LISTING_NAMES = LISTING_COLS.split(",").map((c) => c.trim().split(/\s+/)[0]!);

export async function upsertListings(
  db: pg.Client,
  listings: CanonicalListing[],
): Promise<{ ids: Map<string, number>; inserted: number; updated: number }> {
  const ids = new Map<string, number>();
  let inserted = 0;
  for (const part of chunks(listings)) {
    const rows = part.map((l) => ({
      identity_key: l.identity.key,
      identity_kind: l.identity.kind,
      ats: l.identity.kind === "ats" ? l.identity.ats : null,
      ats_tenant: l.identity.kind === "ats" ? l.identity.tenant : null,
      ats_req_id: l.identity.kind === "ats" ? l.identity.reqId : null,
      company: l.company,
      title: l.title,
      locations: l.locations,
      apply_url: l.applyUrl,
      normalized_url: l.normalizedUrl,
      job_type: l.jobType,
      season: l.season,
      remote: l.remote,
      posted_at: l.postedAt,
      posted_at_precision: l.postedAtPrecision,
      primary_source_id: l.primarySourceId,
      primary_source_priority: SOURCE_PRIORITY[l.primarySourceId],
      baseline_sponsorship: l.baselineSponsorship,
    }));
    const r = await db.query<{ id: string; identity_key: string; inserted: boolean }>(
      `insert into listings as l (${LISTING_NAMES.join(", ")})
       select ${LISTING_NAMES.map((c) => `x.${c}`).join(", ")}
       from jsonb_to_recordset($1::jsonb) as x(${LISTING_COLS})
       on conflict (identity_key) do update set
         ${["company", "title", "locations", "apply_url", "normalized_url", "job_type", "primary_source_id"].map(take).join(", ")},
         ${["season", "remote", "posted_at", "posted_at_precision"].map(fill).join(", ")},
         primary_source_priority = least(excluded.primary_source_priority, l.primary_source_priority),
         baseline_sponsorship = coalesce(excluded.baseline_sponsorship, l.baseline_sponsorship),
         status = 'open', closed_at = null, last_seen_at = now(), updated_at = now()
       returning l.id, l.identity_key, (xmax = 0) as inserted`,
      [JSON.stringify(rows)],
    );
    for (const row of r.rows) {
      ids.set(row.identity_key, Number(row.id));
      if (row.inserted) inserted++;
    }
  }
  return { ids, inserted, updated: listings.length - inserted };
}

// Point each source record at its listing and mark it seen in this run.
export async function upsertListingSources(
  db: pg.Client,
  runId: number,
  links: { sourceId: SourceId; externalId: string; listingId: number }[],
) {
  for (const part of chunks(links)) {
    const rows = part.map((x) => ({ source_id: x.sourceId, external_id: x.externalId, listing_id: x.listingId }));
    await db.query(
      `insert into listing_sources (source_id, external_id, listing_id, last_seen_run_id)
       select x.source_id, x.external_id, x.listing_id, $2
       from jsonb_to_recordset($1::jsonb) as x(source_id text, external_id text, listing_id bigint)
       on conflict (source_id, external_id) do update
         set listing_id = excluded.listing_id, missed_reads = 0,
             last_seen_at = now(), last_seen_run_id = excluded.last_seen_run_id`,
      [JSON.stringify(rows), runId],
    );
  }
}

// Called only for sources whose read was complete this run. Records that
// source did not include (or that are now out of region) count one miss.
export async function recordMisses(db: pg.Client, runId: number, sourceId: SourceId): Promise<number> {
  const r = await db.query(
    `update listing_sources set missed_reads = missed_reads + 1
     where source_id = $1 and last_seen_run_id is distinct from $2`,
    [sourceId, runId],
  );
  return r.rowCount ?? 0;
}

// Close open listings that no source still vouches for: every source record has
// missed two consecutive complete reads (or moved to another listing).
export async function closeMissingListings(db: pg.Client): Promise<number> {
  const r = await db.query(
    `update listings l set status = 'closed', closed_at = now(), updated_at = now()
     where l.status = 'open'
       and not exists (select 1 from listing_sources s where s.listing_id = l.id and s.missed_reads < 2)`,
  );
  return r.rowCount ?? 0;
}

export async function openDuplicateCandidates(db: pg.Client): Promise<DuplicateCandidate[]> {
  const r = await db.query<{
    id: string; company: string; title: string; season: string | null; locations: string[];
    ats: string | null; ats_tenant: string | null; ats_req_id: string | null;
  }>(`select id, company, title, season, locations, ats, ats_tenant, ats_req_id from listings where status = 'open'`);
  return r.rows.map((x) => ({
    id: Number(x.id), company: x.company, title: x.title, season: x.season, locations: x.locations,
    ats: x.ats, atsTenant: x.ats_tenant, atsReqId: x.ats_req_id,
  }));
}

// Possible duplicates are derived data, so they are recomputed from scratch.
export async function replacePossibleDuplicates(db: pg.Client, dups: PossibleDuplicate[]) {
  await db.query("delete from possible_duplicates");
  for (const part of chunks(dups)) {
    await db.query(
      `insert into possible_duplicates (listing_id_a, listing_id_b, reason)
       select x.a, x.b, x.reason from jsonb_to_recordset($1::jsonb) as x(a bigint, b bigint, reason text)`,
      [JSON.stringify(part)],
    );
  }
}
