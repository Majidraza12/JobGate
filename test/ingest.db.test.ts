// Integration tests against a throwaway database on the local Supabase
// Postgres. Skipped when it isn't running (start it with `npm run db:start`).
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { applyMigrations } from "./helpers/migrate";
import pg from "pg";
import { LOCAL_DATABASE_URL, tryLock } from "../pipeline/db";
import { runIngest } from "../pipeline/runIngest";
import type { RawListing, SourceAdapter, SourceId } from "../pipeline/types";

const TEST_DB = "jobgate_test";
const testUrl = LOCAL_DATABASE_URL.replace(/\/postgres$/, `/${TEST_DB}`);

async function reachable() {
  const c = new pg.Client({ connectionString: LOCAL_DATABASE_URL, connectionTimeoutMillis: 2000 });
  try {
    await c.connect();
    await c.end();
    return true;
  } catch {
    return false;
  }
}

const up = await reachable();

const listing = (sourceId: SourceId, n: number, over: Partial<RawListing> = {}): RawListing => ({
  sourceId,
  externalId: `${sourceId}-${n}`,
  company: "Acme",
  title: `Engineer ${n}`,
  locations: ["Chicago, IL"],
  applyUrl: `https://job-boards.greenhouse.io/acme/jobs/${n}`,
  postedAt: null,
  postedAtPrecision: null,
  jobType: sourceId === "zshah101" ? "internship" : "new_grad",
  season: null,
  remote: null,
  baselineSponsorship: null,
  record: { n },
  ...over,
});

const source = (id: SourceId, listings: RawListing[] | Error): SourceAdapter => ({
  id,
  fetch: async () => {
    if (listings instanceof Error) throw listings;
    return { sourceId: id, listings, skipped: [], inactive: 0 };
  },
});

const ingest = (...adapters: SourceAdapter[]) => runIngest({ adapters, trigger: "local", databaseUrl: testUrl, log: false });

describe.skipIf(!up)("ingest against Postgres", () => {
  let db: pg.Client;

  beforeAll(async () => {
    const admin = new pg.Client({ connectionString: LOCAL_DATABASE_URL });
    await admin.connect();
    await admin.query(`drop database if exists ${TEST_DB} with (force)`);
    await admin.query(`create database ${TEST_DB}`);
    await admin.end();
    db = new pg.Client({ connectionString: testUrl });
    await db.connect();
    await applyMigrations(db);
  });

  afterAll(async () => {
    await db?.end();
    const admin = new pg.Client({ connectionString: LOCAL_DATABASE_URL });
    await admin.connect();
    await admin.query(`drop database if exists ${TEST_DB} with (force)`);
    await admin.end();
  });

  beforeEach(async () => {
    await db.query("truncate possible_duplicates, listing_sources, listings, raw_listings, pipeline_runs restart identity cascade");
  });

  const status = async (n: number) =>
    (await db.query("select status from listings where identity_key = $1", [`greenhouse:acme:${n}`])).rows[0]?.status;

  it("is idempotent: a second identical run inserts nothing", async () => {
    const z = [listing("zshah101", 1), listing("zshah101", 2)];
    const first = await ingest(source("zshah101", z));
    const second = await ingest(source("zshah101", z));
    expect(first.counts.inserted).toBe(2);
    expect(second.counts).toMatchObject({ inserted: 0, updated: 2, closed: 0 });
    const counts = await db.query(
      "select (select count(*) from listings) l, (select count(*) from raw_listings) r, (select count(*) from listing_sources) s",
    );
    expect(counts.rows[0]).toEqual({ l: "2", r: "2", s: "2" });
  });

  it("closes a listing only after two consecutive complete reads miss it, and reopens it if it returns", async () => {
    await ingest(source("zshah101", [listing("zshah101", 1), listing("zshah101", 2)]));
    await ingest(source("zshah101", [listing("zshah101", 1)]));
    expect(await status(2)).toBe("open");
    await ingest(source("zshah101", [listing("zshah101", 1)]));
    expect(await status(2)).toBe("closed");
    await ingest(source("zshah101", [listing("zshah101", 1), listing("zshah101", 2)]));
    expect(await status(2)).toBe("open");
  });

  it("never counts a failed source read as a miss", async () => {
    await ingest(source("zshah101", [listing("zshah101", 1)]), source("simplify-newgrad", [listing("simplify-newgrad", 9)]));
    for (let i = 0; i < 3; i++) {
      const r = await ingest(source("zshah101", new Error("503")), source("simplify-newgrad", [listing("simplify-newgrad", 9)]));
      expect(r.status).toBe("partial");
    }
    expect(await status(1)).toBe("open");
    const misses = await db.query("select missed_reads from listing_sources where source_id = 'zshah101'");
    expect(misses.rows[0].missed_reads).toBe(0);
  });

  it("records a failed run when every source fails, and changes nothing", async () => {
    await ingest(source("zshah101", [listing("zshah101", 1)]));
    const r = await ingest(source("zshah101", new Error("timeout")));
    expect(r.status).toBe("failed");
    expect(await status(1)).toBe("open");
    const run = await db.query("select status, errors from pipeline_runs where id = $1", [r.runId]);
    expect(run.rows[0].status).toBe("failed");
    expect(run.rows[0].errors[0]).toMatchObject({ step: "fetch", source: "zshah101" });
  });

  it("links one listing to every source that found it", async () => {
    await ingest(source("zshah101", [listing("zshah101", 1)]), source("simplify-newgrad", [listing("simplify-newgrad", 1)]));
    const r = await db.query("select count(distinct listing_id) l, count(*) s from listing_sources");
    expect(r.rows[0]).toEqual({ l: "1", s: "2" });
  });

  it("keeps the higher-priority source's fields when only the lower one is read", async () => {
    await ingest(source("zshah101", [listing("zshah101", 1, { title: "From zshah101", baselineSponsorship: "citizens-only" })]));
    await ingest(source("simplify-newgrad", [listing("simplify-newgrad", 1, { title: "From Simplify", season: "Fall 2027" })]));
    const r = await db.query("select title, season, baseline_sponsorship, primary_source_id from listings");
    expect(r.rows[0]).toEqual({
      title: "From zshah101",
      season: "Fall 2027",
      baseline_sponsorship: "citizens-only",
      primary_source_id: "zshah101",
    });
  });

  it("stores out-of-region records as raw but never as listings", async () => {
    await ingest(source("simplify-newgrad", [listing("simplify-newgrad", 1, { locations: ["London, UK"] })]));
    const r = await db.query("select (select count(*) from listings) l, (select count(*) from raw_listings) r");
    expect(r.rows[0]).toEqual({ l: "0", r: "1" });
  });

  it("flags possible duplicates without merging them", async () => {
    const same = { title: "Software Engineer Intern", season: "Summer 2027" };
    const r = await ingest(source("zshah101", [listing("zshah101", 1, same), listing("zshah101", 2, same)]));
    expect(r.counts.listings).toBe(2);
    expect(r.counts.possibleDuplicates).toBe(1);
  });

  it("exits without writing when another run holds the lock", async () => {
    const holder = new pg.Client({ connectionString: testUrl });
    await holder.connect();
    expect(await tryLock(holder)).toBe(true);
    const r = await ingest(source("zshah101", [listing("zshah101", 1)]));
    await holder.end();
    expect(r.status).toBe("locked");
    expect((await db.query("select count(*) from listings")).rows[0].count).toBe("0");
  });
});
