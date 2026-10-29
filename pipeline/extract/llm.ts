// The one place that talks to the Claude API. Everything else depends on the
// LlmClient interface, so tests replay recorded responses with no network.

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { ModelExtraction } from "@core/requirements";

export const MODEL = "claude-haiku-4-5-20251001";
export const MAX_OUTPUT_TOKENS = 8000;

// USD per million tokens, standard (non-batch) rates. Checked 2026-10-28;
// re-check before quoting costs in the README.
export const PRICES: Record<string, { input: number; output: number }> = {
  "claude-haiku-4-5-20251001": { input: 1, output: 5 },
};

export function costUsd(model: string, inputTokens: number, outputTokens: number): number {
  const p = PRICES[model];
  if (!p) throw new Error(`no price for ${model}`);
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}

export type Turn = { role: "user" | "assistant"; content: string };

export interface LlmResponse {
  text: string;
  stopReason: string | null;
  inputTokens: number;
  outputTokens: number;
}

export interface LlmClient {
  model: string;
  complete(system: string, turns: Turn[]): Promise<LlmResponse>;
}

// Structured outputs: the API constrains the response to the JSON shape of
// ModelExtraction. Rules JSON Schema can't express (stated needs evidence,
// window order) are checked by Zod afterwards, which drives the one retry.
export function anthropicClient(client = new Anthropic()): LlmClient {
  const format = zodOutputFormat(ModelExtraction);
  return {
    model: MODEL,
    async complete(system, turns) {
      const res = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_OUTPUT_TOKENS,
        system,
        messages: turns,
        output_config: { format },
      });
      const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
      return {
        text,
        stopReason: res.stop_reason,
        inputTokens: res.usage.input_tokens,
        outputTokens: res.usage.output_tokens,
      };
    },
  };
}
