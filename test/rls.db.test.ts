// Row-level security and grants, exercised as the real API roles against a
// throwaway database. Skipped when the local Supabase Postgres isn't running.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";
import { LOCAL_DATABASE_URL } from "../pipeline/db";
import { applyMigrations } from "./helpers/migrate";

const TEST_DB = "jobgate_test_rls";
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

const A = randomUUID();
const B = randomUUID();

const profile = (id: string) => ({
  id, grad_month: "2027-05", degree: "bs", us_citizen: false, permanent_resident: false,
  authorized_now_without_sponsorship: true, needs_sponsorship_future: true, clearance_status: "none",
});

describe.skipIf(!up)("RLS and grants", () => {
  let db: pg.Client;

  // Runs fn as an API role, the way PostgREST does: role plus JWT subject,
  // scoped to one transaction that is always rolled back.
  async function as<T>(role: "authenticated" | "anon", sub: string | null, fn: () => Promise<T>): Promise<T> {
    await db.query("begin");
    try {
      await db.query(`set local role ${role}`);
      await db.query("select set_config('request.jwt.claim.sub', $1, true)", [sub ?? ""]);
      return await fn();
    } finally {
      await db.query("rollback");
    }
  }

  const insertProfile = (p: ReturnType<typeof profile>) =>
    db.query(
      `insert into profiles (${Object.keys(p).join(", ")}) values (${Object.keys(p).map((_, i) => `$${i + 1}`).join(", ")})`,
      Object.values(p),
    );

  beforeAll(async () => {
    const admin = new pg.Client({ connectionString: LOCAL_DATABASE_URL });
    await admin.connect();
    await admin.query(`drop database if exists ${TEST_DB} with (force)`);
    await admin.query(`create database ${TEST_DB}`);
    await admin.end();
    db = new pg.Client({ connectionString: testUrl });
    await db.connect();
    await applyMigrations(db);
    await db.query("insert into auth.users (id) values ($1), ($2)", [A, B]);
    await insertProfile(profile(A)); // as the owner role, like a seed
    await db.query(
      `insert into listings (identity_key, identity_kind, company, title, apply_url, normalized_url, job_type, primary_source_id, primary_source_priority)
       values ('url:x', 'url', 'Acme', 'Intern', 'https://x', 'https://x', 'internship', 'zshah101', 1)`,
    );
  });

  afterAll(async () => {
    await db?.end();
    const admin = new pg.Client({ connectionString: LOCAL_DATABASE_URL });
    await admin.connect();
    await admin.query(`drop database if exists ${TEST_DB} with (force)`);
    await admin.end();
  });

  it("lets a user read their own profile and nobody else's", async () => {
    expect(await as("authenticated", A, async () => (await db.query("select id from profiles")).rows)).toEqual([{ id: A }]);
    expect(await as("authenticated", B, async () => (await db.query("select id from profiles")).rows)).toEqual([]);
  });

  it("stops a user from writing a profile for someone else", async () => {
    await expect(as("authenticated", B, () => insertProfile(profile(A)))).rejects.toThrow(/row-level security|duplicate/);
    await expect(as("authenticated", B, () => insertProfile({ ...profile(randomUUID()) }))).rejects.toThrow(/row-level security/);
  });

  it("stops a user from changing someone else's profile", async () => {
    const changed = await as("authenticated", B, async () => (await db.query("update profiles set degree = 'phd' where id = $1", [A])).rowCount);
    expect(changed).toBe(0);
  });

  it("lets signed-in users read listings but never write them", async () => {
    expect(await as("authenticated", A, async () => (await db.query("select count(*)::int as n from listings")).rows[0].n)).toBe(1);
    await expect(as("authenticated", A, () => db.query("update listings set title = 'x'"))).rejects.toThrow(/permission denied/);
  });

  it("gives signed-out visitors nothing", async () => {
    await expect(as("anon", null, () => db.query("select * from listings"))).rejects.toThrow(/permission denied/);
    await expect(as("anon", null, () => db.query("select * from profiles"))).rejects.toThrow(/permission denied/);
  });

  it("keeps applications private and feedback append-only", async () => {
    const listingId = (await db.query("select id from listings limit 1")).rows[0].id;
    await as("authenticated", A, async () => {
      await db.query("insert into applications (listing_id) values ($1)", [listingId]);
      await db.query("insert into verdict_feedback (listing_id, verdict_shown) values ($1, 'eligible')", [listingId]);
      expect((await db.query("select count(*)::int as n from applications")).rows[0].n).toBe(1);
      await expect(db.query("delete from verdict_feedback")).rejects.toThrow(/permission denied/);
    });
    expect(await as("authenticated", B, async () => (await db.query("select count(*)::int as n from applications")).rows[0].n)).toBe(0);
  });
});
