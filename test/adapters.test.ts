import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { hintFromId, parseZshah101, zshah101Adapter } from "../pipeline/adapters/zshah101";
import { parseSimplifyNewGrad } from "../pipeline/adapters/simplifyNewGrad";

const fixture = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8"));

describe("zshah101 adapter (snapshot 2026-10-27)", () => {
  const feed = fixture("zshah101.sample.json");
  const batch = parseZshah101(feed);

  it("parses every record in the real snapshot", () => {
    expect(batch.skipped).toEqual([]);
    expect(batch.listings).toHaveLength(feed.jobs.length);
  });

  it("maps fields and keeps the regex sponsorship as the eval baseline", () => {
    const amazon = batch.listings.find((l) => l.externalId === "amazon:amazon:10590290");
    expect(amazon).toBeDefined();
    const sample = batch.listings[0]!;
    expect(sample).toMatchObject({ sourceId: "zshah101", jobType: expect.stringMatching(/internship|co-op/) });
    for (const l of batch.listings) expect(["unknown", "citizens-only", "no-sponsorship", "offers"]).toContain(l.baselineSponsorship);
  });

  it("normalizes date-only and timestamp posted_at values", () => {
    for (const l of batch.listings) {
      if (l.postedAt) expect(l.postedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    }
    expect(batch.listings.some((l) => l.postedAt === null)).toBe(true);
    expect(batch.listings.some((l) => l.postedAtPrecision === "date")).toBe(true);
  });

  it('maps season "Not stated" to null', () => {
    const raw = feed.jobs.filter((j: { season: string }) => j.season === "Not stated").length;
    expect(batch.listings.filter((l) => l.season === null).length).toBe(raw);
  });

  it("splits semicolon-joined locations", () => {
    const multi = batch.listings.find((l) => l.locations.length > 1);
    expect(multi).toBeDefined();
  });

  it("logs and skips bad records without failing the read", () => {
    const good = feed.jobs[0];
    const bad = {
      count: 4,
      jobs: [good, { ...good, id: "x:y:1", url: "not a url" }, { ...good, id: "x:y:2", title: "" }, "garbage"],
    };
    const b = parseZshah101(bad);
    expect(b.listings).toHaveLength(1);
    expect(b.skipped.map((s) => s.externalId)).toEqual(["x:y:1", "x:y:2", null]);
  });

  it("throws when the wrapper itself is malformed, so the read counts as incomplete", async () => {
    expect(() => parseZshah101({ jobs: "nope" })).toThrow();
    await expect(zshah101Adapter(async () => ({})).fetch()).rejects.toThrow();
  });
});

describe("hintFromId", () => {
  it("parses ATS-scoped ids", () => {
    expect(hintFromId("greenhouse:mongodb:8209134")).toEqual({ ats: "greenhouse", tenant: "mongodb", reqId: "8209134" });
    expect(hintFromId("oracle:hdjq.fa.us2.oraclecloud.com:26010630")).toEqual({
      ats: "oracle",
      tenant: "hdjq.fa.us2.oraclecloud.com",
      reqId: "26010630",
    });
  });
  it("reduces Workday path ids to the requisition suffix", () => {
    expect(hintFromId("workday:aaaie:/job/Arizona---Home-Teleworkers/Data-Science-Intern_R8002")?.reqId).toBe("R8002");
  });
  it("ignores unknown ATS names and malformed ids", () => {
    expect(hintFromId("mystery:a:b")).toBeUndefined();
    expect(hintFromId("greenhouse:only")).toBeUndefined();
  });
});

describe("Simplify new-grad adapter (snapshot 2026-10-27)", () => {
  const records = fixture("simplify-newgrad.sample.json");
  const batch = parseSimplifyNewGrad(records);

  it("keeps only active, visible listings", () => {
    const active = records.filter((r: { active: boolean; is_visible: boolean }) => r.active && r.is_visible).length;
    expect(batch.listings).toHaveLength(active);
    expect(batch.inactive).toBe(records.length - active);
    expect(batch.skipped).toEqual([]);
  });

  it("marks every listing as new grad with a datetime posted date", () => {
    for (const l of batch.listings) {
      expect(l.jobType).toBe("new_grad");
      expect(l.postedAtPrecision).toBe("datetime");
    }
  });

  it("never reads or stores Simplify-specific fields (discovery only)", () => {
    const withExtras = [
      { ...records.find((r: { active: boolean }) => r.active), sponsorship: "Offers Sponsorship", category: "Software", degrees: ["PhD"], notes: "x" },
    ];
    const [l] = parseSimplifyNewGrad(withExtras).listings;
    expect(l!.baselineSponsorship).toBeNull();
    expect(Object.keys(l!.record as object).sort()).toEqual(["company_name", "date_posted", "id", "locations", "title", "url"]);
    expect(JSON.stringify(l)).not.toMatch(/Offers Sponsorship|degrees|category|notes/);
  });

  it("logs and skips bad records", () => {
    const good = records.find((r: { active: boolean }) => r.active);
    const b = parseSimplifyNewGrad([good, { ...good, id: "bad", date_posted: "yesterday" }, null]);
    expect(b.listings).toHaveLength(1);
    expect(b.skipped.map((s) => s.externalId)).toEqual(["bad", null]);
  });
});
