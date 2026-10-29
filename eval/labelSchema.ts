// Gold label for one JD: what a careful human says each gate field is. Same
// field shapes as the extraction schema, but quotes are optional: the eval
// scores the decision (status, value, strength); quote accuracy is measured
// separately by the substring verifier.

import { z } from "zod";
import { ClassYear, Clearance, Degree, GATE_FIELDS, GradWindowBase, StartOption, withWindowChecks } from "@core/requirements";

function gold<T extends z.ZodType>(value: T) {
  return z
    .object({
      status: z.enum(["stated", "not_mentioned", "ambiguous"]),
      value: value.nullable(),
      strength: z.enum(["required", "preferred"]).nullable(),
      evidence: z.array(z.string()).default([]),
    })
    .superRefine((f, ctx) => {
      const v = (f as unknown as { value: unknown }).value;
      if (f.status === "stated" && (v === null || f.strength === null))
        ctx.addIssue({ code: "custom", message: "stated needs a value and a strength" });
      if (f.status === "not_mentioned" && (v !== null || f.strength !== null))
        ctx.addIssue({ code: "custom", message: "not_mentioned must have no value or strength" });
    });
}

// Windows in gold labels may omit their own evidence.
const GoldWindow = withWindowChecks(GradWindowBase.extend({ evidence: z.array(z.string()).default([]) }));

export const ADVERSARIAL_TAGS = [
  "boundary_grad_date",
  "contradiction",
  "preferred_sounds_required",
  "multiple_windows_or_starts",
  "itar_vs_citizenship",
  "ability_vs_active_clearance",
] as const;

export const Label = z.object({
  id: z.string(),
  datasetVersion: z.string(),
  labeler: z.string().min(1),
  labeledAt: z.string(),
  fields: z.object({
    grad_requirements: gold(z.array(GoldWindow).min(1)),
    must_return_to_school: gold(z.boolean()),
    class_years: gold(z.array(ClassYear).min(1)),
    degree_levels: gold(z.array(Degree).min(1)),
    start_options: gold(z.array(StartOption).min(1)),
    citizenship_required: gold(z.boolean()),
    us_person_required: gold(z.boolean()),
    sponsorship_now_unavailable: gold(z.boolean()),
    sponsorship_future_unavailable: gold(z.boolean()),
    clearance: gold(Clearance),
  }),
  tags: z.array(z.enum(ADVERSARIAL_TAGS)).default([]),
  notes: z.string().default(""),
});
export type Label = z.infer<typeof Label>;

export const LABEL_FIELDS = GATE_FIELDS;

export const DatasetItem = z.object({
  id: z.string(),
  stratum: z.enum(["random", "keyword"]),
  jdHash: z.string(),
  ats: z.string().nullable(),
  company: z.string(),
  title: z.string(),
  applyUrl: z.string(),
  baselineSponsorship: z.string().nullable(),
  jdText: z.string(),
});
export const Dataset = z.object({
  version: z.string(),
  createdAt: z.string(),
  seed: z.number(),
  keywordPattern: z.string(),
  items: z.array(DatasetItem),
});
export type Dataset = z.infer<typeof Dataset>;
