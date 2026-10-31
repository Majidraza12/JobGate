import { createClient } from "@/lib/supabase/server";
import { cityCounts } from "@core/cities";
import { all } from "@/lib/feed";
import type { ProfileRow } from "@/lib/profile";
import { ProfileForm } from "./ProfileForm";

export default async function ProfilePage() {
  const supabase = await createClient();
  const [{ data }, locations] = await Promise.all([
    supabase.from("profiles").select("*").maybeSingle<ProfileRow>(),
    // City suggestions come from the open listings, so every pick matches real postings.
    all<{ locations: string[] }>((from, to) => supabase.from("listings").select("locations").eq("status", "open").order("id").range(from, to)),
  ]);

  return (
    <div className="mx-auto max-w-[1100px]">
      <h1 className="text-[24px] font-medium leading-8">Profile</h1>
      <p className="mt-1 text-muted">
        {data
          ? "Every verdict in your feed is computed from these answers. Change one and the feed updates."
          : "Answer these once. Every verdict in your feed is computed from them."}
      </p>
      <ProfileForm profile={data} cityOptions={cityCounts(locations.map((l) => l.locations))} />
    </div>
  );
}
