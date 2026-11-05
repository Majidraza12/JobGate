"use client";

import Link from "next/link";
import { useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import { CompanyAvatar } from "@/components/CompanyAvatar";
import { Dropdown } from "@/components/Dropdown";
import { Icon, type IconName } from "@/components/Icon";
import { SaveButton } from "@/components/SaveButton";
import { BUTTON, EmptyState } from "@/components/ui";
import { responded, STAGES, STAGE_STYLE, type Stage } from "@/lib/stages";
import { removeApplication, updateApplication } from "./actions";

export type Application = {
  id: number;
  status: Stage;
  notes: string;
  applied_at: string;
  updated_at: string;
  listing_id: number;
  listings: { company: string; title: string; apply_url: string; locations: string[]; job_type: string } | null;
};

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const stageLabel = (s: Stage) => STAGES.find((x) => x.value === s)!.label;

function relative(iso: string, now: number) {
  const m = Math.floor((now - Date.parse(iso)) / 60_000);
  if (m < 60) return `${Math.max(1, m)} min ago`;
  if (m < 1440) return `${Math.floor(m / 60)} hr ago`;
  const d = Math.floor(m / 1440);
  return d === 1 ? "1 day ago" : `${d} days ago`;
}

function StagePill({ stage, onChange }: { stage: Stage; onChange: (s: Stage) => void }) {
  const st = STAGE_STYLE[stage];
  return (
    <Dropdown<Stage>
      label="Stage"
      value={stage}
      options={STAGES.map((s) => ({ value: s.value, label: s.label }))}
      onChange={onChange}
      buttonClassName={`h-[34px] rounded-full px-3.5 text-[14px] font-medium ring-1 ring-inset hover:brightness-125 [&>svg:last-child]:hidden sm:[&>svg:last-child]:block ${st.pill}`}
    />
  );
}

function Row({ app, saved, now }: { app: Application; saved: boolean; now: number }) {
  const [stage, setStage] = useOptimistic(app.status);
  const [pending, start] = useTransition();
  const [menu, setMenu] = useState(false);
  const [notesOpen, setNotesOpen] = useState(Boolean(app.notes));
  const [notes, setNotes] = useState(app.notes);
  const menuRef = useRef<HTMLDivElement>(null);
  const l = app.listings;

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setMenu(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menu]);

  const save = (patch: { status?: Stage; notes?: string }) =>
    start(async () => {
      if (patch.status) setStage(patch.status);
      const fd = new FormData();
      fd.set("status", patch.status ?? stage);
      fd.set("notes", patch.notes ?? notes);
      await updateApplication(app.id, fd);
    });

  return (
    <li className="glass group relative rounded-[16px] transition-[background,border-color,box-shadow] duration-200 hover:glow focus-within:glow">
      <div className="flex items-center gap-4 p-4 sm:gap-6 sm:px-5 sm:py-[13px]">
        <span className="max-sm:[&>span]:!size-11">
          <CompanyAvatar company={l?.company ?? "?"} size={58} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] text-soft">{l?.company ?? "Posting removed"}</p>
          <Link href={`/listing/${app.listing_id}`} className="block truncate text-[18px] font-semibold tracking-[-0.01em] hover:text-lavender-hi">
            {l?.title ?? "This posting was removed"}
          </Link>
          <p className="mt-1 flex flex-wrap items-center gap-x-6 gap-y-1 text-[13.5px] text-soft">
            {l?.locations[0] && (
              <span className="flex min-w-0 items-center gap-2">
                <Icon name="pin" size={15} className="text-muted" />
                <span className="truncate">{l.locations[0]}</span>
              </span>
            )}
            <span className="flex items-center gap-2">
              <Icon name="calendar" size={15} className="text-muted" />
              Applied {fmt(app.applied_at)}
            </span>
            {notes && !notesOpen && (
              <span className="flex min-w-0 items-center gap-2 text-muted">
                <Icon name="edit" size={14} />
                <span className="truncate">{notes}</span>
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-none items-center gap-1 sm:gap-5">
          <span className="hidden text-[12px] text-muted md:inline" aria-live="polite">
            {pending ? "Saving" : ""}
          </span>
          <StagePill stage={stage} onChange={(s) => save({ status: s })} />
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenu(!menu)}
              aria-label="More actions"
              aria-expanded={menu}
              className="grid size-9 place-items-center rounded-[10px] text-soft hover:bg-white/[0.06] hover:text-ink"
            >
              <Icon name="dots" size={22} />
            </button>
            {menu && (
              <div className="absolute right-0 top-[calc(100%+6px)] z-40 w-52 animate-pop rounded-[14px] border border-white/10 bg-[#15121f]/95 p-1.5 shadow-[0_20px_50px_-12px_rgb(0_0_0/0.8)] backdrop-blur-xl">
                <button type="button" onClick={() => (setNotesOpen(true), setMenu(false))} className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-[14px] text-soft hover:bg-white/[0.06] hover:text-ink">
                  <Icon name="edit" size={16} />
                  {notes ? "Edit notes" : "Add notes"}
                </button>
                {l && (
                  <a href={l.apply_url} target="_blank" rel="noopener noreferrer" className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-[14px] text-soft hover:bg-white/[0.06] hover:text-ink">
                    <Icon name="external" size={16} />
                    Open posting
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => start(() => removeApplication(app.id))}
                  className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-[14px] text-rose hover:bg-rose/10"
                >
                  <Icon name="trash" size={16} />
                  Remove from tracker
                </button>
              </div>
            )}
          </div>
          <SaveButton listingId={app.listing_id} saved={saved} className="max-sm:hidden" />
        </div>
      </div>
      {notesOpen && (
        <div className="flex animate-fade items-center gap-3 border-t border-white/[0.06] px-5 py-3">
          <Icon name="edit" size={16} className="flex-none text-muted" />
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => notes !== app.notes && save({ notes })}
            onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
            maxLength={2000}
            placeholder="Recruiter, OA date, referral…"
            aria-label={`Notes for ${l?.company ?? "this application"}`}
            className="h-9 min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none"
          />
          <span className="text-[12px] text-muted">{relative(app.updated_at, now)}</span>
        </div>
      )}
    </li>
  );
}

