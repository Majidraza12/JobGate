import { createClient } from "@/lib/supabase/server";
import { cityCounts, cityOptions } from "@core/cities";
import usCities from "@core/usCities.json";
import { all } from "@/lib/feed";
import type { ProfileRow } from "@/lib/profile";
import { ProfileForm } from "./ProfileForm";

export default async function ProfilePage() {
  const supabase = await createClient();
  const [{ data }, locations] = await Promise.all([
    supabase.from("profiles").select("*").maybeSingle<ProfileRow>(),
    // Suggestions: cities in open listings (with counts), then Census cities with none yet.
    all<{ locations: string[] }>((from, to) => supabase.from("listings").select("locations").eq("status", "open").order("id").range(from, to)),
  ]);

  return (
    <div>
      <h1 className="font-display text-[34px] font-bold tracking-[-0.02em]">Profile</h1>
      <p className="mt-2 text-muted">
        {data
          ? "Every verdict in your feed is computed from these answers. Change one and the feed updates."
          : "Answer these once. Every verdict in your feed is computed from them."}
      </p>
      <ProfileForm profile={data} cityOptions={cityOptions(cityCounts(locations.map((l) => l.locations)), usCities)} />
    </div>
  );
}
