// extractOne and the spend guard, against a scripted fake LLM. The responses
// here are hand-written, not recorded from the API (no live calls approved
// yet); replace them with real recordings after the first approved run.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { ModelExtraction } from "@core/requirements";
import { extractOne } from "../pipeline/extract/extract";
import { costUsd, MODEL, type LlmClient, type LlmResponse, type Turn } from "../pipeline/extract/llm";
import { SpendGuard, worstCaseUsd } from "../pipeline/extract/spend";
import { planFetch } from "../pipeline/jd/plans";
import { blank, ORACLE_TARGET } from "./helpers/extraction";

const jd = planFetch(ORACLE_TARGET)!.extract(JSON.parse(readFileSync("test/fixtures/jd/oracle.json", "utf8")), "")!;

function scripted(...responses: (Partial<LlmResponse> | Error)[]) {
  const seen: Turn[][] = [];
  const llm: LlmClient = {
    model: MODEL,
    async complete(_system, turns) {
      seen.push(structuredClone(turns));
      const r = responses.shift();
      if (!r) throw new Error("no scripted response left");
      if (r instanceof Error) throw r;
      return { text: "", stopReason: "end_turn", inputTokens: 1000, outputTokens: 200, ...r };
    },
  };
  return { llm, seen };
}

function good() {
  const e = blank();
  e.grad_requirements = {
    status: "stated",
    value: [
      {
        applies_to_degrees: ["bs"],
        applies_to_start: null,
        earliest: "2027-12",
        latest: "2028-06",
        evidence: ["Bachelor's degree candidates with an expected graduation date between December 2027 and June 2028."],
      },
    ],
    evidence: ["Bachelor's degree candidates with an expected graduation date between December 2027 and June 2028."],
    strength: "required",
  };
  e.sponsorship_now_unavailable = {
    status: "stated",
    value: true,
    evidence: ["the company will not pursue visa sponsorship for these positions"],
    strength: "required",
  };
  return e;
}

describe("extractOne", () => {
  it("returns ok with verified fields, tokens, and cost", async () => {
    const { llm } = scripted({ text: JSON.stringify(good()) });
    const r = await extractOne(llm, jd);
    expect(r).toMatchObject({ status: "ok", calls: 1, inputTokens: 1000, outputTokens: 200, quoteFailures: [] });
    expect(r.costUsd).toBeCloseTo(0.002, 6);
    expect(r.extracted!.grad_requirements.status).toBe("stated");
  });

  it("downgrades a field whose quote isn't in the JD, keeping the rest", async () => {
    const e = good();
    e.citizenship_required = { status: "stated", value: true, evidence: ["Must be a U.S. citizen."], strength: "required" };
    const r = await extractOne(scripted({ text: JSON.stringify(e) }).llm, jd);
    expect(r.status).toBe("ok");
    expect(r.extracted!.citizenship_required.status).toBe("unverified");
    expect(r.extracted!.sponsorship_now_unavailable.status).toBe("stated");
    expect(r.quoteFailures).toEqual([{ field: "citizenship_required", quote: "Must be a U.S. citizen." }]);
  });

  it("retries once with the validation errors, then succeeds", async () => {
    const bad = good();
    bad.citizenship_required = { status: "stated", value: true, evidence: [], strength: null };
    const { llm, seen } = scripted({ text: JSON.stringify(bad) }, { text: JSON.stringify(good()) });
    const r = await extractOne(llm, jd);
    expect(r).toMatchObject({ status: "ok", calls: 2, inputTokens: 2000, outputTokens: 400 });
    expect(seen[1]).toHaveLength(3);
    expect(seen[1]![2]!.content).toContain("citizenship_required: stated needs evidence");
  });

  it("gives up as schema_invalid after the retry also fails", async () => {
    const r = await extractOne(scripted({ text: "{" }, { text: "not json" }).llm, jd);
    expect(r).toMatchObject({ status: "schema_invalid", calls: 2, extracted: null, error: "response is not valid JSON" });
    expect(r.costUsd).toBeGreaterThan(0);
  });

  it("treats a response cut off at max_tokens as invalid", async () => {
    const r = await extractOne(scripted({ text: "{", stopReason: "max_tokens" }, { text: "{", stopReason: "max_tokens" }).llm, jd);
    expect(r).toMatchObject({ status: "schema_invalid", error: "response was cut off at max_tokens" });
  });

  it("reports API errors and refusals as llm_failed without throwing", async () => {
    expect((await extractOne(scripted(new Error("529 overloaded")).llm, jd)).status).toBe("llm_failed");
    const refused = await extractOne(scripted({ stopReason: "refusal" }).llm, jd);
    expect(refused).toMatchObject({ status: "llm_failed", error: "model refused", calls: 1 });
  });
});

describe("spend guard", () => {
  it("prices Haiku 4.5 at $1 / $5 per million tokens", () => {
    expect(costUsd(MODEL, 1_000_000, 0)).toBe(1);
    expect(costUsd(MODEL, 0, 1_000_000)).toBe(5);
    expect(() => costUsd("unknown-model", 1, 1)).toThrow();
  });

  it("refuses an extraction whose worst case could cross the cap", () => {
    const worst = worstCaseUsd(MODEL, jd);
    expect(new SpendGuard(1, 1 - worst).canAfford(MODEL, jd)).toBe(true);
    expect(new SpendGuard(1, 1 - worst + 0.0001).canAfford(MODEL, jd)).toBe(false);
  });

  it("accumulates recorded spend", () => {
    const g = new SpendGuard(1, 0.25);
    g.record(0.5);
    expect(g.spent).toBe(0.75);
  });
});

describe("structured output schema", () => {
  it("builds a JSON schema from ModelExtraction without throwing", () => {
    const f = zodOutputFormat(ModelExtraction) as unknown as { type: string; schema: { properties: Record<string, unknown> } };
    expect(f.type).toBe("json_schema");
    expect(Object.keys(f.schema.properties)).toContain("us_person_required");
  });
});
