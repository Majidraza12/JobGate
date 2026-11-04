"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { Verdict } from "@core/match";
import type { GateField } from "@core/requirements";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { Quote } from "@/components/Quote";
import { pageNumbers } from "@/lib/pages";
import { feedHref, type FeedFilters, type FeedPage } from "@/lib/feedQuery";
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
  result,
  filters,
  profileJobTypes,
  hasCities,
  remoteOk,
  checkedAgainst,
}: {
  result: FeedPage<FeedCard>;
  filters: FeedFilters;
  profileJobTypes: string[];
  hasCities: boolean;
  remoteOk: boolean;
  checkedAgainst: string;
}) {
  const [now] = useState(() => Date.now());
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const top = useRef<HTMLParagraphElement>(null);
  const { counts, total, pages, page: current, items } = result;
  const href = (patch: Partial<FeedFilters>) => feedHref(filters, patch, profileJobTypes);

  // Every filter is a URL change; the server filters and sends one page back.
  const go = (patch: Partial<FeedFilters>, opts: { replace?: boolean; scrollTop?: boolean } = {}) =>
    startTransition(() => {
      const url = href(patch);
      if (opts.replace) router.replace(url, { scroll: false });
      else router.push(url, { scroll: false });
      if (opts.scrollTop) top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

  // The next page is the likeliest click, so fetch it in the background.
  const nextHref = current < pages ? href({ page: current + 1 }) : null;
  useEffect(() => {
    if (nextHref) router.prefetch(nextHref);
  }, [nextHref, router]);

  // Search waits for a pause in typing, then replaces the URL (no history spam).
  const [q, setQ] = useState(filters.q);
  useEffect(() => setQ(filters.q), [filters.q]);
  useEffect(() => {
    if (q.trim() === filters.q.trim()) return;
    const t = setTimeout(() => go({ q }, { replace: true }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const toggle = (v: Verdict) => {
    const on = filters.verdicts.includes(v);
    go({ verdicts: on ? filters.verdicts.filter((x) => x !== v) : [...filters.verdicts, v] });
  };
  const setJobType = (t: string) => go({ jobType: t });

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
          const on = filters.verdicts.includes(v);
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
        <Chip on={!filters.jobType} onClick={() => setJobType("")}>
          Everything
        </Chip>
        <Chip on={filters.jobType === "internship,co-op"} onClick={() => setJobType("internship,co-op")}>
          Internships
        </Chip>
        <Chip on={filters.jobType === "new_grad"} onClick={() => setJobType("new_grad")}>
          New grad
        </Chip>
        {hasCities && (
          <Chip on={filters.mine} onClick={() => go({ mine: !filters.mine })}>
            My cities{remoteOk ? " + remote" : ""}
          </Chip>
        )}
        <Chip on={filters.within === 7} onClick={() => go({ within: filters.within === 7 ? 0 : 7 })}>
          This week
        </Chip>
        <Chip on={filters.showApplied} onClick={() => go({ showApplied: !filters.showApplied })}>
          Show applied
        </Chip>
        <label className="flex h-10 w-full items-center gap-2 rounded-full border-2 border-line bg-surface px-4 text-muted focus-within:border-lav sm:ml-auto sm:w-72">
          <span aria-hidden="true">⌕</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Find a company or title"
            aria-label="Find a company or title"
            className="h-full min-w-0 flex-1 bg-transparent text-ink outline-none"
          />
        </label>
      </div>

      <p ref={top} className="num mt-5 scroll-mt-4 text-[13px] text-muted">
        {total.toLocaleString()} posting{total === 1 ? "" : "s"}, best matches first, then newest
        {pending ? " · loading…" : ""}
      </p>

      <div className={`transition-opacity duration-150 ${pending ? "opacity-50" : ""}`} aria-busy={pending}>
        {items.length === 0 ? (
          <p className="mt-3 rounded-[20px] border-2 border-dashed border-line px-6 py-10 text-center text-muted">
            Nothing matches. Turn on more verdicts above, or clear the search.
          </p>
        ) : (
          <section className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Postings">
            {items.map((c) => (
              <Card key={c.id} c={c} now={now} />
            ))}
          </section>
        )}
      </div>
      {pages > 1 && (
        <nav aria-label="Pages" className="mt-8 flex flex-wrap items-center justify-center gap-1.5">
          <PageButton label="Previous page" disabled={current === 1} onClick={() => go({ page: current - 1 }, { scrollTop: true })}>
            ‹
          </PageButton>
          {pageNumbers(current, pages).map((p, i) =>
            p === null ? (
              <span key={`gap-${i}`} className="px-1 text-muted" aria-hidden>
                …
              </span>
            ) : (
              <PageButton key={p} label={`Page ${p}`} current={p === current} onClick={() => go({ page: p }, { scrollTop: true })}>
                {p}
              </PageButton>
            ),
          )}
          <PageButton label="Next page" disabled={current === pages} onClick={() => go({ page: current + 1 }, { scrollTop: true })}>
            ›
          </PageButton>
        </nav>
      )}
    </div>
  );
}

function PageButton({
  children,
  label,
  onClick,
  current = false,
  disabled = false,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  current?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-current={current ? "page" : undefined}
      className={`num grid h-10 min-w-10 place-items-center rounded-[12px] border-2 px-3 font-mono text-[14px] font-semibold active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${
        current ? "border-lav bg-lav text-ground" : "border-line bg-surface hover:border-lav"
      }`}
    >
      {children}
    </button>
  );
}
