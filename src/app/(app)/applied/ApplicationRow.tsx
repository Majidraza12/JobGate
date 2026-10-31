"use client";

import Link from "next/link";
import { useRef, useTransition } from "react";
import { STAGES, type Stage } from "@/lib/stages";
import { updateApplication } from "./actions";

export type Application = {
  id: number;
  status: Stage;
  notes: string;
  applied_at: string;
  listing_id: number;
  listings: { company: string; title: string; apply_url: string } | null;
};

// Each row saves itself when a field changes: one save model for the page.
export function ApplicationRow({ app }: { app: Application }) {
  const form = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const save = () => start(() => updateApplication(app.id, new FormData(form.current!)));

  return (
    <li className="border-b border-rule last:border-0">
      <form ref={form} onSubmit={(e) => (e.preventDefault(), save())} className="grid gap-x-4 gap-y-2 px-5 py-3.5 md:grid-cols-[minmax(0,1fr)_110px_200px_minmax(0,1fr)] md:items-center">
        <Link href={`/listing/${app.listing_id}`} className="min-w-0 hover:underline">
          <span className="block truncate font-medium">{app.listings?.title ?? "Posting removed"}</span>
          <span className="block truncate text-[13px] text-muted">{app.listings?.company}</span>
        </Link>
        <span className="num text-[13px] text-muted md:text-right">{app.applied_at.slice(0, 10)}</span>
        <select name="status" defaultValue={app.status} onChange={save} aria-label="Stage" className="h-9 rounded-control border border-control bg-surface px-2 text-[14px]">
          {STAGES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <input name="notes" defaultValue={app.notes} onBlur={save} placeholder="Recruiter, OA date, referral…" aria-label="Notes" className="h-9 min-w-0 flex-1 rounded-control border border-line bg-surface px-3 text-[14px]" />
          <span className="w-12 text-[12px] text-muted" aria-live="polite">
            {pending ? "Saving" : ""}
          </span>
        </div>
      </form>
    </li>
  );
}
