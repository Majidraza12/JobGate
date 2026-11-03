// Matching engine: every case CLAUDE.md section 12 requires.
import { describe, expect, it } from "vitest";
import { classYearAt, match, parseStart, type JobType, type StoredRequirements } from "@core/match";
import { EligibilityProfile, START_TERMS } from "@core/profile";
import type { StoredExtraction } from "@core/requirements";
import { blank } from "./helpers/extraction";

// Majid-like: BS, graduating May 2027, U.S. citizen.
const me: EligibilityProfile = {
  grad_month: "2027-05",
  degree: "bs",
  us_citizen: true,
  permanent_resident: false,
  authorized_now_without_sponsorship: true,
  needs_sponsorship_future: false,
  clearance: { status: "none" },
  starts: ["Summer 2027", "Summer 2028"],
};
const as = (over: Partial<EligibilityProfile>): EligibilityProfile => ({ ...me, ...over });

const stated = (value: unknown, quote = "quote", strength: "required" | "preferred" = "required") => ({ status: "stated", value, evidence: [quote], strength });
const ambiguous = (quote = "a", quote2 = "b") => ({ status: "ambiguous", value: null, evidence: [quote, quote2], strength: null });
const unverified = (value: unknown) => ({ status: "unverified", value, evidence: ["made up"], strength: "required" });
const win = (earliest: string | null, latest: string | null, extra: { degrees?: string[]; start?: string } = {}) => ({
  applies_to_degrees: extra.degrees ?? null,
  applies_to_start: extra.start ?? null,
  earliest,
  latest,
  evidence: ["window quote"],
});

const ok = (fields: Record<string, unknown>): StoredRequirements => ({
  extraction_status: "ok",
  extracted: { ...blank(), ...fields } as StoredExtraction,
});
const run = (fields: Record<string, unknown>, p = me, jobType: JobType = "internship") => match(ok(fields), p, jobType);
const rowOf = (fields: Record<string, unknown>, field: string, p = me, jobType: JobType = "full-time") =>
  run(fields, p, jobType).rows.find((r) => r.field === field)!;

describe("graduation windows", () => {
  const grad = (windows: unknown[], p = me) => rowOf({ grad_requirements: stated(windows) }, "grad_requirements", p).status;

  it("includes both boundary months and excludes one month outside", () => {
    expect(grad([win("2027-05", "2027-12")])).toBe("satisfied");
    expect(grad([win("2026-12", "2027-05")])).toBe("satisfied");
    expect(grad([win("2027-06", "2027-12")])).toBe("conflict");
    expect(grad([win("2026-12", "2027-04")])).toBe("conflict");
  });

  it("treats null bounds as open-ended", () => {
    expect(grad([win(null, "2027-05")])).toBe("satisfied");
    expect(grad([win("2027-05", null)])).toBe("satisfied");
    expect(grad([win(null, "2027-04")])).toBe("conflict");
    expect(grad([win("2027-06", null)])).toBe("conflict");
  });

  it("fits if any applicable window fits", () => {
    expect(grad([win("2027-12", "2028-06"), win("2027-05", "2027-05")])).toBe("satisfied");
  });

  it("never matches a bachelor's student against a master's-only window, in either direction", () => {
    expect(grad([win("2027-12", "2028-06", { degrees: ["ms"] })])).toBe("unclear");
    expect(grad([win("2027-05", "2027-05", { degrees: ["ms"] })], as({ degree: "bs" }))).toBe("unclear");
    expect(grad([win("2027-12", "2028-06", { degrees: ["bs"] })], as({ degree: "ms" }))).toBe("unclear");
    // The bachelor's window applies to the bachelor's student and decides.
    expect(grad([win("2027-12", "2028-06", { degrees: ["bs"] }), win("2027-01", "2027-12", { degrees: ["ms"] })])).toBe("conflict");
  });

  it("applies start-conditional windows only to matching start terms", () => {
    // Summer 2027 is one of my starts: that window decides.
    expect(grad([win("2027-12", "2028-06", { start: "Summer 2027" })])).toBe("conflict");
    // Fall 2027 isn't: no window applies, so unclear, never conflict.
    expect(grad([win("2027-12", "2028-06", { start: "Fall 2027" })])).toBe("unclear");
    // A month vs my named terms can't be compared without guessing.
    expect(grad([win("2027-01", "2027-12", { start: "February 2027" })])).toBe("unclear");
    expect(grad([win("2027-12", "2028-06", { start: "February 2027" })])).toBe("unclear");
  });

  it("is unclear for an ambiguous or contradictory posting", () => {
    expect(rowOf({ grad_requirements: ambiguous("graduating 2027", "graduating 2028") }, "grad_requirements").status).toBe("unclear");
  });

  it("is only unclear, not a conflict, when the window is preferred", () => {
    expect(grad([win("2027-12", "2028-06")])).toBe("conflict");
    expect(rowOf({ grad_requirements: stated([win("2027-12", "2028-06")], "q", "preferred") }, "grad_requirements").status).toBe("unclear");
  });
});

