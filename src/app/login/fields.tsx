"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Icon } from "@/components/Icon";
import type { AuthState } from "./actions";

export const INPUT =
  "mt-2 h-12 w-full rounded-[12px] border border-white/10 bg-black/25 px-4 font-medium outline-none hover:border-white/20 focus:border-lavender/60";

// A labelled password input with its own show/hide toggle.
export function PasswordField({ id, label, className = "mt-4", ...input }: { id: string; label: string } & InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <div className={className}>
      <label className="block text-[14px] font-medium text-soft" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input id={id} name={id} type={show ? "text" : "password"} required className={`${INPUT} pr-12`} {...input} />
        <button
          type="button"
          onClick={() => setShow(!show)}
          aria-label={show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={show}
          className="absolute right-1.5 top-[calc(50%+4px)] grid size-9 -translate-y-1/2 place-items-center rounded-[10px] text-muted hover:bg-white/[0.06] hover:text-ink"
        >
          <Icon name={show ? "eyeOff" : "eye"} size={19} />
        </button>
      </div>
    </div>
  );
}

// Error (rose) and notice (amber) lines under an auth form.
export function StateMessages({ state }: { state: AuthState }) {
  return (
    <>
      {state.error && (
        <p role="alert" className="mt-4 rounded-[12px] bg-rose/10 px-3.5 py-2.5 text-[13.5px] text-rose ring-1 ring-inset ring-rose/20">
          {state.error}
        </p>
      )}
      {state.notice && (
        <p role="status" className="mt-4 rounded-[12px] bg-amber/10 px-3.5 py-2.5 text-[13.5px] text-amber ring-1 ring-inset ring-amber/20">
          {state.notice}
        </p>
      )}
    </>
  );
}
