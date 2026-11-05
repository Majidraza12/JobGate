"use client";

import { useActionState, useOptimistic, useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { BUTTON } from "@/components/ui";
import { sendFeedback, setApplied, type FeedbackState } from "./actions";

export function AppliedButton({ listingId, applied }: { listingId: number; applied: boolean }) {
  const [on, setOn] = useOptimistic(applied);
  const [, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() =>
        start(async () => {
          setOn(!on);
          await setApplied(listingId, !on);
        })
      }
      aria-pressed={on}
      className={`flex h-11 items-center justify-center gap-2 rounded-full border px-3 text-[14.5px] font-medium ${
        on ? "border-mint/40 bg-mint/10 text-mint" : "border-white/12 bg-white/[0.03] hover:border-lavender/50 hover:bg-white/[0.06]"
      }`}
    >
      <Icon name={on ? "checkCircle" : "send"} size={18} />
      {on ? "Applied" : "Mark applied"}
    </button>
  );
}

export function PostingText({ text }: { text: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <section aria-label="Posting text">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 text-[21px] font-semibold tracking-[-0.01em]">
          <Icon name="file" size={24} className="text-lavender" />
          Job Description
        </h2>
        {text && (
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className={`${BUTTON.ghost} h-9 px-4 text-[13.5px]`}>
            {open ? "Collapse" : "Show the full posting"}
            <Icon name="chevronDown" size={15} className={`transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>
      {!text ? (
        <p className="mt-3 text-[15px] text-soft">We couldn&apos;t fetch this posting&apos;s text. Open it on the company site.</p>
      ) : (
        <div className="relative mt-4">
          <div className={`whitespace-pre-wrap text-[15px] leading-[1.7] text-soft ${open ? "" : "max-h-[168px] overflow-hidden"}`}>{text.replace(/\n{3,}/g, "\n\n").trim()}</div>
          {!open && <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ground to-transparent" />}
        </div>
      )}
    </section>
  );
}

const field = "mt-2 w-full rounded-[12px] border border-white/10 bg-black/25 px-3 text-[14px] text-ink outline-none hover:border-white/20 focus:border-lavender/60";

export function FeedbackForm({ listingId, verdictShown, fields }: { listingId: number; verdictShown: string; fields: { value: string; label: string }[] }) {
  const [state, action, pending] = useActionState<FeedbackState, FormData>(sendFeedback.bind(null, listingId, verdictShown), { sent: false, error: null });
  const [open, setOpen] = useState(false);
  return (
    <section className="glass rounded-[18px] p-5" aria-labelledby="feedback">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-3 text-left">
        <Icon name="flag" size={19} className="text-lavender" />
        <span className="flex-1">
          <span id="feedback" className="block text-[17px] font-semibold">
            Wrong verdict?
          </span>
          <span className="block text-[13px] text-muted">Tell us and it goes into the accuracy review.</span>
        </span>
        <Icon name="chevronDown" size={16} className={`text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open &&
        (state.sent ? (
          <p className="mt-4 flex items-center gap-2 text-[14px] text-mint">
            <Icon name="checkCircle" size={17} />
            Thanks. Reports go into the accuracy review.
          </p>
        ) : (
          <form action={action} className="mt-4 animate-fade">
            <label htmlFor="fb-field" className="block text-[13.5px] font-medium text-soft">
              What&apos;s wrong
            </label>
            <select id="fb-field" name="field" className={`${field} h-10`}>
              <option value="">The verdict overall</option>
              {fields.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
            <label htmlFor="fb-comment" className="mt-3 block text-[13.5px] font-medium text-soft">
              Details
            </label>
            <textarea id="fb-comment" name="comment" rows={3} maxLength={2000} className={`${field} py-2`} />
            {state.error && <p className="mt-2 text-[13px] text-bad-ink">{state.error}</p>}
            <button disabled={pending} className={`${BUTTON.primary} mt-3 h-10 px-5 text-[14px]`}>
              {pending ? "Sending…" : "Send report"}
            </button>
          </form>
        ))}
    </section>
  );
}
