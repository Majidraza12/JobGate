// Extraction schema (CLAUDE.md section 11). Shared by the pipeline, which
// validates model output with it, and the app, which reads stored results.
//
// Gate fields (the ones matching can turn into a verdict) are Field<T> with
// status, value, verbatim evidence, and strength. Descriptive fields (where,
// what kind of job) never decide eligibility, so they are plain values.

import { z } from "zod";

export const MODEL_STATUSES = ["stated", "not_mentioned", "ambiguous"] as const;
// The model never returns "unverified"; our validator sets it when a quote
// isn't a substring of the JD.
export const STORED_STATUSES = [...MODEL_STATUSES, "unverified"] as const;

export const Month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "expected YYYY-MM");
export const Degree = z.enum(["bs", "ms", "phd"]);
export const ClassYear = z.enum(["freshman", "sophomore", "junior", "senior", "masters", "phd"]);

export const GradWindowBase = z.object({
  applies_to_degrees: z.array(Degree).min(1).nullable(), // null = applies to everyone
  applies_to_start: z.string().min(1).nullable(), // e.g. "Summer 2027"; null = any start
  earliest: Month.nullable(),
  latest: Month.nullable(), // null bounds are open-ended
  evidence: z.array(z.string().min(1)).min(1),
});

type Window = { earliest: string | null; latest: string | null };

// Shared with gold labels, which use the same window shape.
export function withWindowChecks<T extends z.ZodType<Window>>(schema: T) {
  return schema
    .refine((g) => g.earliest === null || g.latest === null || g.earliest <= g.latest, {
      message: "earliest is after latest",
    })
    .refine((g) => g.earliest !== null || g.latest !== null, { message: "a window needs at least one bound" });
}

export const GradRequirement = withWindowChecks(GradWindowBase);

export const Clearance = z.object({
  required: z.enum(["active", "ability_to_obtain", "preferred"]),
  level: z.enum(["secret", "top_secret", "ts_sci"]).nullable(),
});

export const StartOption = z.object({ label: z.string().min(1), month: Month.nullable() });

type Statuses = typeof MODEL_STATUSES | typeof STORED_STATUSES;

function field<T extends z.ZodType, S extends Statuses>(value: T, statuses: S) {
  return z
    .object({
      status: z.enum(statuses as S),
      value: value.nullable(),
      evidence: z.array(z.string().min(1)),
      strength: z.enum(["required", "preferred"]).nullable(),
    })
    .superRefine((raw, ctx) => {
      const f = raw as { status: string; value: unknown; evidence: string[]; strength: string | null };
      const issue = (message: string) => ctx.addIssue({ code: "custom", message });
      if (f.status === "not_mentioned") {
        if (f.value !== null) issue("not_mentioned must have value null");
        if (f.evidence.length) issue("not_mentioned must have no evidence");
        if (f.strength !== null) issue("not_mentioned must have strength null");
      }
      if (f.status === "stated") {
        if (f.value === null) issue("stated needs a value");
        if (f.strength === null) issue("stated needs a strength");
      }
      if ((f.status === "stated" || f.status === "ambiguous") && !f.evidence.length) issue(`${f.status} needs evidence`);
    });
}

function schema<S extends Statuses>(statuses: S) {
  return z.object({
    grad_requirements: field(z.array(GradRequirement).min(1), statuses),
    must_return_to_school: field(z.boolean(), statuses),
    class_years: field(z.array(ClassYear).min(1), statuses),
    degree_levels: field(z.array(Degree).min(1), statuses),
    start_options: field(z.array(StartOption).min(1), statuses),
    citizenship_required: field(z.boolean(), statuses),
    us_person_required: field(z.boolean(), statuses),
    sponsorship_now_unavailable: field(z.boolean(), statuses),
    sponsorship_future_unavailable: field(z.boolean(), statuses),
    clearance: field(Clearance, statuses),
    locations: z.object({ cities: z.array(z.string()), remote: z.boolean().nullable(), hybrid: z.boolean().nullable() }),
    employment_type: z.enum(["internship", "co-op", "full-time", "part-time"]).nullable(),
    season: z.string().nullable(),
    role_family: z.enum(["swe", "ml", "fullstack", "data", "quant", "other"]).nullable(),
  });
}

export const ModelExtraction = schema(MODEL_STATUSES);
export const StoredExtraction = schema(STORED_STATUSES);
export type ModelExtraction = z.infer<typeof ModelExtraction>;
export type StoredExtraction = z.infer<typeof StoredExtraction>;

export const GATE_FIELDS = [
  "grad_requirements",
  "must_return_to_school",
  "class_years",
  "degree_levels",
  "start_options",
  "citizenship_required",
  "us_person_required",
  "sponsorship_now_unavailable",
  "sponsorship_future_unavailable",
  "clearance",
] as const satisfies readonly (keyof ModelExtraction)[];
export type GateField = (typeof GATE_FIELDS)[number];