describe("start terms and class year", () => {
  it("parses months, named months, and seasons", () => {
    expect(parseStart("2027-06")).toEqual({ kind: "month", key: "2027-06" });
    expect(parseStart("February 2027")).toEqual({ kind: "month", key: "2027-02" });
    expect(parseStart(" Autumn 2027 ")).toEqual({ kind: "term", key: "fall 2027" });
    expect(parseStart("immediately")).toBeNull();
  });

  it("derives class year at the start from months left", () => {
    expect(classYearAt("2027-06", as({ grad_month: "2028-05" }))).toBe("senior"); // 11 months left
    expect(classYearAt("2027-06", as({ grad_month: "2028-06" }))).toBe("senior"); // exactly 12
    expect(classYearAt("2027-06", as({ grad_month: "2028-07" }))).toBe("junior"); // 13
    expect(classYearAt("2027-06", as({ grad_month: "2029-05" }))).toBe("junior");
    expect(classYearAt("2027-06", as({ grad_month: "2030-05" }))).toBe("sophomore");
    expect(classYearAt("2027-06", as({ grad_month: "2031-05" }))).toBe("freshman");
    expect(classYearAt("2027-06", as({ grad_month: "2027-05" }))).toBeNull(); // already graduated
    expect(classYearAt("2027-06", as({ degree: "ms", grad_month: "2028-05" }))).toBe("masters");
  });

  const summer = { start_options: stated([{ label: "Summer 2027", month: "2027-06" }]) };
  const years = (ys: string[], p = me, starts: unknown = summer) => rowOf({ ...(starts as object), class_years: stated(ys) }, "class_years", p).status;

  it("checks class years at the stated start", () => {
    expect(years(["junior", "senior"], as({ grad_month: "2028-05" }))).toBe("satisfied");
    expect(years(["junior"], as({ grad_month: "2028-05" }))).toBe("conflict");
    expect(years(["junior", "senior"])).toBe("conflict"); // graduated before the start
    expect(years(["senior"], as({ grad_month: "2028-05" }), {})).toBe("unclear"); // no start stated
  });

  it("passes if any stated start works", () => {
    const two = { start_options: stated([{ label: "Summer 2027", month: "2027-06" }, { label: "Summer 2028", month: "2028-06" }]) };
    expect(years(["senior"], as({ grad_month: "2029-05" }), two)).toBe("satisfied");
  });
});

describe("return to school", () => {
  const ret = (grad: string, starts: unknown[] | null) =>
    rowOf(
      { must_return_to_school: stated(true), ...(starts ? { start_options: stated(starts) } : {}) },
      "must_return_to_school",
      as({ grad_month: grad }),
    ).status;
  const june = [{ label: "Summer 2027", month: "2027-06" }];

  it("conflicts when graduating before the start", () => {
    expect(ret("2027-05", june)).toBe("conflict");
  });

  it("is unclear within 3 months after the start and satisfied later", () => {
    expect(ret("2027-06", june)).toBe("unclear");
    expect(ret("2027-09", june)).toBe("unclear");
    expect(ret("2027-10", june)).toBe("satisfied");
  });

  it("is unclear when the internship period isn't stated", () => {
    expect(ret("2027-05", null)).toBe("unclear");
    expect(ret("2027-05", [{ label: "Summer 2027", month: null }])).toBe("unclear");
  });

  it("is satisfied when the posting says it isn't required", () => {
    expect(rowOf({ must_return_to_school: stated(false) }, "must_return_to_school").status).toBe("satisfied");
  });
});

describe("degree levels", () => {
  it("checks the user's degree", () => {
    expect(rowOf({ degree_levels: stated(["bs", "ms"]) }, "degree_levels").status).toBe("satisfied");
    expect(rowOf({ degree_levels: stated(["ms", "phd"]) }, "degree_levels").status).toBe("conflict");
    expect(rowOf({ degree_levels: stated(["ms"], "q", "preferred") }, "degree_levels").status).toBe("unclear");
  });
});

