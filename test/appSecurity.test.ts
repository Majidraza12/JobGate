// Regression tests from the 2026-11-10 audit: server actions validate their
// arguments (they are public HTTP endpoints), requirement lookups page in a
// stable order, and the response headers and public-path rule stay in place.
// No database and no network: Supabase is a recording fake.
import { beforeEach, describe, expect, it, vi } from "vitest";

type Call = { table: string; op: string; args: unknown[] };
const calls: Call[] = [];
let failWith: { message: string } | null = null;

// A chainable stand-in for the Supabase query builder. Every method records
// itself and returns the same thenable, which resolves to { data, error }.
function builder(table: string, rows: unknown[] = []) {
  const b: Record<string, unknown> = {};
  for (const op of ["select", "insert", "update", "upsert", "delete", "eq", "in", "order", "range"]) {
    b[op] = (...args: unknown[]) => {
      calls.push({ table, op, args });
      return b;
    };
  }
  b.then = (resolve: (v: unknown) => unknown) => resolve({ data: failWith ? null : rows, error: failWith });
  return b;
}

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: (t: string) => builder(t) }) }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

const { sendFeedback, setApplied } = await import("../src/app/(app)/listing/[id]/actions");
const { removeApplication, updateApplication } = await import("../src/app/(app)/applied/actions");
const { setSaved } = await import("../src/app/(app)/saved/actions");
const { HASH_CHUNK, loadRequirements } = await import("../src/lib/feed");
const { isPublicPath } = await import("../src/lib/publicPaths");
const { SECURITY_HEADERS } = await import("../next.config");

const form = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};
const writes = () => calls.filter((c) => ["insert", "update", "upsert", "delete"].includes(c.op));

beforeEach(() => {
  calls.length = 0;
  failWith = null;
});

describe("sendFeedback", () => {
  const prev = { sent: false, error: null };

  it("stores a valid report", async () => {
    expect(await sendFeedback(7, "check", prev, form({ field: "clearance", comment: "wrong" }))).toEqual({ sent: true, error: null });
    expect(writes()).toHaveLength(1);
    expect(writes()[0]!.args[0]).toMatchObject({ listing_id: 7, verdict_shown: "check", field: "clearance", comment: "wrong" });
  });

  it("treats an empty field as the verdict overall", async () => {
    await sendFeedback(7, "eligible", prev, form({ field: "", comment: "" }));
    expect(writes()[0]!.args[0]).toMatchObject({ field: null });
  });

  it("rejects a made-up verdict, field, or listing id without touching the database", async () => {
    const bad: [unknown, unknown, Record<string, string>][] = [
      [7, "x".repeat(500_000), { comment: "" }],
      [7, "definitely_eligible", { comment: "" }],
      [7, "check", { field: "<script>", comment: "" }],
      [7.5, "check", { comment: "" }],
      [-1, "check", { comment: "" }],
      ["7; drop table", "check", { comment: "" }],
      [{ id: 7 }, "check", { comment: "" }],
    ];
    for (const [id, verdict, f] of bad) {
      expect(await sendFeedback(id as number, verdict as string, prev, form(f))).toEqual({ sent: false, error: "Couldn't send. Try again." });
    }
    expect(calls).toHaveLength(0);
  });

  it("caps the comment at 2000 characters", async () => {
    await sendFeedback(7, "check", prev, form({ comment: "x".repeat(5000) }));
    expect((writes()[0]!.args[0] as { comment: string }).comment).toHaveLength(2000);
  });

  it("reports a database failure without leaking its message", async () => {
    failWith = { message: 'new row violates row-level security policy for table "verdict_feedback"' };
    expect(await sendFeedback(7, "check", prev, form({ comment: "" }))).toEqual({ sent: false, error: "Couldn't send. Try again." });
  });
});

