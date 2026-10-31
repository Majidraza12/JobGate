"use client";

import { useId, useMemo, useState } from "react";

export type CityOption = { city: string; count: number };

// Type-to-search over the cities that appear in real listings, picked as
// chips. Only listed cities can be chosen, so a spelling can never miss.
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
      <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-control border border-line bg-surface px-2 py-1.5 focus-within:border-brand">
        {picked.map((c) => (
          <span key={c} className="flex h-7 items-center gap-1 rounded-full bg-brand-soft pl-3 pr-1 text-[13px] text-ink">
            {c}
            <button type="button" onClick={() => remove(c)} aria-label={`Remove ${c}`} className="grid size-5 place-items-center rounded-full text-muted hover:bg-brand hover:text-on-brand">
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
        <ul id={listId} role="listbox" className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-card border border-line bg-raised py-1 shadow-[0_12px_32px_rgba(0,0,0,0.5)]">
          {matches.length === 0 && <li className="px-3 py-2 text-muted">No postings in a city matching &quot;{q.trim()}&quot;.</li>}
          {matches.map((o, i) => (
            <li
              key={o.city}
              role="option"
              aria-selected={i === active}
              // mousedown, not click: the input's blur would close the list first.
              onMouseDown={(e) => (e.preventDefault(), add(o.city))}
              onMouseEnter={() => setActive(i)}
              className={`flex items-center justify-between px-3 py-2 ${i === active ? "bg-brand-soft" : ""}`}
            >
              <span>{o.city}</span>
              <span className="num text-[12px] text-muted">
                {o.count} posting{o.count === 1 ? "" : "s"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
