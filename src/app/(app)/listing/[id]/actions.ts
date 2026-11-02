"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { PROMPT_VERSION } from "../../../../../pipeline/extract/prompt";

export async function setApplied(listingId: number, applied: boolean) {
  const supabase = await createClient();
  // RLS scopes both statements to the signed-in user's own rows.
  const { error } = applied
    ? await supabase.from("applications").upsert({ listing_id: listingId }, { onConflict: "user_id,listing_id", ignoreDuplicates: true })
    : await supabase.from("applications").delete().eq("listing_id", listingId);
  if (error) throw new Error("Couldn't update. Try again.");
  revalidatePath("/", "layout");
}

export type FeedbackState = { sent: boolean; error: string | null };

export async function sendFeedback(listingId: number, verdictShown: string, _prev: FeedbackState, form: FormData): Promise<FeedbackState> {
  const supabase = await createClient();
  const field = String(form.get("field") ?? "");
  const { error } = await supabase.from("verdict_feedback").insert({
    listing_id: listingId,
    verdict_shown: verdictShown,
    prompt_version: PROMPT_VERSION,
    field: field || null,
    comment: String(form.get("comment") ?? "").slice(0, 2000),
  });
  if (error) return { sent: false, error: "Couldn't send. Try again." };
  return { sent: true, error: null };
}
