"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import type { Verdict } from "@core/match";
import type { GateField } from "@core/requirements";
import { setApplied } from "@/app/(app)/listing/[id]/actions";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { Dropdown } from "@/components/Dropdown";
import { Icon } from "@/components/Icon";
import { Quote } from "@/components/Quote";
import { BUTTON, CheckMark, EmptyState, TowerArt } from "@/components/ui";
import { FIELD_NAMES, JOB_TYPES, VERDICTS, VERDICT_ORDER, VERDICT_STYLE } from "@/lib/labels";
import type { Role } from "@/lib/roles";
import { setSaved } from "./actions";

export type SavedCard = {
  id: number;
  company: string;
  title: string;
  locations: string[];
  cities: string[];
  remote: boolean;
  jobType: "internship" | "co-op" | "new_grad";
  applyUrl: string;
  verdict: Verdict;
  unchecked: "not_fetched" | "not_read_yet" | null;
  quote: string | null;
  quoteField: GateField | null;
  role: Role;
  savedAt: string;
  applied: boolean;
};

type Tab = "all" | "todo" | "applied";
type Sort = "recent" | "verdict" | "company";

function savedAgo(iso: string, now: number) {
  const m = Math.floor((now - Date.parse(iso)) / 60_000);
  if (m < 60) return `Saved ${Math.max(1, m)}m ago`;
  if (m < 1440) return `Saved ${Math.floor(m / 60)}h ago`;
  return `Saved ${Math.floor(m / 1440)}d ago`;
}

const RANK = Object.fromEntries(VERDICT_ORDER.map((v, i) => [v, i])) as Record<Verdict, number>;

