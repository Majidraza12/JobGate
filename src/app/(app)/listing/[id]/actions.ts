"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { GATE_FIELDS } from "@core/requirements";
import { createClient } from "@/lib/supabase/server";
import { PROMPT_VERSION } from "../../../../../pipeline/extract/prompt";

// Server actions are public HTTP endpoints: their arguments come from the
// caller, not from our components, so every one is checked here.
const ListingId = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);

export async function setApplied(listingId: number, applied: boolean) {
  if (!ListingId.safeParse(listingId).success || typeof applied !== "boolean") throw new Error("Couldn't update. Try again.");
  const supabase = await createClient();
  // RLS scopes both statements to the signed-in user's own rows.
  const { error } = applied
    ? await supabase.from("applications").upsert({ listing_id: listingId }, { onConflict: "user_id,listing_id", ignoreDuplicates: true })
    : await supabase.from("applications").delete().eq("listing_id", listingId);
  if (error) throw new Error("Couldn't update. Try again.");
  revalidatePath("/", "layout");
}

export type FeedbackState = { sent: boolean; error: string | null };

const Feedback = z.object({
  listingId: ListingId,
  verdictShown: z.enum(["not_eligible", "not_checked", "check", "eligible", "no_restrictions_found"]),
  field: z.enum(GATE_FIELDS).nullable(),
  comment: z.string().max(2000),
});

export async function sendFeedback(listingId: number, verdictShown: string, _prev: FeedbackState, form: FormData): Promise<FeedbackState> {
  const parsed = Feedback.safeParse({
    listingId,
    verdictShown,
    field: String(form.get("field") ?? "") || null,
    comment: String(form.get("comment") ?? "").slice(0, 2000),
  });
  if (!parsed.success) return { sent: false, error: "Couldn't send. Try again." };
  const supabase = await createClient();
  const { error } = await supabase.from("verdict_feedback").insert({
    listing_id: parsed.data.listingId,
    verdict_shown: parsed.data.verdictShown,
    prompt_version: PROMPT_VERSION,
    field: parsed.data.field,
    comment: parsed.data.comment,
  });
  if (error) return { sent: false, error: "Couldn't send. Try again." };
  return { sent: true, error: null };
}
