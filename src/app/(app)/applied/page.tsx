import { createClient } from "@/lib/supabase/server";
import { ApplicationsView, type Application } from "./ApplicationRow";

export default async function AppliedPage() {
  const supabase = await createClient();
  const [{ data }, { data: saved }] = await Promise.all([
    supabase
      .from("applications")
      .select("id, status, notes, applied_at, updated_at, listing_id, listings(company, title, apply_url, locations, job_type)")
      .order("applied_at", { ascending: false })
      .returns<Application[]>(),
    supabase.from("saved_listings").select("listing_id"),
  ]);

  return <ApplicationsView apps={data ?? []} savedIds={(saved ?? []).map((s) => s.listing_id as number)} />;
}
