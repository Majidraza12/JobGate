// Adjudication list: which disagreements are found and how they're classified.
import { describe, expect, it } from "vitest";
import type { Dataset, Label } from "../eval/labelSchema";
import { classify, renderReview, review } from "../eval/review";
import type { Prediction } from "../eval/score";
import { blank } from "./helpers/extraction";

const none = { status: "not_mentioned", value: null, strength: null, evidence: [] };
const stated = (value: unknown, strength = "required", evidence = ["q"]) => ({ status: "stated", value, strength, evidence });

describe("classify", () => {
  it("agrees with the scorer's match rule and names the kind of miss", () => {
    expect(classify("citizenship_required", stated(true), stated(true))).toBeNull();
    expect(classify("citizenship_required", stated(true), none)).toBe("missed");
    expect(classify("citizenship_required", none, stated(true))).toBe("spurious");
    expect(classify("citizenship_required", stated(true), { ...stated(true), status: "unverified" })).toBe("unverified");
    expect(classify("citizenship_required", stated(true), { ...stated(true), status: "ambiguous" })).toBe("status");
    expect(classify("citizenship_required", stated(true), stated(false))).toBe("value");
    expect(classify("citizenship_required", stated(true), stated(true, "preferred"))).toBe("strength");
  });

  it("ignores strength on a vague ambiguous gold field", () => {
    const amb = (strength: string | null) => ({ status: "ambiguous", value: null, strength, evidence: ["q"] });
    expect(classify("grad_requirements", amb("required"), amb(null))).toBeNull();
  });
});

describe("review", () => {
  const dataset: Dataset = {
    version: "v1",
    createdAt: "",
    seed: 1,
    keywordPattern: "",
    items: ["jd-001", "jd-002", "jd-003"].map((id) => ({
      id, stratum: "keyword", jdHash: id, ats: "lever", company: "Acme", title: "Intern", applyUrl: "https://x", baselineSponsorship: null, jdText: "text",
    })),
  };
  const label = (id: string, fields: Record<string, unknown> = {}): Label => ({
    id, datasetVersion: "v1", labeler: "majid", labeledAt: "", tags: [], notes: "",
    fields: { ...(blank() as unknown as Label["fields"]), ...fields },
  });
  const pred = (id: string, status: Prediction["status"], fields: Record<string, unknown> = {}): Prediction => ({
    id, status, extracted: status === "ok" ? ({ ...blank(), ...fields } as never) : null, quoteFailures: 0, costUsd: 0, latencyMs: 0,
  });

  const r = review(
    [label("jd-002", { citizenship_required: stated(true, "required", ["Must be a U.S. citizen"]) }), label("jd-001"), label("jd-003")],
    [pred("jd-001", "schema_invalid"), pred("jd-002", "ok", { us_person_required: stated(true, "required", ["U.S. person"]) })],
  );

  it("lists field disagreements, failed extractions, and unpredicted JDs", () => {
    expect(r.disagreements.map((d) => [d.id, d.field, d.kind])).toEqual([
      ["jd-002", "citizenship_required", "missed"],
      ["jd-002", "us_person_required", "spurious"],
    ]);
    expect(r.failed).toEqual([{ id: "jd-001", status: "schema_invalid" }]);
    expect(r.unpredicted).toEqual(["jd-003"]);
  });

  it("renders both sides with their quotes", () => {
    const md = renderReview(r, dataset, "t");
    expect(md).toContain("2 disagreements: missed 1, spurious 1.");
    expect(md).toContain("## jd-002 (keyword) Acme: Intern");
    expect(md).toContain("> Must be a U.S. citizen");
    expect(md).toContain("- model: not mentioned");
    expect(md).toContain("Failed extractions: jd-001 (schema_invalid).");
  });
});