function Card({ c, now, grid }: { c: SavedCard; now: number; grid: boolean }) {
  const [pending, start] = useTransition();
  const [applied, setAppliedLocal] = useState(c.applied);
  const v = VERDICTS[c.verdict];
  const st = VERDICT_STYLE[c.verdict];
  return (
    <article className="glass group relative flex animate-rise gap-5 rounded-[16px] p-4 transition-[background,border-color,box-shadow] duration-200 hover:glow focus-within:glow sm:p-5">
      <span className="max-sm:[&>span]:!size-12">
        <CompanyAvatar company={c.company} size={62} />
      </span>
      <div className="min-w-0 flex-1">
        <div className={`flex gap-4 ${grid ? "flex-col" : "flex-col lg:flex-row lg:items-start"}`}>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14.5px] text-soft">{c.company}</p>
            <h3 className="mt-0.5 line-clamp-2 text-[19px] font-semibold leading-[1.3] tracking-[-0.01em]">
              <Link href={`/listing/${c.id}`} className="hover:text-lavender-hi">
                {c.title}
              </Link>
            </h3>
            <p className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-[13.5px] text-soft">
              <span className="flex items-center gap-2">
                <Icon name="briefcase" size={15} className="text-muted" />
                {JOB_TYPES[c.jobType]}
              </span>
              <span className="flex min-w-0 items-center gap-2">
                <Icon name="pin" size={15} className="text-muted" />
                <span className="truncate">
                  {c.locations[0] ?? "Location not listed"}
                  {c.locations.length > 1 ? ` +${c.locations.length - 1}` : ""}
                </span>
              </span>
            </p>
            {c.quote && (
              <p className="mt-3 flex min-w-0">
                <span className="inline-flex h-7 min-w-0 items-center gap-2 rounded-full bg-white/[0.06] px-3 text-[12.5px] text-soft" title={c.quote}>
                  <span className="flex-none font-semibold text-ink">{FIELD_NAMES[c.quoteField!]}</span>
                  <span className="truncate">
                    <Quote text={c.quote} field={c.quoteField} mark={st.mark} />
                  </span>
                </span>
              </p>
            )}
          </div>

          <div className={`flex flex-none flex-col gap-3 ${grid ? "" : "lg:items-end"}`}>
            <div className="flex items-center gap-4">
              <span className={`inline-flex h-[34px] items-center gap-2 rounded-full px-3.5 text-[14px] font-medium ${v.badge}`} title={v.tip}>
                <Icon name={st.icon} size={16} />
                {c.unchecked === "not_read_yet" ? "Not read yet" : v.label}
              </span>
              <span className="whitespace-nowrap text-[13px] text-muted">{savedAgo(c.savedAt, now)}</span>
              <Icon name="bookmark" size={21} strokeWidth={1.6} className="fill-lavender text-lavender" label="Saved" />
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <a href={c.applyUrl} target="_blank" rel="noopener noreferrer" className={`${BUTTON.primary} h-9 px-4 text-[14.5px]`}>
                Apply
                <Icon name="arrowRight" size={15} />
              </a>
              <button
                type="button"
                disabled={pending}
                aria-pressed={applied}
                onClick={() =>
                  start(async () => {
                    setAppliedLocal(!applied);
                    await setApplied(c.id, !applied);
                  })
                }
                className={`${BUTTON.ghost} h-9 px-4 text-[14px] ${applied ? "!border-mint/40 !bg-mint/10 text-mint" : ""}`}
              >
                <Icon name={applied ? "checkCircle" : "send"} size={15} />
                {applied ? "Applied" : "Mark applied"}
              </button>
              <button type="button" disabled={pending} onClick={() => start(() => setSaved(c.id, false))} className={`${BUTTON.ghost} h-9 px-4 text-[14px] hover:!border-rose/40 hover:text-rose`}>
                <Icon name="trash" size={15} />
                Remove
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export function SavedView({ cards, myCities, remoteOk }: { cards: SavedCard[]; myCities: string[]; remoteOk: boolean }) {
  const [now] = useState(() => Date.now());
  const [q, setQ] = useState("");
  const [where, setWhere] = useState<"all" | "mine" | "remote">("all");
  const [tab, setTab] = useState<Tab>("all");
  const [sort, setSort] = useState<Sort>("recent");
  const [grid, setGrid] = useState(false);
  const [verdicts, setVerdicts] = useState<Verdict[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const mine = useMemo(() => new Set(myCities), [myCities]);

  const inMine = (c: SavedCard) => (remoteOk && c.remote) || c.cities.some((x) => mine.has(x));
  const needle = q.trim().toLowerCase();
  const base = cards.filter(
    (c) =>
      (!needle || `${c.company} ${c.title}`.toLowerCase().includes(needle)) &&
      (where === "all" || (where === "remote" ? c.remote : inMine(c))) &&
      (tab === "all" || (tab === "applied" ? c.applied : !c.applied)),
  );
  const shown = base
    .filter((c) => (!verdicts.length || verdicts.includes(c.verdict)) && (!types.length || types.includes(c.jobType)))
    .sort((a, b) => (sort === "company" ? a.company.localeCompare(b.company) : sort === "verdict" ? RANK[a.verdict] - RANK[b.verdict] || b.savedAt.localeCompare(a.savedAt) : b.savedAt.localeCompare(a.savedAt)));

  const countV = (v: Verdict) => base.filter((c) => c.verdict === v && (!types.length || types.includes(c.jobType))).length;
  const countT = (t: string) => base.filter((c) => c.jobType === t && (!verdicts.length || verdicts.includes(c.verdict))).length;
  const toggle = <T,>(list: T[], x: T, set: (v: T[]) => void) => set(list.includes(x) ? list.filter((y) => y !== x) : [...list, x]);
  const appliedCount = cards.filter((c) => c.applied).length;
  const eligibleCount = cards.filter((c) => c.verdict === "eligible").length;

  return (
    <div>
      <section className="flex flex-col items-center pt-6 text-center sm:pt-[18px]">
        <h1 className="text-[40px] font-bold leading-[1.1] tracking-[-0.035em] sm:text-[52px]">
          Saved <span className="text-shine pr-[0.08em] italic">Opportunities</span>
        </h1>
        <p className="mt-2 text-[17px] text-soft sm:text-[19px]">Your bookmarked postings, with their verdicts, all in one place.</p>
        <p className="num mt-4 inline-flex h-10 items-center gap-3 rounded-full border border-white/12 bg-white/[0.03] px-5 text-[14.5px] text-soft">
          <Icon name="bookmark" size={17} />
          {cards.length} saved job{cards.length === 1 ? "" : "s"}
          <span aria-hidden="true" className="text-dim">•</span>
          {eligibleCount} eligible
          <span aria-hidden="true" className="text-dim">•</span>
          {appliedCount} applied
        </p>

        <form
          role="search"
          onSubmit={(e) => e.preventDefault()}
          className="mt-6 flex w-full max-w-[978px] flex-col gap-2 rounded-[28px] border border-white/10 bg-[#16131f]/80 p-2 shadow-[inset_0_1px_0_rgb(255_255_255/0.05),0_20px_60px_-20px_rgb(0_0_0/0.8)] backdrop-blur-xl sm:h-[50px] sm:flex-row sm:items-center sm:gap-0 sm:rounded-full sm:py-0 sm:pl-6 sm:pr-[5px]"
        >
          <label className="flex h-11 min-w-0 flex-1 items-center gap-3.5 px-3 sm:px-0">
            <Icon name="search" size={20} className="text-soft" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search saved jobs by title or company..."
              aria-label="Search saved jobs"
              className="h-full min-w-0 flex-1 bg-transparent text-[16px] outline-none"
            />
          </label>
          <span aria-hidden="true" className="mx-5 hidden h-7 w-px bg-white/10 sm:block" />
          <Dropdown
            label="Location"
            icon="pin"
            value={where}
            options={[
              { value: "all", label: "All locations" },
              ...(myCities.length ? [{ value: "mine" as const, label: `My cities${remoteOk ? " + remote" : ""}` }] : []),
              { value: "remote", label: "Remote only" },
            ]}
            onChange={setWhere}
            className="sm:w-[210px]"
            buttonClassName="h-11 w-full px-3 text-[16px] sm:px-0 sm:pr-4"
          />
          <button type="submit" className="btn-lavender flex h-10 items-center justify-center gap-2 rounded-full px-6 text-[16px] font-medium hover:brightness-110 sm:ml-2">
            Search
            <Icon name="arrowRight" size={16} />
          </button>
        </form>
      </section>

      <div className="mt-8 grid grid-cols-1 gap-x-[28px] gap-y-6 lg:grid-cols-[256px_minmax(0,1fr)] xl:grid-cols-[256px_minmax(0,1fr)_344px] 2xl:gap-x-[30px]">
        {/* Left: verdict groups (in place of collections) and filters */}
        <aside className="glass h-fit overflow-hidden rounded-[18px] lg:sticky lg:top-6" aria-label="Filters">
          <div className="px-4 pb-4 pt-5">
            <h2 className="px-2 text-[19px] font-semibold">By verdict</h2>
            <ul className="mt-3 flex flex-col gap-1">
              {VERDICT_ORDER.map((v) => {
                const on = verdicts.includes(v);
                return (
                  <li key={v}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(verdicts, v, setVerdicts)}
                      className={`flex h-9 w-full items-center gap-3 rounded-[10px] px-3 text-left text-[14.5px] ${on ? "bg-white/[0.08] text-ink ring-1 ring-inset ring-white/10" : "text-soft hover:bg-white/[0.04] hover:text-ink"}`}
                    >
                      <Icon name={VERDICT_STYLE[v].icon} size={18} className={VERDICT_STYLE[v].text} />
                      <span className="min-w-0 flex-1 truncate">{VERDICTS[v].label}</span>
                      <span className="num text-[13px] text-muted">{countV(v)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="border-t border-white/[0.07] px-6 pb-5 pt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[19px] font-semibold">Filters</h2>
              <button type="button" onClick={() => (setVerdicts([]), setTypes([]), setWhere("all"), setQ(""))} className="text-[14px] text-soft hover:text-lavender">
                Reset
              </button>
            </div>
            <p className="mt-4 text-[15px] font-semibold">Job Type</p>
            <ul className="mt-3 space-y-[7px]">
              {(["internship", "co-op", "new_grad"] as const).map((t) => (
                <li key={t}>
                  <button type="button" role="checkbox" aria-checked={types.includes(t)} onClick={() => toggle(types, t, setTypes)} className="flex w-full items-center gap-3 text-left text-[14px] text-soft hover:text-ink">
                    <CheckMark on={types.includes(t)} />
                    <span className="flex-1">{JOB_TYPES[t]}</span>
                    <span className="num text-[13px] text-muted">{countT(t)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Center */}
        <section className="min-w-0" aria-label="Saved postings">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-2.5 overflow-x-auto" role="tablist" aria-label="Show">
              {(
                [
                  ["all", "Saved Jobs", "bookmark"],
                  ["todo", "To apply", "send"],
                  ["applied", "Applied", "checkCircle"],
                ] as const
              ).map(([value, label, icon]) => (
                <button
                  key={value}
                  role="tab"
                  aria-selected={tab === value}
                  onClick={() => setTab(value)}
                  className={`flex h-10 flex-none items-center gap-2.5 rounded-full border px-5 text-[15px] font-medium ${
                    tab === value ? "border-lavender/70 bg-[#1d1638] shadow-[0_8px_30px_-10px_rgb(102_49_251/0.6)]" : "border-white/[0.07] bg-[#15131d] text-soft hover:border-white/15 hover:text-ink"
                  }`}
                >
                  <Icon name={icon} size={18} />
                  {label}
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-3">
              <Dropdown<Sort>
                label="Sort by"
                prefix="Sort by:"
                value={sort}
                options={[
                  { value: "recent", label: "Recently saved" },
                  { value: "verdict", label: "Best verdict" },
                  { value: "company", label: "Company (A to Z)" },
                ]}
                onChange={setSort}
                buttonClassName="h-10 text-[14.5px]"
              />
              <div className="hidden overflow-hidden rounded-[12px] border border-white/10 sm:flex" role="group" aria-label="Layout">
                <button type="button" aria-pressed={grid} aria-label="Grid" onClick={() => setGrid(true)} className={`grid size-10 place-items-center ${grid ? "bg-lavender/15 text-lavender" : "text-soft hover:text-ink"}`}>
                  <Icon name="grid" size={18} />
                </button>
                <button type="button" aria-pressed={!grid} aria-label="List" onClick={() => setGrid(false)} className={`grid size-10 place-items-center ${!grid ? "bg-lavender/15 text-lavender" : "text-soft hover:text-ink"}`}>
                  <Icon name="list" size={18} />
                </button>
              </div>
            </div>
          </div>

          <p className="num mt-5 px-1 text-[16px] font-medium">
            {shown.length} saved job{shown.length === 1 ? "" : "s"}
          </p>

          {cards.length === 0 ? (
            <div className="mt-3">
              <EmptyState
                icon="bookmark"
                title="Nothing saved yet"
                action={
                  <Link href="/feed" className={`${BUTTON.primary} h-11 px-6`}>
                    Browse jobs
                    <Icon name="arrowRight" size={16} />
                  </Link>
                }
              >
                Tap the bookmark on any posting to keep it here with its verdict.
              </EmptyState>
            </div>
          ) : shown.length === 0 ? (
            <p className="glass mt-3 rounded-[16px] px-6 py-10 text-center text-muted">No saved jobs match. Clear the search or filters.</p>
          ) : (
            <div className={`mt-3 grid gap-4 ${grid ? "md:grid-cols-2" : "grid-cols-1"}`}>
              {shown.map((c) => (
                <Card key={c.id} c={c} now={now} grid={grid} />
              ))}
            </div>
          )}
        </section>

        {/* Right */}
        <aside className="hidden flex-col gap-[18px] xl:flex">
          <section className="relative overflow-hidden rounded-[18px] border border-white/10 bg-[linear-gradient(160deg,#1c1530_0%,#130f20_55%,#100d19_100%)] p-5 shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]">
            <TowerArt className="absolute right-0 top-0 h-[170px] w-[150px]" />
            <div className="absolute -right-12 -top-12 size-44 rounded-full bg-brand/30 blur-3xl" aria-hidden="true" />
            <div className="relative">
              <h2 className="flex items-center gap-3 text-[19px] font-semibold">
                <Icon name="send" size={20} className="text-lavender" />
                Ready to apply
              </h2>
              <p className="mt-2 max-w-[28ch] text-[14px] leading-[1.45] text-soft">Saved jobs you&apos;re eligible for and haven&apos;t applied to yet.</p>
              <ul className="mt-4 flex flex-col gap-2.5">
                {cards
                  .filter((c) => !c.applied && (c.verdict === "eligible" || c.verdict === "no_restrictions_found"))
                  .slice(0, 3)
                  .map((c) => (
                    <li key={c.id}>
                      <Link href={`/listing/${c.id}`} className="flex items-center gap-3 rounded-[12px] bg-black/20 p-2.5 ring-1 ring-inset ring-white/[0.06] hover:bg-white/[0.05]">
                        <CompanyAvatar company={c.company} size={36} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-semibold">{c.title}</span>
                          <span className="block truncate text-[12.5px] text-muted">{c.company}</span>
                        </span>
                        <Icon name="chevronRight" size={16} className="text-muted" />
                      </Link>
                    </li>
                  ))}
              </ul>
              {!cards.some((c) => !c.applied && (c.verdict === "eligible" || c.verdict === "no_restrictions_found")) && (
                <p className="mt-3 text-[13.5px] text-muted">None right now. Eligible saved jobs you haven&apos;t applied to show up here.</p>
              )}
            </div>
          </section>

          <section className="glass rounded-[18px] p-5">
            <h2 className="flex items-center gap-3 text-[19px] font-semibold">
              <Icon name="chart" size={20} className="text-lavender" />
              Verdict breakdown
            </h2>
            <ul className="mt-4 flex flex-col gap-3">
              {VERDICT_ORDER.map((v) => {
                const n = cards.filter((c) => c.verdict === v).length;
                return (
                  <li key={v}>
                    <div className="flex items-center justify-between text-[13.5px]">
                      <span className="text-soft">{VERDICTS[v].label}</span>
                      <span className="num font-medium">{n}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <div className={`h-full rounded-full ${VERDICT_STYLE[v].dot} transition-[width] duration-700`} style={{ width: `${cards.length ? (n / cards.length) * 100 : 0}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="glass rounded-[18px] p-5">
            <h2 className="flex items-center gap-3 text-[19px] font-semibold">
              <Icon name="sparkles" size={20} className="text-lavender" />
              Find more like these
            </h2>
            <p className="mt-2 text-[14px] leading-[1.45] text-soft">New postings arrive every couple of hours, each checked against your profile.</p>
            <Link href="/feed?v=eligible" className="mt-4 flex items-center gap-3 rounded-[14px] bg-black/20 p-3.5 ring-1 ring-inset ring-white/[0.06] hover:bg-white/[0.05]">
              <span className="grid size-9 place-items-center rounded-full bg-mint/10 text-mint">
                <Icon name="checkCircle" size={19} />
              </span>
              <span className="flex-1 text-[14.5px] font-medium">Browse eligible jobs</span>
              <Icon name="chevronRight" size={16} className="text-muted" />
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
