"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { BUTTON } from "@/components/ui";
import { signIn, signInWithGoogle, signUp, type AuthState } from "./actions";
import { INPUT, PasswordField, StateMessages } from "./fields";

const initial: AuthState = { error: null, notice: null };
const LINK_ERROR: AuthState = { error: "That link has expired or was already used. Request a new one.", notice: null };

export function LoginForm({ initialMode = "in", linkError = false }: { initialMode?: "in" | "up"; linkError?: boolean }) {
  const [mode, setMode] = useState<"in" | "up">(initialMode);
  // Controlled, because React resets uncontrolled fields after every form
  // action, which would wipe the email after a wrong password.
  const [email, setEmail] = useState("");
  const [inState, inAction, inPending] = useActionState(signIn, initial);
  const [upState, upAction, upPending] = useActionState(signUp, initial);
  const [googleState, googleAction, googlePending] = useActionState(signInWithGoogle, initial);
  const acted = inState !== initial || upState !== initial || googleState !== initial;
  // An expired email link lands here with ?error=link; show that until the form is used.
  const state = !acted && linkError ? LINK_ERROR : googleState.error ? googleState : mode === "in" ? inState : upState;
  const pending = inPending || upPending || googlePending;

  return (
    <div className="glow mt-8 rounded-[20px] p-6">
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

      {/* Its own form: forms can't nest, and this one posts nothing but a click. */}
      <form action={googleAction}>
        <button
          disabled={pending}
          className="flex h-12 w-full items-center justify-center gap-3 rounded-full bg-white text-[15.5px] font-semibold text-[#1f1f1f] hover:bg-[#f2f2f2] active:scale-[0.98] disabled:opacity-60"
        >
          <GoogleMark />
          {googlePending ? "Opening Google…" : "Continue with Google"}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3 text-[12.5px] text-muted" aria-hidden="true">
        <span className="h-px flex-1 bg-white/10" />
        or with email
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <form action={mode === "in" ? inAction : upAction}>
        <label className="block text-[14px] font-medium text-soft" htmlFor="email">
          Email
        </label>
        <input id="email" name="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} />

        <PasswordField
          key={mode}
          id="password"
          label="Password"
          // New passwords need 8; sign-in stays open to older, shorter ones.
          minLength={mode === "up" ? 8 : undefined}
          aria-describedby={mode === "up" ? "pw-rule" : undefined}
          autoComplete={mode === "in" ? "current-password" : "new-password"}
        />
        {mode === "up" ? (
          <>
            <p id="pw-rule" className="mt-1.5 text-[12.5px] text-muted">
              At least 8 characters.
            </p>
            <PasswordField id="confirm" label="Confirm password" minLength={8} autoComplete="new-password" />
          </>
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
    </div>
  );
}

// Google's "G" mark, as Google's sign-in branding guidelines ask.
function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
