"use client";

import { useId, useMemo, useState } from "react";

export type CityOption = { city: string; count: number };

// Type-to-search over known U.S. cities (listing cities plus the Census
// list), picked as chips. Only known cities can be chosen, so a spelling can
// never miss.
export function CityPicker({ name, options, defaultValue }: { name: string; options: CityOption[]; defaultValue: string[] }) {
  const [picked, setPicked] = useState<string[]>(defaultValue);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();

  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    // Prefix of the city name first ("chi" -> Chicago), then any word start.
    const starts = (o: CityOption) => o.city.toLowerCase().startsWith(t);
    const words = (o: CityOption) => o.city.toLowerCase().split(/[\s,]+/).some((w) => w.startsWith(t));
    const free = options.filter((o) => !picked.includes(o.city));
    return [...free.filter(starts), ...free.filter((o) => !starts(o) && words(o))].slice(0, 8);
  }, [q, options, picked]);

  const add = (city: string) => {
    setPicked([...picked, city]);
    setQ("");
    setActive(0);
  };
  const remove = (city: string) => setPicked(picked.filter((c) => c !== city));
  const show = open && q.trim() !== "";

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") setActive(Math.min(active + 1, matches.length - 1));
    else if (e.key === "ArrowUp") setActive(Math.max(active - 1, 0));
    else if (e.key === "Enter") {
      // Never submit the profile from the search box.
      e.preventDefault();
      if (matches[active]) add(matches[active].city);
    } else if (e.key === "Escape") setOpen(false);
    else if (e.key === "Backspace" && q === "" && picked.length) remove(picked[picked.length - 1]!);
    else return;
    if (e.key !== "Enter" && e.key !== "Backspace") e.preventDefault();
  };

  return (
    <div className="relative mt-2">
      {picked.map((c) => (
        <input key={c} type="hidden" name={name} value={c} />
      ))}
      <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-[12px] border border-white/10 bg-black/25 px-2 py-1.5 focus-within:border-lavender/60">
        {picked.map((c) => (
          <span key={c} className="flex h-7 items-center gap-1 rounded-full bg-white/[0.08] pl-3 pr-1 text-[13px] font-medium text-ink ring-1 ring-inset ring-white/10">
            {c}
            <button type="button" onClick={() => remove(c)} aria-label={`Remove ${c}`} className="grid size-5 place-items-center rounded-full text-muted hover:bg-white/10 hover:text-ink">
              ×
            </button>
          </span>
        ))}
        <input
          value={q}
          onChange={(e) => (setQ(e.target.value), setOpen(true), setActive(0))}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKey}
          role="combobox"
          aria-expanded={show}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label="Search cities"
          placeholder={picked.length ? "Add another city" : "Type a city, for example Chi"}
          className="h-7 min-w-[160px] flex-1 bg-transparent px-1 outline-none"
        />
      </div>

      {show && (
        <ul id={listId} role="listbox" className="absolute left-0 right-0 z-20 mt-2 overflow-hidden animate-pop rounded-[14px] border border-white/10 bg-[#15121f]/95 py-1 shadow-[0_20px_50px_-12px_rgb(0_0_0/0.8)] backdrop-blur-xl">
          {matches.length === 0 && <li className="px-3 py-2 text-muted">No U.S. city matching &quot;{q.trim()}&quot;.</li>}
          {matches.map((o, i) => (
            <li
              key={o.city}
              role="option"
              aria-selected={i === active}
              // mousedown, not click: the input's blur would close the list first.
              onMouseDown={(e) => (e.preventDefault(), add(o.city))}
              onMouseEnter={() => setActive(i)}
              className={`flex items-center justify-between px-3 py-2 ${i === active ? "bg-hover" : ""}`}
            >
              <span>{o.city}</span>
              <span className={`num text-[12px] ${o.count ? "text-mint" : "text-muted"}`}>
                {o.count ? `${o.count} posting${o.count === 1 ? "" : "s"}` : "No postings yet"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
