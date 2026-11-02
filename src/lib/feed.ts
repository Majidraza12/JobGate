// Loads open listings with their stored requirements and matches each against
// the user's profile. Runs on the server as the signed-in user, so RLS applies.
// Matching is pure TypeScript: no API calls, nothing per user stored.
import type { SupabaseClient } from "@supabase/supabase-js";
import { match, type JobType, type MatchResult, type StoredRequirements } from "@core/match";
import type { StoredExtraction } from "@core/requirements";
import type { EligibilityProfile } from "@core/profile";
import { PRODUCTION_MODEL } from "../../pipeline/extract/llm";
import { PROMPT_VERSION } from "../../pipeline/extract/prompt";

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

export async function loadRequirements(supabase: SupabaseClient, hashes?: string[]) {
  let q = supabase.from("requirements").select("jd_hash, extraction_status, extracted").eq("prompt_version", PROMPT_VERSION).eq("model", PRODUCTION_MODEL);
  if (hashes) q = q.in("jd_hash", hashes);
  const rows = await all<RequirementRow>((from, to) => q.range(from, to));
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

export async function loadFeed(supabase: SupabaseClient, profile: EligibilityProfile): Promise<FeedItem[]> {
  const [listings, reqs] = await Promise.all([
    all<ListingRow>((from, to) => supabase.from("listings").select(LISTING_COLUMNS).eq("status", "open").order("id").range(from, to)),
    loadRequirements(supabase),
  ]);
  return listings.map((l) => matchListing(l, reqs, profile));
}
