// The extract step against a throwaway database, with a fake LLM (no API
// calls). Skipped when the local Supabase Postgres isn't running.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { applyMigrations } from "./helpers/migrate";
import pg from "pg";
import { LOCAL_DATABASE_URL } from "../pipeline/db";
import { MODEL, type LlmClient } from "../pipeline/extract/llm";
import { PROMPT_VERSION } from "../pipeline/extract/prompt";
import { worstCaseUsd } from "../pipeline/extract/spend";
import { sha256 } from "../pipeline/jd/text";
import { runExtract } from "../pipeline/runExtract";
import { blank } from "./helpers/extraction";

const TEST_DB = "jobgate_test_extract";
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

const JD_A = "Software Engineer Intern. Must be a U.S. citizen. ".repeat(10);
const JD_B = "Data Analyst Intern. We are unable to sponsor visas. ".repeat(10);

// Answers every call with a valid blank extraction unless told otherwise;
// counts calls per JD.
function fakeLlm(behavior: (jd: string) => "ok" | "throw" | "garbage" = () => "ok") {
  const calls: string[] = [];
  const llm: LlmClient = {
    model: MODEL,
    async complete(_s, turns) {
      const jd = turns[0]!.content;
      calls.push(jd);
      const b = behavior(jd);
      if (b === "throw") throw new Error("overloaded");
      return {
        text: b === "garbage" ? "nope" : JSON.stringify(blank()),
        stopReason: "end_turn",
        inputTokens: 2000,
        outputTokens: 500,
      };
    },
  };
  return { llm, calls };
}

const extract = (llm: LlmClient, capUsd = 1) => runExtract({ llm, capUsd, databaseUrl: testUrl, log: false });

describe.skipIf(!up)("extract step against Postgres", () => {
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
    await db.query("truncate listings, requirements, extraction_runs restart identity cascade");
  });

  let n = 0;
  const addListing = (jd: string | null, status = "open") => {
    const url = `https://jobs.lever.co/acme/${++n}`;
    return db.query(
      `insert into listings (identity_key, identity_kind, company, title, apply_url, normalized_url, job_type,
                             primary_source_id, primary_source_priority, status, jd_text, jd_hash, jd_fetch_status)
       values ($1, 'url', 'Acme', 'Engineer', $1, $1, 'internship', 'zshah101', 0, $2, $3, $4, $5)`,
      [url, status, jd, jd && sha256(jd), jd ? "ok" : "blocked"],
    );
  };
  const reqs = async () =>
    (await db.query("select jd_hash, extraction_status, prompt_version, model from requirements order by jd_hash")).rows;

  it("extracts each distinct JD once, shared by listings with identical text", async () => {
    await addListing(JD_A);
    await addListing(JD_A);
    await addListing(JD_B);
    await addListing(null);
    await addListing(JD_B, "closed");
    const { llm, calls } = fakeLlm();
    const r = await extract(llm);
    expect(calls).toHaveLength(2);
    expect(r.counts).toMatchObject({ targets: 2, listingsCovered: 3, ok: 2 });
    expect(await reqs()).toEqual(
      [sha256(JD_A), sha256(JD_B)].sort().map((h) => ({ jd_hash: h, extraction_status: "ok", prompt_version: PROMPT_VERSION, model: MODEL })),
    );
  });

  it("is cached: a second run makes no calls", async () => {
    await addListing(JD_A);
    await extract(fakeLlm().llm);
    const { llm, calls } = fakeLlm();
    expect((await extract(llm)).counts.targets).toBe(0);
    expect(calls).toHaveLength(0);
  });

  it("retries llm_failed on the next run but not schema_invalid", async () => {
    await addListing(JD_A);
    await addListing(JD_B);
    const first = await extract(fakeLlm((jd) => (jd.includes("Software") ? "throw" : "garbage")).llm);
    expect(first).toMatchObject({ status: "partial", counts: { llm_failed: 1, schema_invalid: 1 } });
    const { llm, calls } = fakeLlm();
    await extract(llm);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("Software");
  });

  it("records tokens and cost on the run row after each call", async () => {
    await addListing(JD_A);
    const r = await extract(fakeLlm().llm);
    const run = (await db.query("select status, input_tokens, output_tokens, cost_usd from extraction_runs where id = $1", [r.runId])).rows[0];
    // 2000 input at $1/M + 500 output at $5/M = $0.0045
    expect(run).toEqual({ status: "succeeded", input_tokens: "2000", output_tokens: "500", cost_usd: "0.004500" });
  });

  it("stops before an extraction whose worst case could cross the daily cap, counting earlier runs today", async () => {
    await addListing(JD_A);
    await addListing(JD_B);
    const worst = worstCaseUsd(MODEL, JD_A);
    // An earlier run today already spent all but one worst case (plus a little).
    await db.query("insert into extraction_runs (model, prompt_version, status, cost_usd) values ($1, $2, 'succeeded', $3)", [
      MODEL,
      PROMPT_VERSION,
      1 - worst - 0.001,
    ]);
    const { llm, calls } = fakeLlm();
    const r = await extract(llm, 1);
    expect(calls).toHaveLength(1);
    expect(r).toMatchObject({ status: "cap_reached", counts: { ok: 1, skippedForCap: 1 } });
  });

  it("dry run reports targets and worst-case cost without calling the model", async () => {
    await addListing(JD_A);
    const { llm, calls } = fakeLlm();
    const r = await runExtract({ llm, capUsd: 1, databaseUrl: testUrl, log: false, dryRun: true });
    expect(r.status).toBe("dry_run");
    expect(r.worstCaseUsd).toBeCloseTo(worstCaseUsd(MODEL, JD_A), 6);
    expect(calls).toHaveLength(0);
  });
});