describe("setApplied, setSaved, and the application actions", () => {
  it("refuse ids that aren't positive whole numbers", async () => {
    for (const id of [1.5, -3, 0, Number.NaN, "1", null, { a: 1 }] as unknown as number[]) {
      await expect(setApplied(id, true)).rejects.toThrow("Couldn't update");
      await setSaved(id, true);
      await removeApplication(id);
      await updateApplication(id, form({ status: "applied", notes: "" }));
    }
    expect(calls).toHaveLength(0);
  });

  it("refuse a non-boolean flag", async () => {
    await expect(setApplied(1, "yes" as unknown as boolean)).rejects.toThrow("Couldn't update");
    await setSaved(1, "yes" as unknown as boolean);
    expect(calls).toHaveLength(0);
  });

  it("refuse an unknown stage or oversized notes", async () => {
    await updateApplication(1, form({ status: "hired", notes: "" }));
    await updateApplication(1, form({ status: "applied", notes: "x".repeat(2001) }));
    expect(calls).toHaveLength(0);
  });

  it("write when the input is valid", async () => {
    await setApplied(1, true);
    await setSaved(1, false);
    await updateApplication(1, form({ status: "interview", notes: "phone screen" }));
    expect(writes().map((c) => `${c.table}.${c.op}`)).toEqual(["applications.upsert", "saved_listings.delete", "applications.update"]);
  });

  it("surface a failed save instead of pretending it worked, with a generic message", async () => {
    failWith = { message: "connection refused to 10.0.0.5:5432" };
    await expect(updateApplication(1, form({ status: "offer", notes: "" }))).rejects.toThrow(/^Couldn't save\. Try again\.$/);
    await expect(removeApplication(1)).rejects.toThrow(/^Couldn't remove\. Try again\.$/);
  });
});

describe("loadRequirements", () => {
  const fake = { from: (t: string) => builder(t) } as never;

  it("pages in a stable order, so no row is skipped or repeated between pages", async () => {
    await loadRequirements(fake);
    expect(calls.filter((c) => c.op === "order").map((c) => c.args[0])).toEqual(["jd_hash"]);
    // The order comes before the range it applies to.
    expect(calls.map((c) => c.op).indexOf("order")).toBeLessThan(calls.map((c) => c.op).indexOf("range"));
  });

  it("splits a long hash list into requests that fit in a URL, without duplicates", async () => {
    const hashes = Array.from({ length: 2 * HASH_CHUNK + 1 }, (_, i) => String(i).padStart(64, "0"));
    await loadRequirements(fake, [...hashes, hashes[0]!]);
    const ins = calls.filter((c) => c.op === "in").map((c) => c.args[1] as string[]);
    expect(ins.map((x) => x.length)).toEqual([HASH_CHUNK, HASH_CHUNK, 1]);
    expect(new Set(ins.flat()).size).toBe(hashes.length);
  });

  it("makes no request for an empty list", async () => {
    expect((await loadRequirements(fake, [])).size).toBe(0);
    expect(calls).toHaveLength(0);
  });
});

describe("public paths", () => {
  it("opens only the landing page, /login, and /auth/* to signed-out visitors", () => {
    for (const p of ["/", "/login", "/login/", "/auth", "/auth/confirm", "/privacy", "/terms"]) expect(isPublicPath(p), p).toBe(true);
    for (const p of ["/feed", "/profile", "/listing/1", "/login-admin", "/loginx", "/authx", "/authorize", "/applied", "/saved"]) expect(isPublicPath(p), p).toBe(false);
  });

  it("lets crawlers and link previews fetch robots.txt, the sitemap, and the preview image", () => {
    for (const p of ["/robots.txt", "/sitemap.xml", "/opengraph-image"]) expect(isPublicPath(p), p).toBe(true);
    for (const p of ["/robots.txtx", "/sitemap.xml.bak", "/opengraph-imagex"]) expect(isPublicPath(p), p).toBe(false);
  });
});

describe("security headers", () => {
  const h = Object.fromEntries(SECURITY_HEADERS.map((x) => [x.key, x.value]));

  it("forbid framing, MIME sniffing, and cross-site form posts", () => {
    expect(h["X-Frame-Options"]).toBe("DENY");
    expect(h["X-Content-Type-Options"]).toBe("nosniff");
    expect(h["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(h["Content-Security-Policy"]).toContain("form-action 'self'");
    expect(h["Content-Security-Policy"]).toContain("base-uri 'self'");
    expect(h["Strict-Transport-Security"]).toMatch(/max-age=\d{8,}/);
    expect(h["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
  });
});
