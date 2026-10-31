"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Verdict } from "@core/match";
import type { GateField } from "@core/requirements";
import { FIELD_NAMES, JOB_TYPES, VERDICTS, VERDICT_DOT, VERDICT_ORDER } from "@/lib/labels";

export type FeedCard = {
  id: number;
  company: string;
  title: string;
  locations: string[];
  cities: string[]; // canonical "City, ST", matched against the profile's cities
  remote: boolean;
  jobType: "internship" | "co-op" | "new_grad";
  postedAt: string | null;
  verdict: Verdict;
  unchecked: "not_fetched" | "not_read_yet" | null;
  quote: string | null;
  quoteField: GateField | null;
  note: string | null;
  applied: boolean;
};

const PAGE = 50;
const DAY = 86_400_000;
const control = "h-9 rounded-control border border-control bg-surface px-3 text-[14px]";

function age(iso: string | null, now: number) {
  if (!iso) return "–";
  const days = Math.floor((now - Date.parse(iso)) / DAY);
  return days <= 0 ? "Today" : days === 1 ? "Yesterday" : days < 30 ? `${days} days` : iso.slice(0, 10);
}

export function FeedView({ cards, defaultJobTypes, cities, remoteOk }: { cards: FeedCard[]; defaultJobTypes: string[]; cities: string[]; remoteOk: boolean }) {
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
  const notReadYet = base.filter((c) => c.unchecked === "not_read_yet").length;

  const toggle = (v: Verdict) => {
    const next = new Set(shown);
    next.has(v) ? next.delete(v) : next.add(v);
    setShown(next);
    setLimit(PAGE);
  };

  return (
    <div className="mx-auto max-w-[1100px]">
      <h1 className="text-[24px] font-medium leading-8">Feed</h1>
      <p className="mt-1 text-muted">
        <span className="num text-ink">{counts.eligible}</span> eligible, <span className="num text-ink">{counts.no_restrictions_found}</span> with no restrictions
        found, and <span className="num text-ink">{counts.check}</span> to check.{" "}
        {notReadYet > 0 && (
          <>
            <span className="num">{notReadYet.toLocaleString()}</span> postings aren&apos;t read yet.
          </>
        )}
      </p>

      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Verdicts">
        {VERDICT_ORDER.map((v) => (
          <button
            key={v}
            onClick={() => toggle(v)}
            aria-pressed={shown.has(v)}
            title={VERDICTS[v].tip}
            className={`flex h-8 items-center gap-2 rounded-full border px-3 text-[13px] ${shown.has(v) ? "border-brand bg-brand-soft text-ink" : "border-line bg-transparent text-muted hover:border-control hover:text-ink"}`}
          >
            <span className={`size-2 rounded-full ${VERDICT_DOT[v]}`} aria-hidden="true" />
            {VERDICTS[v].label}
            <span className="num text-muted">{counts[v].toLocaleString()}</span>
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => (setQ(e.target.value), setLimit(PAGE))} placeholder="Search company or title" aria-label="Search company or title" className={`${control} w-full sm:w-64`} />
        <select value={jobType} onChange={(e) => (setJobType(e.target.value), setLimit(PAGE))} aria-label="Job type" className={control}>
          <option value="">All job types</option>
          <option value="internship,co-op">Internships and co-ops</option>
          <option value="new_grad">New grad</option>
        </select>
        <select value={within} onChange={(e) => (setWithin(Number(e.target.value)), setLimit(PAGE))} aria-label="Posted within" className={control}>
          <option value={0}>Posted any time</option>
          <option value={1}>Last 24 hours</option>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
        </select>
        {cities.length > 0 && (
          <label className="flex h-9 items-center gap-2 px-1 text-[14px]">
            <input type="checkbox" checked={myCities} onChange={(e) => setMyCities(e.target.checked)} className="size-4 accent-brand" />
            My cities{remoteOk ? " and remote" : ""}
          </label>
        )}
        <label className="flex h-9 items-center gap-2 px-1 text-[14px]">
          <input type="checkbox" checked={hideApplied} onChange={(e) => setHideApplied(e.target.checked)} className="size-4 accent-brand" />
          Hide applied
        </label>
      </div>

      <section className="mt-4 overflow-hidden rounded-card border border-line bg-surface" aria-label="Postings">
        <div className="flex items-center justify-between border-b border-line px-5 py-3 text-[12px] text-muted">
          <span className="num">
            {list.length.toLocaleString()} posting{list.length === 1 ? "" : "s"}
          </span>
          <span>Newest first</span>
        </div>
        {list.length === 0 ? (
          <p className="px-5 py-8 text-muted">No postings match these filters. Turn on more verdicts above, or clear the search.</p>
        ) : (
          <ul>
            {list.slice(0, limit).map((c) => (
              <li key={c.id} className="border-b border-rule last:border-0">
                <Link href={`/listing/${c.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 px-5 py-3.5 hover:bg-hover md:grid-cols-[150px_minmax(0,1fr)_auto]">
                  <span className="md:pt-0.5">
                    <span className={`inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-[12px] font-medium ${VERDICTS[c.verdict].badge}`}>
                      {c.unchecked === "not_read_yet" ? "Not read yet" : VERDICTS[c.verdict].label}
                    </span>
                  </span>
                  <span className="num text-right text-[12px] text-muted md:order-last md:pt-1">{age(c.postedAt, now)}</span>
                  <span className="col-span-2 min-w-0 md:col-span-1">
                    <span className="block truncate font-medium">{c.title}</span>
                    <span className="block truncate text-[13px] text-muted">
                      {c.company} · {c.locations.slice(0, 2).join("; ") || "Location not listed"}
                      {c.locations.length > 2 ? ` +${c.locations.length - 2}` : ""} · {JOB_TYPES[c.jobType]}
                      {c.applied && <span className="text-mint"> · Applied</span>}
                    </span>
                    {c.quote && (
                      <span className="mt-1.5 line-clamp-3 text-[13px] leading-5 text-ink/80">
                        <span className="text-muted">{FIELD_NAMES[c.quoteField!]}: </span>“{c.quote}”
                      </span>
                    )}
                    {c.note && <span className="mt-1 block text-[12px] text-warn-ink">{c.note}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {list.length > limit && (
          <button onClick={() => setLimit(limit + PAGE)} className="h-11 w-full border-t border-line text-[14px] font-medium hover:bg-hover">
            Show {Math.min(PAGE, list.length - limit)} more of {(list.length - limit).toLocaleString()}
          </button>
        )}
      </section>
    </div>
  );
}
