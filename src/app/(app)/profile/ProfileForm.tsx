"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import type { Verdict } from "@core/match";
import { START_TERMS } from "@core/profile";
import { CityPicker, type CityOption } from "@/components/CityPicker";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { Icon, type IconName } from "@/components/Icon";
import { MonthPicker } from "@/components/MonthPicker";
import { SaveButton } from "@/components/SaveButton";
import { BUTTON, TowerArt } from "@/components/ui";
import { JOB_TYPES, VERDICTS, VERDICT_ORDER, VERDICT_STYLE } from "@/lib/labels";
import type { ProfileRow } from "@/lib/profile";
import { saveProfile, type ProfileState } from "./actions";

export type Recommended = { id: number; company: string; title: string; location: string | null; jobType: string; saved: boolean };

type SectionId = "education" | "auth" | "clearance" | "starts" | "prefs";
const ALL: SectionId[] = ["education", "auth", "clearance", "starts", "prefs"];

const DEGREES = { bs: "Bachelor's", ms: "Master's", phd: "PhD", none: "No degree / not in school" } as const;
const CLEARANCE: Record<string, string> = {
  none: "None",
  prefer_not_to_say: "Prefer not to say",
  "active:secret": "Active Secret",
  "active:top_secret": "Active Top Secret",
  "active:ts_sci": "Active TS/SCI",
};
const LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const monthLabel = (m: string | null) => (m ? `${LONG[Number(m.slice(5)) - 1]} ${m.slice(0, 4)}` : null);

const control = "mt-2 h-11 w-full rounded-[12px] border border-white/10 bg-black/25 px-3 font-medium outline-none hover:border-white/20 focus:border-lavender/60";

function YesNo({ name, label, value, onChange, note }: { name: string; label: string; value: boolean; onChange: (v: boolean) => void; note?: string }) {
  return (
    <fieldset className="mt-5 first:mt-0">
      <legend className="text-[14px] font-medium text-soft">{label}</legend>
      <div className="mt-2 flex gap-2">
        {[true, false].map((v) => (
          <label
            key={String(v)}
            className={`flex h-10 items-center rounded-full border px-5 text-[14px] font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-lavender ${
              value === v ? "border-lavender/70 bg-[#1d1638] text-ink shadow-[0_6px_24px_-10px_rgb(102_49_251/0.7)]" : "border-white/10 bg-white/[0.02] text-soft hover:border-white/20 hover:text-ink"
            }`}
          >
            <input type="radio" name={name} value={v ? "yes" : "no"} checked={value === v} onChange={() => onChange(v)} className="sr-only" />
            {v ? "Yes" : "No"}
          </label>
        ))}
      </div>
      {note && <p className="mt-1.5 text-[12.5px] text-muted">{note}</p>}
    </fieldset>
  );
}

// What an earlier answer settles, said once instead of asked again.
function Settled({ children }: { children: React.ReactNode }) {
  return <p className="mt-5 rounded-[12px] border border-dashed border-white/15 px-3.5 py-2.5 text-[13.5px] text-soft">{children}</p>;
}

function Chip({ children, tone = "" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`inline-flex h-8 items-center rounded-full bg-white/[0.06] px-3.5 text-[13.5px] text-ink ring-1 ring-inset ring-white/[0.08] ${tone}`}>{children}</span>;
}

