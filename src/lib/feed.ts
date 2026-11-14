// Loads open listings with their stored requirements and matches each against
// the user's profile. Runs on the server as the signed-in user, so RLS applies.
// Matching is pure TypeScript: no API calls, nothing per user stored.
import type { SupabaseClient } from "@supabase/supabase-js";
import { match, type JobType, type MatchResult, type StoredRequirements } from "@core/match";
import type { StoredExtraction } from "@core/requirements";
import type { EligibilityProfile } from "@core/profile";
import { PRODUCTION_MODEL } from "../../pipeline/extract/llm";
import { PROMPT_VERSION } from "../../pipeline/extract/prompt";
import { memo } from "./memo";

export const LISTING_COLUMNS = "id, company, title, locations, job_type, posted_at, apply_url, jd_hash, jd_fetch_status, remote";

export type ListingRow = {
  id: number;
  company: string;
  title: string;
  locations: string[];
  job_type: "internship" | "co-op" | "new_grad";
  posted_at: string | null;
  apply_url: string;
  jd_hash: string | null;
  jd_fetch_status: string | null;
  remote: boolean | null;
};

type RequirementRow = { jd_hash: string; extraction_status: StoredRequirements["extraction_status"]; extracted: StoredExtraction | null };

// Why a listing has no verdict, in the user's words. "Not read yet" and
// "couldn't read" are different facts and are never shown the same way.
export type Unchecked = "not_fetched" | "not_read_yet" | null;

export type FeedItem = ListingRow & MatchResult & { unchecked: Unchecked; roleFamily: string | null };

export const jobTypeOf = (t: ListingRow["job_type"]): JobType => (t === "new_grad" ? "full-time" : t);

const PAGE = 1000; // PostgREST's default row cap per request

export async function all<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await query(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) return out;
  }
}

// A hash is 64 characters and the filter travels in the URL, so a long list is
// sent in pieces that stay well under URL length limits.
export const HASH_CHUNK = 50;

export async function loadRequirements(supabase: SupabaseClient, hashes?: string[]) {
  const base = () => supabase.from("requirements").select("jd_hash, extraction_status, extracted").eq("prompt_version", PROMPT_VERSION).eq("model", PRODUCTION_MODEL);
  // Ordered, because paging with range() over an unordered query can skip or
  // repeat rows between pages. jd_hash is unique per prompt version and model.
  const page = (hs?: string[]) => all<RequirementRow>((from, to) => (hs ? base().in("jd_hash", hs) : base()).order("jd_hash").range(from, to));
  let rows: RequirementRow[];
  if (!hashes) rows = await page();
  else {
    const unique = [...new Set(hashes)];
    const parts = await Promise.all(Array.from({ length: Math.ceil(unique.length / HASH_CHUNK) }, (_, i) => page(unique.slice(i * HASH_CHUNK, (i + 1) * HASH_CHUNK))));
    rows = parts.flat();
  }
  return new Map(rows.map((r) => [r.jd_hash, r]));
}

export function matchListing(l: ListingRow, reqs: Map<string, RequirementRow>, profile: EligibilityProfile): FeedItem {
  const r = l.jd_hash ? reqs.get(l.jd_hash) : undefined;
  if (r) {
    return { ...l, ...match(r, profile, jobTypeOf(l.job_type)), unchecked: null, roleFamily: r.extracted?.role_family ?? null };
  }
  const unchecked: Unchecked = l.jd_fetch_status === "ok" ? "not_read_yet" : "not_fetched";
  const result = match({ extraction_status: "jd_unavailable", extracted: null }, profile, jobTypeOf(l.job_type));
  const why = unchecked === "not_read_yet" ? "We have this posting but haven't read it yet." : "We couldn't fetch this posting's description.";
  return { ...l, ...result, rows: result.rows.map((row) => ({ ...row, explanation: why })), unchecked, roleFamily: null };
}

// Open listings and requirements are the same for every signed-in user (RLS
// lets any of them read all of it) and change only when the pipeline runs,
// every 2 hours. So they are cached for a few minutes instead of re-read from
// the database on every request. Matching stays per request and per user.
const OPEN_DATA_TTL = 5 * 60_000;

function loadOpenData(supabase: SupabaseClient) {
  return memo("open-listings", OPEN_DATA_TTL, () =>
    Promise.all([
      all<ListingRow>((from, to) => supabase.from("listings").select(LISTING_COLUMNS).eq("status", "open").order("id").range(from, to)),
      loadRequirements(supabase),
    ]),
  );
}

export async function loadFeed(supabase: SupabaseClient, profile: EligibilityProfile): Promise<FeedItem[]> {
  const [listings, reqs] = await loadOpenData(supabase);
  return listings.map((l) => matchListing(l, reqs, profile));
}
