import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STAGES } from "@/lib/stages";
import { ApplicationRow, type Application } from "./ApplicationRow";

export default async function AppliedPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("applications")
    .select("id, status, notes, applied_at, listing_id, listings(company, title, apply_url)")
    .order("applied_at", { ascending: false })
    .returns<Application[]>();
  const apps = data ?? [];
  const byStage = Object.fromEntries(STAGES.map((s) => [s.value, apps.filter((a) => a.status === s.value).length]));

  const tone: Record<string, string> = { applied: "text-lav", online_assessment: "text-amber", interview: "text-brand-text", offer: "text-mint", rejected: "text-rose" };

  return (
    <div>
      <h1 className="font-display text-[34px] font-bold tracking-[-0.02em]">Applied</h1>
      <p className="mt-2 text-muted">
        {apps.length === 0 ? "Nothing yet. Mark a posting applied from its page and it shows up here." : `${apps.length} application${apps.length === 1 ? "" : "s"}. Stage and notes save as you change them.`}
      </p>

      {apps.length > 0 && (
        <>
          <dl className="mt-6 grid grid-cols-3 gap-2 sm:gap-3 md:grid-cols-5">
            {STAGES.map((s) => (
              <div key={s.value} className="min-w-0 rounded-[16px] border-2 border-line bg-surface px-3 py-2.5 sm:px-4 sm:py-3">
                <dd className={`num font-mono text-[22px] font-bold leading-tight sm:text-[28px] ${byStage[s.value] ? tone[s.value] : "text-muted"}`}>{byStage[s.value]}</dd>
                <dt className="truncate text-[12px] font-medium text-muted sm:text-[13px]">{s.label}</dt>
              </div>
            ))}
          </dl>

          <ul className="mt-6 grid grid-cols-1 gap-3" aria-label="Applications">
            {apps.map((a) => (
              <ApplicationRow key={a.id} app={a} />
            ))}
          </ul>
        </>
      )}
      {apps.length === 0 && (
        <Link href="/feed" className="mt-6 inline-flex h-11 items-center rounded-[12px] bg-ink px-5 font-bold text-ground hover:bg-mint active:scale-95">
          Go to the feed
        </Link>
      )}
    </div>
  );
}
