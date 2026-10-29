// Matching (CLAUDE.md sections 5, 10, 12): stored requirements + a profile ->
// one row per gate and a listing verdict. Pure and deterministic.
//
// Each gate is first judged meets / fails / unknown against its value. Then
// the field's status and strength decide the row: only a stated, required,
// verified field can turn "fails" into a conflict. Anything less certain is
// unclear, because wrongly hiding a job is the worst error.

import type { EligibilityProfile } from "./profile";
import { GATE_FIELDS, type GateField, type StoredExtraction } from "./requirements";

export type RowStatus = "satisfied" | "conflict" | "unclear" | "not_mentioned" | "extraction_failed";
export type Verdict = "not_eligible" | "not_checked" | "check" | "eligible" | "no_restrictions_found";
export type JobType = "internship" | "co-op" | "full-time";
export type ExtractionStatus = "ok" | "jd_unavailable" | "llm_failed" | "schema_invalid";

export interface StoredRequirements {
  extraction_status: ExtractionStatus;
  extracted: StoredExtraction | null;
}

export interface RequirementRow {
  field: GateField;
  status: RowStatus;
  evidence: string[];
  explanation: string;
}

export interface MatchResult {
  verdict: Verdict;
  rows: RequirementRow[];
}

// start_options feeds the graduation, return-to-school, and class-year checks;
// it isn't a requirement on its own, so it gets no row.
export const ROW_FIELDS = GATE_FIELDS.filter((f) => f !== "start_options");

type Judgment = { result: "meets" | "fails" | "unknown"; why: string };
const meets = (why: string): Judgment => ({ result: "meets", why });
const fails = (why: string): Judgment => ({ result: "fails", why });
const unknown = (why: string): Judgment => ({ result: "unknown", why });

// --- months and start terms ----------------------------------------------------

const toIndex = (m: string) => Number(m.slice(0, 4)) * 12 + Number(m.slice(5, 7)) - 1;
const monthsBetween = (from: string, to: string) => toIndex(to) - toIndex(from);

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

// A start is either an exact month or a named term ("summer 2027"). The two
// kinds are never compared with each other: "Summer 2027" vs "2027-05" can't
// be decided without guessing, so it's unknown.
type Start = { kind: "month"; key: string } | { kind: "term"; key: string } | null;

export function parseStart(s: string): Start {
  const t = s.trim().toLowerCase();
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(t)) return { kind: "month", key: t };
  let m = t.match(/^(spring|summer|fall|autumn|winter)\s+(\d{4})$/);
  if (m) return { kind: "term", key: `${m[1] === "autumn" ? "fall" : m[1]} ${m[2]}` };
  m = t.match(/^([a-z]+)\s+(\d{4})$/);
  const i = m ? MONTHS.indexOf(m[1]!.slice(0, 3)) : -1;
  if (m && i >= 0) return { kind: "month", key: `${m[2]}-${String(i + 1).padStart(2, "0")}` };
  return null;
}

function startApplies(windowStart: string, userStarts: string[]): boolean | null {
  const w = parseStart(windowStart);
  if (!w) return null;
  const users = userStarts.map(parseStart);
  if (users.some((u) => u?.kind === w.kind && u.key === w.key)) return true;
  if (users.length && users.every((u) => u?.kind === w.kind)) return false;
  return null;
}

// Months of the start options the JD states, for checks that need a date.
function startMonths(x: StoredExtraction): string[] {
  const f = x.start_options;
  if (f.status !== "stated" || !f.value) return [];
  return f.value.map((s) => s.month).filter((m): m is string => m !== null);
}

// Any start that works is enough: the user can pick it.
function bestOf(js: Judgment[]): Judgment {
  return js.find((j) => j.result === "meets") ?? js.find((j) => j.result === "unknown") ?? js[0]!;
}

// --- gates ---------------------------------------------------------------------

type Grad = NonNullable<StoredExtraction["grad_requirements"]["value"]>[number];

