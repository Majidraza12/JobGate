// The parts of a user's profile that matching reads (CLAUDE.md sections 4 and
// 10). Location, role tracks, and job types are feed filters, not eligibility,
// so they live elsewhere.
//
// Work-authorization answers are sensitive: never log a profile.

import { z } from "zod";
import { Degree, Month } from "./requirements";

export const ClearanceLevel = z.enum(["secret", "top_secret", "ts_sci"]);

// "none": not in a degree program and no degree. Such a user has no
// graduation month, and graduation windows and class years can't be judged.
export const ProfileDegree = z.enum([...Degree.options, "none"]);

export const EligibilityProfile = z
  .object({
    grad_month: Month.nullable(),
    degree: ProfileDegree, // the degree being pursued, or the most recent one
    us_citizen: z.boolean(),
    permanent_resident: z.boolean(),
    authorized_now_without_sponsorship: z.boolean(),
    needs_sponsorship_future: z.boolean(),
    clearance: z.discriminatedUnion("status", [
      z.object({ status: z.literal("active"), level: ClearanceLevel }),
      z.object({ status: z.literal("none") }),
      z.object({ status: z.literal("prefer_not_to_say") }),
    ]),
    // Start terms the user can take, e.g. "Summer 2027". Used for windows that
    // apply only to one start term. The profile form only offers START_TERMS;
    // older free-text values stay valid here.
    starts: z.array(z.string().min(1)),
  })
  .refine(
    (p) => (p.degree === "none") === (p.grad_month === null),
    "A graduation month goes with a degree, and only with one.",
  );
export type EligibilityProfile = z.infer<typeof EligibilityProfile>;

// The start terms a user can pick, as fixed tags so "sum 2027" can't happen.
// Every one parses as a named term in match.ts. Extend the years as time passes.
export const START_TERMS = [
  "Spring 2027",
  "Summer 2027",
  "Fall 2027",
  "Winter 2028",
  "Spring 2028",
  "Summer 2028",
  "Fall 2028",
] as const;
