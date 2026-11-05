"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const Update = z.object({
  status: z.enum(["applied", "online_assessment", "interview", "offer", "rejected"]),
  notes: z.string().max(2000),
});

export async function updateApplication(id: number, form: FormData) {
  const parsed = Update.safeParse(Object.fromEntries(form));
  if (!parsed.success) return;
  const supabase = await createClient();
  await supabase.from("applications").update({ ...parsed.data, updated_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/applied");
}

export async function removeApplication(id: number) {
  if (!Number.isInteger(id)) return;
  const supabase = await createClient();
  // RLS limits the delete to the signed-in user's own row.
  await supabase.from("applications").delete().eq("id", id);
  revalidatePath("/", "layout");
}
