// Words and badge colours for verdicts and requirement rows. One place, so the
// feed, the detail page, and the tooltips always agree (CLAUDE.md section 5).
import type { RowStatus, Verdict } from "@core/match";
import type { GateField } from "@core/requirements";

export const VERDICTS: Record<Verdict, { label: string; short: string; tip: string; badge: string }> = {
  eligible: {
    label: "Eligible",
    short: "Eligible",
    tip: "You meet every requirement this posting states that we evaluated. Not a guarantee from the employer.",
    badge: "bg-mint text-ground",
  },
  no_restrictions_found: {
    label: "No restrictions found",
    short: "No limits",
    tip: "The posting doesn't state any of the requirements we check.",
    badge: "bg-lav text-ground",
  },
  check: {
    label: "Check",
    short: "Check",
    tip: "Something is unclear, or an internship doesn't state its graduation rule. Read the posting.",
    badge: "bg-amber text-ground",
  },
  not_checked: {
    label: "Not checked",
    short: "Not checked",
    tip: "We haven't read this posting, or couldn't.",
    badge: "bg-slate text-ground",
  },
  not_eligible: {
    label: "Not eligible",
    short: "Not eligible",
    tip: "The posting states a hard requirement you don't meet, with a verified quote.",
    badge: "bg-rose text-ground",
  },
};

// Per-verdict colours for the bold cards: the count, the hover edge and offset
// shadow, and the highlight on the deciding phrase. Literal class strings, so
// Tailwind can see them.
export const VERDICT_STYLE: Record<Verdict, { text: string; card: string; mark: string; ring: string }> = {
  eligible: { text: "text-mint", card: "hover:border-mint hover:shadow-[6px_6px_0_var(--color-mint)]", mark: "bg-mint text-ground", ring: "border-mint" },
  no_restrictions_found: { text: "text-lav", card: "hover:border-lav hover:shadow-[6px_6px_0_var(--color-lav)]", mark: "bg-lav text-ground", ring: "border-lav" },
  check: { text: "text-amber", card: "hover:border-amber hover:shadow-[6px_6px_0_var(--color-amber)]", mark: "bg-amber text-ground", ring: "border-amber" },
  not_checked: { text: "text-slate", card: "hover:border-slate hover:shadow-[6px_6px_0_var(--color-slate)]", mark: "bg-slate text-ground", ring: "border-slate" },
  not_eligible: { text: "text-rose", card: "hover:border-rose hover:shadow-[6px_6px_0_var(--color-rose)]", mark: "bg-rose text-ground", ring: "border-rose" },
};

export const VERDICT_ORDER: Verdict[] = ["eligible", "no_restrictions_found", "check", "not_checked", "not_eligible"];

export const ROW_STATUS: Record<RowStatus, { label: string; badge: string; mark: string }> = {
  satisfied: { label: "Meets", badge: "bg-mint text-ground", mark: "bg-mint text-ground" },
  conflict: { label: "Conflict", badge: "bg-rose text-ground", mark: "bg-rose text-ground" },
  unclear: { label: "Unclear", badge: "bg-amber text-ground", mark: "bg-amber text-ground" },
  not_mentioned: { label: "Not stated", badge: "border-2 border-line text-muted", mark: "" },
  extraction_failed: { label: "Couldn't read", badge: "border-2 border-dashed border-muted text-muted", mark: "" },
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
