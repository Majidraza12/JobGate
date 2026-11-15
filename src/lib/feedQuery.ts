// Feed filters live in the URL and run on the server, so the browser only
// receives the page of cards it shows (not every open listing). Pure functions:
// the page component parses the URL, applies it, and renders one page.
import type { Verdict } from "@core/match";
import { VERDICT_ORDER } from "./labels";
import { ROLES, type Role } from "./roles";

export const FEED_PAGE = 48;
const DAY = 86_400_000;

// The fields filtering and sorting read; FeedCard has these and more.
export type Filterable = {
  company: string;
  title: string;
  locations: string[];
  cities: string[];
  remote: boolean;
  jobType: "internship" | "co-op" | "new_grad";
  postedAt: string | null;
  verdict: Verdict;
  applied: boolean;
  role?: Role;
};

export type FeedSort = "relevant" | "newest";

// Employers often open one requisition per location for the same job (one
// company had 27, one per state). They stay separate listings (CLAUDE.md
// section 8: never merge on similarity, and their requirements can differ),
// but the feed shows them as one card. Same company, title, and job type.
export const groupKey = (c: Pick<Filterable, "company" | "title" | "jobType">) => `${c.company}\u0000${c.title}\u0000${c.jobType}`;

export type CardGroup = {
  size: number; // matching postings in the group, this one included
  locations: string[]; // every location across them, this card's first
  varies: boolean; // the matching postings don't all have the same verdict
};

export type FeedFilters = {
  verdicts: Verdict[]; // shown verdicts, in VERDICT_ORDER
  jobType: string; // "" = everything, else comma-separated job types
  q: string;
  role: string; // "" = every role, else one ROLES value
  mine: boolean; // the profile's cities (+ remote when allowed)
  remote: boolean; // remote postings
  within: number; // days, 0 = any time
  showApplied: boolean;
  sort: FeedSort;
  page: number;
};

// Not eligible is hidden by default (section 5). Not checked starts hidden too:
// most postings haven't been read yet, and they would bury the rest.
export const DEFAULT_VERDICTS: Verdict[] = ["eligible", "no_restrictions_found", "check"];
export const JOB_TYPE_VALUES = ["internship", "co-op", "new_grad"] as const;
export const WITHIN_OPTIONS = [1, 7, 30] as const;

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

// The profile's job types are the default; "all" in the URL means everything.
export function defaultJobType(profileJobTypes: string[]) {
  return profileJobTypes.length === 0 || profileJobTypes.length === 3 ? "" : profileJobTypes.join(",");
}

