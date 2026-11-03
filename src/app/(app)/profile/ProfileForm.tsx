"use client";

import { useActionState, useState } from "react";
import { CityPicker, type CityOption } from "@/components/CityPicker";
import { MonthPicker } from "@/components/MonthPicker";
import { START_TERMS } from "@core/profile";
import type { ProfileRow } from "@/lib/profile";
import { saveProfile, type ProfileState } from "./actions";

const input = "mt-2 h-11 w-full rounded-[12px] border-2 border-line bg-sunken px-3 font-medium hover:border-control";

function Section({ title, why, children }: { title: string; why: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 py-6 md:grid-cols-[minmax(0,360px)_minmax(0,1fr)] md:gap-10">
      <div className="pt-1">
        <h2 className="font-display text-[22px] font-bold">{title}</h2>
        <p className="mt-1 text-muted">{why}</p>
      </div>
      <div className="rounded-[20px] border-2 border-line bg-surface p-4 md:p-6">{children}</div>
    </section>
  );
}

function YesNo({ name, label, value, onChange, note }: { name: string; label: string; value: boolean; onChange: (v: boolean) => void; note?: string }) {
  return (
    <fieldset className="mt-5 first:mt-0">
      <legend className="text-[14px] font-medium">{label}</legend>
      <div className="mt-2 flex gap-2">
        {[true, false].map((v) => (
          <label
            key={String(v)}
            className={`flex h-10 items-center rounded-[12px] border-2 px-5 text-[14px] font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-text ${value === v ? "border-mint bg-mint text-ground" : "border-line bg-sunken text-muted hover:border-lav hover:text-ink"}`}
          >
            <input type="radio" name={name} value={v ? "yes" : "no"} checked={value === v} onChange={() => onChange(v)} className="sr-only" />
            {v ? "Yes" : "No"}
          </label>
        ))}
      </div>
      {note && <p className="mt-1.5 text-[12px] text-muted">{note}</p>}
    </fieldset>
  );
}

// What an earlier answer settles, said once instead of asked again.
function Settled({ children }: { children: React.ReactNode }) {
  return <p className="mt-5 rounded-[12px] border-2 border-dashed border-line px-3 py-2.5 text-[13px] text-muted">{children}</p>;
}

export function ProfileForm({ profile, cityOptions }: { profile: ProfileRow | null; cityOptions: CityOption[] }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(saveProfile, { error: null });
  const [degree, setDegree] = useState(profile?.degree ?? "bs");
  const [citizen, setCitizen] = useState(profile?.us_citizen ?? false);
  const [pr, setPr] = useState(profile?.permanent_resident ?? false);
  const [authNow, setAuthNow] = useState(profile?.authorized_now_without_sponsorship ?? true);
  const [future, setFuture] = useState(profile?.needs_sponsorship_future ?? false);
  const clearance = profile ? (profile.clearance_status === "active" ? `active:${profile.clearance_level}` : profile.clearance_status) : "none";
  const jobTypes = profile?.job_types ?? ["internship", "co-op", "new_grad"];

  return (
    <form action={action} className="mt-6">
      <Section title="Graduation" why="Internships often limit who can apply by graduation date. A bachelor's student is never matched against a master's-only window.">
        <label className="block text-[14px] font-medium" htmlFor="degree">
          Degree
        </label>
        <select id="degree" name="degree" value={degree} onChange={(e) => setDegree(e.target.value as typeof degree)} className={input}>
          <option value="bs">Bachelor's</option>
          <option value="ms">Master's</option>
          <option value="phd">PhD</option>
          <option value="none">No degree / not in school</option>
        </select>
        {degree === "none" ? (
          <Settled>
            No graduation month needed. Postings that limit by graduation date or class year show as Check, and postings that require a degree show as Not
            eligible, with the quote.
          </Settled>
        ) : (
          <>
            <label className="mt-5 block text-[14px] font-medium" htmlFor="grad_month">
              Graduation month
            </label>
            <MonthPicker id="grad_month" name="grad_month" defaultValue={profile?.grad_month} />
            <p className="mt-1.5 text-[12px] text-muted">Already graduated? Pick the month you did.</p>
          </>
        )}
      </Section>

      <Section
        title="Work authorization"
        why="Asked separately because the rules differ: a permanent resident counts as a U.S. person under ITAR but isn't a citizen, and is never affected by no-sponsorship language. Never shown to anyone else."
      >
        {/* Each answer can settle the ones after it, and settled questions aren't
            asked. The server derives the same values (actions.ts). */}
        <YesNo name="us_citizen" label="Are you a U.S. citizen?" value={citizen} onChange={setCitizen} />
        {citizen ? (
          <Settled>As a citizen you can work without sponsorship and won&apos;t need it later. Nothing else to answer here.</Settled>
        ) : (
          <>
            <YesNo name="permanent_resident" label="Are you a permanent resident (green card)?" value={pr} onChange={setPr} />
            {pr ? (
              <Settled>As a permanent resident you can work without sponsorship and won&apos;t need it later.</Settled>
            ) : (
              <>
                <YesNo
                  name="authorized_now_without_sponsorship"
                  label="Can you work in the U.S. now without sponsorship?"
                  value={authNow}
                  onChange={setAuthNow}
                  note="Yes for most F-1 students on OPT or CPT."
                />
                <YesNo name="needs_sponsorship_future" label="Will you need visa sponsorship later (for example H-1B)?" value={future} onChange={setFuture} />
              </>
            )}
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
                <input type="checkbox" name="job_types" value={v} defaultChecked={jobTypes.includes(v!)} className="size-4 accent-mint" />
                {l}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="mt-4">
          <legend className="text-[14px] font-medium">Start terms you can do</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {START_TERMS.map((t) => (
              <label
                key={t}
                className="flex h-9 cursor-pointer items-center rounded-full border-2 border-line bg-surface px-3.5 text-[13px] font-semibold text-muted transition-colors hover:border-lav hover:text-ink active:scale-95 has-[:checked]:border-lav has-[:checked]:bg-lav has-[:checked]:text-ground has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-lav"
              >
                <input type="checkbox" name="starts" value={t} defaultChecked={(profile?.starts ?? ["Summer 2027"]).includes(t)} className="sr-only" />
                {t}
              </label>
            ))}
          </div>
        </fieldset>
        <p className="mt-5 text-[14px] font-medium">Cities</p>
        <CityPicker name="locations" options={cityOptions} defaultValue={profile?.locations ?? []} />
        <label className="mt-4 flex items-center gap-2 text-[14px]">
          <input type="checkbox" name="remote_ok" defaultChecked={profile?.remote_ok ?? true} className="size-4 accent-mint" />
          Remote is fine
        </label>
      </Section>

      <div className="flex items-center justify-end gap-4 pt-4">
        {state.error && <p className="text-[13px] text-bad-ink">{state.error}</p>}
        <button disabled={pending} className="h-12 rounded-[14px] bg-brand px-6 font-bold text-on-brand shadow-[5px_5px_0_var(--color-mint)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[7px_7px_0_var(--color-mint)] active:translate-x-0 active:translate-y-0 active:shadow-none disabled:opacity-60">
          {pending ? "Saving…" : profile ? "Save profile" : "Save and see my feed"}
        </button>
      </div>
    </form>
  );
}
