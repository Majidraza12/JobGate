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

  return (
    <div className="mx-auto max-w-[1100px]">
      <h1 className="text-[24px] font-medium leading-8">Applied</h1>
      <p className="mt-1 text-muted">
        {apps.length === 0 ? "Nothing yet. Mark a posting applied from its page and it shows up here." : `${apps.length} application${apps.length === 1 ? "" : "s"}.`}
      </p>

      {apps.length > 0 && (
        <>
          <dl className="mt-6 grid grid-cols-2 overflow-hidden rounded-card border border-line bg-surface sm:grid-cols-5">
            {STAGES.map((s, i) => (
              <div key={s.value} className={`px-5 py-4 ${i > 0 ? "sm:border-l sm:border-line" : ""}`}>
                <dt className="text-[13px] text-muted">{s.label}</dt>
                <dd className={`num mt-1 text-[24px] leading-8 ${byStage[s.value] ? "" : "text-muted"}`}>{byStage[s.value]}</dd>
              </div>
            ))}
          </dl>

          <section className="mt-3 overflow-hidden rounded-card border border-line bg-surface" aria-label="Applications">
            <div className="hidden grid-cols-[minmax(0,1fr)_110px_200px_minmax(0,1fr)] gap-4 border-b border-line px-5 py-3 text-[12px] text-muted md:grid">
              <span>Posting</span>
              <span className="text-right">Applied</span>
              <span>Stage</span>
              <span>Notes</span>
            </div>
            <ul>
              {apps.map((a) => (
                <ApplicationRow key={a.id} app={a} />
              ))}
            </ul>
          </section>
        </>
      )}
      {apps.length === 0 && (
        <Link href="/" className="mt-6 inline-flex h-9 items-center rounded-control bg-ink px-4 text-[14px] font-medium text-white hover:bg-ink/85">
          Go to the feed
        </Link>
      )}
    </div>
  );
}