describe("not in a degree program", () => {
  const none = as({ degree: "none", grad_month: null });
  const summer = { start_options: stated([{ label: "Summer 2027", month: "2027-06" }]) };

  it("is unclear, never a conflict, against graduation windows and class years", () => {
    expect(rowOf({ grad_requirements: stated([win("2027-05", "2027-12")]) }, "grad_requirements", none).status).toBe("unclear");
    expect(rowOf({ grad_requirements: stated([win(null, "2027-04")]) }, "grad_requirements", none).status).toBe("unclear");
    expect(rowOf({ ...summer, class_years: stated(["senior"]) }, "class_years", none).status).toBe("unclear");
    expect(classYearAt("2027-06", none)).toBeNull();
  });

  it("conflicts with a required degree and with returning to school", () => {
    expect(rowOf({ degree_levels: stated(["bs"]) }, "degree_levels", none).status).toBe("conflict");
    expect(rowOf({ degree_levels: stated(["bs"], "q", "preferred") }, "degree_levels", none).status).toBe("unclear");
    expect(rowOf({ ...summer, must_return_to_school: stated(true) }, "must_return_to_school", none).status).toBe("conflict");
  });

  it("has a graduation month exactly when it has a degree", () => {
    expect(EligibilityProfile.safeParse(none).success).toBe(true);
    expect(EligibilityProfile.safeParse(as({ grad_month: null })).success).toBe(false);
    expect(EligibilityProfile.safeParse(as({ degree: "none" })).success).toBe(false);
  });

  it("an internship with only a graduation window is Check, not Not eligible", () => {
    expect(run({ grad_requirements: stated([win("2027-12", "2028-06")]) }, none).verdict).toBe("check");
  });
});

describe("work authorization (every combination in section 10)", () => {
  const bools = [true, false];
  const combos = bools.flatMap((us_citizen) =>
    bools.flatMap((permanent_resident) =>
      bools.flatMap((authorized_now_without_sponsorship) =>
        bools.map((needs_sponsorship_future) => as({ us_citizen, permanent_resident, authorized_now_without_sponsorship, needs_sponsorship_future })),
      ),
    ),
  );
  const status = (field: string, p: EligibilityProfile) => rowOf({ [field]: stated(true) }, field, p).status;

  const name = (p: EligibilityProfile) =>
    `citizen ${p.us_citizen}, PR ${p.permanent_resident}, authorized now ${p.authorized_now_without_sponsorship}, needs future ${p.needs_sponsorship_future}`;

  it.each(combos.map((p) => [name(p), p] as const))("%s", (_, q) => {
    const citizenOrPr = q.us_citizen || q.permanent_resident;
    expect(status("citizenship_required", q)).toBe(q.us_citizen ? "satisfied" : "conflict");
    // Never a conflict: a refugee or asylee is a U.S. person too.
    expect(status("us_person_required", q)).toBe(citizenOrPr ? "satisfied" : "unclear");
    expect(status("sponsorship_now_unavailable", q)).toBe(citizenOrPr || q.authorized_now_without_sponsorship ? "satisfied" : "conflict");
    expect(status("sponsorship_future_unavailable", q)).toBe(citizenOrPr || !q.needs_sponsorship_future ? "satisfied" : "conflict");
  });

  it("never marks a permanent resident ineligible for no-sponsorship language", () => {
    const pr = as({ us_citizen: false, permanent_resident: true, authorized_now_without_sponsorship: false, needs_sponsorship_future: true });
    const r = run({ sponsorship_now_unavailable: stated(true), sponsorship_future_unavailable: stated(true), us_person_required: stated(true) }, pr, "full-time");
    expect(r.verdict).toBe("eligible");
  });

  it("treats 'not required' values as satisfied", () => {
    const f1 = as({ us_citizen: false, authorized_now_without_sponsorship: false, needs_sponsorship_future: true });
    expect(rowOf({ sponsorship_now_unavailable: stated(false) }, "sponsorship_now_unavailable", f1).status).toBe("satisfied");
  });
});

