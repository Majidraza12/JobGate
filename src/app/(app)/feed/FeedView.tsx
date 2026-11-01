"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Verdict } from "@core/match";
import type { GateField } from "@core/requirements";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { Quote } from "@/components/Quote";
import { FIELD_NAMES, JOB_TYPES, VERDICTS, VERDICT_ORDER, VERDICT_STYLE } from "@/lib/labels";

export type FeedCard = {
  id: number;
  company: string;
  title: string;
  locations: string[];
  cities: string[]; // canonical "City, ST", matched against the profile's cities
  remote: boolean;
  jobType: "internship" | "co-op" | "new_grad";
  postedAt: string | null;
  applyUrl: string;
  verdict: Verdict;
  unchecked: "not_fetched" | "not_read_yet" | null;
  quote: string | null;
  quoteField: GateField | null;
  note: string | null;
  applied: boolean;
};

const PAGE = 48;
const DAY = 86_400_000;

function age(iso: string | null, now: number) {
  if (!iso) return null;
  const days = Math.floor((now - Date.parse(iso)) / DAY);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`h-10 rounded-full border-2 px-4 text-[14px] font-semibold active:scale-95 ${on ? "border-ink text-ink" : "border-line bg-surface text-muted hover:border-lav hover:text-ink"}`}
    >
      {children}
    </button>
  );
}

