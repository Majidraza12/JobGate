"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/app/login/actions";
import { Mark } from "./Mark";

const NAV = [
  { href: "/", label: "Feed", icon: "M4 6h16M4 12h16M4 18h10" },
  { href: "/applied", label: "Applied", icon: "M5 12.5l4 4L19 7" },
  { href: "/profile", label: "Profile", icon: "M12 12a4 4 0 100-8 4 4 0 000 8zm-7 8a7 7 0 0114 0" },
];

function Icon({ d }: { d: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export function Sidebar({ email, appliedCount }: { email: string; appliedCount: number }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/" ? path === "/" || path.startsWith("/listing") : path.startsWith(href));

  const nav = (
    <nav className="flex flex-col gap-0.5" aria-label="Main">
      {NAV.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          onClick={() => setOpen(false)}
          aria-current={active(n.href) ? "page" : undefined}
          className={`flex h-8 items-center gap-2.5 rounded-control px-2.5 text-[14px] ${active(n.href) ? "bg-brand-soft text-ink" : "text-muted hover:bg-raised hover:text-ink"}`}
        >
          <Icon d={n.icon} />
          <span className="flex-1">{n.label}</span>
          {n.href === "/applied" && appliedCount > 0 && <span className="num text-[12px] text-muted">{appliedCount}</span>}
        </Link>
      ))}
    </nav>
  );

  const account = (
    <div className="border-t border-line pt-3">
      <p className="truncate px-2.5 text-[13px] text-muted" title={email}>
        {email}
      </p>
      <form action={signOut}>
        <button className="mt-1 h-8 w-full rounded-control px-2.5 text-left text-[14px] text-muted hover:bg-raised hover:text-ink">Sign out</button>
      </form>
    </div>
  );

  return (
    <>
      {/* Desktop: a labelled sidebar on the page ground, one hairline to the canvas. */}
      <aside className="sticky top-0 hidden h-screen flex-col justify-between border-r border-line px-3 py-5 md:flex">
        <div>
          <Link href="/" className="mb-6 flex items-center gap-2.5 px-2.5">
            <Mark />
            <span className="text-[16px] font-medium">JobGate</span>
          </Link>
          {nav}
        </div>
        {account}
      </aside>

      {/* Phone: a 48px top bar; the menu opens the nav as a full-screen sheet. */}
      <div className="sticky top-0 z-20 flex h-12 items-center justify-between border-b border-line bg-ground px-4 md:hidden">
        <Link href="/" className="flex items-center gap-2">
          <Mark size={22} />
          <span className="font-medium">JobGate</span>
        </Link>
        <button onClick={() => setOpen(true)} className="h-11 px-2 text-[14px]" aria-expanded={open} aria-controls="mobile-nav">
          Menu
        </button>
      </div>
      {open && (
        <div id="mobile-nav" className="fixed inset-0 z-30 flex flex-col justify-between bg-ground p-4 md:hidden">
          <div>
            <div className="mb-6 flex items-center justify-between">
              <span className="font-medium">Menu</span>
              <button onClick={() => setOpen(false)} className="h-11 px-2 text-[14px]">
                Close
              </button>
            </div>
            {nav}
          </div>
          {account}
        </div>
      )}
    </>
  );
}
