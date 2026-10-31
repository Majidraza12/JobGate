"use client";

import { useActionState, useState } from "react";
import type { ProfileRow } from "@/lib/profile";
import { saveProfile, type ProfileState } from "./actions";

const input = "mt-2 h-10 w-full rounded-control border border-line bg-surface px-3";

function Section({ title, why, children }: { title: string; why: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-line py-8 md:grid-cols-[minmax(0,400px)_minmax(0,1fr)] md:gap-10">
      <div className="pt-1">
        <h2 className="text-[16px] font-medium">{title}</h2>
        <p className="mt-1 text-muted">{why}</p>
      </div>
      <div className="rounded-[16px] bg-[#fafafa] p-4 md:p-5">{children}</div>
    </section>
  );
}

function YesNo({ name, label, value, onChange, disabled, note }: { name: string; label: string; value: boolean; onChange?: (v: boolean) => void; disabled?: boolean; note?: string }) {
  return (
    <fieldset className="mt-4 first:mt-0" disabled={disabled}>
      <legend className="text-[14px] font-medium">{label}</legend>
      <div className="mt-2 flex gap-2">
        {[true, false].map((v) => (
          <label
            key={String(v)}
            className={`flex h-9 cursor-pointer items-center rounded-control border px-4 text-[14px] ${value === v ? "border-ink bg-surface font-medium" : "border-line bg-surface text-muted"} ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
          >
            <input type="radio" name={name} value={v ? "yes" : "no"} checked={value === v} onChange={() => onChange?.(v)} className="sr-only" />
            {v ? "Yes" : "No"}
          </label>
        ))}
      </div>
      {note && <p className="mt-1.5 text-[12px] text-muted">{note}</p>}
    </fieldset>
  );
}

export function ProfileForm({ profile }: { profile: ProfileRow | null }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(saveProfile, { error: null });
  const [citizen, setCitizen] = useState(profile?.us_citizen ?? false);
  const [pr, setPr] = useState(profile?.permanent_resident ?? false);
  const [authNow, setAuthNow] = useState(profile?.authorized_now_without_sponsorship ?? true);
  const [future, setFuture] = useState(profile?.needs_sponsorship_future ?? false);
  const citizenOrPr = citizen || pr;
  const clearance = profile ? (profile.clearance_status === "active" ? `active:${profile.clearance_level}` : profile.clearance_status) : "none";
  const jobTypes = profile?.job_types ?? ["internship", "co-op", "new_grad"];

  return (
    <form action={action} className="mt-6">
      <Section title="Graduation" why="Internships often limit who can apply by graduation date. A bachelor's student is never matched against a master's-only window.">
        <label className="block text-[14px] font-medium" htmlFor="grad_month">
          Graduation month
        </label>
        <input id="grad_month" name="grad_month" type="month" required defaultValue={profile?.grad_month ?? ""} className={input} />
        <label className="mt-4 block text-[14px] font-medium" htmlFor="degree">
          Degree you're pursuing
        </label>
        <select id="degree" name="degree" defaultValue={profile?.degree ?? "bs"} className={input}>
          <option value="bs">Bachelor's</option>
          <option value="ms">Master's</option>
          <option value="phd">PhD</option>
        </select>
      </Section>

      <Section
        title="Work authorization"
        why="Asked separately because the rules differ: a permanent resident counts as a U.S. person under ITAR but isn't a citizen, and is never affected by no-sponsorship language. Never shown to anyone else."
      >
        <YesNo name="us_citizen" label="Are you a U.S. citizen?" value={citizen} onChange={setCitizen} />
        <YesNo name="permanent_resident" label="Are you a permanent resident (green card)?" value={pr} onChange={setPr} />
        <YesNo
          name="authorized_now_without_sponsorship"
          label="Can you work in the U.S. now without sponsorship?"
          value={citizenOrPr || authNow}
          onChange={setAuthNow}
          disabled={citizenOrPr}
          note={citizenOrPr ? "Yes for citizens and permanent residents." : "Yes for most F-1 students on OPT or CPT."}
        />
        <YesNo
          name="needs_sponsorship_future"
          label="Will you need visa sponsorship later (for example H-1B)?"
          value={citizenOrPr ? false : future}
          onChange={setFuture}
          disabled={citizenOrPr}
          note={citizenOrPr ? "Not needed for citizens and permanent residents." : undefined}
        />
        {/* Disabled fieldsets don't submit, so send the derived values explicitly. */}
        {citizenOrPr && (
          <>
            <input type="hidden" name="authorized_now_without_sponsorship" value="yes" />
            <input type="hidden" name="needs_sponsorship_future" value="no" />
          </>
        )}
      </Section>

      <Section title="Security clearance" why="Only an explicit active clearance requirement at a stated level can mark a job Not eligible. Ability to obtain one becomes Check.">
        <label className="block text-[14px] font-medium" htmlFor="clearance">
          Clearance
        </label>
        <select id="clearance" name="clearance" defaultValue={clearance} className={input}>
          <option value="none">None</option>
          <option value="prefer_not_to_say">Prefer not to say</option>
          <option value="active:secret">Active Secret</option>
          <option value="active:top_secret">Active Top Secret</option>
          <option value="active:ts_sci">Active TS/SCI</option>
        </select>
      </Section>

      <Section title="What you're looking for" why="Filters for your feed. These never change a verdict, only which postings you see first.">
        <fieldset>
          <legend className="text-[14px] font-medium">Job types</legend>
          <div className="mt-2 flex flex-wrap gap-4">
            {[
              ["internship", "Internships"],
              ["co-op", "Co-ops"],
              ["new_grad", "New grad full-time"],
            ].map(([v, l]) => (
              <label key={v} className="flex items-center gap-2 text-[14px]">
                <input type="checkbox" name="job_types" value={v} defaultChecked={jobTypes.includes(v!)} className="size-4 accent-ink" />
                {l}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="mt-4 block text-[14px] font-medium" htmlFor="starts">
          Start terms you can do
        </label>
        <input id="starts" name="starts" defaultValue={(profile?.starts ?? ["Summer 2027"]).join(", ")} aria-describedby="starts-note" className={input} />
        <p id="starts-note" className="mt-1.5 text-[12px] text-muted">
          Separate with commas, for example Summer 2027, Fall 2027.
        </p>
        <label className="mt-4 block text-[14px] font-medium" htmlFor="locations">
          Cities
        </label>
        <input id="locations" name="locations" defaultValue={(profile?.locations ?? []).join(", ")} placeholder="Chicago, New York" className={input} />
        <label className="mt-4 flex items-center gap-2 text-[14px]">
          <input type="checkbox" name="remote_ok" defaultChecked={profile?.remote_ok ?? true} className="size-4 accent-ink" />
          Remote is fine
        </label>
      </Section>

      <div className="flex items-center justify-end gap-4 border-t border-line pt-6">
        {state.error && <p className="text-[13px] text-bad-ink">{state.error}</p>}
        <button disabled={pending} className="h-10 rounded-control bg-ink px-5 font-medium text-white hover:bg-ink/85 disabled:opacity-60">
          {pending ? "Saving…" : profile ? "Save profile" : "Save and see my feed"}
        </button>
      </div>
    </form>
  );
}
