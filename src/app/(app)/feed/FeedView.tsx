"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { Verdict } from "@core/match";
import type { GateField } from "@core/requirements";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { Dropdown } from "@/components/Dropdown";
import { Icon, type IconName } from "@/components/Icon";
import { Quote } from "@/components/Quote";
import { SaveButton } from "@/components/SaveButton";
import { BUTTON, CheckMark, TowerArt } from "@/components/ui";
import { pageNumbers } from "@/lib/pages";
import { feedHref, JOB_TYPE_VALUES, WITHIN_OPTIONS, type FeedFilters, type FeedPage, type FeedSort } from "@/lib/feedQuery";
import { FIELD_NAMES, JOB_TYPES, VERDICTS, VERDICT_ORDER, VERDICT_STYLE } from "@/lib/labels";
import { ROLES, type Role } from "@/lib/roles";

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
  saved: boolean;
  role: Role;
};

const DAY = 86_400_000;
const HOUR = 3_600_000;

export function ago(iso: string | null, now: number) {
  if (!iso) return null;
  const ms = now - Date.parse(iso);
  // Date-only postings carry no time, so under a day reads "today".
  if (ms < DAY) return iso.length <= 10 ? "today" : `${Math.max(1, Math.floor(ms / HOUR))}h ago`;
  const days = Math.floor(ms / DAY);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const ROLE_ICONS: Record<string, IconName> = { "": "grid", swe: "code", ml: "sparkles", fullstack: "layers", data: "chart", quant: "sigma" };
const WITHIN_LABELS: Record<number, string> = { 0: "Any time", 1: "Past 24 hours", 7: "Past week", 30: "Past month" };

function Card({ c, now, index }: { c: FeedCard; now: number; index: number }) {
  const v = VERDICTS[c.verdict];
  const st = VERDICT_STYLE[c.verdict];
  const when = ago(c.postedAt, now);
  const place = c.locations[0] ?? "Location not listed";
  return (
    <article
      style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
      className="glass group relative flex animate-rise gap-4 rounded-[16px] p-4 transition-[background,border-color,box-shadow,transform] duration-200 hover:glow focus-within:glow sm:gap-[26px] sm:p-5"
    >
      <span className="contents max-sm:[&>span]:!size-12 max-sm:[&>span]:!rounded-[12px] max-sm:[&>span]:!text-[20px]">
        <CompanyAvatar company={c.company} size={64} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 truncate text-[15px] font-medium text-soft">{c.company}</p>
            <h3 className="mt-0.5 line-clamp-2 text-[19px] font-semibold leading-[1.3] tracking-[-0.01em] sm:text-[20px]">
              {/* The title's link covers the whole card; buttons sit above it. */}
              <Link href={`/listing/${c.id}`} className="after:absolute after:inset-0 after:rounded-[16px] focus-visible:outline-none">
                {c.title}
              </Link>
            </h3>
          </div>
          <div className="flex flex-none items-center gap-3">
            {when && <span className="num hidden text-[13px] text-muted sm:inline">{when}</span>}
            <SaveButton listingId={c.id} saved={c.saved} className="-mr-2 -mt-1" />
          </div>
        </div>

        <p className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-[14px] text-soft">
          <span className="flex items-center gap-2">
            <Icon name="briefcase" size={16} className="text-muted" />
            {JOB_TYPES[c.jobType]}
          </span>
          <span className="flex min-w-0 items-center gap-2">
            <Icon name="pin" size={16} className="text-muted" />
            <span className="truncate">
              {place}
              {c.locations.length > 1 ? ` +${c.locations.length - 1}` : ""}
            </span>
          </span>
          <span className={`flex items-center gap-2 ${st.text}`} title={v.tip}>
            <Icon name={st.icon} size={16} />
            {c.unchecked === "not_read_yet" ? "Not read yet" : v.label}
          </span>
        </p>

        <div className="mt-3 flex min-w-0 items-center gap-2">
          {c.applied && <span className="inline-flex h-7 flex-none items-center gap-1.5 rounded-full bg-mint/12 px-3 text-[12.5px] font-medium text-mint">Applied</span>}
          {c.quote ? (
            <span className="inline-flex h-7 min-w-0 items-center gap-2 rounded-full bg-white/[0.06] px-3 text-[12.5px] text-soft" title={c.quote}>
              <span className="flex-none font-semibold text-ink">{FIELD_NAMES[c.quoteField!]}</span>
              <span className="truncate">
                <Quote text={c.quote} field={c.quoteField} mark={st.mark} />
              </span>
            </span>
          ) : (
            <span className="inline-flex h-7 min-w-0 items-center rounded-full bg-white/[0.06] px-3 text-[12.5px] text-muted">
              <span className="truncate">
                {c.unchecked === "not_read_yet"
                  ? "We haven't read this posting yet"
                  : c.unchecked === "not_fetched"
                    ? "Couldn't fetch the description"
                    : "No graduation, citizenship, sponsorship, or clearance rules stated"}
              </span>
            </span>
          )}
          <a
            href={c.applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="relative z-10 ml-auto hidden h-7 flex-none items-center gap-1 rounded-full px-2.5 text-[13px] font-medium text-lavender hover:bg-lavender/10 sm:inline-flex"
          >
            Apply
            <Icon name="arrowUpRight" size={14} />
          </a>
        </div>
        {c.note && <p className="mt-2 text-[12.5px] text-amber">{c.note}</p>}
      </div>
    </article>
  );
}

function FilterGroup({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-white/[0.07] px-6 py-4">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center justify-between text-[15px] font-semibold">
        {title}
        <Icon name={open ? "chevronUp" : "chevronDown"} size={16} className="text-soft" />
      </button>
      {open && <ul className="mt-3 space-y-[7px]">{children}</ul>}
    </div>
  );
}

function FilterRow({ on, onClick, label, count, dot }: { on: boolean; onClick: () => void; label: string; count?: number; dot?: string }) {
  return (
    <li>
      <button type="button" role="checkbox" aria-checked={on} onClick={onClick} className="group flex w-full items-center gap-3 rounded-[6px] text-left text-[14px] text-soft hover:text-ink">
        <CheckMark on={on} />
        {dot && <span aria-hidden="true" className={`size-1.5 rounded-full ${dot}`} />}
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {count !== undefined && <span className="num text-[13px] text-muted">{count.toLocaleString()}</span>}
      </button>
    </li>
  );
}

export function FeedView({
  result,
  filters,
  profileJobTypes,
  hasCities,
  remoteOk,
  checkedAgainst,
  openCount,
  updatedAt,
}: {
  result: FeedPage<FeedCard>;
  filters: FeedFilters;
  profileJobTypes: string[];
  hasCities: boolean;
  remoteOk: boolean;
  checkedAgainst: string;
  openCount: number;
  updatedAt: string | null;
}) {
  const [now] = useState(() => Date.now());
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const top = useRef<HTMLDivElement>(null);
  const { facets, total, pages, page: current, items } = result;
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
    const t = setTimeout(() => go({ q }, { replace: true }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const toggleVerdict = (v: Verdict) => {
    const on = filters.verdicts.includes(v);
    go({ verdicts: on ? filters.verdicts.filter((x) => x !== v) : [...filters.verdicts, v] });
  };
  const types = filters.jobType ? filters.jobType.split(",") : [];
  const toggleType = (t: string) => {
    const next = types.includes(t) ? types.filter((x) => x !== t) : [...types, t];
    // Every box ticked is the same as none: everything.
    go({ jobType: next.length === JOB_TYPE_VALUES.length ? "" : JOB_TYPE_VALUES.filter((x) => next.includes(x)).join(",") });
  };
  const where = filters.remote && !filters.mine ? "remote" : filters.mine && !filters.remote ? "mine" : filters.mine ? "both" : "all";
  const mineLabel = `My cities${remoteOk ? " + remote" : ""}`;
  const locationOptions = [
    { value: "all", label: "All locations" },
    ...(hasCities ? [{ value: "mine", label: mineLabel }] : []),
    { value: "remote", label: "Remote only" },
    ...(where === "both" ? [{ value: "both", label: "My cities or remote" }] : []),
  ];
  const updated = ago(updatedAt, now);
  // Phones get the filters behind a toggle, so the postings come first.
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div>
      {/* Hero */}
      <section className="flex flex-col items-center pt-8 text-center sm:pt-[26px]">
        <p className="inline-flex h-10 items-center gap-2.5 rounded-full border border-white/12 bg-white/[0.03] px-4 text-[14.5px] text-soft shadow-[inset_0_1px_0_rgb(255_255_255/0.05)] backdrop-blur">
          <Icon name="bolt" size={17} className="fill-lavender text-lavender" />
          <span className="num">{openCount.toLocaleString()} open postings, read for their rules</span>
        </p>
        <h1 className="mt-[22px] text-[40px] font-semibold leading-[1.1] tracking-[-0.03em] [word-spacing:0.04em] sm:text-[52px] lg:text-[62px]">
          Find jobs you can <span className="text-shine pr-[0.1em] italic">actually</span> get
        </h1>
        <p className="mt-2 text-[17px] text-muted sm:text-[20px]">Every posting checked against your graduation date and work authorization.</p>

        <form
          role="search"
          onSubmit={(e) => (e.preventDefault(), go({ q }))}
          className="mt-8 flex w-full max-w-[948px] flex-col gap-2 rounded-[28px] border border-white/10 bg-[#16131f]/80 p-2 shadow-[inset_0_1px_0_rgb(255_255_255/0.05),0_20px_60px_-20px_rgb(0_0_0/0.8)] backdrop-blur-xl sm:h-[62px] sm:flex-row sm:items-center sm:gap-0 sm:rounded-full sm:py-0 sm:pl-6 sm:pr-[7px]"
        >
          <label className="flex h-12 min-w-0 flex-1 items-center gap-3.5 px-3 sm:px-0">
            <Icon name="search" size={21} className="text-soft" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search jobs, companies, or keywords..."
              aria-label="Search jobs or companies"
              className="h-full min-w-0 flex-1 bg-transparent text-[16.5px] text-ink outline-none"
            />
          </label>
          <span aria-hidden="true" className="mx-6 hidden h-8 w-px bg-white/10 sm:block" />
          <Dropdown
            label="Location"
            icon="pin"
            value={where}
            options={locationOptions}
            onChange={(v) => go({ mine: v === "mine" || v === "both", remote: v === "remote" || v === "both" })}
            className="sm:w-[218px]"
            buttonClassName="h-12 w-full px-3 text-[16px] text-ink sm:px-0 sm:pr-4"
          />
          <button type="submit" className="btn-lavender flex h-12 items-center justify-center gap-2 rounded-full px-7 text-[16px] font-medium hover:brightness-110 sm:ml-2">
            Search
            <Icon name="arrowRight" size={17} />
          </button>
        </form>

        <div className="mt-11 flex w-full gap-[18px] overflow-x-auto px-1 pb-2 [scrollbar-width:none] max-sm:mt-8 max-sm:gap-2.5 sm:flex-wrap sm:justify-center sm:overflow-visible" role="group" aria-label="Role">
          {[{ value: "", label: "All Jobs" }, ...ROLES].map((r) => {
            const on = filters.role === r.value;
            return (
              <button
                key={r.value || "all"}
                type="button"
                aria-pressed={on}
                onClick={() => go({ role: r.value })}
                title={`${(facets.roles[r.value] ?? 0).toLocaleString()} postings`}
                className={`flex h-[44px] flex-none items-center gap-3 rounded-full border px-6 text-[15px] font-medium ${
                  on
                    ? "border-lavender/70 bg-[#1d1638] text-ink shadow-[0_0_0_1px_rgb(102_49_251/0.15),0_8px_30px_-10px_rgb(102_49_251/0.6),inset_0_1px_0_rgb(255_255_255/0.06)]"
                    : "border-white/[0.07] bg-[#15131d] text-soft hover:border-white/15 hover:text-ink"
                }`}
              >
                <Icon name={ROLE_ICONS[r.value]!} size={19} className={on ? "text-ink" : "text-soft"} />
                {r.label}
              </button>
            );
          })}
        </div>
      </section>

      <div ref={top} className="mt-[52px] grid scroll-mt-6 grid-cols-1 gap-x-[35px] gap-y-6 lg:grid-cols-[272px_minmax(0,1fr)] xl:grid-cols-[272px_minmax(0,1fr)_330px]">
        {/* Filters */}
        <aside className="glass h-fit overflow-hidden rounded-[18px] pb-2 lg:sticky lg:top-6" aria-label="Filters">
          <div className="flex items-center justify-between px-6 pb-4 pt-5 max-lg:pb-5">
            <h2 className="text-[18px] font-semibold">
              <button type="button" onClick={() => setShowFilters(!showFilters)} aria-expanded={showFilters} className="flex items-center gap-2 lg:pointer-events-none">
                <Icon name="sliders" size={18} className="text-soft lg:hidden" />
                Filters
                <Icon name="chevronDown" size={16} className={`text-muted transition-transform lg:hidden ${showFilters ? "rotate-180" : ""}`} />
              </button>
            </h2>
            <button type="button" onClick={() => startTransition(() => router.push("/feed", { scroll: false }))} className="text-[14px] text-soft hover:text-lavender">
              Reset
            </button>
          </div>
          <div className={showFilters ? "" : "max-lg:hidden"}>
          <FilterGroup title="Verdict">
            {VERDICT_ORDER.map((v) => (
              <FilterRow key={v} on={filters.verdicts.includes(v)} onClick={() => toggleVerdict(v)} label={VERDICTS[v].label} count={facets.verdicts[v]} dot={VERDICT_STYLE[v].dot} />
            ))}
          </FilterGroup>
          <FilterGroup title="Job Type">
            {JOB_TYPE_VALUES.map((t) => (
              <FilterRow key={t} on={types.includes(t)} onClick={() => toggleType(t)} label={JOB_TYPES[t]!} count={facets.jobTypes[t]} />
            ))}
          </FilterGroup>
          <FilterGroup title="Location">
            <FilterRow on={filters.remote} onClick={() => go({ remote: !filters.remote })} label="Remote" count={facets.location.remote} />
            {hasCities && <FilterRow on={filters.mine} onClick={() => go({ mine: !filters.mine })} label={mineLabel} count={facets.location.mine} />}
          </FilterGroup>
          <FilterGroup title="Date Posted">
            {[0, ...WITHIN_OPTIONS].map((d) => (
              <FilterRow key={d} on={filters.within === d} onClick={() => go({ within: d })} label={WITHIN_LABELS[d]!} count={facets.within[d]} />
            ))}
          </FilterGroup>
          <FilterGroup title="Status" defaultOpen={false}>
            <FilterRow on={filters.showApplied} onClick={() => go({ showApplied: !filters.showApplied })} label="Show jobs I applied to" />
          </FilterGroup>
          </div>
        </aside>

        {/* Results */}
        <section aria-label="Postings" className="min-w-0">
          <div className="flex h-[42px] items-center justify-between gap-4">
            <p className="num text-[16px] text-soft" aria-live="polite">
              <b className="font-semibold text-ink">{total.toLocaleString()}</b> job{total === 1 ? "" : "s"} found
              {pending && <span className="ml-2 text-[13px] text-muted">Loading…</span>}
            </p>
            <Dropdown<FeedSort>
              label="Sort by"
              prefix="Sort by:"
              value={filters.sort}
              options={[
                { value: "relevant", label: "Most relevant", hint: "Eligible first, then newest" },
                { value: "newest", label: "Newest" },
              ]}
              onChange={(sort) => go({ sort })}
              buttonClassName="h-10 text-[15px] text-ink"
            />
          </div>

          <div className={`mt-3 transition-opacity duration-200 ${pending ? "opacity-50" : ""}`} aria-busy={pending}>
            {items.length === 0 ? (
              <div className="glass flex flex-col items-center rounded-[16px] px-6 py-16 text-center">
                <span className="grid size-14 place-items-center rounded-full bg-lavender/10 text-lavender ring-1 ring-inset ring-lavender/15">
                  <Icon name="search" size={24} />
                </span>
                <p className="mt-4 text-[18px] font-semibold">Nothing matches</p>
                <p className="mt-1.5 max-w-[46ch] text-muted">Tick more verdicts in the filters, pick another role, or clear the search.</p>
                <button type="button" onClick={() => router.push("/feed")} className={`${BUTTON.ghost} mt-6 h-11 px-5`}>
                  Reset filters
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {items.map((c, i) => (
                  <Card key={c.id} c={c} now={now} index={i} />
                ))}
              </div>
            )}
          </div>

          {pages > 1 && (
            <nav aria-label="Pages" className="mt-8 flex flex-wrap items-center justify-center gap-1.5">
              <PageButton label="Previous page" disabled={current === 1} onClick={() => go({ page: current - 1 }, { scrollTop: true })}>
                <Icon name="chevronLeft" size={17} />
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
                <Icon name="chevronRight" size={17} />
              </PageButton>
            </nav>
          )}
        </section>

        {/* Right rail */}
        <aside className="hidden flex-col gap-6 xl:flex" aria-label="About your verdicts">
          <section className="relative overflow-hidden rounded-[18px] border border-white/10 bg-[linear-gradient(160deg,#1c1530_0%,#130f20_55%,#100d19_100%)] p-6 pt-[30px] shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]">
            <TowerArt className="absolute right-0 top-0 h-[230px] w-[170px]" />
            <div className="absolute -right-10 -top-10 size-48 rounded-full bg-brand/30 blur-3xl" aria-hidden="true" />
            <div className="relative">
              <p className="inline-flex h-[27px] items-center rounded-full bg-white/[0.07] px-2.5 text-[12.5px] font-semibold uppercase tracking-[0.06em] text-soft">Your profile</p>
              <h2 className="mt-4 text-[29px] font-bold leading-[1.18] tracking-[-0.02em]">
                Verdicts built <br />
                <span className="text-shine">around you</span>
              </h2>
              <p className="mt-4 max-w-[30ch] text-[15px] leading-[1.45] text-soft">Checked against {checkedAgainst}. Change an answer and every verdict updates.</p>
              <Link href="/profile" className={`${BUTTON.white} mt-6 h-[42px] px-6 text-[15px]`}>
                Edit profile
                <Icon name="arrowRight" size={16} />
              </Link>
            </div>
          </section>

          <section className="glass rounded-[18px] p-6">
            <div className="flex items-center">
              {(["eligible", "check", "not_eligible"] as const).map((v, i) => (
                <span
                  key={v}
                  style={{ zIndex: 3 - i }}
                  className={`-mr-2 grid size-10 place-items-center rounded-full bg-[#0f0d17] ring-2 ring-[#15121e] ${VERDICT_STYLE[v].text}`}
                >
                  <Icon name={VERDICT_STYLE[v].icon} size={22} />
                </span>
              ))}
              <span className="num ml-3.5 inline-flex h-9 items-center rounded-full bg-white/[0.07] px-3 text-[13px] font-medium text-soft">
                {facets.verdicts.eligible.toLocaleString()} eligible
              </span>
            </div>
            <h2 className="mt-5 text-[20px] font-bold tracking-[-0.01em]">Every verdict shows its quote</h2>
            <p className="mt-2 text-[15px] leading-[1.45] text-soft">
              Eligible means you meet every requirement the posting states that we evaluated. It isn&apos;t a guarantee from the employer.
            </p>
          </section>

          {updated && (
            <p className="flex items-center gap-2.5 px-2 text-[13px] text-muted">
              <Icon name="refresh" size={15} />
              Postings updated {updated === "today" ? "today" : updated}
            </p>
          )}
        </aside>
      </div>
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
      className={`num grid h-10 min-w-10 place-items-center rounded-full border px-3 text-[14px] font-medium disabled:cursor-not-allowed disabled:opacity-35 ${
        current ? "border-lavender/70 bg-[#1d1638] text-ink shadow-[0_6px_24px_-8px_rgb(102_49_251/0.7)]" : "border-white/[0.08] bg-[#15131d] text-soft hover:border-white/20 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
