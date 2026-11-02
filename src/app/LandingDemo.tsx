"use client";

import { useState } from "react";
import { match, type JobType, type StoredRequirements } from "@core/match";
import type { EligibilityProfile } from "@core/profile";
import type { StoredExtraction } from "@core/requirements";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { Quote } from "@/components/Quote";
import { FIELD_NAMES, VERDICTS, VERDICT_STYLE } from "@/lib/labels";
import postings from "./demoPostings.json";

// Four real postings with their stored v4 readings, matched in the browser by
// the same match() the app uses. No API calls: changing the profile only
// re-runs pure TypeScript.

const GRADS = [
  { value: "2026-12", label: "Dec 2026" },
  { value: "2027-05", label: "May 2027" },
  { value: "2028-05", label: "May 2028" },
];

const STATUSES = {
  citizen: { label: "U.S. citizen", p: { us_citizen: true, permanent_resident: false, authorized_now_without_sponsorship: true, needs_sponsorship_future: false } },
  green: { label: "Green card", p: { us_citizen: false, permanent_resident: true, authorized_now_without_sponsorship: true, needs_sponsorship_future: false } },
  f1: { label: "F-1 student", p: { us_citizen: false, permanent_resident: false, authorized_now_without_sponsorship: true, needs_sponsorship_future: true } },
} as const;

type Status = keyof typeof STATUSES;

const jobTypeOf = (t: string): JobType => (t === "new_grad" ? "full-time" : (t as JobType));

function Toggle<T extends string>({ options, value, onChange, label }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1 rounded-[14px] border-2 border-line bg-surface p-1">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`h-9 rounded-[10px] px-3.5 text-[14px] font-semibold active:scale-95 ${value === o.value ? "bg-mint text-ground" : "text-muted hover:text-ink"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function LandingDemo() {
  const [grad, setGrad] = useState("2027-05");
  const [status, setStatus] = useState<Status>("citizen");
  const profile: EligibilityProfile = { grad_month: grad, degree: "bs", clearance: { status: "none" }, starts: ["Summer 2027"], ...STATUSES[status].p };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <span className="text-[14px] font-semibold text-muted">I graduate</span>
        <Toggle label="Graduation" options={GRADS} value={grad} onChange={setGrad} />
        <span className="text-[14px] font-semibold text-muted sm:ml-2">and I'm a</span>
        <Toggle label="Work authorization" options={Object.entries(STATUSES).map(([value, s]) => ({ value: value as Status, label: s.label }))} value={status} onChange={setStatus} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {postings.map((x) => {
          const req: StoredRequirements = { extraction_status: "ok", extracted: x.extracted as unknown as StoredExtraction };
          const { verdict, rows } = match(req, profile, jobTypeOf(x.jobType));
          const decider = ["conflict", "unclear", "satisfied"].map((s) => rows.find((r) => r.status === s && r.evidence.length)).find(Boolean);
          const st = VERDICT_STYLE[verdict];
          return (
            <article key={x.title} className={`flex flex-col gap-3 rounded-[20px] border-2 bg-surface p-4 transition-[border-color,box-shadow] duration-200 ${st.ring} shadow-[5px_5px_0_var(--color-line)]`}>
              <div className="flex items-center gap-3">
                <CompanyAvatar company={x.company} size={38} />
                <div className="min-w-0 flex-1 leading-5">
                  <p className="truncate text-[14px] font-semibold">{x.company}</p>
                  <p className="truncate text-[12.5px] text-muted">
                    {x.location} · {x.jobType === "new_grad" ? "New grad" : "Internship"}
                  </p>
                </div>
                <span key={verdict} className={`flex-none rotate-3 rounded-[8px] px-2 py-1 font-mono text-[11px] font-bold uppercase tracking-wide motion-safe:animate-[stamp_250ms_ease-out] ${VERDICTS[verdict].badge}`}>
                  {VERDICTS[verdict].short}
                </span>
              </div>
              <h3 className="line-clamp-2 font-display text-[18px] font-bold leading-[1.2]">{x.title}</h3>
              {decider && (
                <div className="rounded-[12px] bg-sunken px-3 py-2.5 text-[13px] leading-[1.45] text-ink/85">
                  <p className="mb-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted">{FIELD_NAMES[decider.field]}</p>
                  <p className="line-clamp-3">
                    <Quote text={decider.evidence[0]!} field={decider.field} mark={st.mark} />
                  </p>
                  <p className={`mt-2 text-[12.5px] font-semibold ${st.text}`}>{decider.explanation}</p>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
