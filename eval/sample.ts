// Draw the labeling sample and freeze it (JD text included) as
// eval/dataset/<version>.json. Two strata, reported separately in the eval:
//   random   a seeded random draw over distinct fetched JDs: estimates
//            accuracy on the real mix of postings
//   keyword  JDs containing gate language, at most 2 per company so one
//            employer's boilerplate can't dominate: stresses the hard cases
// The CLI is sampleCli.ts.

export const KEYWORDS =
  /U\.?S\.? citizen|citizenship|sponsor|\bvisa\b|clearance|\bITAR\b|export control|U\.?S\.? person|permanent resident|graduat\w* (date|between|in|by|no later)|expected graduation|return\w* to school|semesters? remaining|rising (sophomore|junior|senior)|class of 20\d\d/i;

// mulberry32: small, well-known seeded PRNG, so the draw is reproducible.
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(xs: T[], rand: () => number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export interface Row {
  jd_hash: string;
  jd_text: string;
  ats: string | null;
  company: string;
  title: string;
  apply_url: string;
  baseline_sponsorship: string | null;
}

export function drawSample(rows: Row[], o: { random: number; keyword: number; seed: number; perCompany?: number }) {
  const all = shuffle(rows, rng(o.seed));
  const random = all.slice(0, o.random);
  const taken = new Set(random.map((r) => r.jd_hash));
  const perCompany = new Map<string, number>();
  const keyword: Row[] = [];
  for (const r of all) {
    if (keyword.length >= o.keyword) break;
    if (taken.has(r.jd_hash) || !KEYWORDS.test(r.jd_text)) continue;
    const c = r.company.toLowerCase();
    if ((perCompany.get(c) ?? 0) >= (o.perCompany ?? 2)) continue;
    perCompany.set(c, (perCompany.get(c) ?? 0) + 1);
    keyword.push(r);
  }
  return [...random.map((r) => ({ r, stratum: "random" as const })), ...keyword.map((r) => ({ r, stratum: "keyword" as const }))].map(
    ({ r, stratum }, i) => ({
      id: `jd-${String(i + 1).padStart(3, "0")}`,
      stratum,
      jdHash: r.jd_hash,
      ats: r.ats,
      company: r.company,
      title: r.title,
      applyUrl: r.apply_url,
      baselineSponsorship: r.baseline_sponsorship,
      jdText: r.jd_text,
    }),
  );
}
