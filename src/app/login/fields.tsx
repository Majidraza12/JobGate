import type { AuthState } from "./actions";

export const INPUT =
  "mt-2 h-12 w-full rounded-[12px] border border-white/10 bg-black/25 px-4 font-medium outline-none hover:border-white/20 focus:border-lavender/60";

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
