# JobGate

JobGate tells a student whether they are actually eligible for an internship or new-grad posting. It reads each job description, extracts the eligibility rules (graduation window, return to school, class year, degree level, work authorization), checks them against the student's profile, and shows the exact sentence from the posting behind every verdict.

## Why

Eligibility rules are buried in posting text: "graduating between December 2027 and June 2028", "must be returning to school after the internship", "must be a U.S. person as defined by ITAR", "no visa sponsorship now or in the future". A student graduating in May 2027 is ineligible for most Summer 2027 internships, but only finds out after opening each posting. Job aggregators already collect listings well. None of them reason about eligibility for a specific person.

## How it works

**Extraction is user-independent; matching is user-specific.**

```
Sources (zshah101 internships API, Simplify new-grad list)
  -> ingest, identity, dedupe
  -> fetch the JD from the employer's ATS (public JSON APIs)
  -> LLM extracts requirements into a fixed schema, with verbatim quotes
  -> validate: Zod schema + every quote must be an exact substring of the JD
  -> Postgres (shared by every user)

Next.js app, per request:
  match(requirements, profile) -> per-requirement rows + verdict
```

- The LLM runs once per job description, and results are cached by the SHA-256 of the JD text, the prompt version, and the model. LLM cost scales with the number of postings, not the number of users.
- Matching is pure TypeScript: deterministic, free, and unit-tested.

### Verdicts

| Verdict | Meaning |
|---|---|
| Not eligible | The posting states a hard requirement you fail, backed by a verified quote |
| Not checked | The posting couldn't be fetched or read |
| Check | Something is ambiguous, preferred, or conditional and can't be resolved for you |
| Eligible | You meet every requirement this posting states that JobGate evaluated |
| No restrictions found | The posting doesn't state any of the gates JobGate checks |

Precedence: Not eligible > Not checked > Check > Eligible / No restrictions found. Wrongly hiding a job you could apply to is treated as the worst error, so Not eligible needs a verified quote and a hard requirement; anything less certain becomes Check. "Eligible" never means the employer guarantees eligibility.

"Not mentioned in the posting" and "couldn't read it" are stored and displayed differently.

### Work authorization

Most tools reduce this to one "citizens only" flag. JobGate models each dimension separately:

- **Citizenship required:** fails only non-citizens.
- **U.S. person (ITAR/EAR):** a permanent resident satisfies it; a citizen-only rule they do not.
- **No sponsorship now / in the future:** checked against whether you need sponsorship now or later. A permanent resident is never marked ineligible by sponsorship language.
- **Security clearance:** never hides a job by itself unless an active clearance at a stated level is required. "Ability to obtain" or "preferred" becomes Check.

### Graduation windows

Windows can depend on degree ("BS graduating Dec 2026 to Jun 2027, MS graduating ...") and on start term. A bachelor's student is never matched against a master's-only window. If no window applies to you, the result is Check, never Not eligible.

## Evaluation

60 job descriptions hand-labeled (30 random, 30 pre-selected by gate keywords), scored per field with precision and recall per stratum, quote-verification failure rate, cost, and latency, against a regex baseline (the sponsorship classifier from zshah101's list).

| | Result |
|---|---|
| Valid outputs by prompt version | v2 39/60, v3 56/60, v4 60/60 |
| Fields failing quote verification (v4) | about 1% (n=167) |
| Any work-auth restriction, model vs regex | precision 100% vs 88%, recall 100% vs 70% (n=10) |
| Mean cost per JD (Haiku 4.5, v4) | $0.0098 |
| p50 latency (Haiku 4.5, v4) | 6.1 s |

**These are dev-set numbers.** The prompt was tuned on these same 60 JDs. A fresh held-out labeled set is needed before they say anything about generalization.

## Data and fetching

- **Sources:** [zshah101's internship list](https://github.com/zshah101/Automated-List-Of-Summer-2027-and-Fall-2026-Tech-Internships) (MIT) for internships and [SimplifyJobs New-Grad-Positions](https://github.com/SimplifyJobs/New-Grad-Positions) for new grad, used for discovery only (company, title, location, date, apply link). Region: US and remote-US.
- **Identity:** ATS requisition ID namespaced by ATS and tenant (for example `greenhouse:stripe:123`), else the normalized apply URL. Postings are never merged on similarity, because employers open identical requisitions on purpose; lookalikes are flagged as possible duplicates.
- **JD fetchers:** Greenhouse, Lever, Ashby, Oracle HCM, Workday, SmartRecruiters. robots.txt is respected, requests to a host are spaced out and retried with backoff, and one honest User-Agent is used. No proxies, user-agent rotation, or headless browsers. Blocked tenants become Not checked.
- **Fetch success on the first full run (2026-10-28):** Greenhouse 97%, Lever 95%, SmartRecruiters 94%, Ashby 93%, Oracle 85%, Workday 78%.
- **Generic career pages are not scraped.** A smoke test showed scraped pages silently returning a careers landing page instead of the JD, which would produce false "No restrictions found" verdicts. About 21% of listings are unsupported for that reason and show as Not checked.
- A GitHub Actions workflow runs ingest and JD fetching every 2 hours.

## Stack

Next.js 15 (App Router), TypeScript, Tailwind, Supabase (Postgres, Auth, row-level security), GitHub Actions, Claude, Zod, Vitest, jsdom with Mozilla Readability.

Row-level security: users read and write only their own profile, applications, saved jobs, and feedback. Tables get explicit per-role grants, and the RLS tests run as the real database roles. Work-authorization answers are never logged.

## Running it

Requires Node 22+ and Docker (for local Supabase).

```bash
npm ci
cp .env.example .env        # fill in Supabase values
npm run db:start            # local Supabase
npm run ingest              # pull listings
npm run fetch-jds           # fetch job descriptions
npm run extract -- --dry-run
npm test
npm run dev                 # http://localhost:3000
```

## Status

Working: ingestion, JD fetching, extraction, eval harness, matching engine, and the app (auth, onboarding, feed with server-side filters, listing detail with quotes, applied tracker, saved jobs, "Wrong verdict?" feedback).

Not done yet: public deployment, a held-out eval set, a verdict-level eval (wrongful-hide rate over synthetic profiles), pipeline run log, stale-data banner, password reset, Google sign-in.

## Credits

Internship listings from [zshah101/Automated-List-Of-Summer-2027-and-Fall-2026-Tech-Internships](https://github.com/zshah101/Automated-List-Of-Summer-2027-and-Fall-2026-Tech-Internships) (MIT). New-grad listings discovered through [SimplifyJobs/New-Grad-Positions](https://github.com/SimplifyJobs/New-Grad-Positions).
