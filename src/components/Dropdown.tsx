"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Icon, type IconName } from "./Icon";

export type DropdownOption<T extends string> = { value: T; label: string; hint?: string };

// A small listbox popover, styled like the references' "Sort by" and "All
// locations" menus. Escape and outside clicks close it; arrows move focus.
export function Dropdown<T extends string>({
  value,
  options,
  onChange,
  label,
  icon,
  prefix,
  className = "",
  buttonClassName = "",
  align = "right",
}: {
  value: T;
  options: DropdownOption<T>[];
  onChange: (v: T) => void;
  label: string;
  icon?: IconName;
  prefix?: string;
  className?: string;
  buttonClassName?: string;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();
  const current = options.find((o) => o.value === value) ?? options[0]!;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    list.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus();
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      root.current?.querySelector("button")?.focus();
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const items = [...(list.current?.querySelectorAll<HTMLElement>("[role=option]") ?? [])];
      const i = items.indexOf(document.activeElement as HTMLElement);
      items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
    }
  };

  return (
    <div ref={root} className={`relative ${className}`} onKeyDown={onKey}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        aria-label={`${label}: ${current.label}`}
        className={`flex items-center gap-2.5 ${buttonClassName}`}
      >
        {icon && <Icon name={icon} size={19} className="text-soft" />}
        {prefix && <span className="text-muted">{prefix}</span>}
        <span className="min-w-0 flex-1 truncate text-left">{current.label}</span>
        <Icon name="chevronDown" size={16} className={`text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul
          ref={list}
          id={id}
          role="listbox"
          aria-label={label}
          className={`absolute top-[calc(100%+8px)] z-40 min-w-[220px] animate-pop rounded-[14px] border border-white/10 bg-[#15121f]/95 p-1.5 shadow-[0_20px_50px_-12px_rgb(0_0_0/0.8),0_0_0_1px_rgb(102_49_251/0.08)] backdrop-blur-xl ${align === "right" ? "right-0" : "left-0"}`}
        >
          {options.map((o) => (
            <li
              key={o.value}
              role="option"
              tabIndex={-1}
              aria-selected={o.value === value}
              onClick={() => (onChange(o.value), setOpen(false))}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onChange(o.value), setOpen(false))}
              className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[14px] text-soft outline-none hover:bg-white/[0.06] hover:text-ink focus:bg-white/[0.06] focus:text-ink aria-selected:text-ink"
            >
              <span className="min-w-0 flex-1">
                {o.label}
                {o.hint && <span className="block text-[12px] text-muted">{o.hint}</span>}
              </span>
              {o.value === value && <Icon name="check" size={16} className="text-lavender" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
