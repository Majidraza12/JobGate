// Feed filters live in the URL and run on the server, so the browser only
// receives the page of cards it shows (not every open listing). Pure functions:
// the page component parses the URL, applies it, and renders one page.
import type { Verdict } from "@core/match";
import { VERDICT_ORDER } from "./labels";

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
};

export type FeedFilters = {
  verdicts: Verdict[]; // shown verdicts, in VERDICT_ORDER
  jobType: string; // "" = everything, else comma-separated job types
  q: string;
  mine: boolean; // only the profile's cities (+ remote)
  within: number; // days, 0 = any time
  showApplied: boolean;
  page: number;
};

// Not eligible is hidden by default (section 5). Not checked starts hidden too:
// most postings haven't been read yet, and they would bury the rest.
export const DEFAULT_VERDICTS: Verdict[] = ["eligible", "no_restrictions_found", "check"];

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
  return {
    verdicts,
    jobType: type === undefined ? defaultJobType(profileJobTypes) : type === "all" ? "" : type,
    q: (one(sp.q) ?? "").slice(0, 100),
    mine: one(sp.mine) === "1",
    within: Number.isFinite(within) && within > 0 ? within : 0,
    showApplied: one(sp.applied) === "1",
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
  if (next.mine) p.set("mine", "1");
  if (next.within) p.set("within", String(next.within));
  if (next.showApplied) p.set("applied", "1");
  if (next.page > 1) p.set("page", String(next.page));
  const s = p.toString();
  return s ? `/feed?${s}` : "/feed";
}

const RANK = Object.fromEntries(VERDICT_ORDER.map((v, i) => [v, i])) as Record<Verdict, number>;

export type FeedPage<T> = { counts: Record<Verdict, number>; total: number; pages: number; page: number; items: T[] };

// Filters, counts each verdict (before the verdict filter, so the toggles show
// what turning them on would add), sorts most relevant first (verdict order,
// then newest), and slices one page.
export function applyFeed<T extends Filterable>(cards: T[], f: FeedFilters, ctx: { cities: string[]; remoteOk: boolean; now: number }): FeedPage<T> {
  const needle = f.q.trim().toLowerCase();
  const mine = new Set(ctx.cities);
  // Older profiles saved free-text cities; those still match by substring.
  const legacy = ctx.cities.filter((c) => !c.includes(", ")).map((c) => c.toLowerCase());
  const types = f.jobType ? f.jobType.split(",") : null;

  const base = cards.filter(
    (c) =>
      (!types || types.includes(c.jobType)) &&
      (!needle || `${c.company} ${c.title}`.toLowerCase().includes(needle)) &&
      (!f.mine || (ctx.remoteOk && c.remote) || c.cities.some((x) => mine.has(x)) || c.locations.some((l) => legacy.some((n) => l.toLowerCase().includes(n)))) &&
      (!f.within || (c.postedAt !== null && ctx.now - Date.parse(c.postedAt) <= f.within * DAY)) &&
      (f.showApplied || !c.applied),
  );

  const counts = Object.fromEntries(VERDICT_ORDER.map((v) => [v, 0])) as Record<Verdict, number>;
  for (const c of base) counts[c.verdict]++;

  const shown = new Set(f.verdicts);
  const list = base
    .filter((c) => shown.has(c.verdict))
    .sort((a, b) => RANK[a.verdict] - RANK[b.verdict] || (b.postedAt ?? "").localeCompare(a.postedAt ?? ""));

  const pages = Math.max(1, Math.ceil(list.length / FEED_PAGE));
  // Clamp, in case a filter shrank the list while on a later page.
  const page = Math.min(f.page, pages);
  return { counts, total: list.length, pages, page, items: list.slice((page - 1) * FEED_PAGE, page * FEED_PAGE) };
}