// One row of the profile, as in the reference: icon, title and why on the
// left, the saved answer in the middle, Edit on the right. Its inputs are
// always in the form (hidden when closed), so one Save sends every section.
function Section({
  id,
  icon,
  title,
  why,
  summary,
  open,
  onToggle,
  children,
}: {
  id: SectionId;
  icon: IconName;
  title: string;
  why: string;
  summary: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={`${open ? "glow" : "glass"} scroll-mt-6 rounded-[16px] transition-[background,border-color,box-shadow] duration-200`}>
      <div className="grid gap-4 p-5 md:grid-cols-[250px_minmax(0,1fr)_auto] md:items-center md:gap-6 md:px-7">
        <div className="flex gap-4">
          <Icon name={icon} size={26} className="mt-0.5 text-lavender" />
          <div>
            <h2 className="text-[17px] font-semibold">{title}</h2>
            <p className="mt-0.5 text-[13px] leading-[1.45] text-soft">{why}</p>
          </div>
        </div>
        <div className={`min-w-0 md:border-l md:border-white/[0.07] md:pl-6 ${open ? "hidden" : ""}`}>{summary}</div>
        <div className={`min-w-0 md:border-l md:border-white/[0.07] md:pl-6 ${open ? "animate-fade" : "hidden"}`}>{children}</div>
        <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={id} className={`${BUTTON.ghost} h-9 justify-self-start px-4 text-[14px] md:justify-self-end`}>
          <Icon name={open ? "x" : "edit"} size={15} />
          {open ? "Close" : "Edit"}
        </button>
      </div>
    </section>
  );
}

