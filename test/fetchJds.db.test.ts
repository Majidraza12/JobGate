// fetch-jds against a throwaway database (its own, so it can run in parallel
// with the ingest tests). The network is faked. Skipped when the local
// Supabase Postgres isn't running.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { applyMigrations } from "./helpers/migrate";
import pg from "pg";
import { LOCAL_DATABASE_URL } from "../pipeline/db";
import { interleaveByHost, runFetchJds } from "../pipeline/runFetchJds";

const TEST_DB = "jobgate_test_jd";
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

const LONG = "<p>" + "Must be a U.S. citizen to apply for this role. ".repeat(10) + "</p>";

// Each test sets what every URL returns; robots.txt is always 404 (allow all).
let routes: Record<string, () => Response> = {};
const fetchImpl = (async (url: string) => {
  if (url.endsWith("/robots.txt")) return new Response(null, { status: 404 });
  const r = routes[url];
  if (!r) throw new Error(`unexpected request ${url}`);
  return r();
}) as typeof fetch;
const html = (body: string) => () => new Response(body, { status: 200, headers: { "content-type": "text/html" } });
const status = (n: number) => () => new Response(null, { status: n });

const fetchJds = (extra: Partial<Parameters<typeof runFetchJds>[0]> = {}) =>
  runFetchJds({
    trigger: "local",
    databaseUrl: testUrl,
    log: false,
    fetcher: { fetchImpl, sleep: async () => {}, minDelayMs: 0 },
    ...extra,
  });

describe.skipIf(!up)("fetch-jds against Postgres", () => {
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
    routes = {};
    await db.query("truncate listings, pipeline_runs restart identity cascade");
  });

  // SmartRecruiters-style listings (fetched as pages) so the fake network can
  // serve them; the req id is the last path segment.
  const addListing = (url: string, status = "open") =>
    db.query(
      `insert into listings (identity_key, identity_kind, ats, ats_tenant, ats_req_id, company, title, apply_url,
                             normalized_url, job_type, primary_source_id, primary_source_priority, status)
       values ($1, 'ats', 'smartrecruiters', 'acme', $2, 'Acme', 'Engineer', $1, $1, 'new_grad', 'simplify-newgrad', 1, $3)`,
      [url, url.split("/").at(-1), status],
    );
  const row = async (url: string) =>
    (await db.query("select jd_fetch_status, jd_fetch_attempts, jd_hash, jd_text from listings where apply_url = $1", [url])).rows[0];

  it("saves text, hash, and status, and logs counts per kind on the run row", async () => {
    await addListing("https://a.com/1");
    await addListing("https://a.com/2");
    await addListing("https://a.com/9", "closed");
    routes = { "https://a.com/1": html(LONG), "https://a.com/2": status(403) };
    const r = await fetchJds();
    expect(r.counts).toEqual({ smartrecruiters: { ok: 1, blocked: 1 } });
    expect(await row("https://a.com/1")).toMatchObject({ jd_fetch_status: "ok", jd_fetch_attempts: 0 });
    expect((await row("https://a.com/1")).jd_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(await row("https://a.com/2")).toMatchObject({ jd_fetch_status: "blocked", jd_fetch_attempts: 1 });
    expect(await row("https://a.com/9")).toMatchObject({ jd_fetch_status: null });
    const run = await db.query("select status, counts from pipeline_runs where id = $1", [r.runId]);
    expect(run.rows[0]).toEqual({ status: "succeeded", counts: { step: "fetch_jd", byKind: { smartrecruiters: { ok: 1, blocked: 1 } } } });
  });

  it("is idempotent: a second run fetches nothing that already succeeded or failed for good", async () => {
    await addListing("https://a.com/1");
    await addListing("https://a.com/2");
    routes = { "https://a.com/1": html(LONG), "https://a.com/2": status(404) };
    await fetchJds();
    expect((await fetchJds()).counts).toEqual({});
  });

  it("retries transient errors on later runs, up to three consecutive failures", async () => {
    await addListing("https://a.com/1");
    routes = { "https://a.com/1": status(503) };
    for (let i = 0; i < 4; i++) await fetchJds();
    expect(await row("https://a.com/1")).toMatchObject({ jd_fetch_status: "error", jd_fetch_attempts: 3 });
  });

  it("keeps a good JD when a refresh fails transiently", async () => {
    await addListing("https://a.com/1");
    routes = { "https://a.com/1": html(LONG) };
    await fetchJds();
    const before = await row("https://a.com/1");
    await db.query("update listings set jd_fetched_at = now() - interval '10 days'");
    routes = { "https://a.com/1": status(503) };
    expect((await fetchJds({ refreshDays: 7 })).counts).toEqual({ smartrecruiters: { error: 1 } });
    expect(await row("https://a.com/1")).toMatchObject({ jd_fetch_status: "ok", jd_hash: before.jd_hash, jd_text: before.jd_text });
  });
});

describe("interleaveByHost", () => {
  it("alternates hosts so one slow host doesn't stall every worker", () => {
    const items = ["https://a.com/1", "https://a.com/2", "https://a.com/3", "https://b.com/1", "https://c.com/1"].map((applyUrl) => ({ applyUrl }));
    expect(interleaveByHost(items).map((x) => x.applyUrl)).toEqual([
      "https://a.com/1",
      "https://b.com/1",
      "https://c.com/1",
      "https://a.com/2",
      "https://a.com/3",
    ]);
  });

  it("groups by the host actually requested, not the apply URL's host", () => {
    const items = ["https://x.com/1", "https://y.com/1", "https://b.com/1"].map((applyUrl) => ({ applyUrl }));
    const api = (t: { applyUrl: string }) => (t.applyUrl.includes("b.com") ? t.applyUrl : "https://api.example/x");
    expect(interleaveByHost(items, api).map((x) => x.applyUrl)).toEqual(["https://x.com/1", "https://b.com/1", "https://y.com/1"]);
  });
});
