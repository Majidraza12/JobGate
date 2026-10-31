// Hard daily spend cap. Before each extraction we reserve its worst-case cost
// (two calls, max output each); if that could cross the cap, we stop. So the
// cap is never exceeded, at the price of stopping up to one worst case early.
// "Today" is the UTC day.

import { costUsd, MAX_OUTPUT_TOKENS } from "./llm";
import { SYSTEM_PROMPT } from "./prompt";

export const DEFAULT_DAILY_CAP_USD = 1;

// Conservative: English averages about 4 characters per token, so assuming 3
// overestimates input tokens.
const CHARS_PER_TOKEN = 3;

export function worstCaseUsd(model: string, jdText: string): number {
  const input = Math.ceil((SYSTEM_PROMPT.length + jdText.length + 200) / CHARS_PER_TOKEN);
  // First call: input + max output. Retry: input + first output + error note, max output.
  return costUsd(model, input + (input + MAX_OUTPUT_TOKENS + 500), 2 * MAX_OUTPUT_TOKENS);
}

export class SpendGuard {
  constructor(
    readonly capUsd: number,
    private spentUsd: number,
  ) {}

  get spent() {
    return this.spentUsd;
  }

  canAfford(model: string, jdText: string): boolean {
    return this.spentUsd + worstCaseUsd(model, jdText) <= this.capUsd;
  }

  record(usd: number) {
    this.spentUsd += usd;
  }
}
