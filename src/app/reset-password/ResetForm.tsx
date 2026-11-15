"use client";

import { useActionState, useState } from "react";
import { Icon } from "@/components/Icon";
import { BUTTON } from "@/components/ui";
import { updatePassword, type AuthState } from "../login/actions";
import { INPUT, StateMessages } from "../login/fields";

const initial: AuthState = { error: null, notice: null };

export function ResetForm() {
  const [state, action, pending] = useActionState(updatePassword, initial);
  const [show, setShow] = useState(false);
  const type = show ? "text" : "password";
  return (
    <form action={action} className="glow mt-8 rounded-[20px] p-6">
      <label className="block text-[14px] font-medium text-soft" htmlFor="password">
        New password
      </label>
      <div className="relative">
        <input id="password" name="password" type={type} required minLength={8} maxLength={72} autoComplete="new-password" className={`${INPUT} pr-12`} />
        <button
          type="button"
          onClick={() => setShow(!show)}
          aria-label={show ? "Hide passwords" : "Show passwords"}
          aria-pressed={show}
          className="absolute right-1.5 top-[calc(50%+4px)] grid size-9 -translate-y-1/2 place-items-center rounded-[10px] text-muted hover:bg-white/[0.06] hover:text-ink"
        >
          <Icon name={show ? "eyeOff" : "eye"} size={19} />
        </button>
      </div>
      <label className="mt-4 block text-[14px] font-medium text-soft" htmlFor="confirm">
        Confirm new password
      </label>
      <input id="confirm" name="confirm" type={type} required minLength={8} maxLength={72} autoComplete="new-password" className={INPUT} />
      <StateMessages state={state} />
      <button disabled={pending} className={`${BUTTON.primary} mt-6 h-12 w-full text-[16px]`}>
        {pending ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}
