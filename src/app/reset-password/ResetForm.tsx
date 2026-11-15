"use client";

import { useActionState } from "react";
import { BUTTON } from "@/components/ui";
import { updatePassword, type AuthState } from "../login/actions";
import { PasswordField, StateMessages } from "../login/fields";

const initial: AuthState = { error: null, notice: null };

export function ResetForm() {
  const [state, action, pending] = useActionState(updatePassword, initial);
  return (
    <form action={action} className="glow mt-8 rounded-[20px] p-6">
      <PasswordField id="password" label="New password" className="" minLength={8} maxLength={72} autoComplete="new-password" />
      <PasswordField id="confirm" label="Confirm new password" minLength={8} maxLength={72} autoComplete="new-password" />
      <StateMessages state={state} />
      <button disabled={pending} className={`${BUTTON.primary} mt-6 h-12 w-full text-[16px]`}>
        {pending ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}
