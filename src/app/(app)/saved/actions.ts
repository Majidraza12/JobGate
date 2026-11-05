"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Bookmark or un-bookmark a posting. RLS scopes both to the signed-in user.
export async function setSaved(listingId: number, saved: boolean) {
  if (!Number.isInteger(listingId)) return;
  const supabase = await createClient();
  const { error } = saved
    ? await supabase.from("saved_listings").upsert({ listing_id: listingId }, { onConflict: "user_id,listing_id", ignoreDuplicates: true })
    : await supabase.from("saved_listings").delete().eq("listing_id", listingId);
  if (error) throw new Error("Couldn't update. Try again.");
  revalidatePath("/", "layout");
}
