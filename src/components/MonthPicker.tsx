"use client";

import { useEffect, useRef, useState } from "react";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const label = (v: string) => `${LONG[Number(v.slice(5)) - 1]} ${v.slice(0, 4)}`;

// One button that opens a year-and-month grid. Submits "YYYY-MM" through a
// hidden input, so the server action reads it like any other field.
export function MonthPicker({ name, id, defaultValue, placeholder = "Pick a month" }: { name: string; id?: string; defaultValue?: string | null; placeholder?: string }) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => Number((defaultValue ?? "").slice(0, 4)) || new Date().getFullYear() + 1);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const pick = (m: number) => {
    setValue(`${year}-${String(m + 1).padStart(2, "0")}`);
    setOpen(false);
  };
  const arrow = "grid size-8 place-items-center rounded-control text-muted hover:bg-raised hover:text-ink";

  return (
    <div ref={box} className="relative mt-2">
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        id={id}
        onClick={() => setOpen(!open)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`flex h-10 w-full items-center justify-between rounded-control border bg-surface px-3 text-left ${open ? "border-brand" : "border-line hover:border-control"}`}
      >
        <span className={value ? "" : "text-muted"}>{value ? label(value) : placeholder}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-muted" aria-hidden="true">
          <rect x="3.5" y="5" width="17" height="15" rx="2" />
          <path d="M3.5 10h17M8 3v4M16 3v4" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div role="dialog" aria-label="Choose a month" className="absolute left-0 z-20 mt-2 w-[296px] rounded-card border border-line bg-raised p-3 shadow-[0_12px_32px_rgba(0,0,0,0.5)]">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => setYear(year - 1)} className={arrow} aria-label="Previous year">
              ‹
            </button>
            <span className="num font-medium">{year}</span>
            <button type="button" onClick={() => setYear(year + 1)} className={arrow} aria-label="Next year">
              ›
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {MONTHS.map((m, i) => {
              const v = `${year}-${String(i + 1).padStart(2, "0")}`;
              const selected = v === value;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => pick(i)}
                  aria-pressed={selected}
                  aria-label={`${LONG[i]} ${year}`}
                  className={`h-9 rounded-control text-[14px] ${selected ? "bg-brand font-medium text-on-brand" : "text-ink hover:bg-hover"}`}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
