// Scores extraction predictions against gold labels. Pure: no I/O.
//
// Per gate field and per stratum:
//   detection   did the model notice the field at all? Gold positive = stated
//               or ambiguous; predicted positive = stated, ambiguous, or
//               unverified (the model claimed it, even if its quote failed).
//               Precision and recall, with Wilson intervals.
//   decision    exact match on status, value, and strength, over all JDs.
//   value       value match where both gold and prediction are "stated".
// Plus extraction failure rate, quote-failure rate, cost and latency, and the
// zshah101 regex baseline on the JDs where it exists.

import type { StoredExtraction } from "@core/requirements";
import type { Dataset, Label } from "./labelSchema";
import { LABEL_FIELDS } from "./labelSchema";
import { percentile, wilson, type Proportion } from "./stats";

export interface Prediction {
  id: string;
  status: "ok" | "llm_failed" | "schema_invalid";
  extracted: StoredExtraction | null;
  quoteFailures: number;
  costUsd: number;
  latencyMs: number;
}

type Field = (typeof LABEL_FIELDS)[number];
type AnyField = { status: string; value: unknown; strength: string | null };

const sortedJson = (xs: unknown[]) => JSON.stringify(xs.map((x) => JSON.stringify(x)).sort());

// Canonical form of a value so equal meanings compare equal (sets, not lists).
export function canonicalValue(field: Field, v: unknown): string {
  if (v === null || v === undefined) return "null";
  if (field === "grad_requirements")
    return sortedJson(
      (v as { applies_to_degrees: string[] | null; applies_to_start: string | null; earliest: string | null; latest: string | null }[]).map((w) => [
        w.applies_to_degrees ? [...w.applies_to_degrees].sort() : null,
        w.applies_to_start?.trim().toLowerCase() ?? null,
        w.earliest,
        w.latest,
      ]),
    );
  if (field === "start_options")
    return sortedJson((v as { label: string; month: string | null }[]).map((s) => s.month ?? s.label.trim().toLowerCase()));
  if (field === "class_years" || field === "degree_levels") return sortedJson(v as string[]);
  if (field === "clearance") {
    const c = v as { required: string; level: string | null };
    return `${c.required}/${c.level}`;
  }
  return JSON.stringify(v);
}

export const mentioned = (s: string) => s === "stated" || s === "ambiguous";
export const claimed = (s: string) => mentioned(s) || s === "unverified";

// Exact decision match: status, value, and strength. Strength means nothing on
// an ambiguous field with no value, so it isn't compared there.
export function decisionMatches(field: Field, gold: AnyField, pred: AnyField | null): boolean {
  const vague = gold.status === "ambiguous" && gold.value === null;
  return (
    pred !== null &&
    pred.status === gold.status &&
    (vague || pred.strength === gold.strength) &&
    canonicalValue(field, pred.value) === canonicalValue(field, gold.value)
  );
}

export interface FieldScore {
  field: Field;
  n: number;
  goldPositive: number;
  detectionPrecision: Proportion;
  detectionRecall: Proportion;
  decisionAccuracy: Proportion;
  valueAccuracy: Proportion;
  unverified: number;
}

export function scoreField(field: Field, pairs: { gold: AnyField; pred: AnyField | null }[]): FieldScore {
  let tp = 0, fp = 0, fn = 0, exact = 0, valueN = 0, valueOk = 0, unverified = 0;
  for (const { gold, pred } of pairs) {
    const g = mentioned(gold.status);
    // A failed extraction predicts nothing.
    const p = pred !== null && claimed(pred.status);
    if (pred?.status === "unverified") unverified++;
    if (g && p) tp++;
    if (!g && p) fp++;
    if (g && !p) fn++;
    if (decisionMatches(field, gold, pred)) exact++;
    if (pred && gold.status === "stated" && pred.status === "stated") {
      valueN++;
      if (canonicalValue(field, pred.value) === canonicalValue(field, gold.value)) valueOk++;
    }
  }
  return {
    field,
    n: pairs.length,
    goldPositive: tp + fn,
    detectionPrecision: wilson(tp, tp + fp),
    detectionRecall: wilson(tp, tp + fn),
    decisionAccuracy: wilson(exact, pairs.length),
    valueAccuracy: wilson(valueOk, valueN),
    unverified,
  };
}

// --- zshah101 regex baseline -------------------------------------------------

const truthy = (f: AnyField | undefined) => !!f && f.status === "stated" && f.value !== null && f.value !== false;

// Any work-authorization restriction, the only thing the baseline can express.
function anyWorkAuth(f: Record<string, AnyField>): boolean {
  const clearance = f.clearance;
  return (
    truthy(f.citizenship_required) ||
    truthy(f.us_person_required) ||
    truthy(f.sponsorship_now_unavailable) ||
    truthy(f.sponsorship_future_unavailable) ||
    (truthy(clearance) && (clearance!.value as { required: string }).required === "active")
  );
}

