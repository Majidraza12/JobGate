// Converts hand labels written as one JSON file (eval/labels-<version>.json)
// into gold Label objects. Pure: no I/O. The file's own "conventions" block
// documents the encoding; an omitted field means not mentioned.

import { LABEL_FIELDS } from "./labelSchema";

type Field = (typeof LABEL_FIELDS)[number];

// File key -> gold field.
export const KEYS: Record<string, Field> = {
  gradWindow: "grad_requirements",
  mustReturnToSchool: "must_return_to_school",
  classYears: "class_years",
  degreeLevels: "degree_levels",
  startOptions: "start_options",
  usCitizenship: "citizenship_required",
  usPerson: "us_person_required",
  noSponsorNow: "sponsorship_now_unavailable",
  noSponsorFuture: "sponsorship_future_unavailable",
  clearance: "clearance",
};

export interface HandField {
  status: string;
  strength: string | null;
  value: unknown;
  level?: string | null;
  quote?: string;
}

export interface HandItem {
  id: string;
  company?: string;
  tags?: string[];
  notes?: string;
  [key: string]: unknown;
}

function value(field: Field, f: HandField): unknown {
  const v = f.value;
  if (v === null || v === undefined) return null;
  if (typeof v === "string" && (v === "yes" || v === "no")) return v === "yes";
  if (field === "grad_requirements")
    return (v as { earliest: string | null; latest: string | null; degrees?: string[]; start?: string }[]).map((w) => ({
      applies_to_degrees: w.degrees ?? null,
      applies_to_start: w.start ?? null,
      earliest: w.earliest,
      latest: w.latest,
      evidence: [],
    }));
  if (field === "start_options")
    return (v as string[]).map((s) => ({ label: s, month: /^\d{4}-\d{2}/.test(s) ? s.slice(0, 7) : null }));
  if (field === "clearance") return { required: v, level: f.level ?? null };
  return v;
}

// Returns the unvalidated label body plus any file keys it didn't recognize.
export function fromHand(item: HandItem) {
  const fields = Object.fromEntries(
    LABEL_FIELDS.map((k) => [k, { status: "not_mentioned", value: null, strength: null, evidence: [] as string[] }]),
  ) as Record<Field, { status: string; value: unknown; strength: string | null; evidence: string[] }>;
  const unknown: string[] = [];
  for (const [key, raw] of Object.entries(item)) {
    if (key === "id" || key === "company" || key === "tags" || key === "notes") continue;
    const field = KEYS[key];
    if (!field) {
      unknown.push(key);
      continue;
    }
    const f = raw as HandField;
    fields[field] = { status: f.status, value: value(field, f), strength: f.strength, evidence: f.quote ? [f.quote] : [] };
  }
  return { body: { fields, tags: item.tags ?? [], notes: item.notes ?? "" }, unknown };
}
