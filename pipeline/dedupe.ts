import { identify, normalizeUrl, type Identity } from "@core/identity";
import type { JobType, RawListing, SourceId } from "./types";

// Lower number wins when two sources describe the same posting. zshah101 comes
// first because its data comes straight from ATS APIs; Simplify is discovery only.
export const SOURCE_PRIORITY: Record<SourceId, number> = { zshah101: 0, "simplify-newgrad": 1 };

export interface CanonicalListing {
  identity: Identity;
  normalizedUrl: string;
  company: string;
  title: string;
  locations: string[];
  applyUrl: string;
  postedAt: string | null;
  postedAtPrecision: "date" | "datetime" | null;
  jobType: JobType;
  season: string | null;
  remote: boolean | null;
  baselineSponsorship: string | null;
  primarySourceId: SourceId;
  members: RawListing[];
}

export interface IdentifiedRecords {
  canonical: CanonicalListing[];
  unidentifiable: { record: RawListing; reason: string }[];
}

const first = <T>(xs: RawListing[], pick: (r: RawListing) => T | null): T | null => {
  for (const x of xs) {
    const v = pick(x);
    if (v !== null) return v;
  }
  return null;
};

// Group records by identity key. Only an identical key (same ATS requisition,
// or same normalized URL) merges records; similarity never does.
export function canonicalize(records: RawListing[]): IdentifiedRecords {
  const groups = new Map<string, { identity: Identity; members: RawListing[] }>();
  const unidentifiable: IdentifiedRecords["unidentifiable"] = [];
  for (const r of records) {
    let identity: Identity;
    try {
      identity = identify(r.applyUrl, r.atsHint);
    } catch (e) {
      unidentifiable.push({ record: r, reason: e instanceof Error ? e.message : String(e) });
      continue;
    }
    const g = groups.get(identity.key);
    if (g) g.members.push(r);
    else groups.set(identity.key, { identity, members: [r] });
  }

  const canonical = [...groups.values()].map(({ identity, members }) => {
    const ordered = [...members].sort((a, b) => SOURCE_PRIORITY[a.sourceId] - SOURCE_PRIORITY[b.sourceId]);
    const p = ordered[0]!;
    return {
      identity,
      normalizedUrl: normalizeUrl(p.applyUrl),
      company: p.company,
      title: p.title,
      locations: p.locations.length ? p.locations : (ordered.find((m) => m.locations.length)?.locations ?? []),
      applyUrl: p.applyUrl,
      postedAt: first(ordered, (m) => m.postedAt),
      postedAtPrecision: first(ordered, (m) => (m.postedAt ? m.postedAtPrecision : null)),
      jobType: p.jobType,
      season: first(ordered, (m) => m.season),
      remote: first(ordered, (m) => m.remote),
      baselineSponsorship: first(ordered, (m) => m.baselineSponsorship),
      primarySourceId: p.sourceId,
      members: ordered,
    };
  });
  return { canonical, unidentifiable };
}

export interface DuplicateCandidate {
  id: number;
  company: string;
  title: string;
  season: string | null;
  locations: string[];
  ats: string | null;
  atsTenant: string | null;
  atsReqId: string | null;
}

export type DuplicateReason = "same_company_title_season_location" | "workday_posting_suffix";

export interface PossibleDuplicate {
  a: number;
  b: number;
  reason: DuplicateReason;
}

const norm = (s: string) =>
  s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function pairs(ids: number[], reason: DuplicateReason, out: Map<string, PossibleDuplicate>) {
  const sorted = [...ids].sort((x, y) => x - y);
  for (let i = 0; i < sorted.length; i++)
    for (let j = i + 1; j < sorted.length; j++) {
      const key = `${sorted[i]}:${sorted[j]}`;
      if (!out.has(key)) out.set(key, { a: sorted[i]!, b: sorted[j]!, reason });
    }
}

// Flag listings that look alike but were not proven identical. These are shown
// to the user as a group ("3 similar openings"), never merged or deleted.
export function findPossibleDuplicates(rows: DuplicateCandidate[]): PossibleDuplicate[] {
  const out = new Map<string, PossibleDuplicate>();
  const bySimilarity = new Map<string, number[]>();
  const byWorkdayBase = new Map<string, number[]>();
  for (const r of rows) {
    const loc = r.locations.map(norm).sort().join("|");
    const k = [norm(r.company), norm(r.title), norm(r.season ?? ""), loc].join("::");
    bySimilarity.set(k, [...(bySimilarity.get(k) ?? []), r.id]);
    // Workday "-1", "-2" posting suffixes on one requisition. Kept as separate
    // listings by identify(); grouped here so the user sees them together.
    if (r.ats === "workday" && r.atsTenant && r.atsReqId && /-\d{1,2}$/.test(r.atsReqId)) {
      const base = `${r.atsTenant}:${r.atsReqId.replace(/-\d{1,2}$/, "")}`;
      byWorkdayBase.set(base, [...(byWorkdayBase.get(base) ?? []), r.id]);
    }
  }
  for (const ids of bySimilarity.values()) if (ids.length > 1) pairs(ids, "same_company_title_season_location", out);
  for (const ids of byWorkdayBase.values()) if (ids.length > 1) pairs(ids, "workday_posting_suffix", out);
  return [...out.values()];
}
