// Words and badge colours for verdicts and requirement rows. One place, so the
// feed, the detail page, and the tooltips always agree (CLAUDE.md section 5).
import type { RowStatus, Verdict } from "@core/match";
import type { GateField } from "@core/requirements";

export const VERDICTS: Record<Verdict, { label: string; short: string; tip: string; badge: string }> = {
  eligible: {
    label: "Eligible",
    short: "Eligible",
    tip: "You meet every requirement this posting states that we evaluated. Not a guarantee from the employer.",
    badge: "bg-mint/12 text-mint ring-1 ring-inset ring-mint/25",
  },
  no_restrictions_found: {
    label: "No restrictions found",
    short: "No limits",
    tip: "The posting doesn't state any of the requirements we check.",
    badge: "bg-lav/12 text-lav ring-1 ring-inset ring-lav/25",
  },
  check: {
    label: "Check",
    short: "Check",
    tip: "Something is unclear, or an internship doesn't state its graduation rule. Read the posting.",
    badge: "bg-amber/12 text-amber ring-1 ring-inset ring-amber/25",
  },
  not_checked: {
    label: "Not checked",
    short: "Not checked",
    tip: "We haven't read this posting, or couldn't.",
    badge: "bg-white/[0.06] text-slate ring-1 ring-inset ring-white/10",
  },
  not_eligible: {
    label: "Not eligible",
    short: "Not eligible",
    tip: "The posting states a hard requirement you don't meet, with a verified quote.",
    badge: "bg-rose/12 text-rose ring-1 ring-inset ring-rose/25",
  },
};

// Per-verdict accents: text colour, the dot, the highlight on the deciding
// phrase, and the icon. Literal class strings, so Tailwind can see them.
export const VERDICT_STYLE: Record<Verdict, { text: string; dot: string; mark: string; ring: string; icon: "checkCircle" | "sparkles" | "alert" | "help" | "xCircle" }> = {
  eligible: { text: "text-mint", dot: "bg-mint", mark: "bg-mint/15 text-mint", ring: "border-mint/50", icon: "checkCircle" },
  no_restrictions_found: { text: "text-lav", dot: "bg-lav", mark: "bg-lav/15 text-lav", ring: "border-lav/50", icon: "sparkles" },
  check: { text: "text-amber", dot: "bg-amber", mark: "bg-amber/15 text-amber", ring: "border-amber/50", icon: "alert" },
  not_checked: { text: "text-slate", dot: "bg-slate", mark: "bg-white/10 text-soft", ring: "border-white/20", icon: "help" },
  not_eligible: { text: "text-rose", dot: "bg-rose", mark: "bg-rose/15 text-rose", ring: "border-rose/50", icon: "xCircle" },
};

export const VERDICT_ORDER: Verdict[] = ["eligible", "no_restrictions_found", "check", "not_checked", "not_eligible"];

export const ROW_STATUS: Record<RowStatus, { label: string; badge: string; mark: string; icon: "checkCircle" | "xCircle" | "alert" | "help" | "dots" }> = {
  satisfied: { label: "Meets", badge: "bg-mint/12 text-mint ring-1 ring-inset ring-mint/25", mark: "bg-mint/15 text-mint", icon: "checkCircle" },
  conflict: { label: "Conflict", badge: "bg-rose/12 text-rose ring-1 ring-inset ring-rose/25", mark: "bg-rose/15 text-rose", icon: "xCircle" },
  unclear: { label: "Unclear", badge: "bg-amber/12 text-amber ring-1 ring-inset ring-amber/25", mark: "bg-amber/15 text-amber", icon: "alert" },
  not_mentioned: { label: "Not stated", badge: "bg-white/[0.05] text-muted ring-1 ring-inset ring-white/10", mark: "", icon: "dots" },
  extraction_failed: { label: "Couldn't read", badge: "text-muted border border-dashed border-white/25", mark: "", icon: "help" },
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
