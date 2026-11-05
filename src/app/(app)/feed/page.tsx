import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cityOf } from "@core/cities";
import { loadFeed, type FeedItem } from "@/lib/feed";
import { toEligibility, type ProfileRow } from "@/lib/profile";
import { applyFeed, parseFeedParams } from "@/lib/feedQuery";
import { roleOf } from "@/lib/roles";
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

const DEGREES = { bs: "bachelor's", ms: "master's", phd: "PhD", none: "not in school" } as const;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "May 2027 · bachelor's · U.S. citizen": what the verdicts were checked against.
// Shown only to the profile's owner; never logged.
function checkedAgainst(p: ProfileRow): string {
  const grad = p.grad_month ? `${MONTHS[Number(p.grad_month.slice(5)) - 1]} ${p.grad_month.slice(0, 4)}` : null;
  const auth = p.us_citizen
    ? "U.S. citizen"
    : p.permanent_resident
      ? "permanent resident"
      : p.needs_sponsorship_future
        ? "needs sponsorship later"
        : p.authorized_now_without_sponsorship
          ? "authorized to work"
          : "needs sponsorship";
  return [grad, DEGREES[p.degree], auth].filter(Boolean).join(" · ");
}

export default async function FeedPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("*").maybeSingle<ProfileRow>();
  if (!profile) redirect("/profile");

  const [items, { data: applied }, { data: saved }, { data: lastRun }] = await Promise.all([
    loadFeed(supabase, toEligibility(profile)),
    supabase.from("applications").select("listing_id"),
    supabase.from("saved_listings").select("listing_id"),
    supabase.from("pipeline_runs").select("finished_at").eq("status", "succeeded").order("finished_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const appliedIds = new Set((applied ?? []).map((a) => a.listing_id as number));
  const savedIds = new Set((saved ?? []).map((a) => a.listing_id as number));

  const cards: FeedCard[] = items.map((i) => {
    const d = decider(i);
    return {
      id: i.id,
      company: i.company,
      title: i.title,
      locations: i.locations,
      cities: i.locations.map(cityOf).filter((c): c is string => c !== null),
      remote: i.remote === true,
      jobType: i.job_type,
      postedAt: i.posted_at,
      applyUrl: i.apply_url,
      verdict: i.verdict,
      unchecked: i.unchecked,
      quote: d?.quote ?? null,
      quoteField: d?.field ?? null,
      note: secondaryNote(i),
      applied: appliedIds.has(i.id),
      saved: savedIds.has(i.id),
      role: roleOf(i.title, i.roleFamily),
    };
  });

  // Filter, sort, and page here, so the browser gets one page of cards.
  const filters = parseFeedParams(await searchParams, profile.job_types);
  const result = applyFeed(cards, filters, { cities: profile.locations, remoteOk: profile.remote_ok, now: Date.now() });

  return (
    <FeedView
      result={result}
      filters={filters}
      profileJobTypes={profile.job_types}
      hasCities={profile.locations.length > 0}
      remoteOk={profile.remote_ok}
      checkedAgainst={checkedAgainst(profile)}
      openCount={cards.length}
      updatedAt={(lastRun?.finished_at as string | null) ?? null}
    />
  );
}
