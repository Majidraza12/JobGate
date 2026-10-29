// Quote verification: every evidence string must appear in the JD text. A
// field with any quote that doesn't is downgraded to "unverified" (shown as
// "couldn't read", never as a conflict), so a hallucinated quote can never
// hide a job.

import { GATE_FIELDS, type ModelExtraction, type StoredExtraction } from "@core/requirements";

// Whitespace is collapsed, and typographic variants that models routinely
// straighten are unified (curly quotes, dashes, NFKC forms like the "ﬁ"
// ligature). Case and wording stay strict.
export function normalizeForMatch(s: string): string {
  return s
    .normalize("NFKC")
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/[‐-―−]/g, "-")
    .replace(/…/g, "...")
    .replace(/\s+/g, " ")
    .trim();
}

export interface QuoteFailure {
  field: string;
  quote: string;
}

export function verifyQuotes(e: ModelExtraction, jdText: string): { result: StoredExtraction; failures: QuoteFailure[] } {
  const haystack = normalizeForMatch(jdText);
  const found = (q: string) => {
    const n = normalizeForMatch(q);
    return n.length > 0 && haystack.includes(n);
  };
  const result = structuredClone(e) as StoredExtraction;
  const failures: QuoteFailure[] = [];
  for (const name of GATE_FIELDS) {
    const f = result[name];
    const quotes = [...f.evidence];
    // Graduation windows carry their own evidence too.
    if (name === "grad_requirements" && result.grad_requirements.value)
      for (const w of result.grad_requirements.value) quotes.push(...w.evidence);
    const bad = quotes.filter((q) => !found(q));
    if (bad.length) {
      f.status = "unverified";
      for (const quote of bad) failures.push({ field: name, quote });
    }
  }
  return { result, failures };
}