describe("clearance", () => {
  const c = (required: string, level: string | null, p = me, strength: "required" | "preferred" = "required") =>
    rowOf({ clearance: stated({ required, level }, "q", strength) }, "clearance", p).status;
  const active = (level: "secret" | "top_secret" | "ts_sci") => as({ clearance: { status: "active", level } });

  it("conflicts only for an explicit active clearance at a stated level when the user has none", () => {
    expect(c("active", "top_secret")).toBe("conflict");
    expect(c("active", null)).toBe("unclear");
    expect(c("ability_to_obtain", "secret")).toBe("unclear");
    expect(c("preferred", "secret")).toBe("unclear");
    expect(c("active", "top_secret", me, "preferred")).toBe("unclear");
  });

  it("is unclear when the user prefers not to say", () => {
    expect(c("active", "ts_sci", as({ clearance: { status: "prefer_not_to_say" } }))).toBe("unclear");
  });

  it("accepts an active clearance at or above the level, unclear below", () => {
    expect(c("active", "secret", active("top_secret"))).toBe("satisfied");
    expect(c("active", "ts_sci", active("ts_sci"))).toBe("satisfied");
    expect(c("active", null, active("secret"))).toBe("satisfied");
    expect(c("ability_to_obtain", "ts_sci", active("secret"))).toBe("unclear");
    expect(c("active", "top_secret", active("secret"))).toBe("unclear");
  });
});

describe("verdict precedence", () => {
  const gradOk = { grad_requirements: stated([win("2027-01", "2027-12")]) };

  it("one conflict plus one extraction failure is Not eligible, with both rows shown", () => {
    const r = run({ citizenship_required: stated(true), grad_requirements: unverified([win("2027-01", "2027-12")]) }, as({ us_citizen: false }));
    expect(r.verdict).toBe("not_eligible");
    expect(r.rows.find((x) => x.field === "citizenship_required")!.status).toBe("conflict");
    expect(r.rows.find((x) => x.field === "grad_requirements")!.status).toBe("extraction_failed");
  });

  it("is Not checked on a document-level failure, with every row extraction_failed", () => {
    for (const s of ["jd_unavailable", "llm_failed", "schema_invalid"] as const) {
      const r = match({ extraction_status: s, extracted: null }, me, "full-time");
      expect(r.verdict).toBe("not_checked");
      expect(r.rows.every((x) => x.status === "extraction_failed")).toBe(true);
    }
  });

  it("is Not checked when a critical gate failed extraction, Check for an unclear one", () => {
    expect(run({ grad_requirements: unverified([win("2027-01", "2027-12")]) }).verdict).toBe("not_checked");
    expect(run({ ...gradOk, citizenship_required: ambiguous() }).verdict).toBe("check");
  });

  it("does not treat a non-critical extraction failure as Not checked", () => {
    const r = run({ ...gradOk, citizenship_required: unverified(true) });
    expect(r.verdict).toBe("eligible");
    expect(r.rows.find((x) => x.field === "citizenship_required")!.status).toBe("extraction_failed");
  });

  it("keeps not_mentioned and extraction_failed distinct", () => {
    const r = run({ ...gradOk, citizenship_required: unverified(true) });
    expect(r.rows.find((x) => x.field === "us_person_required")!.status).toBe("not_mentioned");
    expect(r.rows.find((x) => x.field === "citizenship_required")!.status).toBe("extraction_failed");
  });

  it("internships: Check when both critical gates are silent, Eligible when one is satisfied", () => {
    expect(run({}).verdict).toBe("check");
    expect(run({}, me, "co-op").verdict).toBe("check");
    expect(run(gradOk).verdict).toBe("eligible");
    const june = { start_options: stated([{ label: "Summer 2026", month: "2026-06" }]) };
    expect(run({ ...june, must_return_to_school: stated(true) }).verdict).toBe("eligible");
  });

  it("new grad: silence is No restrictions found; a satisfied requirement is Eligible", () => {
    expect(run({}, me, "full-time").verdict).toBe("no_restrictions_found");
    expect(run(gradOk, me, "full-time").verdict).toBe("eligible");
    expect(run({ grad_requirements: unverified([]) }, me, "full-time").verdict).toBe("no_restrictions_found");
  });

  it("work authorization is never critical by absence", () => {
    expect(run(gradOk, as({ us_citizen: false, authorized_now_without_sponsorship: false, needs_sponsorship_future: true })).verdict).toBe("eligible");
  });

  it("Not eligible needs a required, stated field; preferred conflicts only reach Check", () => {
    expect(run({ ...gradOk, degree_levels: stated(["ms"]) }).verdict).toBe("not_eligible");
    expect(run({ ...gradOk, degree_levels: stated(["ms"], "q", "preferred") }).verdict).toBe("check");
  });

  it("start_options has no row of its own", () => {
    expect(run({}).rows.map((r) => r.field)).not.toContain("start_options");
  });
});

describe("START_TERMS", () => {
  it("are all named terms the matcher understands", () => {
    for (const t of START_TERMS) expect(parseStart(t)?.kind, t).toBe("term");
  });
});
