"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/app/login/actions";
import { Mark } from "./Mark";

const TABS = [
  { href: "/feed", label: "Feed" },
  { href: "/applied", label: "Applied" },
  { href: "/profile", label: "Profile" },
];

// Top bar: the mark, the three tabs in one pill, and an account menu.
export function TopNav({ email, appliedCount }: { email: string; appliedCount: number }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  const active = (href: string) => (href === "/feed" ? path === "/feed" || path.startsWith("/listing") : path.startsWith(href));

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !menu.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <header className="mx-auto flex max-w-[1240px] items-center gap-3 px-4 pt-5 md:px-8 md:pt-7">
      <Link href="/feed" className="flex items-center gap-2.5 font-display text-[22px] font-bold">
        <Mark size={30} />
        <span className="hidden sm:inline">JobGate</span>
      </Link>

      <nav aria-label="Main" className="ml-auto flex gap-1 rounded-[14px] border-2 border-line bg-surface p-1">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active(t.href) ? "page" : undefined}
            className={`flex h-9 items-center gap-1.5 rounded-[10px] px-3 text-[14px] font-semibold active:scale-95 sm:px-4 ${active(t.href) ? "bg-mint text-ground" : "text-muted hover:text-ink"}`}
          >
            {t.label}
            {t.href === "/applied" && appliedCount > 0 && <span className="num font-mono text-[12px]">{appliedCount}</span>}
          </Link>
        ))}
      </nav>

      <div ref={menu} className="relative">
        <button
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label="Account"
          className="grid size-11 place-items-center rounded-[14px] border-2 border-line bg-surface font-display font-bold hover:border-lav"
        >
          {email.slice(0, 1).toUpperCase() || "?"}
        </button>
        {open && (
          <div className="absolute right-0 z-30 mt-2 w-64 rounded-[16px] border-2 border-line bg-surface p-2 shadow-[6px_6px_0_var(--color-line)]">
            <p className="truncate px-3 py-2 text-[13px] text-muted" title={email}>
              {email}
            </p>
            <form action={signOut}>
              <button className="h-10 w-full rounded-[10px] px-3 text-left font-semibold hover:bg-hover">Sign out</button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
