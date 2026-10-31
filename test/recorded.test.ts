// Replays the recorded Haiku 4.5 / prompt v4 responses from the live eval run
// (2026-10-31) through extractOne with no network: real model output, not
// hand-written JSON, must still validate, verify, and reproduce the stored
// extraction.
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extractOne } from "../pipeline/extract/extract";
import { MODEL, type LlmClient } from "../pipeline/extract/llm";
import { PROMPT_VERSION } from "../pipeline/extract/prompt";

const root = new URL("../eval/", import.meta.url);
const dir = new URL(`predictions/v1/${MODEL}/${PROMPT_VERSION}/`, root);
const dataset = JSON.parse(readFileSync(new URL("dataset/v1.json", root), "utf8")) as { items: { id: string; jdText: string }[] };
const jdText = new Map(dataset.items.map((i) => [i.id, i.jdText]));

type Recorded = { id: string; status: string; extracted: unknown; responses: string[] };
const recorded: Recorded[] = readdirSync(dir).map((f) => JSON.parse(readFileSync(new URL(f, dir), "utf8")));

function replay(responses: string[]): LlmClient {
  const queue = [...responses];
  return {
    model: MODEL,
    async complete() {
      const text = queue.shift();
      if (text === undefined) throw new Error("no more recorded responses");
      return { text, stopReason: "end_turn", inputTokens: 0, outputTokens: 0 };
    },
  };
}

const byId = (id: string) => recorded.find((r) => r.id === id)!;

describe(`recorded ${MODEL} ${PROMPT_VERSION} responses`, () => {
  it("covers all 60 eval JDs", () => {
    expect(recorded).toHaveLength(60);
  });

  it.each(recorded.map((r) => [r.id, r] as const))("%s replays to the stored result", async (_id, r) => {
    const out = await extractOne(replay(r.responses), jdText.get(r.id)!);
    expect(out.status).toBe(r.status);
    expect(out.extracted).toEqual(r.extracted);
  });

  it("reads a citizen/LPR/refugee/asylee list as U.S. person, not citizenship (jd-045)", () => {
    const e = byId("jd-045").extracted as Record<string, { status: string; value: unknown }>;
    expect(e.us_person_required).toMatchObject({ status: "stated", value: true });
    expect(e.citizenship_required).toMatchObject({ status: "not_mentioned" });
  });

  it("reads bare 'must be authorized to work' as ambiguous, not no-sponsorship (jd-058)", () => {
    const e = byId("jd-058").extracted as Record<string, { status: string; value: unknown }>;
    expect(e.sponsorship_now_unavailable).toMatchObject({ status: "ambiguous", value: null });
  });
});
