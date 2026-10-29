// Eval statistics and scoring rules, on hand-built labels and predictions.
import { describe, expect, it } from "vitest";
import type { Dataset, Label } from "../eval/labelSchema";
import { canonicalValue, scoreBaseline, scoreExtraction, scoreField, type Prediction } from "../eval/score";
import { percentile, ruleOfThree, wilson } from "../eval/stats";
import { blank } from "./helpers/extraction";

describe("wilson", () => {
  it("matches known 95% intervals", () => {
    const half = wilson(5, 10);
    expect(half.low).toBeCloseTo(0.2366, 3);
    expect(half.high).toBeCloseTo(0.7634, 3);
    const zero = wilson(0, 10);
    expect(zero.rate).toBe(0);
    expect(zero.low).toBe(0);
    expect(zero.high).toBeCloseTo(0.2775, 3);
  });

  it("returns nulls for n = 0", () => {
    expect(wilson(0, 0)).toEqual({ k: 0, n: 0, rate: null, low: null, high: null });
  });

  it("rule of three and percentiles", () => {
    expect(ruleOfThree(60)).toBe(0.05);
    expect(percentile([5, 1, 3, 2, 4], 50)).toBe(3);
    expect(percentile([5, 1, 3, 2, 4], 95)).toBe(5);
    expect(percentile([], 50)).toBeNull();
  });
});

describe("canonicalValue", () => {
  it("treats windows, class years, and start options as sets", () => {
    const w = (d: string[] | null, e: string) => ({ applies_to_degrees: d, applies_to_start: null, earliest: e, latest: null, evidence: ["q"] });
    expect(canonicalValue("grad_requirements", [w(["ms", "bs"], "2027-01"), w(null, "2026-01")])).toBe(
      canonicalValue("grad_requirements", [w(null, "2026-01"), w(["bs", "ms"], "2027-01")]),
    );
    expect(canonicalValue("class_years", ["senior", "junior"])).toBe(canonicalValue("class_years", ["junior", "senior"]));
    expect(canonicalValue("start_options", [{ label: "Summer 2027", month: null }])).toBe(
      canonicalValue("start_options", [{ label: " summer 2027 ", month: null }]),
    );
  });
});

const stated = (value: unknown, strength = "required") => ({ status: "stated", value, strength });
const none = { status: "not_mentioned", value: null, strength: null };

describe("scoreField", () => {
  it("computes detection precision/recall, exact decisions, and value accuracy", () => {
    const s = scoreField("citizenship_required", [
      { gold: stated(true), pred: stated(true) }, // tp, exact
      { gold: stated(true), pred: stated(true, "preferred") }, // tp, wrong strength
      { gold: stated(true), pred: none }, // fn
      { gold: none, pred: stated(true) }, // fp
      { gold: none, pred: none }, // tn, exact
      { gold: stated(true), pred: null }, // failed extraction: fn
      { gold: stated(true), pred: { status: "unverified", value: true, strength: "required" } }, // tp, claimed
    ]);
    expect(s.detectionPrecision).toMatchObject({ k: 3, n: 4 });
    expect(s.detectionRecall).toMatchObject({ k: 3, n: 5 });
    expect(s.decisionAccuracy).toMatchObject({ k: 2, n: 7 });
    expect(s.valueAccuracy).toMatchObject({ k: 2, n: 2 });
    expect(s.unverified).toBe(1);
  });
});

describe("scoreBaseline", () => {
  const fields = (over: Record<string, unknown>) => ({ ...blank(), ...over }) as never;

  it("measures how often citizens-only really means citizenship", () => {
    const rows = [
      // Real citizenship requirement.
      { gold: fields({ citizenship_required: stated(true) }), pred: fields({ citizenship_required: stated(true) }), baseline: "citizens-only" },
      // ITAR U.S. person: a permanent resident qualifies, baseline still says citizens-only.
      { gold: fields({ us_person_required: stated(true) }), pred: fields({ us_person_required: stated(true) }), baseline: "citizens-only" },
      // Clearance "ability to obtain": not a hard restriction.
      { gold: fields({ clearance: stated({ required: "ability_to_obtain", level: null }) }), pred: fields({}), baseline: "citizens-only" },
      { gold: fields({ sponsorship_now_unavailable: stated(true) }), pred: fields({}), baseline: "unknown" },
    ];
    const s = scoreBaseline(rows);
    expect(s.citizensOnlyIsCitizenship).toMatchObject({ k: 1, n: 3 });
    expect(s.baseline.precision).toMatchObject({ k: 2, n: 3 });
    expect(s.baseline.recall).toMatchObject({ k: 2, n: 3 });
    expect(s.model.precision).toMatchObject({ k: 2, n: 2 });
    expect(s.model.recall).toMatchObject({ k: 2, n: 3 });
  });
});

describe("scoreExtraction", () => {
  const dataset: Dataset = {
    version: "v1",
    createdAt: "2026-10-28T00:00:00Z",
    seed: 1,
    keywordPattern: "",
    items: ["random", "keyword"].map((stratum, i) => ({
      id: `jd-00${i + 1}`,
      stratum: stratum as "random" | "keyword",
      jdHash: `h${i}`,
      ats: "lever",
      company: "Acme",
      title: "Intern",
      applyUrl: "https://x",
      baselineSponsorship: null,
      jdText: "text",
    })),
  };
  const label = (id: string): Label => ({
    id,
    datasetVersion: "v1",
    labeler: "majid",
    labeledAt: "",
    fields: blank() as unknown as Label["fields"],
    tags: [],
    notes: "",
  });
  const pred = (id: string, status: Prediction["status"], cost: number): Prediction => ({
    id,
    status,
    extracted: status === "ok" ? (blank() as never) : null,
    quoteFailures: 0,
    costUsd: cost,
    latencyMs: 1000,
  });

  it("reports per stratum, failure rates, and cost", () => {
    const r = scoreExtraction(dataset, [label("jd-001"), label("jd-002")], [pred("jd-001", "ok", 0.01), pred("jd-002", "llm_failed", 0.002)]);
    expect(r.strata.map((s) => [s.stratum, s.jds])).toEqual([["all", 2], ["random", 1], ["keyword", 1]]);
    expect(r.strata[0]!.extractionFailure).toMatchObject({ k: 1, n: 2 });
    expect(r.costUsd.total).toBeCloseTo(0.012, 6);
    expect(r.strata[1]!.fields.find((f) => f.field === "citizenship_required")!.decisionAccuracy).toMatchObject({ k: 1, n: 1 });
  });

  it("ignores labels without a prediction", () => {
    expect(scoreExtraction(dataset, [label("jd-001"), label("jd-002")], [pred("jd-001", "ok", 0)]).predicted).toBe(1);
  });
});
