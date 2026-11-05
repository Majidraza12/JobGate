import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { GateField } from "@core/requirements";
import { createClient } from "@/lib/supabase/server";
import { LISTING_COLUMNS, loadRequirements, matchListing, type ListingRow } from "@/lib/feed";
import { toEligibility, type ProfileRow } from "@/lib/profile";
import { roleOf, ROLES } from "@/lib/roles";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { Icon, type IconName } from "@/components/Icon";
import { Quote } from "@/components/Quote";
import { SaveButton } from "@/components/SaveButton";
import { BUTTON, Panel, Tag, TowerArt } from "@/components/ui";
import { FIELD_NAMES, JOB_TYPES, ROW_STATUS, VERDICTS, VERDICT_STYLE } from "@/lib/labels";
import { AppliedButton, FeedbackForm, PostingText } from "./ListingActions";

// One icon per requirement, used in the table and the "not stated" tiles.
const FIELD_ICONS: Record<GateField, IconName> = {
  grad_requirements: "graduation",
  must_return_to_school: "refresh",
  class_years: "users",
  degree_levels: "file",
  start_options: "calendar",
  citizenship_required: "flag",
  us_person_required: "shield",
  sponsorship_now_unavailable: "globe",
  sponsorship_future_unavailable: "clock",
  clearance: "lock",
};

