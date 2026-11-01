"use client";

import { useActionState, useState } from "react";
import { signIn, signUp, type AuthState } from "./actions";

const initial: AuthState = { error: null, notice: null };

export function LoginForm({ initialMode = "in" }: { initialMode?: "in" | "up" }) {
  const [mode, setMode] = useState<"in" | "up">(initialMode);
  const [inState, inAction, inPending] = useActionState(signIn, initial);
  const [upState, upAction, upPending] = useActionState(signUp, initial);
  const state = mode === "in" ? inState : upState;
  const pending = inPending || upPending;

  return (
    <form action={mode === "in" ? inAction : upAction} className="mt-8 rounded-[24px] border-2 border-line bg-surface p-6 shadow-[8px_8px_0_var(--color-brand)]">
      <div role="tablist" className="mb-6 flex gap-1 rounded-[14px] border-2 border-line bg-sunken p-1">
        {(["in", "up"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`h-9 flex-1 rounded-[10px] text-[14px] font-semibold ${mode === m ? "bg-mint text-ground" : "text-muted hover:text-ink"}`}
          >
            {m === "in" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      <label className="block text-[14px] font-medium" htmlFor="email">
        Email
      </label>
      <input id="email" name="email" type="email" required autoComplete="email" className="mt-2 h-11 w-full rounded-[12px] border-2 border-line bg-sunken px-3 font-medium outline-none focus:border-lav" />

      <label className="mt-4 block text-[14px] font-medium" htmlFor="password">
        Password
      </label>
      <input
        id="password"
        name="password"
        type="password"
        required
        minLength={6}
        aria-describedby={mode === "up" ? "pw-rule" : undefined}
        autoComplete={mode === "in" ? "current-password" : "new-password"}
        className="mt-2 h-11 w-full rounded-[12px] border-2 border-line bg-sunken px-3 font-medium outline-none focus:border-lav"
      />
      {mode === "up" && (
        <p id="pw-rule" className="mt-1.5 text-[12px] text-muted">
          At least 6 characters.
        </p>
      )}

      {state.error && <p className="mt-4 rounded-control bg-bad-bg px-3 py-2 text-[13px] text-bad-ink">{state.error}</p>}
      {state.notice && <p className="mt-4 rounded-control bg-warn-bg px-3 py-2 text-[13px] text-warn-ink">{state.notice}</p>}

      <button disabled={pending} className="mt-6 h-12 w-full rounded-[14px] bg-ink font-bold text-ground hover:bg-mint active:scale-[0.98] disabled:opacity-60">
        {pending ? "Working…" : mode === "in" ? "Sign in" : "Create account"}
      </button>
    </form>
  );
}
