import { createClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/lib/profile";
import { ProfileForm } from "./ProfileForm";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").maybeSingle<ProfileRow>();

  return (
    <div className="mx-auto max-w-[1100px]">
      <h1 className="text-[24px] font-medium leading-8">Profile</h1>
      <p className="mt-1 text-muted">
        {data
          ? "Every verdict in your feed is computed from these answers. Change one and the feed updates."
          : "Answer these once. Every verdict in your feed is computed from them."}
      </p>
      <ProfileForm profile={data} />
    </div>
  );
}
