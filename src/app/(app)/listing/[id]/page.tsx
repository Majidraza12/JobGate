import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LISTING_COLUMNS, loadRequirements, matchListing, type ListingRow } from "@/lib/feed";
import { toEligibility, type ProfileRow } from "@/lib/profile";
import { FIELD_NAMES, JOB_TYPES, ROW_STATUS, VERDICTS } from "@/lib/labels";
import { AppliedButton, FeedbackForm, PostingText } from "./ListingActions";

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const supabase = await createClient();

  const [{ data: profile }, { data: listing }, { data: application }] = await Promise.all([
    supabase.from("profiles").select("*").maybeSingle<ProfileRow>(),
    supabase.from("listings").select(`${LISTING_COLUMNS}, jd_text`).eq("id", id).maybeSingle<ListingRow & { jd_text: string | null }>(),
    supabase.from("applications").select("status, applied_at").eq("listing_id", id).maybeSingle(),
  ]);
  if (!profile) redirect("/profile");
  if (!listing) notFound();

  const reqs = await loadRequirements(supabase, listing.jd_hash ? [listing.jd_hash] : []);
  const item = matchListing(listing, reqs, toEligibility(profile));
  const v = VERDICTS[item.verdict];

  return (
    <div className="mx-auto max-w-[1100px]">
      <Link href="/" className="text-[13px] text-muted hover:text-ink">
        ← Feed
      </Link>

      <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="text-[24px] font-medium leading-8">{listing.title}</h1>
          <p className="mt-1 text-muted">
            {listing.company} · {listing.locations.join("; ") || "Location not listed"} · {JOB_TYPES[listing.job_type]}
            {listing.posted_at ? ` · posted ${listing.posted_at.slice(0, 10)}` : ""}
          </p>
        </div>
        <div className="flex flex-none gap-2">
          <AppliedButton listingId={id} applied={Boolean(application)} />
          <a href={listing.apply_url} target="_blank" rel="noopener noreferrer" className="flex h-9 items-center rounded-control bg-ink px-4 text-[14px] font-medium text-white hover:bg-ink/85">
            Apply on company site
          </a>
        </div>
      </div>

      <section className="mt-6 rounded-card border border-line bg-surface p-5" aria-labelledby="verdict">
        <div className="flex flex-wrap items-center gap-3">
          <span id="verdict" className={`inline-flex h-7 items-center rounded-full px-3 text-[14px] font-medium ${v.badge}`}>
            {item.unchecked === "not_read_yet" ? "Not read yet" : v.label}
          </span>
          <p className="text-muted">{item.unchecked ? item.rows[0]?.explanation : v.tip}</p>
        </div>
      </section>

      {!item.unchecked && (
        <section className="mt-3 overflow-hidden rounded-card border border-line bg-surface" aria-label="Requirements">
          <div className="hidden grid-cols-[220px_110px_minmax(0,1fr)] gap-4 border-b border-line px-5 py-3 text-[12px] text-muted md:grid">
            <span>Requirement</span>
            <span>Status</span>
            <span>Why, and what the posting says</span>
          </div>
          <ul>
            {item.rows.map((r) => (
              <li key={r.field} className="grid gap-x-4 gap-y-1.5 border-b border-rule px-5 py-3.5 last:border-0 md:grid-cols-[220px_110px_minmax(0,1fr)]">
                <span className="font-medium">{FIELD_NAMES[r.field]}</span>
                <span>
                  <span className={`inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-[12px] font-medium ${ROW_STATUS[r.status].badge}`}>{ROW_STATUS[r.status].label}</span>
                </span>
                <span className="min-w-0">
                  <span className={r.status === "not_mentioned" ? "text-muted" : ""}>{r.explanation}</span>
                  {r.evidence.map((e) => (
                    <blockquote key={e} className="mt-1.5 border-l-2 border-line pl-3 text-[13px] leading-5 text-ink/80">
                      “{e}”
                    </blockquote>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_340px] md:items-start">
        <PostingText text={listing.jd_text} />
        <FeedbackForm listingId={id} verdictShown={item.verdict} fields={item.rows.map((r) => ({ value: r.field, label: FIELD_NAMES[r.field] }))} />
      </div>
    </div>
  );
}
