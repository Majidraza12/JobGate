"use client";

import { useActionState, useState, useTransition } from "react";
import { sendFeedback, setApplied, type FeedbackState } from "./actions";

export function AppliedButton({ listingId, applied }: { listingId: number; applied: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => start(() => setApplied(listingId, !applied))}
      aria-pressed={applied}
      className={`h-9 rounded-control border px-4 text-[14px] font-medium disabled:opacity-60 ${applied ? "border-transparent bg-mint text-mint-ink" : "border-control bg-surface hover:border-ink"}`}
    >
      {pending ? "Saving…" : applied ? "Applied ✓" : "Mark applied"}
    </button>
  );
}

export function PostingText({ text }: { text: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-card border border-line bg-surface" aria-label="Posting text">
      <div className="flex items-center justify-between px-5 py-3">
        <h2 className="text-[16px] font-medium">Posting text</h2>
        {text && (
          <button onClick={() => setOpen(!open)} aria-expanded={open} className="text-[14px] text-brand hover:underline">
            {open ? "Hide" : "Show the full posting"}
          </button>
        )}
      </div>
      {!text && <p className="px-5 pb-4 text-muted">We couldn&apos;t fetch this posting&apos;s text. Open it on the company site.</p>}
      {open && text && <div className="max-h-[560px] overflow-auto whitespace-pre-wrap border-t border-line px-5 py-4 text-[14px] leading-6">{text}</div>}
    </section>
  );
}

export function FeedbackForm({ listingId, verdictShown, fields }: { listingId: number; verdictShown: string; fields: { value: string; label: string }[] }) {
  const [state, action, pending] = useActionState<FeedbackState, FormData>(sendFeedback.bind(null, listingId, verdictShown), { sent: false, error: null });
  return (
    <section className="rounded-card border border-line bg-surface px-5 py-4" aria-labelledby="feedback">
      <h2 id="feedback" className="text-[16px] font-medium">
        Wrong verdict?
      </h2>
      {state.sent ? (
        <p className="mt-2 text-muted">Thanks. Reports go into the accuracy review.</p>
      ) : (
        <form action={action} className="mt-3">
          <label htmlFor="fb-field" className="block text-[14px] font-medium">
            What&apos;s wrong
          </label>
          <select id="fb-field" name="field" className="mt-2 h-9 w-full rounded-control border border-control bg-surface px-2 text-[14px]">
            <option value="">The verdict overall</option>
            {fields.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
          <label htmlFor="fb-comment" className="mt-3 block text-[14px] font-medium">
            Details
          </label>
          <textarea id="fb-comment" name="comment" rows={3} maxLength={2000} className="mt-2 w-full rounded-control border border-control bg-surface px-3 py-2 text-[14px]" />
          {state.error && <p className="mt-2 text-[13px] text-bad-ink">{state.error}</p>}
          <button disabled={pending} className="mt-3 h-9 rounded-control border border-control bg-surface px-4 text-[14px] font-medium hover:border-ink disabled:opacity-60">
            {pending ? "Sending…" : "Send report"}
          </button>
        </form>
      )}
    </section>
  );
}