function posted(iso: string | null) {
  if (!iso) return null;
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  if (days <= 0) return "Posted today";
  if (days < 30) return `Posted ${days}d ago`;
  return `Posted ${new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

function SectionHead({ icon, children }: { icon: IconName; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-3 text-[21px] font-semibold tracking-[-0.01em]">
      <Icon name={icon} size={24} className="text-lavender" />
      {children}
    </h2>
  );
}

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const supabase = await createClient();

  const [{ data: profile }, { data: listing }, { data: application }, { data: saved }] = await Promise.all([
    supabase.from("profiles").select("*").maybeSingle<ProfileRow>(),
    supabase.from("listings").select(`${LISTING_COLUMNS}, jd_text`).eq("id", id).maybeSingle<ListingRow & { jd_text: string | null }>(),
    supabase.from("applications").select("status, applied_at").eq("listing_id", id).maybeSingle(),
    supabase.from("saved_listings").select("listing_id").eq("listing_id", id).maybeSingle(),
  ]);
  if (!profile) redirect("/profile");
  if (!listing) notFound();

  const reqs = await loadRequirements(supabase, listing.jd_hash ? [listing.jd_hash] : []);
  const item = matchListing(listing, reqs, toEligibility(profile));
  const v = VERDICTS[item.verdict];
  const st = VERDICT_STYLE[item.verdict];
  const role = roleOf(listing.title, item.roleFamily);
  const roleLabel = ROLES.find((r) => r.value === role)?.label ?? "Other roles";

  const decider = item.rows.find((r) => r.status === "conflict") ?? item.rows.find((r) => r.status === "unclear") ?? null;
  const stated = item.rows.filter((r) => r.status !== "not_mentioned");
  const silent = item.rows.filter((r) => r.status === "not_mentioned");
  const tally = (s: string) => item.rows.filter((r) => r.status === s).length;
  const place = listing.locations[0] ?? "Location not listed";
  const verdictLabel = item.unchecked === "not_read_yet" ? "Not read yet" : v.label;

  const facts: [IconName, string, string][] = [
    ["briefcase", "Job type", JOB_TYPES[listing.job_type]!],
    ["pin", "Location", listing.locations.length > 1 ? `${place} +${listing.locations.length - 1}` : place],
    ["globe", "Remote", listing.remote ? "Yes" : listing.remote === false ? "No" : "Not stated"],
    ["code", "Role track", roleLabel],
    ["calendar", "Posted", listing.posted_at ? new Date(listing.posted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Not listed"],
  ];

  return (
    <div className="pt-4">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-3 text-[14.5px] text-soft">
        <Link href="/feed" aria-label="Back to jobs" className="grid size-8 place-items-center rounded-full bg-white/[0.05] hover:bg-white/10 hover:text-ink">
          <Icon name="arrowLeft" size={16} />
        </Link>
        <Link href="/feed" className="hover:text-ink">
          Jobs
        </Link>
        <Icon name="chevronRight" size={14} className="text-dim" />
        <Link href={role !== "other" ? `/feed?role=${role}` : "/feed"} className="hover:text-ink">
          {roleLabel}
        </Link>
        <Icon name="chevronRight" size={14} className="text-dim" />
        <span className="min-w-0 truncate text-ink">{listing.title}</span>
      </nav>

      <div className="mt-6 grid grid-cols-1 gap-[26px] lg:grid-cols-[minmax(0,1fr)_384px]">
        <div className="min-w-0">
          {/* Company header */}
          <section className="glow flex animate-rise flex-col gap-4 rounded-[18px] p-5 sm:flex-row sm:items-center sm:gap-5 sm:px-7 sm:py-[18px]">
            <CompanyAvatar company={listing.company} size={64} />
            <div className="min-w-0 flex-1">
              <p className="text-[19px] font-semibold">{listing.company}</p>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 text-[14px] text-soft">
                {roleLabel}
                <span aria-hidden="true" className="text-dim">•</span>
                {JOB_TYPES[listing.job_type]}
                <span aria-hidden="true" className="text-dim">•</span>
                {listing.locations.length > 1 ? `${listing.locations.length} locations` : place}
              </p>
            </div>
            <a href={listing.apply_url} target="_blank" rel="noopener noreferrer" className={`${BUTTON.ghost} h-10 self-start px-[18px] text-[14px] sm:self-center`}>
              View posting
              <Icon name="arrowUpRight" size={15} />
            </a>
          </section>

          <h1 className="mt-7 px-1.5 text-[32px] font-semibold leading-[1.15] tracking-[-0.025em] sm:text-[40px]">{listing.title}</h1>
          <p className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-2 px-1.5 text-[15px] text-ink">
            <span className="flex items-center gap-2.5">
              <Icon name="briefcase" size={18} className="text-soft" />
              {JOB_TYPES[listing.job_type]}
            </span>
            <span className="flex items-center gap-2.5">
              <Icon name="pin" size={18} className="text-soft" />
              {place}
              {listing.remote ? " (Remote)" : ""}
            </span>
            <span className={`flex items-center gap-2.5 font-medium ${st.text}`}>
              <Icon name={st.icon} size={18} />
              {verdictLabel}
            </span>
            {posted(listing.posted_at) && <span className="text-soft">{posted(listing.posted_at)}</span>}
          </p>
          {stated.length > 0 && !item.unchecked && (
            <div className="mt-5 flex flex-wrap gap-2.5 px-1.5">
              {stated.map((r) => (
                <Tag key={r.field} className="h-[30px] bg-white/[0.07] px-3.5 text-[13.5px]">
                  {FIELD_NAMES[r.field]}
                </Tag>
              ))}
            </div>
          )}

          <hr className="mx-1.5 mt-6 border-white/[0.08]" />

          <section className="px-1.5 pt-6">
            <h2 className="text-[21px] font-semibold tracking-[-0.01em]">Your verdict</h2>
            <p className="mt-2 max-w-[78ch] text-[16px] leading-[1.6] text-soft">
              {item.unchecked ? (
                item.rows[0]?.explanation
              ) : decider ? (
                <>
                  <b className="font-semibold text-ink">{FIELD_NAMES[decider.field]}:</b> {decider.explanation}
                </>
              ) : (
                v.tip
              )}
            </p>
          </section>

          {!item.unchecked && stated.length > 0 && (
            <>
              <hr className="mx-1.5 mt-6 border-white/[0.08]" />
              <section className="px-1.5 pt-6" aria-label="Requirements">
                <SectionHead icon="layersStack">Requirement by requirement</SectionHead>
                <ul className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
                  {stated.map((r) => (
                    <li key={r.field} className="glass rounded-[16px] p-4">
                      <div className="flex items-center gap-3">
                        <Icon name={FIELD_ICONS[r.field]} size={20} className="text-lavender" />
                        <span className="min-w-0 flex-1 font-semibold">{FIELD_NAMES[r.field]}</span>
                        <span className={`inline-flex h-7 flex-none items-center gap-1.5 rounded-full px-2.5 text-[12.5px] font-medium ${ROW_STATUS[r.status].badge}`}>
                          <Icon name={ROW_STATUS[r.status].icon} size={14} />
                          {ROW_STATUS[r.status].label}
                        </span>
                      </div>
                      <p className="mt-2 text-[14px] leading-[1.5] text-soft">{r.explanation}</p>
                      {r.evidence.map((e) => (
                        <blockquote key={e} className="mt-2.5 flex gap-2.5 rounded-[12px] bg-black/25 px-3 py-2.5 text-[13.5px] leading-[1.55] text-soft ring-1 ring-inset ring-white/[0.05]">
                          <span aria-hidden="true" className="mt-0.5 h-auto w-0.5 flex-none rounded-full bg-lavender/50" />
                          <span>
                            <Quote text={e} field={r.field} mark={ROW_STATUS[r.status].mark} />
                          </span>
                        </blockquote>
                      ))}
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}

          {!item.unchecked && silent.length > 0 && (
            <>
              <hr className="mx-1.5 mt-6 border-white/[0.08]" />
              <section className="px-1.5 pt-6">
                <SectionHead icon="dots">Not stated in this posting</SectionHead>
                <ul className="mt-4 flex flex-wrap gap-3">
                  {silent.map((r) => (
                    <li key={r.field} className="glass flex items-center gap-3 rounded-[14px] px-4 py-2.5">
                      <Icon name={FIELD_ICONS[r.field]} size={22} className="text-lavender" />
                      <span className="leading-tight">
                        <span className="block text-[13.5px] font-medium">{FIELD_NAMES[r.field]}</span>
                        <span className="block text-[12px] text-muted">Not stated</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}

          <hr className="mx-1.5 mt-6 border-white/[0.08]" />
          <div className="px-1.5 pt-6">
            <PostingText text={listing.jd_text} />
          </div>
        </div>

        {/* Right column */}
        <aside className="flex flex-col gap-[18px]">
          <section className="relative overflow-hidden rounded-[18px] border border-white/10 bg-[linear-gradient(160deg,#1c1530_0%,#130f20_55%,#100d19_100%)] p-6 shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]">
            <TowerArt className="absolute right-0 top-0 h-[150px] w-[150px]" />
            <div className="absolute -right-12 -top-12 size-44 rounded-full bg-brand/30 blur-3xl" aria-hidden="true" />
            <div className="relative">
              <h2 className="text-[25px] font-semibold tracking-[-0.02em]">Ready to apply?</h2>
              <p className="mt-1.5 max-w-[28ch] text-[14.5px] leading-[1.45] text-soft">Apply on {listing.company}&apos;s own site, then mark it here to track it.</p>
              <a
                href={listing.apply_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 flex h-[46px] items-center justify-center gap-2.5 rounded-full bg-[linear-gradient(90deg,#ffffff,#e7defe_55%,#c9b6ff)] text-[17px] font-semibold text-[#140c2c] shadow-[0_10px_30px_-10px_rgb(160_130_255/0.8)] hover:brightness-105 active:scale-[0.98]"
              >
                Apply Now
                <Icon name="arrowRight" size={18} />
              </a>
              <div className="mt-3.5 grid grid-cols-2 gap-3">
                <SaveButton listingId={id} saved={Boolean(saved)} variant="full" className="h-11 px-3 text-[14.5px]" />
                <AppliedButton listingId={id} applied={Boolean(application)} />
              </div>
            </div>
          </section>

          <Panel className="p-5">
            <h2 className="text-[19px] font-semibold">Verdict summary</h2>
            <div className="mt-4 flex items-start gap-4">
              <span className={`grid size-[54px] flex-none place-items-center rounded-[14px] bg-[#0c0b13] ring-1 ring-inset ring-white/10 ${st.text}`}>
                <Icon name={st.icon} size={28} />
              </span>
              <div className="min-w-0">
                <p className={`text-[17px] font-semibold ${st.text}`}>{verdictLabel}</p>
                <p className="mt-1 text-[13.5px] leading-[1.45] text-soft">{v.tip}</p>
              </div>
            </div>
            {!item.unchecked && (
              <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
                {(
                  [
                    ["checkCircle", "Meets", tally("satisfied"), "text-mint"],
                    ["alert", "Unclear", tally("unclear") + tally("extraction_failed"), "text-amber"],
                    ["xCircle", "Conflicts", tally("conflict"), "text-rose"],
                  ] as const
                ).map(([icon, label, n, tone]) => (
                  <div key={label} className="flex flex-col items-center gap-1">
                    <Icon name={icon} size={20} className={n ? tone : "text-dim"} />
                    <dd className="num text-[15px] font-semibold">{n}</dd>
                    <dt className="text-[12px] text-muted">{label}</dt>
                  </div>
                ))}
              </dl>
            )}
            <Link href="/profile" className={`${BUTTON.ghost} mt-5 h-[38px] w-full text-[14px]`}>
              Edit your profile
              <Icon name="arrowUpRight" size={15} />
            </Link>
          </Panel>

          <Panel className="p-5">
            <h2 className="text-[19px] font-semibold">Job Quick Facts</h2>
            <dl className="mt-2">
              {facts.map(([icon, label, value]) => (
                <div key={label} className="flex items-center gap-3 border-b border-white/[0.06] py-[11px] text-[14px] last:border-0">
                  <Icon name={icon} size={18} className="text-soft" />
                  <dt className="text-soft">{label}</dt>
                  <dd className="ml-auto min-w-0 truncate text-right text-ink">{value}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          <FeedbackForm listingId={id} verdictShown={item.verdict} fields={item.rows.map((r) => ({ value: r.field, label: FIELD_NAMES[r.field] }))} />
        </aside>
      </div>
    </div>
  );
}
