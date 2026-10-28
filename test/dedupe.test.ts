import { describe, expect, it } from "vitest";
import { canonicalize, findPossibleDuplicates, type DuplicateCandidate } from "../pipeline/dedupe";
import type { RawListing } from "../pipeline/types";

const raw = (over: Partial<RawListing>): RawListing => ({
  sourceId: "zshah101",
  externalId: "x",
  company: "Acme",
  title: "Software Engineer Intern",
  locations: ["Chicago, IL"],
  applyUrl: "https://job-boards.greenhouse.io/acme/jobs/1",
  postedAt: null,
  postedAtPrecision: null,
  jobType: "internship",
  season: "Summer 2027",
  remote: false,
  baselineSponsorship: null,
  record: {},
  ...over,
});

describe("canonicalize", () => {
  it("merges records whose apply URLs prove the same requisition", () => {
    const { canonical } = canonicalize([
      raw({ externalId: "a", applyUrl: "https://job-boards.greenhouse.io/acme/jobs/1" }),
      raw({ sourceId: "simplify-newgrad", externalId: "b", applyUrl: "https://boards.greenhouse.io/acme/jobs/1?utm_source=simplify" }),
    ]);
    expect(canonical).toHaveLength(1);
    expect(canonical[0]!.members.map((m) => m.externalId)).toEqual(["a", "b"]);
  });

  it("merges two records from one source with the same URL (seen in Simplify data)", () => {
    const url = "https://jobs.apple.com/en-us/details/200612345/swe";
    const { canonical } = canonicalize([
      raw({ sourceId: "simplify-newgrad", externalId: "u1", applyUrl: url }),
      raw({ sourceId: "simplify-newgrad", externalId: "u2", applyUrl: `${url}/` }),
    ]);
    expect(canonical).toHaveLength(1);
  });

  it("never merges identical-looking postings with different requisition ids", () => {
    const { canonical } = canonicalize([
      raw({ externalId: "a", applyUrl: "https://job-boards.greenhouse.io/acme/jobs/1" }),
      raw({ externalId: "b", applyUrl: "https://job-boards.greenhouse.io/acme/jobs/2" }),
    ]);
    expect(canonical).toHaveLength(2);
  });

  it("takes display fields from the higher-priority source and fills nulls from others", () => {
    const { canonical } = canonicalize([
      raw({ sourceId: "simplify-newgrad", externalId: "s", title: "SWE Intern (Simplify)", postedAt: "2026-10-01T00:00:00.000Z", postedAtPrecision: "datetime" }),
      raw({ externalId: "z", title: "Software Engineer Intern", postedAt: null, baselineSponsorship: "citizens-only" }),
    ]);
    const c = canonical[0]!;
    expect(c.primarySourceId).toBe("zshah101");
    expect(c.title).toBe("Software Engineer Intern");
    expect(c.postedAt).toBe("2026-10-01T00:00:00.000Z");
    expect(c.baselineSponsorship).toBe("citizens-only");
  });

  it("reports records whose URL cannot be parsed instead of throwing", () => {
    const { canonical, unidentifiable } = canonicalize([raw({ applyUrl: "not a url" }), raw({ externalId: "ok" })]);
    expect(canonical).toHaveLength(1);
    expect(unidentifiable).toHaveLength(1);
  });
});

describe("findPossibleDuplicates", () => {
  const row = (id: number, over: Partial<DuplicateCandidate> = {}): DuplicateCandidate => ({
    id,
    company: "Leidos",
    title: "Software Engineer Intern",
    season: "Summer 2027",
    locations: ["Huntsville, AL"],
    ats: "workday",
    atsTenant: "leidos",
    atsReqId: `r${id}`,
    ...over,
  });

  it("flags same company, title, season and location, ignoring case and punctuation", () => {
    const d = findPossibleDuplicates([row(2), row(1, { title: "Software Engineer - Intern", company: "LEIDOS" }), row(3, { locations: ["Reston, VA"] })]);
    expect(d).toEqual([{ a: 1, b: 2, reason: "same_company_title_season_location" }]);
  });

  it("flags every pair in a group of three", () => {
    expect(findPossibleDuplicates([row(1), row(2), row(3)])).toHaveLength(3);
  });

  it("groups Workday -1/-2 postings of one requisition even across locations", () => {
    const d = findPossibleDuplicates([
      row(10, { atsTenant: "visa", atsReqId: "ref089882w-1", locations: ["Austin, TX"] }),
      row(11, { atsTenant: "visa", atsReqId: "ref089882w-2", locations: ["Bellevue, WA"] }),
    ]);
    expect(d).toEqual([{ a: 10, b: 11, reason: "workday_posting_suffix" }]);
  });

  it("does not group Workday reqs across tenants", () => {
    expect(
      findPossibleDuplicates([
        row(1, { atsTenant: "a", atsReqId: "r1-1", locations: ["X"] }),
        row(2, { atsTenant: "b", atsReqId: "r1-2", locations: ["Y"] }),
      ]),
    ).toEqual([]);
  });
});
