import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cityOf } from "@core/cities";
import { LISTING_COLUMNS, loadRequirements, matchListing, type ListingRow } from "@/lib/feed";
import { toEligibility, type ProfileRow } from "@/lib/profile";
import { roleOf } from "@/lib/roles";
import { SavedView, type SavedCard } from "./SavedView";

export default async function SavedPage() {
  const supabase = await createClient();
  const [{ data: profile }, { data: saved }, { data: applied }] = await Promise.all([
    supabase.from("profiles").select("*").maybeSingle<ProfileRow>(),
    supabase.from("saved_listings").select("listing_id, saved_at").order("saved_at", { ascending: false }),
    supabase.from("applications").select("listing_id"),
  ]);
  if (!profile) redirect("/profile");

  const savedAt = new Map((saved ?? []).map((s) => [s.listing_id as number, s.saved_at as string]));
  const ids = [...savedAt.keys()];
  const { data: listings } = ids.length
    ? await supabase.from("listings").select(LISTING_COLUMNS).in("id", ids).returns<ListingRow[]>()
    : { data: [] as ListingRow[] };
  const rows = listings ?? [];
  const reqs = await loadRequirements(supabase, rows.map((l) => l.jd_hash).filter((h): h is string => h !== null));
  const elig = toEligibility(profile);
  const appliedIds = new Set((applied ?? []).map((a) => a.listing_id as number));

  const cards: SavedCard[] = rows
    .map((l) => {
      const item = matchListing(l, reqs, elig);
      const row = (["conflict", "unclear", "satisfied"] as const).map((s) => item.rows.find((r) => r.status === s && r.evidence.length)).find(Boolean);
      return {
        id: l.id,
        company: l.company,
        title: l.title,
        locations: l.locations,
        cities: l.locations.map(cityOf).filter((c): c is string => c !== null),
        remote: l.remote === true,
        jobType: l.job_type,
        applyUrl: l.apply_url,
        verdict: item.verdict,
        unchecked: item.unchecked,
        quote: row?.evidence[0] ?? null,
        quoteField: row?.field ?? null,
        role: roleOf(l.title, item.roleFamily),
        savedAt: savedAt.get(l.id)!,
        applied: appliedIds.has(l.id),
      };
    })
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt));

  return <SavedView cards={cards} myCities={profile.locations} remoteOk={profile.remote_ok} />;
}
