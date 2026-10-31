// Labeling sample and gold label schema.
import { describe, expect, it } from "vitest";
import { Label } from "../eval/labelSchema";
import { drawSample, KEYWORDS, rng, type Row } from "../eval/sample";

const row = (i: number, company: string, text: string): Row => ({
  jd_hash: `h${i}`,
  jd_text: text,
  ats: "greenhouse",
  company,
  title: `Role ${i}`,
  apply_url: `https://x/${i}`,
  baseline_sponsorship: null,
});

const GATE = "Applicants must be a U.S. citizen.";
const PLAIN = "Write code and ship features.";

describe("drawSample", () => {
  const rows = [
    ...Array.from({ length: 40 }, (_, i) => row(i, `Plain${i}`, PLAIN)),
    ...Array.from({ length: 10 }, (_, i) => row(100 + i, "BigCo", GATE)),
    ...Array.from({ length: 10 }, (_, i) => row(200 + i, `Gate${i}`, GATE)),
  ];

  it("is reproducible for a seed and different across seeds", () => {
    const a = drawSample(rows, { random: 10, keyword: 5, seed: 1 }).map((x) => x.jdHash);
    expect(drawSample(rows, { random: 10, keyword: 5, seed: 1 }).map((x) => x.jdHash)).toEqual(a);
    expect(drawSample(rows, { random: 10, keyword: 5, seed: 2 }).map((x) => x.jdHash)).not.toEqual(a);
  });

  it("draws disjoint strata; keyword items all contain gate language, at most 2 per company", () => {
    const s = drawSample(rows, { random: 10, keyword: 8, seed: 7 });
    const random = s.filter((x) => x.stratum === "random");
    const keyword = s.filter((x) => x.stratum === "keyword");
    expect(random).toHaveLength(10);
    expect(keyword).toHaveLength(8);
    expect(new Set(s.map((x) => x.jdHash)).size).toBe(s.length);
    expect(keyword.every((x) => KEYWORDS.test(x.jdText))).toBe(true);
    expect(keyword.filter((x) => x.company === "BigCo").length).toBeLessThanOrEqual(2);
    expect(s.map((x) => x.id).slice(0, 2)).toEqual(["jd-001", "jd-002"]);
  });

  it("uses a deterministic PRNG", () => {
    const r = rng(42);
    expect([r(), r()]).toEqual((() => { const q = rng(42); return [q(), q()]; })());
  });
});

describe("KEYWORDS", () => {
  it.each([
    "Must be a US citizen",
    "We do not sponsor visas",
    "Active Secret clearance",
    "subject to ITAR",
    "expected graduation date of May 2027",
    "graduating between December 2027 and June 2028",
    "must be returning to school",
    "rising juniors",
  ])("matches %s", (t) => expect(KEYWORDS.test(t)).toBe(true));

  it("ignores ordinary text", () => expect(KEYWORDS.test("Build distributed systems in Go.")).toBe(false));
});

describe("Label schema", () => {
  const none = { status: "not_mentioned", value: null, strength: null };
  const base = () => ({
    id: "jd-001",
    datasetVersion: "v1",
    labeler: "majid",
    labeledAt: "2026-10-28T00:00:00Z",
    fields: Object.fromEntries(
      [
        "grad_requirements", "must_return_to_school", "class_years", "degree_levels", "start_options",
        "citizenship_required", "us_person_required", "sponsorship_now_unavailable", "sponsorship_future_unavailable", "clearance",
      ].map((k) => [k, { ...none }]),
    ) as Record<string, unknown>,
  });

  it("accepts a label with windows that carry no quotes", () => {
    const l = base();
    l.fields.grad_requirements = {
      status: "stated",
      strength: "required",
      value: [{ applies_to_degrees: ["bs"], applies_to_start: null, earliest: "2027-12", latest: "2028-06" }],
    };
    const parsed = Label.parse(l);
    expect(parsed.fields.grad_requirements.value![0]!.evidence).toEqual([]);
    expect(parsed.tags).toEqual([]);
  });

  it("rejects stated without a value, and inverted windows", () => {
    const l = base();
    l.fields.citizenship_required = { status: "stated", value: null, strength: "required" };
    expect(Label.safeParse(l).success).toBe(false);
    const w = base();
    w.fields.grad_requirements = {
      status: "stated",
      strength: "required",
      value: [{ applies_to_degrees: null, applies_to_start: null, earliest: "2028-06", latest: "2027-12" }],
    };
    expect(Label.safeParse(w).success).toBe(false);
  });
});
