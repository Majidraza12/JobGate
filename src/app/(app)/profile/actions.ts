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
  grad_month: z.string().optional(),
  degree: z.enum(["bs", "ms", "phd", "none"]),
  us_citizen: yesNo,
  // Not sent when an earlier answer settles them (see ProfileForm).
  permanent_resident: yesNo.optional(),
  authorized_now_without_sponsorship: yesNo.optional(),
  needs_sponsorship_future: yesNo.optional(),
  clearance: z.enum(["none", "prefer_not_to_say", "active:secret", "active:top_secret", "active:ts_sci"]),
  starts: z.string(),
  job_types: z.array(z.enum(["internship", "co-op", "new_grad"])).min(1, "Pick at least one job type."),
  locations: z.array(z.string().trim().min(1).max(80)).max(20, "Pick up to 20 cities."),
  remote_ok: z.literal("on").optional(),
});

export async function saveProfile(_prev: ProfileState, form: FormData): Promise<ProfileState> {
  const parsed = Form.safeParse({ ...Object.fromEntries(form), job_types: form.getAll("job_types"), locations: form.getAll("locations") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  const f = parsed.data;
  // No degree means no graduation month; any degree needs one.
  const gradMonth = f.degree === "none" ? null : (f.grad_month ?? "");
  if (gradMonth !== null && !/^\d{4}-(0[1-9]|1[0-2])$/.test(gradMonth)) return { error: "Pick your graduation month." };
  const pr = !f.us_citizen && f.permanent_resident === true;
  const citizenOrPr = f.us_citizen || pr;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [status, level] = f.clearance.split(":") as ["active" | "none" | "prefer_not_to_say", string | undefined];
  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    grad_month: gradMonth,
    degree: f.degree,
    us_citizen: f.us_citizen,
    permanent_resident: pr,
    // Citizens and permanent residents are authorized without sponsorship by definition.
    authorized_now_without_sponsorship: citizenOrPr || f.authorized_now_without_sponsorship === true,
    needs_sponsorship_future: citizenOrPr ? false : f.needs_sponsorship_future === true,
    clearance_status: status,
    clearance_level: level ?? null,
    starts: list(f.starts),
    job_types: f.job_types,
    locations: f.locations,
    remote_ok: f.remote_ok === "on",
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: "Couldn't save your profile. Try again." };
  revalidatePath("/", "layout");
  redirect("/");
}
