// Shared builders for extraction tests.
import type { ModelExtraction } from "@core/requirements";

const none = { status: "not_mentioned", value: null, evidence: [], strength: null } as const;

// Every gate not mentioned; tests override what they need.
export function blank(): ModelExtraction {
  return {
    grad_requirements: { ...none, evidence: [] },
    must_return_to_school: { ...none, evidence: [] },
    class_years: { ...none, evidence: [] },
    degree_levels: { ...none, evidence: [] },
    start_options: { ...none, evidence: [] },
    citizenship_required: { ...none, evidence: [] },
    us_person_required: { ...none, evidence: [] },
    sponsorship_now_unavailable: { ...none, evidence: [] },
    sponsorship_future_unavailable: { ...none, evidence: [] },
    clearance: { ...none, evidence: [] },
    locations: { cities: [], remote: null, hybrid: null },
    employment_type: null,
    season: null,
    role_family: null,
  };
}


export const ORACLE_TARGET = {
  applyUrl: "https://egug.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/26011784",
  ats: "oracle",
  atsTenant: "egug.fa.us2.oraclecloud.com",
  atsReqId: "26011784",
};