function judgeGrad(windows: Grad[], p: EligibilityProfile): Judgment {
  const fits = (w: Grad) => (w.earliest === null || w.earliest <= p.grad_month) && (w.latest === null || p.grad_month <= w.latest);
  const forDegree = windows.filter((w) => w.applies_to_degrees === null || w.applies_to_degrees.includes(p.degree));
  const applies = forDegree.filter((w) => w.applies_to_start === null || startApplies(w.applies_to_start, p.starts) === true);
  const maybe = forDegree.filter((w) => w.applies_to_start !== null && startApplies(w.applies_to_start, p.starts) === null);
  const range = (w: Grad) =>
    w.earliest === null ? `by ${w.latest}` : w.latest === null ? `${w.earliest} or later` : `${w.earliest} to ${w.latest}`;
  const hit = applies.find(fits);
  if (hit) return meets(`Your graduation (${p.grad_month}) fits the window ${range(hit)}.`);
  if (maybe.some(fits)) return unknown("A window you fit applies to a start term we couldn't match to yours.");
  if (applies.length) return fails(`Your graduation (${p.grad_month}) is outside ${applies.map(range).join(" and ")}.`);
  return unknown("The posting's graduation windows are for other degrees or start terms.");
}

// Agreed 2026-10-29: graduating before the start conflicts; within 3 months
// after it is unclear (the end date isn't known); later is satisfied.
function judgeReturn(required: boolean, x: StoredExtraction, p: EligibilityProfile): Judgment {
  if (!required) return meets("The posting says returning to school isn't required.");
  const starts = startMonths(x);
  if (!starts.length) return unknown("Requires returning to school, but the internship dates aren't stated.");
  return bestOf(
    starts.map((s) => {
      const after = monthsBetween(s, p.grad_month);
      if (after < 0) return fails(`You graduate (${p.grad_month}) before the ${s} start, so you can't return to school after it.`);
      if (after <= 3) return unknown(`You graduate (${p.grad_month}) close to the ${s} start; it depends on when the internship ends.`);
      return meets(`You graduate (${p.grad_month}) well after the ${s} start.`);
    }),
  );
}

// Class year at the start, derived from the graduation month (agreed
// 2026-10-29) instead of asking for it: a bachelor's student with 12 or fewer
// months left is a senior, and so on.
export function classYearAt(start: string, p: EligibilityProfile): string | null {
  const left = monthsBetween(start, p.grad_month);
  if (left < 0) return null;
  if (p.degree === "ms") return "masters";
  if (p.degree === "phd") return "phd";
  return left <= 12 ? "senior" : left <= 24 ? "junior" : left <= 36 ? "sophomore" : "freshman";
}

function judgeClassYears(years: string[], x: StoredExtraction, p: EligibilityProfile): Judgment {
  const starts = startMonths(x);
  if (!starts.length) return unknown(`Requires ${years.join(" or ")} standing, but the start date isn't stated.`);
  return bestOf(
    starts.map((s) => {
      const cy = classYearAt(s, p);
      if (cy === null) return fails(`You'll have graduated by the ${s} start; it requires ${years.join(" or ")} standing.`);
      return years.includes(cy) ? meets(`You'll be a ${cy} at the ${s} start.`) : fails(`You'll be a ${cy} at the ${s} start; it requires ${years.join(" or ")}.`);
    }),
  );
}

const DEGREE_NAMES: Record<string, string> = { bs: "bachelor's", ms: "master's", phd: "PhD" };

const LEVELS = ["secret", "top_secret", "ts_sci"];

function judgeClearance(c: { required: string; level: string | null }, p: EligibilityProfile): Judgment {
  const u = p.clearance;
  if (u.status === "prefer_not_to_say") return unknown("Mentions a clearance; you chose not to share yours.");
  if (u.status === "active") {
    if (c.level === null || LEVELS.indexOf(u.level) >= LEVELS.indexOf(c.level)) return meets("Your active clearance covers this.");
    return unknown(`Asks for ${c.level}; your active clearance is ${u.level}.`);
  }
  // No clearance: only an explicit active clearance at a stated level conflicts.
  if (c.required === "active" && c.level !== null) return fails(`Requires an active ${c.level} clearance; you don't hold one.`);
  if (c.required === "active") return unknown("Requires an active clearance but names no level.");
  if (c.required === "ability_to_obtain") return unknown("Requires the ability to obtain a clearance, which depends on you.");
  return unknown("A clearance is preferred.");
}