export interface BaselineScore {
  n: number; // JDs that have a baseline value
  baseline: { precision: Proportion; recall: Proportion };
  model: { precision: Proportion; recall: Proportion };
  // Of JDs the baseline calls citizens-only, how many truly require citizenship
  // (vs ITAR "U.S. person", clearance, or no sponsorship, which a permanent
  // resident may satisfy).
  citizensOnlyIsCitizenship: Proportion;
}

function pr(pairs: [boolean, boolean][]) {
  const tp = pairs.filter(([g, p]) => g && p).length;
  const fp = pairs.filter(([g, p]) => !g && p).length;
  const fn = pairs.filter(([g, p]) => g && !p).length;
  return { precision: wilson(tp, tp + fp), recall: wilson(tp, tp + fn) };
}

export function scoreBaseline(rows: { gold: Record<string, AnyField>; pred: Record<string, AnyField> | null; baseline: string }[]): BaselineScore {
  const flagged = (b: string) => b === "citizens-only" || b === "no-sponsorship";
  const gold = rows.map((r) => anyWorkAuth(r.gold));
  const citizens = rows.filter((r) => r.baseline === "citizens-only");
  return {
    n: rows.length,
    baseline: pr(rows.map((r, i) => [gold[i]!, flagged(r.baseline)])),
    model: pr(rows.map((r, i) => [gold[i]!, r.pred !== null && anyWorkAuth(r.pred)])),
    citizensOnlyIsCitizenship: wilson(citizens.filter((r) => truthy(r.gold.citizenship_required)).length, citizens.length),
  };
}

// --- whole report ---------------------------------------------------------------

export interface StratumReport {
  stratum: string;
  jds: number;
  extractionFailure: Proportion;
  quoteFailedFields: Proportion; // unverified fields / fields the model claimed
  fields: FieldScore[];
  baseline: BaselineScore;
}

export interface ExtractionReport {
  labeled: number;
  predicted: number;
  strata: StratumReport[];
  costUsd: { total: number; mean: number | null; p50: number | null; p95: number | null };
  latencyMs: { p50: number | null; p95: number | null };
}

export function scoreExtraction(dataset: Dataset, labels: Label[], predictions: Prediction[]): ExtractionReport {
  const items = new Map(dataset.items.map((i) => [i.id, i]));
  const preds = new Map(predictions.map((p) => [p.id, p]));
  const rows = labels
    .filter((l) => items.has(l.id) && preds.has(l.id))
    .map((l) => ({ label: l, item: items.get(l.id)!, pred: preds.get(l.id)! }));

  const stratum = (name: string, rs: typeof rows): StratumReport => {
    const predFields = (r: (typeof rows)[number]) =>
      r.pred.status === "ok" && r.pred.extracted ? (r.pred.extracted as unknown as Record<string, AnyField>) : null;
    let claimedFields = 0, unverifiedFields = 0;
    for (const r of rs) {
      const pf = predFields(r);
      if (!pf) continue;
      for (const f of LABEL_FIELDS) {
        if (claimed(pf[f]!.status)) claimedFields++;
        if (pf[f]!.status === "unverified") unverifiedFields++;
      }
    }
    const withBaseline = rs.filter((r) => r.item.baselineSponsorship !== null);
    return {
      stratum: name,
      jds: rs.length,
      extractionFailure: wilson(rs.filter((r) => r.pred.status !== "ok").length, rs.length),
      quoteFailedFields: wilson(unverifiedFields, claimedFields),
      fields: LABEL_FIELDS.map((f) =>
        scoreField(
          f,
          rs.map((r) => ({ gold: r.label.fields[f] as AnyField, pred: predFields(r)?.[f] ?? null })),
        ),
      ),
      baseline: scoreBaseline(
        withBaseline.map((r) => ({
          gold: r.label.fields as unknown as Record<string, AnyField>,
          pred: predFields(r),
          baseline: r.item.baselineSponsorship!,
        })),
      ),
    };
  };

  const costs = rows.map((r) => r.pred.costUsd);
  const lat = rows.map((r) => r.pred.latencyMs);
  const total = costs.reduce((a, b) => a + b, 0);
  return {
    labeled: labels.length,
    predicted: rows.length,
    strata: [
      stratum("all", rows),
      stratum("random", rows.filter((r) => r.item.stratum === "random")),
      stratum("keyword", rows.filter((r) => r.item.stratum === "keyword")),
    ],
    costUsd: { total, mean: rows.length ? total / rows.length : null, p50: percentile(costs, 50), p95: percentile(costs, 95) },
    latencyMs: { p50: percentile(lat, 50), p95: percentile(lat, 95) },
  };
}
