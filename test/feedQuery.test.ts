import { describe, expect, it } from "vitest";
import { applyFeed, DEFAULT_VERDICTS, FEED_PAGE, feedHref, parseFeedParams, type Filterable } from "../src/lib/feedQuery";

const NOW = Date.parse("2026-11-03T12:00:00Z");
const card = (over: Partial<Filterable> = {}): Filterable => ({
  company: "Acme",
  title: "Software Engineer Intern",
  locations: ["Chicago, IL"],
  cities: ["Chicago, IL"],
  remote: false,
  jobType: "internship",
  postedAt: "2026-11-01",
  verdict: "eligible",
  applied: false,
  ...over,
});
const ctx = { cities: ["Chicago, IL"], remoteOk: true, now: NOW };

describe("parseFeedParams", () => {
  it("uses defaults when the URL is empty", () => {
    expect(parseFeedParams({}, ["internship", "co-op", "new_grad"])).toEqual({
      verdicts: DEFAULT_VERDICTS, jobType: "", q: "", mine: false, within: 0, showApplied: false, page: 1,
    });
  });

  it("takes the profile's job types as the default, and 'all' as everything", () => {
    expect(parseFeedParams({}, ["new_grad"]).jobType).toBe("new_grad");
    expect(parseFeedParams({ type: "all" }, ["new_grad"]).jobType).toBe("");
  });

  it("drops unknown verdicts and bad numbers", () => {
    const f = parseFeedParams({ v: "eligible,bogus", page: "-3", within: "x" }, []);
    expect(f.verdicts).toEqual(["eligible"]);
    expect(f.page).toBe(1);
    expect(f.within).toBe(0);
  });

  it("allows every verdict to be hidden", () => {
    expect(parseFeedParams({ v: "" }, []).verdicts).toEqual([]);
  });
});

describe("feedHref", () => {
  const base = parseFeedParams({}, ["new_grad"]);

  it("leaves defaults out of the URL", () => {
    expect(feedHref(base, {}, ["new_grad"])).toBe("/feed");
  });

  it("round-trips through parseFeedParams", () => {
    const url = feedHref(base, { verdicts: ["eligible", "not_eligible"], jobType: "", q: " stripe ", mine: true, within: 7, showApplied: true, page: 3 }, ["new_grad"]);
    const sp = Object.fromEntries(new URL(url, "http://x").searchParams);
    expect(parseFeedParams(sp, ["new_grad"])).toEqual({
      verdicts: ["eligible", "not_eligible"], jobType: "", q: "stripe", mine: true, within: 7, showApplied: true, page: 3,
    });
  });

  it("goes back to page 1 when a filter changes", () => {
    expect(feedHref({ ...base, page: 4 }, { mine: true }, ["new_grad"])).toBe("/feed?mine=1");
  });
});

describe("applyFeed", () => {
  it("sorts by verdict, then newest", () => {
    const cards = [
      card({ title: "old eligible", postedAt: "2026-10-01" }),
      card({ title: "check", verdict: "check", postedAt: "2026-11-02" }),
      card({ title: "new eligible", postedAt: "2026-11-02" }),
      card({ title: "none found", verdict: "no_restrictions_found", postedAt: "2026-11-03" }),
    ];
    const r = applyFeed(cards, parseFeedParams({}, []), ctx);
    expect(r.items.map((c) => c.title)).toEqual(["new eligible", "old eligible", "none found", "check"]);
  });

  it("counts every verdict before the verdict filter", () => {
    const cards = [card(), card({ verdict: "not_eligible" }), card({ verdict: "not_checked" })];
    const r = applyFeed(cards, parseFeedParams({}, []), ctx);
    expect(r.total).toBe(1);
    expect(r.counts.not_eligible).toBe(1);
    expect(r.counts.not_checked).toBe(1);
  });

  it("sends only one page and clamps a page past the end", () => {
    const cards = Array.from({ length: FEED_PAGE + 5 }, (_, i) => card({ title: `t${i}` }));
    const r1 = applyFeed(cards, parseFeedParams({}, []), ctx);
    expect(r1.items).toHaveLength(FEED_PAGE);
    expect(r1.pages).toBe(2);
    const r9 = applyFeed(cards, parseFeedParams({ page: "9" }, []), ctx);
    expect(r9.page).toBe(2);
    expect(r9.items).toHaveLength(5);
  });

  it("filters by job type, search, cities, recency, and applied", () => {
    const cards = [
      card({ title: "Engineer (match)" }),
      card({ jobType: "new_grad" }),
      card({ company: "Other", title: "Analyst" }),
      card({ cities: ["Austin, TX"], locations: ["Austin, TX"] }),
      card({ postedAt: "2026-09-01" }),
      card({ applied: true }),
    ];
    const f = parseFeedParams({ type: "internship,co-op", q: "engineer", mine: "1", within: "7" }, []);
    expect(applyFeed(cards, f, ctx).items.map((c) => c.title)).toEqual(["Engineer (match)"]);
  });

  it("counts remote as one of my cities when the profile allows remote", () => {
    const remote = card({ cities: [], locations: ["Remote"], remote: true });
    const f = parseFeedParams({ mine: "1" }, []);
    expect(applyFeed([remote], f, ctx).total).toBe(1);
    expect(applyFeed([remote], f, { ...ctx, remoteOk: false }).total).toBe(0);
  });
});
