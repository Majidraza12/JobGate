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

  it("keeps saved listings private to their owner", async () => {
    const listingId = (await db.query("select id from listings limit 1")).rows[0].id;
    await db.query("begin");
    try {
      await db.query("insert into saved_listings (user_id, listing_id) values ($1, $2)", [A, listingId]);
      for (const [who, n] of [[A, 1], [B, 0]] as const) {
        await db.query("set local role authenticated");
        await db.query("select set_config('request.jwt.claim.sub', $1, true)", [who]);
        expect((await db.query("select count(*)::int as n from saved_listings")).rows[0].n).toBe(n);
        await db.query("reset role");
      }
    } finally {
      await db.query("rollback");
    }
    await as("authenticated", A, async () => {
      await db.query("insert into saved_listings (listing_id) values ($1)", [listingId]);
      expect((await db.query("delete from saved_listings where listing_id = $1", [listingId])).rowCount).toBe(1);
    });
    await expect(as("authenticated", B, () => db.query("insert into saved_listings (user_id, listing_id) values ($1, $2)", [A, listingId]))).rejects.toThrow(
      /row-level security/,
    );
    await expect(as("anon", null, () => db.query("select * from saved_listings"))).rejects.toThrow(/permission denied/);
  });

  // Audit 2026-11-10: limits must hold in the database, because a signed-in
  // user can call the REST API directly and skip the app's validation.
  describe("database-side limits", () => {
    const listing = async () => (await db.query("select id from listings limit 1")).rows[0].id as string;

    it("caps note, comment, and field sizes and rejects unknown verdicts", async () => {
      const id = await listing();
      const big = "x".repeat(2001);
      await expect(as("authenticated", A, () => db.query("insert into applications (listing_id, notes) values ($1, $2)", [id, big]))).rejects.toThrow(/applications_notes_len/);
      await expect(as("authenticated", A, () => db.query("insert into verdict_feedback (listing_id, verdict_shown, comment) values ($1, 'eligible', $2)", [id, big]))).rejects.toThrow(
        /verdict_feedback_comment_len/,
      );
      await expect(as("authenticated", A, () => db.query("insert into verdict_feedback (listing_id, verdict_shown) values ($1, $2)", [id, big]))).rejects.toThrow(/verdict_feedback_verdict_check/);
      await expect(as("authenticated", A, () => db.query("insert into verdict_feedback (listing_id, verdict_shown, field) values ($1, 'check', $2)", [id, big]))).rejects.toThrow(
        /verdict_feedback_field_len/,
      );
    });

    it("stops one account from flooding feedback, without limiting anyone else", async () => {
      const id = await listing();
      await as("authenticated", A, async () => {
        await db.query("insert into verdict_feedback (listing_id, verdict_shown) select $1, 'check' from generate_series(1, 50)", [id]);
        await expect(db.query("insert into verdict_feedback (listing_id, verdict_shown) values ($1, 'check')", [id])).rejects.toThrow(/row-level security/);
      });
      // One bulk statement can't slip past the cap either.
      await expect(as("authenticated", A, () => db.query("insert into verdict_feedback (listing_id, verdict_shown) select $1, 'check' from generate_series(1, 51)", [id]))).rejects.toThrow(
        /row-level security/,
      );
      await db.query("begin");
      try {
        await db.query("insert into verdict_feedback (user_id, listing_id, verdict_shown) select $1, $2, 'check' from generate_series(1, 50)", [A, id]);
        await db.query("set local role authenticated");
        await db.query("select set_config('request.jwt.claim.sub', $1, true)", [B]);
        await db.query("insert into verdict_feedback (listing_id, verdict_shown) values ($1, 'check')", [id]);
      } finally {
        await db.query("rollback");
      }
    });

    it("still refuses feedback filed under another user's id", async () => {
      const id = await listing();
      await expect(as("authenticated", B, () => db.query("insert into verdict_feedback (user_id, listing_id, verdict_shown) values ($1, $2, 'check')", [A, id]))).rejects.toThrow(
        /row-level security/,
      );
    });

    it("bounds profile arrays and rejects unknown job types and empty start terms", async () => {
      const set = (col: string, value: string[]) => as("authenticated", A, () => db.query(`update profiles set ${col} = $1 where id = $2`, [value, A]));
      await expect(set("job_types", ["internship", "ceo"])).rejects.toThrow(/profiles_job_types_check/);
      await expect(set("starts", [""])).rejects.toThrow(/profiles_starts_check/);
      await expect(set("starts", Array(21).fill("Summer 2027"))).rejects.toThrow(/profiles_starts_check/);
      await expect(set("locations", Array(21).fill("Chicago, IL"))).rejects.toThrow(/profiles_locations_check/);
      await expect(set("locations", ["x".repeat(2001)])).rejects.toThrow(/profiles_locations_check/);
      expect((await set("locations", ["Chicago, IL", "New York, NY"])).rowCount).toBe(1);
    });

    it("hides pipeline internals (error logs, costs) from signed-in users", async () => {
      await as("authenticated", A, async () => {
        await db.query("select id, status, started_at, finished_at from pipeline_runs");
        await db.query("select jd_hash, prompt_version, model, extraction_status, extracted from requirements order by jd_hash");
      });
      await expect(as("authenticated", A, () => db.query("select errors from pipeline_runs"))).rejects.toThrow(/permission denied/);
      await expect(as("authenticated", A, () => db.query("select counts from pipeline_runs"))).rejects.toThrow(/permission denied/);
      await expect(as("authenticated", A, () => db.query("select error, cost_usd from requirements"))).rejects.toThrow(/permission denied/);
      await expect(as("anon", null, () => db.query("select id from pipeline_runs"))).rejects.toThrow(/permission denied/);
    });

    it("refuses a listing whose apply link is not a web URL", async () => {
      const insert = (url: string) =>
        db.query(
          `insert into listings (identity_key, identity_kind, company, title, apply_url, normalized_url, job_type, primary_source_id, primary_source_priority)
           values ($1, 'url', 'Acme', 'Intern', $1, 'https://y', 'internship', 'zshah101', 1)`,
          [url],
        );
      await expect(insert("javascript:alert(1)")).rejects.toThrow(/listings_apply_url_http/);
      await expect(insert("data:text/html,x")).rejects.toThrow(/listings_apply_url_http/);
    });
  });
});

