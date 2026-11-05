"use client";

import { useOptimistic, useTransition } from "react";
import { setSaved } from "@/app/(app)/saved/actions";
import { Icon } from "./Icon";

// The bookmark from the references. Flips at once, then saves; a failed save
// flips back when the page revalidates.
export function SaveButton({ listingId, saved, variant = "icon", className = "" }: { listingId: number; saved: boolean; variant?: "icon" | "full"; className?: string }) {
  const [on, setOn] = useOptimistic(saved);
  const [, start] = useTransition();
  const toggle = () =>
    start(async () => {
      setOn(!on);
      await setSaved(listingId, !on);
    });

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-pressed={on}
        className={`flex h-12 items-center justify-center gap-2.5 rounded-full border border-white/12 bg-white/[0.03] px-5 text-[15px] font-medium hover:border-lavender/50 hover:bg-white/[0.06] ${className}`}
      >
        <Icon name="bookmark" size={19} className={on ? "fill-lavender text-lavender" : ""} />
        {on ? "Saved" : "Save job"}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? "Remove from saved" : "Save job"}
      title={on ? "Saved" : "Save job"}
      className={`relative z-10 grid size-9 place-items-center rounded-[10px] text-soft hover:bg-white/[0.06] hover:text-ink ${className}`}
    >
      <Icon name="bookmark" size={22} strokeWidth={1.6} className={on ? "fill-lavender text-lavender" : ""} />
    </button>
  );
}
