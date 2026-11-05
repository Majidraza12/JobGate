import { createClient } from "@/lib/supabase/server";
import { cityCountsFromLocations, cityOptions } from "@core/cities";
import usCities from "@core/usCities.json";
import { loadFeed } from "@/lib/feed";
import { toEligibility, type ProfileRow } from "@/lib/profile";
import { VERDICT_ORDER } from "@/lib/labels";
import type { Verdict } from "@core/match";
import { ProfileForm, type Recommended } from "./ProfileForm";

export default async function ProfilePage() {
  const supabase = await createClient();
  const [{ data }, locations, { data: user }, { data: saved }] = await Promise.all([
    supabase.from("profiles").select("*").maybeSingle<ProfileRow>(),
    // Suggestions: cities in open listings (with counts), then Census cities with none yet.
    // Grouped in Postgres: one request instead of every listing's locations.
    supabase.rpc("open_location_counts"),
    supabase.auth.getUser(),
    supabase.from("saved_listings").select("listing_id"),
  ]);
  if (locations.error) throw new Error(locations.error.message);

  // The right column's live numbers: what this profile's feed looks like now.
  let counts: Record<Verdict, number> | null = null;
  let recommended: Recommended[] = [];
  if (data) {
    const items = await loadFeed(supabase, toEligibility(data));
    counts = Object.fromEntries(VERDICT_ORDER.map((v) => [v, items.filter((i) => i.verdict === v).length])) as Record<Verdict, number>;
    const savedIds = new Set((saved ?? []).map((s) => s.listing_id as number));
    recommended = items
      .filter((i) => i.verdict === "eligible" && (data.job_types.length === 0 || data.job_types.includes(i.job_type)))
      .sort((a, b) => (b.posted_at ?? "").localeCompare(a.posted_at ?? ""))
      .slice(0, 3)
      .map((i) => ({ id: i.id, company: i.company, title: i.title, location: i.locations[0] ?? null, jobType: i.job_type, saved: savedIds.has(i.id) }));
  }

  return (
    <ProfileForm
      profile={data}
      email={user.user?.email ?? ""}
      counts={counts}
      recommended={recommended}
      cityOptions={cityOptions(cityCountsFromLocations((locations.data ?? []) as { location: string; listings: number }[]), usCities)}
    />
  );
}
