"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Icon } from "@/components/Icon";
import { BUTTON } from "@/components/ui";
import { signIn, signUp, type AuthState } from "./actions";
import { INPUT, StateMessages } from "./fields";

const initial: AuthState = { error: null, notice: null };
const LINK_ERROR: AuthState = { error: "That link has expired or was already used. Request a new one.", notice: null };

export function LoginForm({ initialMode = "in", linkError = false }: { initialMode?: "in" | "up"; linkError?: boolean }) {
  const [mode, setMode] = useState<"in" | "up">(initialMode);
  const [showPw, setShowPw] = useState(false);
  // Controlled, because React resets uncontrolled fields after every form
  // action, which would wipe the email after a wrong password.
  const [email, setEmail] = useState("");
  const [inState, inAction, inPending] = useActionState(signIn, initial);
  const [upState, upAction, upPending] = useActionState(signUp, initial);
  const acted = inState !== initial || upState !== initial;
  // An expired email link lands here with ?error=link; show that until the form is used.
  const state = !acted && linkError ? LINK_ERROR : mode === "in" ? inState : upState;
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
      <input id="email" name="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} />

      <label className="mt-4 block text-[14px] font-medium text-soft" htmlFor="password">
        Password
      </label>
      <div className="relative">
        <input
          id="password"
          name="password"
          type={showPw ? "text" : "password"}
          required
          // New passwords need 8; sign-in stays open to older, shorter ones.
          minLength={mode === "up" ? 8 : undefined}
          aria-describedby={mode === "up" ? "pw-rule" : undefined}
          autoComplete={mode === "in" ? "current-password" : "new-password"}
          className={`${INPUT} pr-12`}
        />
        <button
          type="button"
          onClick={() => setShowPw(!showPw)}
          aria-label={showPw ? "Hide password" : "Show password"}
          aria-pressed={showPw}
          className="absolute right-1.5 top-[calc(50%+4px)] grid size-9 -translate-y-1/2 place-items-center rounded-[10px] text-muted hover:bg-white/[0.06] hover:text-ink"
        >
          <Icon name={showPw ? "eyeOff" : "eye"} size={19} />
        </button>
      </div>
      {mode === "up" ? (
        <p id="pw-rule" className="mt-1.5 text-[12.5px] text-muted">
          At least 8 characters.
        </p>
      ) : (
        <Link href="/login/forgot" className="mt-2 inline-block text-[13.5px] font-medium text-lavender hover:underline">
          Forgot password?
        </Link>
      )}

      <StateMessages state={state} />

      <button disabled={pending} className={`${BUTTON.primary} mt-6 h-12 w-full text-[16px]`}>
        {pending ? "Working…" : mode === "in" ? "Sign in" : "Create account"}
      </button>
    </form>
  );
}
