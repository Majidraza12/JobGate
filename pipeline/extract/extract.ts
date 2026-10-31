// Extract one JD: call the model, validate with Zod, retry once with the
// validation errors, then verify every quote against the JD text. Never
// throws; failures come back as an extraction_status.

import { ModelExtraction, type StoredExtraction } from "@core/requirements";
import { costUsd, type LlmClient, type Turn } from "./llm";
import { retryMessage, SYSTEM_PROMPT, userMessage } from "./prompt";
import { verifyQuotes, type QuoteFailure } from "./verify";

export interface ExtractionResult {
  status: "ok" | "llm_failed" | "schema_invalid";
  extracted: StoredExtraction | null;
  quoteFailures: QuoteFailure[];
  error: string | null;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  latencyMs: number;
  calls: number;
  // Raw model text per call, kept so eval predictions can be replayed in tests.
  responses: string[];
}

// Models sometimes wrap JSON in a ```json fence despite being told not to.
export function stripFences(text: string): string {
  const m = text.trim().match(/^```(?:json)?\s*\n([\s\S]*?)\n?```$/);
  return m?.[1] ?? text;
}

function validate(text: string, stopReason: string | null): { ok: true; value: ModelExtraction } | { ok: false; errors: string[] } {
  if (stopReason === "max_tokens") return { ok: false, errors: ["response was cut off at max_tokens"] };
  let json: unknown;
  try {
    json = JSON.parse(stripFences(text));
  } catch {
    return { ok: false, errors: ["response is not valid JSON"] };
  }
  const r = ModelExtraction.safeParse(json);
  if (r.success) return { ok: true, value: r.data };
  return { ok: false, errors: r.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`) };
}

export async function extractOne(llm: LlmClient, jdText: string, now = () => performance.now()): Promise<ExtractionResult> {
  const start = now();
  const turns: Turn[] = [{ role: "user", content: userMessage(jdText) }];
  const out: ExtractionResult = {
    status: "llm_failed",
    extracted: null,
    quoteFailures: [],
    error: null,
    inputTokens: 0,
    outputTokens: 0,
    costUsd: 0,
    latencyMs: 0,
    calls: 0,
    responses: [],
  };
  const finish = (r: Partial<ExtractionResult>) => {
    Object.assign(out, r);
    out.costUsd = costUsd(llm.model, out.inputTokens, out.outputTokens);
    out.latencyMs = Math.round(now() - start);
    return out;
  };

  for (let attempt = 0; attempt < 2; attempt++) {
    let res;
    try {
      res = await llm.complete(SYSTEM_PROMPT, turns);
    } catch (e) {
      return finish({ status: "llm_failed", error: e instanceof Error ? e.message : String(e) });
    }
    out.calls++;
    out.responses.push(res.text);
    out.inputTokens += res.inputTokens;
    out.outputTokens += res.outputTokens;
    if (res.stopReason === "refusal") return finish({ status: "llm_failed", error: "model refused" });

    const v = validate(res.text, res.stopReason);
    if (v.ok) {
      const { result, failures } = verifyQuotes(v.value, jdText);
      return finish({ status: "ok", extracted: result, quoteFailures: failures });
    }
    if (attempt === 1) return finish({ status: "schema_invalid", error: v.errors.join("; ") });
    turns.push({ role: "assistant", content: res.text }, { role: "user", content: retryMessage(v.errors) });
  }
  return finish({});
}
