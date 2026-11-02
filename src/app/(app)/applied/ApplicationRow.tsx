"use client";

import Link from "next/link";
import { useRef, useTransition } from "react";
import { CompanyAvatar } from "@/components/CompanyAvatar";
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
    <li className="rounded-[18px] border-2 border-line bg-surface">
      <form ref={form} onSubmit={(e) => (e.preventDefault(), save())} className="grid gap-x-4 gap-y-3 p-4 md:grid-cols-[minmax(0,1fr)_200px_minmax(0,1fr)] md:items-center">
        <Link href={`/listing/${app.listing_id}`} className="flex min-w-0 items-center gap-3 rounded-[12px] hover:opacity-85">
          <CompanyAvatar company={app.listings?.company ?? "?"} size={40} />
          <span className="min-w-0">
            <span className="block truncate font-display text-[16px] font-bold">{app.listings?.title ?? "Posting removed"}</span>
            <span className="block truncate text-[13px] text-muted">
              {app.listings?.company} · applied <span className="num">{app.applied_at.slice(0, 10)}</span>
            </span>
          </span>
        </Link>
        <select
          name="status"
          defaultValue={app.status}
          onChange={save}
          aria-label="Stage"
          className="h-10 rounded-[10px] border-2 border-line bg-sunken px-2 text-[14px] font-semibold hover:border-lav"
        >
          {STAGES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <input
            name="notes"
            defaultValue={app.notes}
            onBlur={save}
            placeholder="Recruiter, OA date, referral…"
            aria-label="Notes"
            className="h-10 min-w-0 flex-1 rounded-[10px] border-2 border-line bg-sunken px-3 text-[14px] outline-none focus:border-lav"
          />
          <span className="w-12 text-[12px] text-mint" aria-live="polite">
            {pending ? "Saving" : ""}
          </span>
        </div>
      </form>
    </li>
  );
}
