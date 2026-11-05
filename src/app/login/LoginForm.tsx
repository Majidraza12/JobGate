"use client";

import { useActionState, useState } from "react";
import { BUTTON } from "@/components/ui";
import { signIn, signUp, type AuthState } from "./actions";

const initial: AuthState = { error: null, notice: null };
const input = "mt-2 h-12 w-full rounded-[12px] border border-white/10 bg-black/25 px-4 font-medium outline-none hover:border-white/20 focus:border-lavender/60";

export function LoginForm({ initialMode = "in" }: { initialMode?: "in" | "up" }) {
  const [mode, setMode] = useState<"in" | "up">(initialMode);
  const [inState, inAction, inPending] = useActionState(signIn, initial);
  const [upState, upAction, upPending] = useActionState(signUp, initial);
  const state = mode === "in" ? inState : upState;
  const pending = inPending || upPending;

  return (
    <form action={mode === "in" ? inAction : upAction} className="glow mt-8 rounded-[20px] p-6">
      <div role="tablist" className="mb-6 flex gap-1 rounded-full border border-white/10 bg-black/25 p-1">
        {(["in", "up"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`h-10 flex-1 rounded-full text-[14.5px] font-medium ${mode === m ? "btn-lavender" : "text-soft hover:text-ink"}`}
          >
            {m === "in" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      <label className="block text-[14px] font-medium text-soft" htmlFor="email">
        Email
      </label>
      <input id="email" name="email" type="email" required autoComplete="email" className={input} />

      <label className="mt-4 block text-[14px] font-medium text-soft" htmlFor="password">
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
        className={input}
      />
      {mode === "up" && (
        <p id="pw-rule" className="mt-1.5 text-[12.5px] text-muted">
          At least 6 characters.
        </p>
      )}

      {state.error && <p className="mt-4 rounded-[12px] bg-rose/10 px-3.5 py-2.5 text-[13.5px] text-rose ring-1 ring-inset ring-rose/20">{state.error}</p>}
      {state.notice && <p className="mt-4 rounded-[12px] bg-amber/10 px-3.5 py-2.5 text-[13.5px] text-amber ring-1 ring-inset ring-amber/20">{state.notice}</p>}

      <button disabled={pending} className={`${BUTTON.primary} mt-6 h-12 w-full text-[16px]`}>
        {pending ? "Working…" : mode === "in" ? "Sign in" : "Create account"}
      </button>
    </form>
  );
}
