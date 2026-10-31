// Words and badge colours for verdicts and requirement rows. One place, so the
// feed, the detail page, and the tooltips always agree (CLAUDE.md section 5).
import type { RowStatus, Verdict } from "@core/match";
import type { GateField } from "@core/requirements";

export const VERDICTS: Record<Verdict, { label: string; tip: string; badge: string }> = {
  eligible: {
    label: "Eligible",
    tip: "You meet every requirement this posting states that we evaluated. Not a guarantee from the employer.",
    badge: "bg-ok-bg text-ok-ink",
  },
  no_restrictions_found: {
    label: "No restrictions found",
    tip: "The posting doesn't state any of the requirements we check.",
    badge: "bg-info-bg text-info-ink",
  },
  check: {
    label: "Check",
    tip: "Something is unclear, or an internship doesn't state its graduation rule. Read the posting.",
    badge: "bg-warn-bg text-warn-ink",
  },
  not_checked: {
    label: "Not checked",
    tip: "We haven't read this posting, or couldn't.",
    badge: "bg-none-bg text-none-ink",
  },
  not_eligible: {
    label: "Not eligible",
    tip: "The posting states a hard requirement you don't meet, with a verified quote.",
    badge: "bg-bad-bg text-bad-ink",
  },
};

// Solid dots for the filter chips: the pale badge fills vanish at 8px.
export const VERDICT_DOT: Record<Verdict, string> = {
  eligible: "bg-[#2fbf7f]",
  no_restrictions_found: "bg-brand",
  check: "bg-[#d97706]",
  not_checked: "bg-[#9a9a9a]",
  not_eligible: "bg-[#c4242a]",
};

export const VERDICT_ORDER: Verdict[] =["eligible", "no_restrictions_found", "check", "not_checked", "not_eligible"];

export const ROW_STATUS: Record<RowStatus, { label: string; badge: string }> = {
  satisfied: { label: "Meets", badge: "bg-ok-bg text-ok-ink" },
  conflict: { label: "Conflict", badge: "bg-bad-bg text-bad-ink" },
  unclear: { label: "Unclear", badge: "bg-warn-bg text-warn-ink" },
  not_mentioned: { label: "Not stated", badge: "bg-none-bg text-none-ink" },
  extraction_failed: { label: "Couldn't read", badge: "border border-dashed border-muted text-none-ink" },
};

export const FIELD_NAMES: Record<GateField, string> = {
  grad_requirements: "Graduation window",
  must_return_to_school: "Return to school",
  class_years: "Class year",
  degree_levels: "Degree level",
  start_options: "Start dates",
  citizenship_required: "U.S. citizenship",
  us_person_required: "U.S. person (ITAR/EAR)",
  sponsorship_now_unavailable: "No sponsorship now",
  sponsorship_future_unavailable: "No sponsorship later",
  clearance: "Security clearance",
};

export const JOB_TYPES: Record<string, string> = { internship: "Internship", "co-op": "Co-op", new_grad: "New grad" };