function Ring({ pct }: { pct: number }) {
  const r = 40;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative size-[96px] flex-none">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#d9ccff" />
            <stop offset="1" stopColor="#7b55f5" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="7" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="url(#ring)" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${(pct / 100) * c} ${c}`} className="drop-shadow-[0_0_8px_rgb(140_100_255/0.6)]" />
      </svg>
      <span className="num absolute inset-0 grid place-items-center text-[19px] font-semibold">{pct}%</span>
    </div>
  );
}

export function ProfileForm({
  profile,
  email,
  counts,
  recommended,
  cityOptions,
}: {
  profile: ProfileRow | null;
  email: string;
  counts: Record<Verdict, number> | null;
  recommended: Recommended[];
  cityOptions: CityOption[];
}) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(saveProfile, { error: null });
  const [degree, setDegree] = useState(profile?.degree ?? "bs");
  const [citizen, setCitizen] = useState(profile?.us_citizen ?? false);
  const [pr, setPr] = useState(profile?.permanent_resident ?? false);
  const [authNow, setAuthNow] = useState(profile?.authorized_now_without_sponsorship ?? true);
  const [future, setFuture] = useState(profile?.needs_sponsorship_future ?? false);
  // A new profile opens every section; an existing one opens none.
  const [open, setOpen] = useState<Set<SectionId>>(() => new Set(profile ? [] : ALL));
  const clearance = profile ? (profile.clearance_status === "active" ? `active:${profile.clearance_level}` : profile.clearance_status) : "none";
  const jobTypes = profile?.job_types ?? ["internship", "co-op", "new_grad"];

  // A save on this page closes the editors; the summaries show the new values.
  useEffect(() => {
    if (state.savedAt) setOpen(new Set());
  }, [state.savedAt]);

  const toggle = (id: SectionId) => setOpen((s) => (s.has(id) ? new Set([...s].filter((x) => x !== id)) : new Set([...s, id])));
  const edit = (id: SectionId) => {
    setOpen((s) => new Set([...s, id]));
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const p = profile;
  const grad = p ? (p.degree === "none" ? "Not in school" : `Graduating ${monthLabel(p.grad_month)}`) : null;
  const checks: { id: SectionId; label: string; done: boolean }[] = [
    { id: "education", label: "Set your degree and graduation month", done: Boolean(p && (p.degree === "none" || p.grad_month)) },
    { id: "auth", label: "Answer the work authorization questions", done: Boolean(p) },
    { id: "starts", label: "Pick the start terms you can do", done: Boolean(p && p.starts.length) },
    { id: "prefs", label: "Add cities you'd work in", done: Boolean(p && (p.locations.length || p.remote_ok)) },
    { id: "prefs", label: "Choose your job types", done: Boolean(p && p.job_types.length) },
  ];
  const pct = Math.round((checks.filter((c) => c.done).length / checks.length) * 100);
  const name = email.split("@")[0] || "You";

  const authChips = !p
    ? []
    : p.us_citizen
      ? ["U.S. citizen"]
      : p.permanent_resident
        ? ["Permanent resident"]
        : [p.authorized_now_without_sponsorship ? "Authorized to work now" : "Needs sponsorship now", p.needs_sponsorship_future ? "Needs sponsorship later" : "No sponsorship needed later"];

  return (
    <div className="mx-auto max-w-[1500px] pt-6 sm:pt-7">
      <h1 className="text-[36px] font-bold leading-[1.1] tracking-[-0.03em] sm:text-[40px]">{p ? "Your Profile" : "Set up your profile"}</h1>
      <p className="mt-1.5 text-[16px] text-soft sm:text-[17px]">
        {p ? "Every verdict in your feed is computed from these answers. Change one and the feed updates." : "Answer these once. Every verdict in your feed is computed from them."}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_416px]">
        <form action={action} className="flex min-w-0 flex-col gap-3">
          {p && <input type="hidden" name="stay" value="1" />}

          {/* Overview */}
          <section className="glow relative overflow-hidden rounded-[18px] p-6 sm:px-6 sm:py-7">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-6">
                <span className="grid size-[110px] flex-none place-items-center rounded-full bg-[conic-gradient(from_200deg,#d9ccff,#7b55f5,#2b1866,#d9ccff)] p-[3px] shadow-[0_0_40px_-6px_rgb(102_49_251/0.7)] sm:size-[130px]">
                  <span className="grid size-full place-items-center rounded-full bg-[radial-gradient(120%_120%_at_30%_0%,#2a1d55,#0d0b16_65%)] text-[44px] font-bold text-lavender-hi">
                    {name.slice(0, 1).toUpperCase()}
                  </span>
                </span>
                <div className="min-w-0">
                  <p className="flex items-center gap-2.5 truncate text-[26px] font-semibold tracking-[-0.02em] sm:text-[30px]">
                    <span className="truncate">{name}</span>
                    {p && <Icon name="shieldCheck" size={24} className="flex-none fill-lavender/25 text-lavender" label="Profile set" />}
                  </p>
                  <p className="mt-0.5 text-[17px] text-soft">{p ? `${DEGREES[p.degree]}${p.degree === "none" ? "" : " student"}` : "New profile"}</p>
                  {p && (
                    <p className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px] text-soft">
                      {p.locations[0] && (
                        <span className="flex items-center gap-2">
                          <Icon name="pin" size={16} className="text-muted" />
                          {p.locations[0]}
                          {p.locations.length > 1 ? ` +${p.locations.length - 1}` : ""}
                        </span>
                      )}
                      {grad && (
                        <span className="flex items-center gap-2">
                          <Icon name="graduation" size={16} className="text-muted" />
                          {grad}
                        </span>
                      )}
                      <span className="inline-flex h-7 items-center gap-2 rounded-full bg-mint/10 px-3 text-[13px] font-medium text-mint ring-1 ring-inset ring-mint/20">
                        <span className="size-2 rounded-full bg-mint" />
                        Feed is live
                      </span>
                    </p>
                  )}
                  <p className="mt-3 max-w-[48ch] text-[14px] leading-[1.5] text-soft">{email}</p>
                </div>
              </div>

              <div className="flex items-center gap-5 lg:border-l lg:border-white/[0.08] lg:pl-7">
                <Ring pct={pct} />
                <div>
                  <p className="flex items-center gap-2 text-[18px] font-semibold">Profile Strength</p>
                  <p className="mt-0.5 text-[13.5px] text-soft">{pct === 100 ? "Complete. Every check can run." : "A few answers left for sharper verdicts."}</p>
                  <ul className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[12.5px] text-soft">
                    {["Education", "Work auth", "Starts", "Places", "Job types"].map((l, i) => (
                      <li key={l} className="flex items-center gap-1">
                        <Icon name="checkCircle" size={14} className={checks[i]!.done ? "fill-lavender/30 text-lavender" : "text-dim"} />
                        {l}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            {p && (
              <button type="button" onClick={() => setOpen(new Set(ALL))} className={`${BUTTON.primary} absolute right-5 top-5 hidden h-10 rounded-[11px] px-4 text-[14.5px] 2xl:inline-flex`}>
                <Icon name="edit" size={16} />
                Edit Profile
              </button>
            )}
          </section>

          <Section
            id="education"
            icon="graduation"
            title="Education"
            why="Internships often limit who can apply by graduation date."
            open={open.has("education")}
            onToggle={() => toggle("education")}
            summary={
              p && (
                <div className="flex items-center gap-4">
                  <span className="grid size-12 flex-none place-items-center rounded-[12px] bg-[#0c0b13] text-lavender ring-1 ring-inset ring-white/10">
                    <Icon name="graduation" size={24} />
                  </span>
                  <div>
                    <p className="text-[16px] font-semibold">{DEGREES[p.degree]}</p>
                    <p className="text-[14px] text-soft">{p.degree === "none" ? "Graduation windows and class years show as Check" : grad}</p>
                  </div>
                </div>
              )
            }
          >
            <label className="block text-[14px] font-medium text-soft" htmlFor="degree">
              Degree
            </label>
            <select id="degree" name="degree" value={degree} onChange={(e) => setDegree(e.target.value as typeof degree)} className={control}>
              <option value="bs">Bachelor&apos;s</option>
              <option value="ms">Master&apos;s</option>
              <option value="phd">PhD</option>
              <option value="none">No degree / not in school</option>
            </select>
            {degree === "none" ? (
              <Settled>
                No graduation month needed. Postings that limit by graduation date or class year show as Check, and postings that require a degree show as Not eligible,
                with the quote.
              </Settled>
            ) : (
              <>
                <label className="mt-5 block text-[14px] font-medium text-soft" htmlFor="grad_month">
                  Graduation month
                </label>
                <MonthPicker id="grad_month" name="grad_month" defaultValue={p?.grad_month} />
                <p className="mt-1.5 text-[12.5px] text-muted">Already graduated? Pick the month you did. A bachelor&apos;s student is never matched against a master&apos;s-only window.</p>
              </>
            )}
          </Section>

          <Section
            id="auth"
            icon="globe"
            title="Work Authorization"
            why="Private to you. Never shown to anyone else."
            open={open.has("auth")}
            onToggle={() => toggle("auth")}
            summary={
              <div className="flex flex-wrap gap-2">
                {authChips.map((c) => (
                  <Chip key={c}>{c}</Chip>
                ))}
              </div>
            }
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
                  <Settled>As a permanent resident you can work without sponsorship and won&apos;t need it later. You also count as a U.S. person under ITAR.</Settled>
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

          <Section
            id="clearance"
            icon="lock"
            title="Security Clearance"
            why="Only an active clearance requirement at a stated level can rule a job out."
            open={open.has("clearance")}
            onToggle={() => toggle("clearance")}
            summary={p && <Chip>{CLEARANCE[clearance]}</Chip>}
          >
            <label className="block text-[14px] font-medium text-soft" htmlFor="clearance-select">
              Clearance
            </label>
            <select id="clearance-select" name="clearance" defaultValue={clearance} className={control}>
              <option value="none">None</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
              <option value="active:secret">Active Secret</option>
              <option value="active:top_secret">Active Top Secret</option>
              <option value="active:ts_sci">Active TS/SCI</option>
            </select>
          </Section>

          <Section
            id="starts"
            icon="calendar"
            title="Start Terms"
            why="Used to pick which graduation window applies to you."
            open={open.has("starts")}
            onToggle={() => toggle("starts")}
            summary={
              <div className="flex flex-wrap gap-2">
                {p?.starts.length ? p.starts.map((t) => <Chip key={t}>{t}</Chip>) : <span className="text-[14px] text-muted">None picked yet</span>}
              </div>
            }
          >
            <fieldset>
              <legend className="text-[14px] font-medium text-soft">Start terms you can do</legend>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {START_TERMS.map((t) => (
                  <label
                    key={t}
                    className="flex h-9 items-center rounded-full border border-white/10 bg-white/[0.02] px-3.5 text-[13.5px] font-medium text-soft hover:border-white/20 hover:text-ink active:scale-95 has-[:checked]:border-lavender/70 has-[:checked]:bg-[#1d1638] has-[:checked]:text-ink has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-lavender"
                  >
                    <input type="checkbox" name="starts" value={t} defaultChecked={(p?.starts ?? ["Summer 2027"]).includes(t)} className="sr-only" />
                    {t}
                  </label>
                ))}
              </div>
            </fieldset>
          </Section>

          <Section
            id="prefs"
            icon="target"
            title="Job Preferences"
            why="Filters for your feed. These never change a verdict."
            open={open.has("prefs")}
            onToggle={() => toggle("prefs")}
            summary={
              p && (
                <dl className="grid gap-4 sm:grid-cols-3">
                  {(
                    [
                      ["briefcase", "Job types", p.job_types.map((t) => JOB_TYPES[t]).join(", ") || "None"],
                      ["pin", "Cities", p.locations.length ? `${p.locations.slice(0, 2).join(", ")}${p.locations.length > 2 ? ` +${p.locations.length - 2}` : ""}` : "Anywhere"],
                      ["globe", "Remote", p.remote_ok ? "Remote is fine" : "Not remote"],
                    ] as const
                  ).map(([icon, label, value]) => (
                    <div key={label} className="min-w-0">
                      <dt className="flex items-center gap-2 text-[13.5px] text-soft">
                        <Icon name={icon} size={16} />
                        {label}
                      </dt>
                      <dd className="mt-1 truncate text-[14.5px]">{value}</dd>
                    </div>
                  ))}
                </dl>
              )
            }
          >
            <fieldset>
              <legend className="text-[14px] font-medium text-soft">Job types</legend>
              <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-2">
                {(["internship", "co-op", "new_grad"] as const).map((v) => (
                  <label key={v} className="flex items-center gap-2.5 text-[14px]">
                    <input type="checkbox" name="job_types" value={v} defaultChecked={jobTypes.includes(v)} className="size-[18px] accent-[#a68bfa]" />
                    {v === "new_grad" ? "New grad full-time" : `${JOB_TYPES[v]}s`}
                  </label>
                ))}
              </div>
            </fieldset>
            <p className="mt-5 text-[14px] font-medium text-soft">Cities</p>
            <CityPicker name="locations" options={cityOptions} defaultValue={p?.locations ?? []} />
            <label className="mt-4 flex items-center gap-2.5 text-[14px]">
              <input type="checkbox" name="remote_ok" defaultChecked={p?.remote_ok ?? true} className="size-[18px] accent-[#a68bfa]" />
              Remote is fine
            </label>
          </Section>

          {(open.size > 0 || state.error) && (
            <div className="sticky bottom-4 z-20 mt-1 flex animate-rise border border-white/10 bg-[#15121f]/95 backdrop-blur-xl items-center justify-end gap-4 rounded-[16px] px-5 py-3.5 shadow-[0_20px_50px_-12px_rgb(0_0_0/0.9)]">
              {state.error && <p className="mr-auto text-[13.5px] text-bad-ink">{state.error}</p>}
              {p && (
                <button type="button" onClick={() => setOpen(new Set())} className="h-10 px-3 text-[14.5px] text-soft hover:text-ink">
                  Cancel
                </button>
              )}
              <button disabled={pending} className={`${BUTTON.primary} h-11 px-6 text-[15px]`}>
                {pending ? "Saving…" : p ? "Save changes" : "Save and see my feed"}
                {!pending && <Icon name="arrowRight" size={16} />}
              </button>
            </div>
          )}
        </form>

        {/* Right column */}
        <aside className="flex flex-col gap-[18px]">
          <section className="relative overflow-hidden rounded-[18px] border border-white/10 bg-[linear-gradient(160deg,#1c1530_0%,#130f20_55%,#100d19_100%)] p-6 shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]">
            <TowerArt className="absolute right-0 top-0 h-[190px] w-[170px]" />
            <div className="absolute -right-12 -top-12 size-44 rounded-full bg-brand/30 blur-3xl" aria-hidden="true" />
            <div className="relative">
              <h2 className="flex items-center gap-3 text-[20px] font-semibold">
                <Icon name="sparkles" size={24} className="text-lavender" />
                Suggested Improvements
              </h2>
              <p className="mt-1 text-[13.5px] text-soft">Each answer makes more checks possible.</p>
              <ul className="mt-4 flex flex-col gap-2.5">
                {checks.map((c, i) => (
                  <li key={i}>
                    <button type="button" disabled={c.done} onClick={() => edit(c.id)} className="flex w-full items-center gap-3 text-left text-[14.5px] disabled:cursor-default">
                      {c.done ? <Icon name="checkCircle" size={22} className="fill-mint/90 text-[#0a0911]" strokeWidth={2.2} /> : <span className="size-[22px] flex-none rounded-full border-2 border-white/30" />}
                      <span className={c.done ? "text-ink" : "text-soft"}>{c.label}</span>
                      {!c.done && <Icon name="chevronRight" size={15} className="text-muted" />}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="glass rounded-[18px] p-5">
            <div className="flex items-start gap-3.5">
              <Icon name="briefcase" size={26} className="mt-0.5 text-lavender" />
              <div>
                <h2 className="text-[20px] font-semibold">Recommended Jobs for You</h2>
                <p className="text-[13.5px] text-soft">The newest postings you&apos;re eligible for.</p>
              </div>
            </div>
            {recommended.length === 0 ? (
              <p className="mt-4 text-[14px] text-muted">{p ? "No eligible postings right now. Check back after the next update." : "Save your profile to see matches."}</p>
            ) : (
              <ul className="mt-3">
                {recommended.map((r) => (
                  <li key={r.id} className="flex items-center gap-3.5 border-b border-white/[0.06] py-3 last:border-0">
                    <CompanyAvatar company={r.company} size={44} />
                    <Link href={`/listing/${r.id}`} className="min-w-0 flex-1 hover:text-lavender-hi">
                      <span className="block truncate text-[15px] font-semibold">{r.title}</span>
                      <span className="block truncate text-[13px] text-soft">
                        {r.company} • {JOB_TYPES[r.jobType]}
                        {r.location ? ` • ${r.location}` : ""}
                      </span>
                    </Link>
                    <SaveButton listingId={r.id} saved={r.saved} />
                  </li>
                ))}
              </ul>
            )}
            <Link href="/feed?v=eligible" className="mt-2 flex items-center justify-center gap-2 text-[14px] font-medium text-lavender hover:text-lavender-hi">
              View more matches
              <Icon name="arrowRight" size={15} />
            </Link>
          </section>

          {counts && (
            <section className="glass rounded-[18px] p-5">
              <div className="flex items-center gap-3.5">
                <Icon name="chart" size={26} className="text-lavender" />
                <h2 className="flex-1 text-[20px] font-semibold">Your Feed Today</h2>
                <span className="inline-flex h-7 items-center rounded-full bg-white/[0.06] px-3 text-[12.5px] text-soft">Live</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2.5">
                {(["eligible", "check", "not_eligible"] as const).map((v) => (
                  <div key={v} className="rounded-[14px] bg-black/20 p-3.5 ring-1 ring-inset ring-white/[0.06]">
                    <Icon name={VERDICT_STYLE[v].icon} size={20} className={VERDICT_STYLE[v].text} />
                    <p className="num mt-2 text-[22px] font-semibold leading-none">{counts[v].toLocaleString()}</p>
                    <p className="mt-1 truncate text-[12.5px] text-soft">{VERDICTS[v].label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-white/[0.06]" role="img" aria-label="Share of postings by verdict">
                {VERDICT_ORDER.map((v) => {
                  const total = VERDICT_ORDER.reduce((n, x) => n + counts[x], 0) || 1;
                  return <span key={v} className={`h-full ${VERDICT_STYLE[v].dot} opacity-90`} style={{ width: `${(counts[v] / total) * 100}%` }} />;
                })}
              </div>
              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
                {VERDICT_ORDER.map((v) => (
                  <li key={v} className="flex items-center gap-1.5">
                    <span className={`size-2 rounded-full ${VERDICT_STYLE[v].dot}`} />
                    {VERDICTS[v].short} <span className="num">{counts[v].toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
