// Lists every field where a prediction disagrees with the gold label, for a
// human to adjudicate (fix the label or count the model wrong). Pure: no I/O.
// Uses the scorer's own match rule, so the list is exactly the misses behind
// the decision-accuracy numbers.

import type { Dataset, Label } from "./labelSchema";
import { LABEL_FIELDS } from "./labelSchema";
import { canonicalValue, claimed, decisionMatches, mentioned, type Prediction } from "./score";

type Field = (typeof LABEL_FIELDS)[number];
type AnyField = { status: string; value: unknown; strength: string | null; evidence?: string[] };

export type Kind = "missed" | "spurious" | "unverified" | "status" | "value" | "strength";

export interface Disagreement {
  id: string;
  field: Field;
  kind: Kind;
  gold: AnyField;
  pred: AnyField;
}

export interface Review {
  disagreements: Disagreement[];
  failed: { id: string; status: string }[]; // extractions with no fields at all
  unpredicted: string[];
}

export function classify(field: Field, gold: AnyField, pred: AnyField): Kind | null {
  if (decisionMatches(field, gold, pred)) return null;
  if (pred.status === "unverified") return "unverified";
  if (mentioned(gold.status) && !claimed(pred.status)) return "missed";
  if (!mentioned(gold.status) && claimed(pred.status)) return "spurious";
  if (gold.status !== pred.status) return "status";
  if (canonicalValue(field, gold.value) !== canonicalValue(field, pred.value)) return "value";
  return "strength";
}

export function review(labels: Label[], predictions: Prediction[]): Review {
  const preds = new Map(predictions.map((p) => [p.id, p]));
  const out: Review = { disagreements: [], failed: [], unpredicted: [] };
  for (const l of [...labels].sort((a, b) => a.id.localeCompare(b.id))) {
    const p = preds.get(l.id);
    if (!p) {
      out.unpredicted.push(l.id);
      continue;
    }
    if (p.status !== "ok" || !p.extracted) {
      out.failed.push({ id: l.id, status: p.status });
      continue;
    }
    const fields = p.extracted as unknown as Record<Field, AnyField>;
    for (const f of LABEL_FIELDS) {
      const gold = l.fields[f] as AnyField;
      const kind = classify(f, gold, fields[f]);
      if (kind) out.disagreements.push({ id: l.id, field: f, kind, gold, pred: fields[f] });
    }
  }
  return out;
}

const show = (field: Field, f: AnyField) =>
  f.status === "not_mentioned" ? "not mentioned" : `${f.status}, ${f.strength ?? "no strength"}, ${canonicalValue(field, f.value)}`;
const quotes = (f: AnyField) => (f.evidence?.length ? f.evidence.map((q) => `> ${q.replace(/\s+/g, " ")}`).join("\n") : "> (no quote)");

export function renderReview(r: Review, dataset: Dataset, title: string): string {
  const items = new Map(dataset.items.map((i) => [i.id, i]));
  const counts = new Map<Kind, number>();
  for (const d of r.disagreements) counts.set(d.kind, (counts.get(d.kind) ?? 0) + 1);
  const lines = [
    `# ${title}`,
    "",
    "For each row decide: label wrong (fix eval/labels-v1.json, then npm run label:import) or model wrong (leave it).",
    "",
    `${r.disagreements.length} disagreements: ${[...counts].map(([k, n]) => `${k} ${n}`).join(", ") || "none"}.`,
  ];
  if (r.failed.length) lines.push(`Failed extractions: ${r.failed.map((f) => `${f.id} (${f.status})`).join(", ")}.`);
  if (r.unpredicted.length) lines.push(`No prediction yet: ${r.unpredicted.join(", ")}.`);
  let last = "";
  for (const d of r.disagreements) {
    if (d.id !== last) {
      const it = items.get(d.id);
      lines.push("", `## ${d.id} (${it?.stratum}) ${it?.company}: ${it?.title}`);
      last = d.id;
    }
    lines.push(
      "",
      `### ${d.field}: ${d.kind}`,
      `- gold: ${show(d.field, d.gold)}`,
      quotes(d.gold),
      `- model: ${show(d.field, d.pred)}`,
      quotes(d.pred),
    );
  }
  return lines.join("\n") + "\n";
}
