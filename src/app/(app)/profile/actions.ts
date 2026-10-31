"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ProfileState = { error: string | null };

const yesNo = z.enum(["yes", "no"]).transform((v) => v === "yes");
const list = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

const Form = z.object({
  grad_month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Pick your graduation month."),
  degree: z.enum(["bs", "ms", "phd"]),
  us_citizen: yesNo,
  permanent_resident: yesNo,
  authorized_now_without_sponsorship: yesNo,
  needs_sponsorship_future: yesNo,
  clearance: z.enum(["none", "prefer_not_to_say", "active:secret", "active:top_secret", "active:ts_sci"]),
  starts: z.string(),
  job_types: z.array(z.enum(["internship", "co-op", "new_grad"])).min(1, "Pick at least one job type."),
  locations: z.string(),
  remote_ok: z.literal("on").optional(),
});

export async function saveProfile(_prev: ProfileState, form: FormData): Promise<ProfileState> {
  const parsed = Form.safeParse({ ...Object.fromEntries(form), job_types: form.getAll("job_types") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  const f = parsed.data;
  const citizenOrPr = f.us_citizen || f.permanent_resident;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [status, level] = f.clearance.split(":") as ["active" | "none" | "prefer_not_to_say", string | undefined];
  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    grad_month: f.grad_month,
    degree: f.degree,
    us_citizen: f.us_citizen,
    permanent_resident: f.permanent_resident,
    // Citizens and permanent residents are authorized without sponsorship by definition.
    authorized_now_without_sponsorship: citizenOrPr || f.authorized_now_without_sponsorship,
    needs_sponsorship_future: citizenOrPr ? false : f.needs_sponsorship_future,
    clearance_status: status,
    clearance_level: level ?? null,
    starts: list(f.starts),
    job_types: f.job_types,
    locations: list(f.locations),
    remote_ok: f.remote_ok === "on",
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: "Couldn't save your profile. Try again." };
  revalidatePath("/", "layout");
  redirect("/");
}
