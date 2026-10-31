import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadFeed, type FeedItem } from "@/lib/feed";
import { toEligibility, type ProfileRow } from "@/lib/profile";
import { FeedView, type FeedCard } from "./FeedView";

// The row that most drove the verdict, for the card's quote.
function decider(item: FeedItem) {
  for (const s of ["conflict", "unclear", "satisfied"] as const) {
    const row = item.rows.find((r) => r.status === s && r.evidence.length);
    if (row) return { quote: row.evidence[0]!, field: row.field };
  }
  return null;
}

// "The verdict is a summary; the requirement table is the truth": a card says
// what a higher-precedence verdict would otherwise hide (CLAUDE.md section 5).
function secondaryNote(item: FeedItem): string | null {
  if (item.verdict === "not_checked") return null;
  const failed = item.rows.filter((r) => r.status === "extraction_failed").length;
  const unclear = item.rows.filter((r) => r.status === "unclear").length;
  const parts: string[] = [];
  if (item.verdict === "not_eligible" && unclear) parts.push(`${unclear} other requirement${unclear > 1 ? "s" : ""} unclear`);
  if (failed) parts.push(`${failed} requirement${failed > 1 ? "s" : ""} couldn't be read`);
  return parts.join(" · ") || null;
}

export default async function FeedPage() {
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("*").maybeSingle<ProfileRow>();
  if (!profile) redirect("/profile");

  const [items, { data: applied }] = await Promise.all([
    loadFeed(supabase, toEligibility(profile)),
    supabase.from("applications").select("listing_id"),
  ]);
  const appliedIds = new Set((applied ?? []).map((a) => a.listing_id as number));

  const cards: FeedCard[] = items.map((i) => {
    const d = decider(i);
    return {
      id: i.id,
      company: i.company,
      title: i.title,
      locations: i.locations,
      remote: i.remote === true,
      jobType: i.job_type,
      postedAt: i.posted_at,
      verdict: i.verdict,
      unchecked: i.unchecked,
      quote: d?.quote ?? null,
      quoteField: d?.field ?? null,
      note: secondaryNote(i),
      applied: appliedIds.has(i.id),
    };
  });

  return <FeedView cards={cards} defaultJobTypes={profile.job_types} cities={profile.locations} remoteOk={profile.remote_ok} />;
}
