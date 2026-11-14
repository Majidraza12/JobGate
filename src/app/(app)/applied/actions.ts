"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const Update = z.object({
  status: z.enum(["applied", "online_assessment", "interview", "offer", "rejected"]),
  notes: z.string().max(2000),
});

// Server actions are public HTTP endpoints, so the id is checked like any input.
const validId = (id: unknown): id is number => Number.isSafeInteger(id) && (id as number) > 0;

export async function updateApplication(id: number, form: FormData) {
  const parsed = Update.safeParse(Object.fromEntries(form));
  if (!validId(id) || !parsed.success) return;
  const supabase = await createClient();
  // RLS limits the update to the signed-in user's own row.
  const { error } = await supabase.from("applications").update({ ...parsed.data, updated_at: new Date().toISOString() }).eq("id", id);
  // Revalidate either way: on failure the page then shows what is really saved.
  revalidatePath("/applied");
  if (error) throw new Error("Couldn't save. Try again.");
}

export async function removeApplication(id: number) {
  if (!validId(id)) return;
  const supabase = await createClient();
  // RLS limits the delete to the signed-in user's own row.
  const { error } = await supabase.from("applications").delete().eq("id", id);
  revalidatePath("/", "layout");
  if (error) throw new Error("Couldn't remove. Try again.");
}
