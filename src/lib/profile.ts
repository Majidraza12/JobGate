// The profiles row <-> the EligibilityProfile that matching reads.
// Work-authorization answers are sensitive: never log these objects.
import { EligibilityProfile } from "@core/profile";

export type ProfileRow = {
  id: string;
  grad_month: string;
  degree: "bs" | "ms" | "phd";
  us_citizen: boolean;
  permanent_resident: boolean;
  authorized_now_without_sponsorship: boolean;
  needs_sponsorship_future: boolean;
  clearance_status: "active" | "none" | "prefer_not_to_say";
  clearance_level: "secret" | "top_secret" | "ts_sci" | null;
  starts: string[];
  job_types: string[];
  locations: string[];
  remote_ok: boolean;
};

export function toEligibility(p: ProfileRow): EligibilityProfile {
  return EligibilityProfile.parse({
    grad_month: p.grad_month,
    degree: p.degree,
    us_citizen: p.us_citizen,
    permanent_resident: p.permanent_resident,
    authorized_now_without_sponsorship: p.authorized_now_without_sponsorship,
    needs_sponsorship_future: p.needs_sponsorship_future,
    clearance: p.clearance_status === "active" ? { status: "active", level: p.clearance_level } : { status: p.clearance_status },
    starts: p.starts,
  });
}
