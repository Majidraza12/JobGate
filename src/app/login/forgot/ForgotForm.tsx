"use client";

import Link from "next/link";
import { useActionState } from "react";
import { BUTTON } from "@/components/ui";
import { requestPasswordReset, type AuthState } from "../actions";
import { INPUT, StateMessages } from "../fields";

const initial: AuthState = { error: null, notice: null };

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, initial);
  return (
    <form action={action} className="glow mt-8 rounded-[20px] p-6">
      <label className="block text-[14px] font-medium text-soft" htmlFor="email">
        Email
      </label>
      <input id="email" name="email" type="email" required autoComplete="email" className={INPUT} />
      <StateMessages state={state} />
      <button disabled={pending} className={`${BUTTON.primary} mt-6 h-12 w-full text-[16px]`}>
        {pending ? "Sending…" : "Send reset link"}
      </button>
      <Link href="/login" className="mt-4 block text-center text-[13.5px] font-medium text-soft hover:text-ink">
        Back to sign in
      </Link>
    </form>
  );
}
