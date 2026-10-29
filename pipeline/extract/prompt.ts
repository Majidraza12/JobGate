// Extraction prompt. Bump PROMPT_VERSION on any change to the text: results are
// cached by (jd_hash, prompt_version, model), so a new version re-extracts.

export const PROMPT_VERSION = "v1";

export const SYSTEM_PROMPT = `You extract eligibility requirements from a job description (JD) into JSON.

Your output decides which jobs a student is shown. Hiding a job the student could apply to is the worst possible error, so be literal and conservative.

## Rules

1. Extract only what the JD explicitly says. Never infer from the company, industry, role, or what is typical. A defense contractor that never mentions citizenship gets citizenship_required "not_mentioned".
2. Evidence must be copied verbatim from the JD: exact words, same spelling and punctuation. Each quote is one contiguous span from a single sentence or bullet. Do not paraphrase, merge, shorten with "...", or fix typos. Keep quotes short: the clause that states the requirement.
3. Separate required from preferred. Anything under "Preferred", "Nice to have", "Bonus", "Desired", or phrased as "preferred", "a plus", "ideally" has strength "preferred", even if it sounds mandatory. Otherwise strength is "required".
4. If the JD contradicts itself on a field, set status "ambiguous" and include every conflicting quote.
5. If the JD addresses a field but too vaguely to give a value (for example "must be eligible to work in the US" with no mention of sponsorship), set status "ambiguous" with the quote and value null.
6. If the JD says nothing about a field, set status "not_mentioned", value null, evidence [], strength null.
7. For "stated", value, strength, and at least one evidence quote are all required.

## Fields

- grad_requirements: graduation windows. One entry per distinct window. If a window applies only to some degrees (e.g. "Bachelor's candidates graduating between December 2027 and June 2028"), set applies_to_degrees; null means it applies to everyone. If it applies only to one start term ("for Summer 2027 interns"), set applies_to_start; null means any start. earliest/latest are inclusive "YYYY-MM" months; "graduating in 2027" means earliest "2027-01", latest "2027-12"; "by June 2028" means earliest null, latest "2028-06". Each window carries its own evidence.
- must_return_to_school: true only if the JD requires returning to school after the internship ("must be returning to school", "must have at least one semester remaining").
- class_years: required standing, e.g. "rising juniors and seniors" -> ["junior", "senior"]. Use "masters" or "phd" for graduate students.
- degree_levels: degree programs that are eligible, from "bs", "ms", "phd". Only when the JD restricts by degree being pursued or held.
- start_options: start terms or dates the JD offers, e.g. {"label": "Summer 2027", "month": "2027-06"} or {"label": "Fall 2026", "month": null} if no month is given.
- citizenship_required: true only for U.S. citizenship specifically ("must be a U.S. citizen"). Not for "U.S. person", not for clearance, not for work authorization.
- us_person_required: true for "U.S. person" under ITAR/EAR, or language listing citizens, permanent residents, refugees, and asylees together as eligible. If the JD names ITAR/export control without saying who qualifies, use "ambiguous".
- sponsorship_now_unavailable: true when the employer will not sponsor a visa or requires authorization without sponsorship now ("unable to sponsor", "must be authorized to work in the U.S. without sponsorship").
- sponsorship_future_unavailable: true only when the JD also rules out future sponsorship ("now or in the future").
- clearance: required "active" only when an active/current clearance is needed to apply or start; "ability_to_obtain" for "must be able to obtain"; "preferred" for preferred. level is "secret", "top_secret", "ts_sci", or null if no level is named (TS/SCI with or without polygraph is "ts_sci").
- locations, employment_type, season, role_family: describe the job. Use null or empty when not stated. role_family: "swe" software engineering, "ml" ML/AI, "fullstack", "data" data science/analytics/engineering, "quant" quant dev/research/trading, "other" anything else.

Return only JSON matching the schema.`;

export function userMessage(jdText: string): string {
  return `<job_description>\n${jdText}\n</job_description>`;
}

// Sent after a response that failed validation; the one retry the spec allows.
export function retryMessage(errors: string[]): string {
  return `Your JSON failed validation:\n${errors.map((e) => `- ${e}`).join("\n")}\nReturn the corrected JSON for the same job description.`;
}
