import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LISTING_COLUMNS, loadRequirements, matchListing, type ListingRow } from "@/lib/feed";
import { toEligibility, type ProfileRow } from "@/lib/profile";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { Quote } from "@/components/Quote";
import { FIELD_NAMES, JOB_TYPES, ROW_STATUS, VERDICTS, VERDICT_STYLE } from "@/lib/labels";
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

  const decider = item.rows.find((r) => r.status === "conflict") ?? item.rows.find((r) => r.status === "unclear") ?? null;

  return (
    <div>
      <Link href="/feed" className="inline-flex h-9 items-center rounded-[10px] px-2 text-[14px] font-semibold text-muted hover:bg-surface hover:text-ink">
        ← Feed
      </Link>

      <section className={`mt-3 rounded-[24px] border-2 bg-surface p-5 md:p-7 ${VERDICT_STYLE[item.verdict].ring}`}>
        <div className="flex flex-col gap-5 md:flex-row md:items-start">
          <CompanyAvatar company={listing.company} size={56} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{listing.company}</p>
            <h1 className="mt-1 font-display text-[28px] font-bold leading-[1.1] tracking-[-0.02em] md:text-[34px]">{listing.title}</h1>
            <p className="mt-2 text-muted">
              {listing.locations.join("; ") || "Location not listed"} · {JOB_TYPES[listing.job_type]}
              {listing.posted_at ? ` · posted ${listing.posted_at.slice(0, 10)}` : ""}
            </p>
          </div>
          <span className={`self-start rotate-3 rounded-[10px] px-3 py-1.5 font-mono text-[13px] font-bold uppercase tracking-wide ${v.badge}`}>
            {item.unchecked === "not_read_yet" ? "Not read yet" : v.label}
          </span>
        </div>
        <p className="mt-5 max-w-[80ch] text-muted">
          {item.unchecked ? item.rows[0]?.explanation : decider ? decider.explanation : v.tip}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <a
            href={listing.apply_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-11 items-center rounded-[12px] bg-ink px-5 font-bold text-ground hover:bg-mint active:scale-95"
          >
            Apply on company site ↗
          </a>
          <AppliedButton listingId={id} applied={Boolean(application)} />
        </div>
      </section>

      {!item.unchecked && (
        <section className="mt-6" aria-label="Requirements">
          <h2 className="font-display text-[22px] font-bold">Requirement by requirement</h2>
          {/* Stated requirements get a card each; silent ones are listed together,
              still one by one, as "not stated" (never as couldn't read). */}
          <ul className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            {item.rows
              .filter((r) => r.status !== "not_mentioned")
              .map((r) => (
                <li key={r.field} className="rounded-[18px] border-2 border-line bg-surface p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold">{FIELD_NAMES[r.field]}</span>
                    <span className={`flex-none rounded-[8px] px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wide ${ROW_STATUS[r.status].badge}`}>
                      {ROW_STATUS[r.status].label}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[14px]">{r.explanation}</p>
                  {r.evidence.map((e) => (
                    <blockquote key={e} className="mt-2 rounded-[12px] bg-sunken px-3 py-2 text-[13px] leading-[1.5] text-ink/85">
                      <Quote text={e} field={r.field} mark={ROW_STATUS[r.status].mark} />
                    </blockquote>
                  ))}
                </li>
              ))}
          </ul>
          {item.rows.some((r) => r.status === "not_mentioned") && (
            <div className="mt-3 rounded-[18px] border-2 border-dashed border-line p-4">
              <p className="text-[14px] text-muted">Not stated in this posting:</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {item.rows
                  .filter((r) => r.status === "not_mentioned")
                  .map((r) => (
                    <li key={r.field} className="rounded-full border-2 border-line px-3 py-1 text-[13px] font-semibold text-muted">
                      {FIELD_NAMES[r.field]}
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_360px] md:items-start">
        <PostingText text={listing.jd_text} />
        <FeedbackForm listingId={id} verdictShown={item.verdict} fields={item.rows.map((r) => ({ value: r.field, label: FIELD_NAMES[r.field] }))} />
      </div>
    </div>
  );
}