function Card({ c, now }: { c: FeedCard; now: number }) {
  const v = VERDICTS[c.verdict];
  const st = VERDICT_STYLE[c.verdict];
  const when = age(c.postedAt, now);
  return (
    <article className={`relative flex flex-col gap-3 rounded-[20px] border-2 border-line bg-surface p-4 transition-[transform,box-shadow,border-color] duration-150 hover:-translate-x-[3px] hover:-translate-y-[3px] ${st.card}`}>
      <div className="flex items-center gap-3">
        <CompanyAvatar company={c.company} size={38} />
        <div className="min-w-0 flex-1 leading-5">
          <p className="truncate text-[14px] font-semibold">{c.company}</p>
          <p className="truncate text-[12.5px] text-muted">
            {c.locations[0] ?? "Location not listed"}
            {c.locations.length > 1 ? ` +${c.locations.length - 1}` : ""}
            {when ? ` · ${when}` : ""}
          </p>
        </div>
        <span className={`flex-none rotate-3 rounded-[8px] px-2 py-1 font-mono text-[11px] font-bold uppercase tracking-wide ${v.badge}`}>
          {c.unchecked === "not_read_yet" ? "Not read" : v.short}
        </span>
      </div>

      <h3 className="line-clamp-2 font-display text-[18px] font-bold leading-[1.2] tracking-[-0.01em]">
        {/* The title's link covers the whole card; Apply sits above it. */}
        <Link href={`/listing/${c.id}`} className="after:absolute after:inset-0 after:rounded-[20px] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-lav">
          {c.title}
        </Link>
      </h3>

      {c.quote ? (
        <div className="rounded-[12px] bg-sunken px-3 py-2.5 text-[13px] leading-[1.45] text-ink/85">
          <p className="mb-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted">{FIELD_NAMES[c.quoteField!]}</p>
          <p className="line-clamp-3">
            <Quote text={c.quote} field={c.quoteField} mark={st.mark} />
          </p>
        </div>
      ) : (
        <p className="rounded-[12px] bg-sunken px-3 py-2.5 text-[13px] text-muted">
          {c.unchecked === "not_read_yet"
            ? "We haven't read this posting yet."
            : c.unchecked === "not_fetched"
              ? "We couldn't fetch this posting's description."
              : "No graduation, citizenship, sponsorship, or clearance rules stated."}
        </p>
      )}
      {c.note && <p className="text-[12px] text-amber">{c.note}</p>}

      <div className="mt-auto flex items-center gap-2">
        <span className="rounded-full border-2 border-line px-2.5 py-0.5 text-[12px] font-semibold text-muted">{JOB_TYPES[c.jobType]}</span>
        {c.applied && <span className="rounded-full border-2 border-mint px-2.5 py-0.5 text-[12px] font-semibold text-mint">Applied</span>}
        <a
          href={c.applyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="relative z-10 ml-auto flex h-9 items-center rounded-[10px] bg-ink px-3.5 text-[13px] font-bold text-ground hover:bg-mint active:scale-95"
        >
          Apply ↗
        </a>
      </div>
    </article>
  );
}

export function FeedView({
  cards,
  defaultJobTypes,
  cities,
  remoteOk,
  checkedAgainst,
}: {
  cards: FeedCard[];
  defaultJobTypes: string[];
  cities: string[];
  remoteOk: boolean;
  checkedAgainst: string;
}) {
  const [now] = useState(() => Date.now());
  // Not eligible is hidden by default (section 5). Not checked starts hidden
  // too: most postings haven't been read yet, and they would bury the rest.
  const [shown, setShown] = useState<Set<Verdict>>(new Set(["eligible", "no_restrictions_found", "check"]));
  const [jobType, setJobType] = useState<string>(defaultJobTypes.length === 3 ? "" : defaultJobTypes.join(","));
  const [q, setQ] = useState("");
  const [myCities, setMyCities] = useState(false);
  const [within, setWithin] = useState(0);
  const [hideApplied, setHideApplied] = useState(true);
  const [limit, setLimit] = useState(PAGE);
  const reset = () => setLimit(PAGE);

  const base = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const mine = new Set(cities);
    // Older profiles saved free-text cities; those still match by substring.
    const legacy = cities.filter((c) => !c.includes(", ")).map((c) => c.toLowerCase());
    return cards
      .filter((c) => !jobType || jobType.split(",").includes(c.jobType))
      .filter((c) => !needle || `${c.company} ${c.title}`.toLowerCase().includes(needle))
      .filter((c) => !myCities || (remoteOk && c.remote) || c.cities.some((x) => mine.has(x)) || c.locations.some((l) => legacy.some((n) => l.toLowerCase().includes(n))))
      .filter((c) => !within || (c.postedAt !== null && now - Date.parse(c.postedAt) <= within * DAY))
      .filter((c) => !hideApplied || !c.applied)
      .sort((a, b) => (b.postedAt ?? "").localeCompare(a.postedAt ?? ""));
  }, [cards, jobType, q, myCities, cities, remoteOk, within, hideApplied, now]);

  const counts = useMemo(() => {
    const m = Object.fromEntries(VERDICT_ORDER.map((v) => [v, 0])) as Record<Verdict, number>;
    for (const c of base) m[c.verdict]++;
    return m;
  }, [base]);
  const list = base.filter((c) => shown.has(c.verdict));

  const toggle = (v: Verdict) => {
    const next = new Set(shown);
    next.has(v) ? next.delete(v) : next.add(v);
    setShown(next);
    reset();
  };

  return (
    <div>
      <section className="relative overflow-hidden rounded-[24px] bg-brand px-6 py-6 shadow-[8px_8px_0_var(--color-mint)] md:px-8">
        <h1 className="max-w-[24ch] font-display text-[30px] font-bold leading-[1.05] tracking-[-0.03em] text-on-brand md:text-[40px]">
          <span className="text-mint">
            {counts.eligible} job{counts.eligible === 1 ? "" : "s"}
          </span>{" "}
          {counts.eligible === 1 ? "is" : "are"} open to you.
        </h1>
        <p className="mt-2 max-w-[60ch] text-[14px] text-[#e5dcff]">
          Checked against {checkedAgainst}. {counts.check} more need a quick look.
        </p>
        <svg className="pointer-events-none absolute -bottom-4 right-4 hidden opacity-25 sm:block" width="170" height="130" viewBox="0 0 24 20" fill="var(--color-mint)" aria-hidden="true">
          <rect x="2" y="2" width="3" height="18" rx="1" />
          <rect x="19" y="2" width="3" height="18" rx="1" />
          <rect x="2" y="6" width="20" height="3" rx="1" transform="rotate(-20 2 6)" />
        </svg>
      </section>

      <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-5" role="group" aria-label="Show verdicts">
        {VERDICT_ORDER.map((v) => {
          const on = shown.has(v);
          return (
            <button
              key={v}
              onClick={() => toggle(v)}
              aria-pressed={on}
              title={VERDICTS[v].tip}
              className={`min-w-0 rounded-[16px] border-2 bg-surface px-3 py-2.5 text-left sm:rounded-[18px] sm:px-4 sm:py-3 transition-[transform,box-shadow,border-color] duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_var(--color-line)] active:translate-x-0 active:translate-y-0 active:shadow-none ${on ? VERDICT_STYLE[v].ring : "border-line opacity-60 hover:opacity-100"}`}
            >
              <b className={`num block font-mono text-[22px] font-bold leading-tight sm:text-[28px] ${VERDICT_STYLE[v].text}`}>{counts[v].toLocaleString()}</b>
              <span className="block truncate text-[12px] font-medium text-muted sm:text-[13px]">
                <span className="sm:hidden">{VERDICTS[v].short}</span>
                <span className="hidden sm:inline">{VERDICTS[v].label}</span>
                {on ? "" : " (hidden)"}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Chip on={!jobType} onClick={() => (setJobType(""), reset())}>
          Everything
        </Chip>
        <Chip on={jobType === "internship,co-op"} onClick={() => (setJobType("internship,co-op"), reset())}>
          Internships
        </Chip>
        <Chip on={jobType === "new_grad"} onClick={() => (setJobType("new_grad"), reset())}>
          New grad
        </Chip>
        {cities.length > 0 && (
          <Chip on={myCities} onClick={() => (setMyCities(!myCities), reset())}>
            My cities{remoteOk ? " + remote" : ""}
          </Chip>
        )}
        <Chip on={within === 7} onClick={() => (setWithin(within === 7 ? 0 : 7), reset())}>
          This week
        </Chip>
        <Chip on={!hideApplied} onClick={() => (setHideApplied(!hideApplied), reset())}>
          Show applied
        </Chip>
        <label className="flex h-10 w-full items-center gap-2 rounded-full border-2 border-line bg-surface px-4 text-muted focus-within:border-lav sm:ml-auto sm:w-72">
          <span aria-hidden="true">⌕</span>
          <input
            value={q}
            onChange={(e) => (setQ(e.target.value), reset())}
            placeholder="Find a company or title"
            aria-label="Find a company or title"
            className="h-full min-w-0 flex-1 bg-transparent text-ink outline-none"
          />
        </label>
      </div>

      <p className="num mt-5 text-[13px] text-muted">
        {list.length.toLocaleString()} posting{list.length === 1 ? "" : "s"}, newest first
      </p>

      {list.length === 0 ? (
        <p className="mt-3 rounded-[20px] border-2 border-dashed border-line px-6 py-10 text-center text-muted">
          Nothing matches. Turn on more verdicts above, or clear the search.
        </p>
      ) : (
        <section className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Postings">
          {list.slice(0, limit).map((c) => (
            <Card key={c.id} c={c} now={now} />
          ))}
        </section>
      )}
      {list.length > limit && (
        <button
          onClick={() => setLimit(limit + PAGE)}
          className="mx-auto mt-6 flex h-11 items-center rounded-[14px] border-2 border-line bg-surface px-6 font-semibold hover:border-lav active:scale-95"
        >
          Show {Math.min(PAGE, list.length - limit)} more of {(list.length - limit).toLocaleString()}
        </button>
      )}
    </div>
  );
}