function Stat({ icon, label, value, sub, active = false }: { icon: IconName; label: string; value: string; sub: string; active?: boolean }) {
  return (
    <div className={`${active ? "glow" : "glass"} flex min-w-0 gap-3.5 rounded-[16px] px-4 py-5 2xl:px-5`}>
      <span className="grid size-11 flex-none place-items-center rounded-full bg-white/[0.06] text-lavender ring-1 ring-inset ring-white/[0.06]">
        <Icon name={icon} size={23} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[14.5px] text-soft">{label}</p>
        <p className="num mt-0.5 text-[28px] font-semibold leading-tight">{value}</p>
        <p className="mt-1 truncate text-[13.5px] text-mint">{sub}</p>
      </div>
    </div>
  );
}

function Donut({ pct }: { pct: number }) {
  const r = 64;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 160 160" className="size-[156px] flex-none -rotate-90" role="img" aria-label={`${pct}% response rate`}>
      <defs>
        <linearGradient id="donut" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d9ccff" />
          <stop offset="1" stopColor="#7b55f5" />
        </linearGradient>
      </defs>
      <circle cx="80" cy="80" r={r} fill="none" stroke="rgb(255 255 255 / 0.07)" strokeWidth="12" />
      <circle
        cx="80"
        cy="80"
        r={r}
        fill="none"
        stroke="url(#donut)"
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={`${(pct / 100) * c} ${c}`}
        className="drop-shadow-[0_0_10px_rgb(140_100_255/0.6)] transition-[stroke-dasharray] duration-700"
      />
    </svg>
  );
}

type Sort = "newest" | "oldest" | "company";
type Since = "all" | "30" | "90";