function judge(field: GateField, value: unknown, x: StoredExtraction, p: EligibilityProfile): Judgment {
  const citizenOrPr = p.us_citizen || p.permanent_resident;
  switch (field) {
    case "grad_requirements":
      return judgeGrad(value as Grad[], p);
    case "must_return_to_school":
      return judgeReturn(value as boolean, x, p);
    case "class_years":
      return judgeClassYears(value as string[], x, p);
    case "degree_levels": {
      const ds = value as string[];
      const name = (d: string) => DEGREE_NAMES[d] ?? d;
      return ds.includes(p.degree)
        ? meets(`Open to ${name(p.degree)} students.`)
        : fails(`Limited to ${ds.map(name).join(", ")}; you're a ${name(p.degree)} student.`);
    }
    case "citizenship_required":
      if (!value) return meets("The posting says citizenship isn't required.");
      return p.us_citizen ? meets("Requires U.S. citizenship; you're a citizen.") : fails("Requires U.S. citizenship.");
    case "us_person_required":
      if (!value || citizenOrPr) return meets("U.S. person requirement met.");
      // Refugees and asylees are U.S. persons too; we don't ask, so never conflict.
      return unknown("Requires a U.S. person (citizen, permanent resident, refugee, or asylee).");
    case "sponsorship_now_unavailable":
      if (!value || citizenOrPr || p.authorized_now_without_sponsorship) return meets("You don't need sponsorship now.");
      return fails("No visa sponsorship, and you need it now.");
    case "sponsorship_future_unavailable":
      if (!value || citizenOrPr || !p.needs_sponsorship_future) return meets("You won't need future sponsorship.");
      return fails("No sponsorship now or in the future, and you'll need it later.");
    case "clearance":
      return judgeClearance(value as { required: string; level: string | null }, p);
    case "start_options":
      return unknown("Start options aren't judged.");
  }
}

// --- rows and verdict --------------------------------------------------------------

function row(field: GateField, x: StoredExtraction, p: EligibilityProfile): RequirementRow {
  const f = x[field] as { status: string; value: unknown; evidence: string[]; strength: string | null };
  const base = { field, evidence: f.evidence };
  if (f.status === "unverified") return { ...base, status: "extraction_failed", explanation: "We couldn't verify the quote for this requirement." };
  if (f.status === "not_mentioned") return { ...base, status: "not_mentioned", explanation: "Not stated in posting." };
  if (f.status === "ambiguous" || f.value === null)
    return { ...base, status: "unclear", explanation: "The posting is unclear or contradicts itself here." };
  const j = judge(field, f.value, x, p);
  if (j.result === "meets") return { ...base, status: "satisfied", explanation: j.why };
  if (j.result === "fails" && f.strength === "required") return { ...base, status: "conflict", explanation: j.why };
  return { ...base, status: "unclear", explanation: j.result === "fails" ? `Preferred, not required. ${j.why}` : j.why };
}

const isInternship = (t: JobType) => t === "internship" || t === "co-op";

export function match(req: StoredRequirements, p: EligibilityProfile, jobType: JobType): MatchResult {
  if (req.extraction_status !== "ok" || !req.extracted) {
    const why = req.extraction_status === "jd_unavailable" ? "We couldn't fetch the job description." : "We couldn't read the job description.";
    return { verdict: "not_checked", rows: ROW_FIELDS.map((field) => ({ field, status: "extraction_failed", evidence: [], explanation: why })) };
  }
  const x = req.extracted;
  const rows = ROW_FIELDS.map((f) => row(f, x, p));
  const status = (f: GateField) => rows.find((r) => r.field === f)!.status;
  // Internships: graduation window or return-to-school is the critical gate.
  // New grad: no gate is critical by absence.
  const critical: GateField[] = isInternship(jobType) ? ["grad_requirements", "must_return_to_school"] : [];

  let verdict: Verdict;
  if (rows.some((r) => r.status === "conflict")) verdict = "not_eligible";
  else if (critical.some((f) => status(f) === "extraction_failed")) verdict = "not_checked";
  else if (rows.some((r) => r.status === "unclear") || (critical.length && critical.every((f) => status(f) === "not_mentioned"))) verdict = "check";
  else if (rows.some((r) => r.status === "satisfied")) verdict = "eligible";
  else verdict = "no_restrictions_found";
  return { verdict, rows };
}