export function parseFeedParams(sp: Params, profileJobTypes: string[]): FeedFilters {
  const v = one(sp.v);
  const verdicts = v === undefined ? DEFAULT_VERDICTS : VERDICT_ORDER.filter((x) => v.split(",").includes(x));
  const type = one(sp.type);
  const page = Number.parseInt(one(sp.page) ?? "1", 10);
  const within = Number.parseInt(one(sp.within) ?? "0", 10);
  const role = one(sp.role) ?? "";
  return {
    verdicts,
    jobType: type === undefined ? defaultJobType(profileJobTypes) : type === "all" ? "" : type,
    q: (one(sp.q) ?? "").slice(0, 100),
    role: ROLES.some((r) => r.value === role) ? role : "",
    mine: one(sp.mine) === "1",
    remote: one(sp.remote) === "1",
    within: Number.isFinite(within) && within > 0 ? within : 0,
    showApplied: one(sp.applied) === "1",
    sort: one(sp.sort) === "newest" ? "newest" : "relevant",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

// The URL for these filters with a patch applied. Any change other than the
// page itself goes back to page 1. Defaults are left out to keep URLs short.
export function feedHref(f: FeedFilters, patch: Partial<FeedFilters>, profileJobTypes: string[]): string {
  const next = { ...f, page: 1, ...patch };
  const p = new URLSearchParams();
  const sameVerdicts = next.verdicts.length === DEFAULT_VERDICTS.length && DEFAULT_VERDICTS.every((x) => next.verdicts.includes(x));
  if (!sameVerdicts) p.set("v", VERDICT_ORDER.filter((x) => next.verdicts.includes(x)).join(","));
  if (next.jobType !== defaultJobType(profileJobTypes)) p.set("type", next.jobType || "all");
  if (next.q.trim()) p.set("q", next.q.trim());
  if (next.role) p.set("role", next.role);
  if (next.mine) p.set("mine", "1");
  if (next.remote) p.set("remote", "1");
  if (next.within) p.set("within", String(next.within));
  if (next.showApplied) p.set("applied", "1");
  if (next.sort !== "relevant") p.set("sort", next.sort);
  if (next.page > 1) p.set("page", String(next.page));
  const s = p.toString();
  return s ? `/feed?${s}` : "/feed";
}

const RANK = Object.fromEntries(VERDICT_ORDER.map((v, i) => [v, i])) as Record<Verdict, number>;

// Counts for the sidebar. Each facet is counted with every other filter
// applied but not its own, so a number says what ticking that box would show.
export type FeedFacets = {
  verdicts: Record<Verdict, number>;
  jobTypes: Record<(typeof JOB_TYPE_VALUES)[number], number>;
  roles: Record<string, number>; // "" = all roles
  location: { remote: number; mine: number };
  within: Record<number, number>; // 0 = any time
};

export type FeedPage<T> = { counts: Record<Verdict, number>; facets: FeedFacets; total: number; pages: number; page: number; items: (T & { group: CardGroup })[] };

type Ctx = { cities: string[]; remoteOk: boolean; now: number };
type Facet = "verdict" | "type" | "q" | "role" | "location" | "within" | "applied";

export function applyFeed<T extends Filterable>(cards: T[], f: FeedFilters, ctx: Ctx): FeedPage<T> {
  const needle = f.q.trim().toLowerCase();
  const mine = new Set(ctx.cities);
  // Older profiles saved free-text cities; those still match by substring.
  const legacy = ctx.cities.filter((c) => !c.includes(", ")).map((c) => c.toLowerCase());
  const types = f.jobType ? f.jobType.split(",") : null;
  const shown = new Set(f.verdicts);

  const inMine = (c: T) => (ctx.remoteOk && c.remote) || c.cities.some((x) => mine.has(x)) || c.locations.some((l) => legacy.some((n) => l.toLowerCase().includes(n)));
  const recent = (c: T, days: number) => c.postedAt !== null && ctx.now - Date.parse(c.postedAt) <= days * DAY;

  // One predicate per facet; ticking both location boxes shows either.
  const test: Record<Facet, (c: T) => boolean> = {
    verdict: (c) => shown.has(c.verdict),
    type: (c) => !types || types.includes(c.jobType),
    q: (c) => !needle || `${c.company} ${c.title}`.toLowerCase().includes(needle),
    role: (c) => !f.role || c.role === f.role,
    location: (c) => (!f.mine && !f.remote) || (f.remote && c.remote) || (f.mine && inMine(c)),
    within: (c) => !f.within || recent(c, f.within),
    applied: (c) => f.showApplied || !c.applied,
  };
  const facetsOf = Object.keys(test) as Facet[];
  const passesExcept = (c: T, skip: Facet) => facetsOf.every((k) => k === skip || test[k](c));

  // Facet counts are of cards, so a group counts once per box it would fill.
  const seen = new Map<string, Set<string>>();
  const add = (bucket: string, key: string) => {
    const set = seen.get(bucket) ?? new Set<string>();
    set.add(key);
    seen.set(bucket, set);
  };
  const groups = new Map<string, T[]>();
  for (const c of cards) {
    const key = groupKey(c);
    if (passesExcept(c, "verdict")) add(`v:${c.verdict}`, key);
    if (passesExcept(c, "type")) add(`t:${c.jobType}`, key);
    if (passesExcept(c, "role")) {
      add("r:", key);
      if (c.role) add(`r:${c.role}`, key);
    }
    if (passesExcept(c, "location")) {
      if (c.remote) add("l:remote", key);
      if (inMine(c)) add("l:mine", key);
    }
    if (passesExcept(c, "within")) {
      add("w:0", key);
      for (const d of WITHIN_OPTIONS) if (recent(c, d)) add(`w:${d}`, key);
    }
    if (facetsOf.every((k) => test[k](c))) groups.set(key, [...(groups.get(key) ?? []), c]);
  }
  const n = (bucket: string) => seen.get(bucket)?.size ?? 0;
  const facets: FeedFacets = {
    verdicts: Object.fromEntries(VERDICT_ORDER.map((v) => [v, n(`v:${v}`)])) as Record<Verdict, number>,
    jobTypes: { internship: n("t:internship"), "co-op": n("t:co-op"), new_grad: n("t:new_grad") },
    roles: Object.fromEntries([["", n("r:")], ...ROLES.map((r) => [r.value, n(`r:${r.value}`)])]),
    location: { remote: n("l:remote"), mine: n("l:mine") },
    within: Object.fromEntries([0, ...WITHIN_OPTIONS].map((d) => [d, n(`w:${d}`)])),
  };

  const newest = (a: T, b: T) => (b.postedAt ?? "").localeCompare(a.postedAt ?? "");
  const best = (a: T, b: T) => RANK[a.verdict] - RANK[b.verdict] || newest(a, b);
  // Each group is shown by its best posting, so a job the user can apply to
  // somewhere is never hidden behind a worse verdict elsewhere.
  const list = [...groups.values()].map((members) => {
    const [lead, ...rest] = [...members].sort(best);
    const locations = [...new Set([lead!, ...rest].flatMap((m) => m.locations))];
    return { ...lead!, group: { size: members.length, locations, varies: rest.some((m) => m.verdict !== lead!.verdict) } };
  });
  list.sort(f.sort === "newest" ? newest : best);

  const pages = Math.max(1, Math.ceil(list.length / FEED_PAGE));
  // Clamp, in case a filter shrank the list while on a later page.
  const page = Math.min(f.page, pages);
  return { counts: facets.verdicts, facets, total: list.length, pages, page, items: list.slice((page - 1) * FEED_PAGE, page * FEED_PAGE) };
}