describe.skipIf(!up)("password reset limits", () => {
  const RESET_DB = "jobgate_test_reset";
  const url = LOCAL_DATABASE_URL.replace(/\/postgres$/, `/${RESET_DB}`);
  let db: pg.Client;

  beforeAll(async () => {
    const admin = new pg.Client({ connectionString: LOCAL_DATABASE_URL });
    await admin.connect();
    await admin.query(`drop database if exists ${RESET_DB} with (force)`);
    await admin.query(`create database ${RESET_DB}`);
    await admin.end();
    db = new pg.Client({ connectionString: url });
    await db.connect();
    await applyMigrations(db);
  });

  afterAll(async () => {
    await db?.end();
    const admin = new pg.Client({ connectionString: LOCAL_DATABASE_URL });
    await admin.connect();
    await admin.query(`drop database if exists ${RESET_DB} with (force)`);
    await admin.end();
  });

  // As a signed-out visitor, the way the forgot-password form calls it.
  const claim = async (email: string, ip: string) => {
    await db.query("begin");
    try {
      await db.query("set local role anon");
      return (await db.query("select public.claim_password_reset($1, $2) as r", [email, ip])).rows[0].r as string;
    } finally {
      await db.query("commit");
    }
  };

  it("allows 3 requests per email address a day, case and spaces ignored", async () => {
    expect(await claim("me@example.com", "1.1.1.1")).toBe("ok");
    expect(await claim(" ME@example.com ", "2.2.2.2")).toBe("ok");
    expect(await claim("me@example.com", "3.3.3.3")).toBe("ok");
    expect(await claim("me@example.com", "4.4.4.4")).toBe("email_limit");
    expect(await claim("other@example.com", "4.4.4.4")).toBe("ok");
  });

  it("allows 10 requests per IP address an hour, across different emails", async () => {
    for (let n = 0; n < 10; n++) expect(await claim(`spray${n}@example.com`, "9.9.9.9")).toBe("ok");
    expect(await claim("spray10@example.com", "9.9.9.9")).toBe("ip_limit");
  });

  it("stores only hashes, and visitors can't read the log", async () => {
    const rows = (await db.query("select email_hash, ip_hash from password_reset_requests")).rows;
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.email_hash).toMatch(/^[0-9a-f]{64}$/);
      expect(r.ip_hash).toMatch(/^[0-9a-f]{64}$/);
    }
    await db.query("begin");
    try {
      await db.query("set local role anon");
      await expect(db.query("select * from password_reset_requests")).rejects.toThrow(/permission denied/);
    } finally {
      await db.query("rollback");
    }
  });

  it("rejects oversized input", async () => {
    await expect(claim(`${"x".repeat(321)}@a.b`, "1.1.1.1")).rejects.toThrow(/too long/);
  });
});
