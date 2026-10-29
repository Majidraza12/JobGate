// Hand-label file conversion.
import { describe, expect, it } from "vitest";
import { fromHand } from "../eval/handLabels";
import { Label } from "../eval/labelSchema";

const label = (item: Parameters<typeof fromHand>[0]) => {
  const { body, unknown } = fromHand(item);
  return { unknown, parsed: Label.safeParse({ ...body, id: item.id, datasetVersion: "v1", labeler: "majid", labeledAt: "now" }) };
};

describe("fromHand", () => {
  it("omitted fields are not mentioned", () => {
    const { parsed } = label({ id: "jd-010", tags: [], notes: "none" });
    expect(parsed.success).toBe(true);
    expect(parsed.data!.fields.clearance).toEqual({ status: "not_mentioned", value: null, strength: null, evidence: [] });
  });

  it("maps keys, yes/no, quotes, windows, starts, and clearance", () => {
    const { parsed, unknown } = label({
      id: "jd-x",
      gradWindow: { status: "stated", strength: "required", value: [{ earliest: null, latest: "2027-02", start: "February 2027" }], quote: "q1" },
      usCitizenship: { status: "stated", strength: "required", value: "yes", quote: "q2" },
      noSponsorNow: { status: "stated", strength: "required", value: "no", quote: "q3" },
      startOptions: { status: "stated", strength: "required", value: ["2027-05-24 to 2027-08-20", "Summer 2027"], quote: "q4" },
      clearance: { status: "stated", strength: "required", value: "ability_to_obtain", level: "secret", quote: "q5" },
    });
    expect(unknown).toEqual([]);
    expect(parsed.success).toBe(true);
    const f = parsed.data!.fields;
    expect(f.grad_requirements.value).toEqual([{ applies_to_degrees: null, applies_to_start: "February 2027", earliest: null, latest: "2027-02", evidence: [] }]);
    expect(f.grad_requirements.evidence).toEqual(["q1"]);
    expect(f.citizenship_required.value).toBe(true);
    expect(f.sponsorship_now_unavailable.value).toBe(false);
    expect(f.start_options.value).toEqual([
      { label: "2027-05-24 to 2027-08-20", month: "2027-05" },
      { label: "Summer 2027", month: null },
    ]);
    expect(f.clearance.value).toEqual({ required: "ability_to_obtain", level: "secret" });
  });

  it("allows ambiguous with no value", () => {
    const { parsed } = label({ id: "jd-x", gradWindow: { status: "ambiguous", strength: "required", value: null, quote: "q" } });
    expect(parsed.success).toBe(true);
    expect(parsed.data!.fields.grad_requirements).toMatchObject({ status: "ambiguous", value: null });
  });

  it("reports unknown keys and rejects free-text values the schema can't hold", () => {
    expect(label({ id: "jd-x", gradeWindow: { status: "stated" } }).unknown).toEqual(["gradeWindow"]);
    expect(label({ id: "jd-x", clearance: { status: "stated", strength: "required", value: "none required", level: null } }).parsed.success).toBe(false);
  });
});
