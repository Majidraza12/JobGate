"use client";

import { BUTTON } from "@/components/ui";

// Shown when a page under the signed-in layout fails to load (for example the
// database is unreachable). Deliberately says nothing about the cause: error
// details stay in the server logs.
export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-[520px] pt-24 text-center">
      <h1 className="text-[28px] font-semibold tracking-[-0.02em]">Something went wrong</h1>
      <p className="mt-3 text-[15px] leading-[1.6] text-soft">We couldn&apos;t load this page. Nothing was changed. Try again in a moment.</p>
      <button type="button" onClick={reset} className={`${BUTTON.ghost} mt-6 h-11 px-5`}>
        Try again
      </button>
    </div>
  );
}