export function ApplicationsView({ apps, savedIds }: { apps: Application[]; savedIds: number[] }) {
  const [now] = useState(() => Date.now());
  const [q, setQ] = useState("");
  const [stage, setStage] = useState<Stage | "all">("all");
  const [since, setSince] = useState<Since>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const saved = useMemo(() => new Set(savedIds), [savedIds]);

  const count = (s: Stage) => apps.filter((a) => a.status === s).length;
  const month = new Date(now);
  const thisMonth = apps.filter((a) => {
    const d = new Date(a.applied_at);
    return d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear();
  }).length;
  const answered = apps.filter((a) => responded(a.status)).length;
  const rate = apps.length ? Math.round((answered / apps.length) * 100) : 0;
  const inProgress = apps.filter((a) => a.status === "interview" || a.status === "online_assessment");

  // What changed and when, from the two timestamps each application keeps.
  const activity = apps
    .flatMap((a) => {
      const who = a.listings?.company ?? "a removed posting";
      const moved = a.status !== "applied" && Date.parse(a.updated_at) - Date.parse(a.applied_at) > 60_000;
      return moved
        ? [{ key: `${a.id}-s`, at: a.updated_at, stage: a.status, text: <>Moved to {stageLabel(a.status).toLowerCase()} at <b className="font-semibold">{who}</b></> }]
        : [{ key: `${a.id}-a`, at: a.applied_at, stage: "applied" as Stage, text: <>Applied to <b className="font-semibold">{who}</b></> }];
    })
    .sort((x, y) => y.at.localeCompare(x.at))
    .slice(0, 4);

  const needle = q.trim().toLowerCase();
  const shown = apps
    .filter(
      (a) =>
        (stage === "all" || a.status === stage) &&
        (since === "all" || now - Date.parse(a.applied_at) <= Number(since) * 86_400_000) &&
        (!needle || `${a.listings?.company} ${a.listings?.title} ${a.notes}`.toLowerCase().includes(needle)),
    )
    .sort((a, b) =>
      sort === "company" ? (a.listings?.company ?? "").localeCompare(b.listings?.company ?? "") : sort === "oldest" ? a.applied_at.localeCompare(b.applied_at) : b.applied_at.localeCompare(a.applied_at),
    );

  return (
    <div className="mx-auto max-w-[1460px] pt-6 sm:pt-8">
      <div className="grid grid-cols-1 gap-[28px] xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0">
          <div className="px-1 sm:px-[86px] xl:px-[86px]">
            <h1 className="text-[40px] font-bold italic leading-[1.05] tracking-[-0.035em] sm:text-[52px]">
              Your <span className="text-shine pr-[0.08em]">Applications</span>
            </h1>
            <p className="mt-2 text-[17px] text-soft sm:text-[19px]">Track your job applications, assessments, interviews, and offers in one place.</p>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat icon="send" label="Total Applications" value={String(apps.length)} sub={`${thisMonth} this month`} active />
            <Stat icon="calendar" label="Interviews" value={String(count("interview"))} sub={`${count("online_assessment")} in assessment`} />
            <Stat icon="target" label="Offers" value={String(count("offer"))} sub={`${count("rejected")} rejected`} />
            <Stat icon="chart" label="Response Rate" value={`${rate}%`} sub={`${answered} of ${apps.length} heard back`} />
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <label className="flex h-[44px] min-w-0 flex-1 items-center gap-3.5 rounded-full border border-white/10 bg-[#16131f]/80 px-6 focus-within:border-lavender/50">
              <Icon name="search" size={19} className="text-soft" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search your applications (role, company, or note)..."
                aria-label="Search your applications"
                className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none"
              />
            </label>
            <div className="flex gap-3">
              <Dropdown<Stage | "all">
                label="Stage"
                icon="layersStack"
                value={stage}
                options={[{ value: "all", label: "All Statuses" }, ...STAGES.map((s) => ({ value: s.value, label: s.label }))]}
                onChange={setStage}
                className="flex-1 sm:w-[184px] sm:flex-none"
                buttonClassName="h-[44px] w-full rounded-full border border-white/10 bg-[#16131f]/80 px-5 text-[15px] hover:border-white/20"
              />
              <Dropdown<Since>
                label="Applied"
                icon="calendar"
                value={since}
                options={[
                  { value: "all", label: "All Time" },
                  { value: "30", label: "Last 30 days" },
                  { value: "90", label: "Last 90 days" },
                ]}
                onChange={setSince}
                className="flex-1 sm:w-[164px] sm:flex-none"
                buttonClassName="h-[44px] w-full rounded-full border border-white/10 bg-[#16131f]/80 px-5 text-[15px] hover:border-white/20"
              />
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between px-1.5">
            <p className="num text-[16px] font-medium">
              {shown.length} application{shown.length === 1 ? "" : "s"}
            </p>
            <Dropdown<Sort>
              label="Sort by"
              prefix="Sort by:"
              value={sort}
              options={[
                { value: "newest", label: "Applied Date (Newest)" },
                { value: "oldest", label: "Applied Date (Oldest)" },
                { value: "company", label: "Company (A to Z)" },
              ]}
              onChange={setSort}
              buttonClassName="h-9 text-[14.5px]"
            />
          </div>

          {apps.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                icon="send"
                title="No applications yet"
                action={
                  <Link href="/feed" className={`${BUTTON.primary} h-11 px-6`}>
                    Browse jobs
                    <Icon name="arrowRight" size={16} />
                  </Link>
                }
              >
                Mark a posting applied from its page or from Saved, and it shows up here with its stage and notes.
              </EmptyState>
            </div>
          ) : shown.length === 0 ? (
            <p className="glass mt-4 rounded-[16px] px-6 py-10 text-center text-muted">No applications match. Clear the search or pick another status.</p>
          ) : (
            <ul className="mt-3.5 flex flex-col gap-3" aria-label="Applications">
              {shown.map((a) => (
                <Row key={a.id} app={a} saved={saved.has(a.listing_id)} now={now} />
              ))}
            </ul>
          )}
        </div>

        {/* Right column */}
        <aside className="flex flex-col gap-[18px] xl:pt-[72px]">
          <section className="glass rounded-[18px] p-5">
            <div className="flex items-center gap-3">
              <Icon name="calendar" size={22} className="text-lavender" />
              <h2 className="flex-1 text-[18px] font-semibold">In Progress</h2>
              <span className="num text-[13px] text-muted">{inProgress.length}</span>
            </div>
            {inProgress.length === 0 ? (
              <p className="mt-3 text-[14px] text-muted">Applications in an assessment or interview stage show up here.</p>
            ) : (
              <ul className="mt-4 flex flex-col gap-2.5">
                {inProgress.slice(0, 4).map((a) => (
                  <li key={a.id}>
                    <Link href={`/listing/${a.listing_id}`} className="flex items-center gap-3.5 rounded-[14px] bg-white/[0.03] p-3 ring-1 ring-inset ring-white/[0.06] hover:bg-white/[0.06]">
                      <CompanyAvatar company={a.listings?.company ?? "?"} size={42} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14.5px] font-semibold">
                          {a.listings?.company} <span className="font-normal text-muted">·</span> {a.listings?.title}
                        </span>
                        <span className={`mt-0.5 flex items-center gap-1.5 text-[13px] ${STAGE_STYLE[a.status].text}`}>
                          <Icon name={STAGE_STYLE[a.status].icon} size={14} />
                          {stageLabel(a.status)}
                          <span className="text-muted">· updated {relative(a.updated_at, now)}</span>
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="glass rounded-[18px] p-5">
            <div className="flex items-center gap-3">
              <Icon name="bolt" size={22} className="text-lavender" />
              <h2 className="text-[18px] font-semibold">Recent Activity</h2>
            </div>
            {activity.length === 0 ? (
              <p className="mt-3 text-[14px] text-muted">Nothing yet.</p>
            ) : (
              <ol className="relative mt-4 flex flex-col gap-4 before:absolute before:bottom-4 before:left-[5px] before:top-4 before:w-px before:bg-white/10">
                {activity.map((e, i) => (
                  <li key={e.key} className="relative flex items-center gap-4 pl-0">
                    <span className={`relative z-10 size-[11px] flex-none rounded-full ring-4 ring-[#14111d] ${i === 0 ? "bg-mint" : "bg-white/70"}`} />
                    <span className={`grid size-9 flex-none place-items-center rounded-full bg-white/[0.05] ${STAGE_STYLE[e.stage].text}`}>
                      <Icon name={STAGE_STYLE[e.stage].icon} size={17} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[14px]">{e.text}</span>
                      <span className="block text-[12.5px] text-muted">
                        {fmt(e.at)} · {relative(e.at, now)}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="glass rounded-[18px] p-5">
            <div className="flex items-center gap-3">
              <Icon name="chart" size={22} className="text-lavender" />
              <h2 className="text-[18px] font-semibold">Application Progress</h2>
            </div>
            <div className="mt-4 flex items-center gap-6">
              <div className="relative">
                <Donut pct={rate} />
                <div className="absolute inset-0 grid place-content-center text-center">
                  <span className="num text-[30px] font-semibold leading-none">{rate}%</span>
                  <span className="mt-1 text-[12.5px] text-soft">Response Rate</span>
                </div>
              </div>
              <ul className="flex flex-col gap-3 text-[14.5px]">
                <li className="flex items-center gap-2.5">
                  <span className="size-2.5 rounded-full bg-lavender" />
                  <b className="num font-semibold">{answered}</b> responded
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="size-2.5 rounded-full bg-white/30" />
                  <b className="num font-semibold">{apps.length - answered}</b> no response yet
                </li>
                <li className="flex items-center gap-2.5 border-t border-white/[0.08] pt-3">
                  <span className="size-2.5 rounded-full bg-white/30" />
                  <b className="num font-semibold">{apps.length}</b> total
                </li>
              </ul>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
