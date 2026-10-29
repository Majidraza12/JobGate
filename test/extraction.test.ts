// Extraction schema rules and quote verification.
import { readFileSync } from "node:fs";
import { describe, expect, expectTypeOf, it } from "vitest";
import { ModelExtraction, StoredExtraction } from "@core/requirements";
import { normalizeForMatch, verifyQuotes } from "../pipeline/extract/verify";
import { planFetch } from "../pipeline/jd/plans";

const none = { status: "not_mentioned", value: null, evidence: [], strength: null } as const;

// Every gate not mentioned; tests override what they need.
function blank(): ModelExtraction {
  return {
    grad_requirements: { ...none, evidence: [] },
    must_return_to_school: { ...none, evidence: [] },
    class_years: { ...none, evidence: [] },
    degree_levels: { ...none, evidence: [] },
    start_options: { ...none, evidence: [] },
    citizenship_required: { ...none, evidence: [] },
    us_person_required: { ...none, evidence: [] },
    sponsorship_now_unavailable: { ...none, evidence: [] },
    sponsorship_future_unavailable: { ...none, evidence: [] },
    clearance: { ...none, evidence: [] },
    locations: { cities: [], remote: null, hybrid: null },
    employment_type: null,
    season: null,
    role_family: null,
  };
}

const errors = (x: unknown) => {
  const r = ModelExtraction.safeParse(x);
  return r.success ? [] : r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
};

describe("ModelExtraction schema", () => {
  it("accepts an all-not-mentioned result", () => {
    expect(errors(blank())).toEqual([]);
  });

  it("requires value, strength, and evidence when stated", () => {
    const e = blank();
    e.citizenship_required = { status: "stated", value: null, evidence: [], strength: null };
    expect(errors(e)).toEqual([
      "citizenship_required: stated needs a value",
      "citizenship_required: stated needs a strength",
      "citizenship_required: stated needs evidence",
    ]);
  });

  it("requires evidence when ambiguous, but allows a null value", () => {
    const e = blank();
    e.sponsorship_now_unavailable = { status: "ambiguous", value: null, evidence: [], strength: null };
    expect(errors(e)).toEqual(["sponsorship_now_unavailable: ambiguous needs evidence"]);
    e.sponsorship_now_unavailable.evidence = ["Sponsorship may be available for some roles."];
    expect(errors(e)).toEqual([]);
  });

  it("rejects leftovers on not_mentioned", () => {
    const e = blank();
    e.clearance = { status: "not_mentioned", value: { required: "active", level: null }, evidence: ["x"], strength: "required" };
    expect(errors(e)).toHaveLength(3);
  });

  it("rejects the unverified status from the model", () => {
    const e = blank() as any;
    e.us_person_required.status = "unverified";
    expect(errors(e)).not.toEqual([]);
    expect(StoredExtraction.safeParse(e).success).toBe(true);
  });

  it("validates graduation windows: month format, order, and at least one bound", () => {
    const window = (earliest: string | null, latest: string | null) => {
      const e = blank();
      e.grad_requirements = {
        status: "stated",
        value: [{ applies_to_degrees: ["bs"], applies_to_start: null, earliest, latest, evidence: ["q"] }],
        evidence: ["q"],
        strength: "required",
      };
      return errors(e);
    };
    expect(window("2027-12", "2028-06")).toEqual([]);
    expect(window(null, "2028-06")).toEqual([]);
    expect(window("2027-13", null)).toEqual(["grad_requirements.value.0.earliest: expected YYYY-MM"]);
    expect(window("2028-06", "2027-12")).toEqual(["grad_requirements.value.0: earliest is after latest"]);
    expect(window(null, null)).toEqual(["grad_requirements.value.0: a window needs at least one bound"]);
  });

  it("types statuses as literal unions", () => {
    expectTypeOf<ModelExtraction["clearance"]["status"]>().toEqualTypeOf<"stated" | "not_mentioned" | "ambiguous">();
    expectTypeOf<StoredExtraction["clearance"]["status"]>().toEqualTypeOf<"stated" | "not_mentioned" | "ambiguous" | "unverified">();
  });
});

describe("normalizeForMatch", () => {
  it("collapses whitespace and unifies quotes and dashes, but keeps case", () => {
    expect(normalizeForMatch("  Bachelor’s  degree – “CS”\n")).toBe(`Bachelor's degree - "CS"`);
    expect(normalizeForMatch("U.S. Citizen")).not.toBe(normalizeForMatch("u.s. citizen"));
  });
});

describe("verifyQuotes", () => {
  // Real JD text (American Express via Oracle, captured 2026-10-28).
  const oracle = planFetch({
    applyUrl: "https://egug.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/26011784",
    ats: "oracle",
    atsTenant: "egug.fa.us2.oraclecloud.com",
    atsReqId: "26011784",
  })!;
  const jd = oracle.extract(JSON.parse(readFileSync("test/fixtures/jd/oracle.json", "utf8")), "")!;

  const GRAD = "Bachelor’s degree candidates with an expected graduation date between December 2027 and June 2028.";
  const VISA = "will not pursue visa sponsorship for these positions";

  const extraction = () => {
    const e = blank();
    e.grad_requirements = {
      status: "stated",
      value: [{ applies_to_degrees: ["bs"], applies_to_start: null, earliest: "2027-12", latest: "2028-06", evidence: [GRAD] }],
      evidence: [GRAD],
      strength: "required",
    };
    e.sponsorship_now_unavailable = { status: "stated", value: true, evidence: [VISA], strength: "required" };
    return e;
  };

  it("keeps fields whose quotes are in the JD, including straightened apostrophes", () => {
    const e = extraction();
    e.grad_requirements.evidence = ["Bachelor's degree candidates with an expected graduation date between December 2027 and June 2028."];
    const { result, failures } = verifyQuotes(e, jd);
    expect(failures).toEqual([]);
    expect(result.grad_requirements.status).toBe("stated");
    expect(result.sponsorship_now_unavailable.status).toBe("stated");
  });

  it("downgrades a field with an invented quote to unverified and reports it", () => {
    const e = extraction();
    e.citizenship_required = { status: "stated", value: true, evidence: ["Must be a U.S. citizen."], strength: "required" };
    const { result, failures } = verifyQuotes(e, jd);
    expect(result.citizenship_required.status).toBe("unverified");
    expect(result.sponsorship_now_unavailable.status).toBe("stated");
    expect(failures).toEqual([{ field: "citizenship_required", quote: "Must be a U.S. citizen." }]);
  });

  it("checks the evidence on each graduation window too", () => {
    const e = extraction();
    e.grad_requirements.value![0]!.evidence = ["graduating between May 2027 and June 2028"];
    const { result, failures } = verifyQuotes(e, jd);
    expect(result.grad_requirements.status).toBe("unverified");
    expect(failures).toHaveLength(1);
  });

  it("does not mutate its input", () => {
    const e = extraction();
    e.citizenship_required = { status: "stated", value: true, evidence: ["invented"], strength: "required" };
    verifyQuotes(e, jd);
    expect(e.citizenship_required.status).toBe("stated");
  });
});
