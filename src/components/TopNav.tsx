"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/login/actions";
import { Mark } from "./Mark";

const TABS = [
  { href: "/feed", label: "Jobs" },
  { href: "/applied", label: "Applied" },
  { href: "/saved", label: "Saved" },
];

// The references' top bar: logo, text tabs with a soft pill on the active one,
// and on the right an account initial, a divider, Sign out, and the lavender
// button (here: your profile, which every verdict is computed from).
export function TopNav({ email, appliedCount, savedCount }: { email: string; appliedCount: number; savedCount: number }) {
  const path = usePathname();
  const active = (href: string) => (href === "/feed" ? path === "/feed" || path.startsWith("/listing") : path.startsWith(href));
  const count = (href: string) => (href === "/applied" ? appliedCount : href === "/saved" ? savedCount : 0);

  const tabs = TABS.map((t) => (
    <Link
      key={t.href}
      href={t.href}
      aria-current={active(t.href) ? "page" : undefined}
      className={`flex h-10 items-center gap-1.5 whitespace-nowrap rounded-[10px] px-4 text-[15px] font-medium ${
        active(t.href) ? "bg-white/[0.07] text-ink shadow-[inset_0_1px_0_rgb(255_255_255/0.05)]" : "text-soft hover:bg-white/[0.04] hover:text-ink"
      }`}
    >
      {t.label}
      {count(t.href) > 0 && <span className="num text-[12px] font-semibold text-lavender">{count(t.href)}</span>}
    </Link>
  ));

  return (
    <header className="relative z-20 mx-auto max-w-[1410px] px-4 pt-1 md:px-8">
      <div className="flex h-14 items-center gap-2">
        <Link href="/feed" className="mr-6 flex items-center gap-2 text-[21px] font-bold tracking-[-0.02em] lg:mr-12">
          <Mark size={26} />
          JobGate
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1.5 md:flex">
          {tabs}
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <span
            title={email}
            className="hidden size-9 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-[13px] font-semibold text-soft sm:grid"
          >
            {email.slice(0, 1).toUpperCase() || "?"}
          </span>
          <span aria-hidden="true" className="mx-2 hidden h-6 w-px bg-white/10 sm:block" />
          <form action={signOut}>
            <button className="h-10 whitespace-nowrap rounded-[10px] px-3 text-[15px] font-medium text-soft hover:text-ink">Sign out</button>
          </form>
          <Link
            href="/profile"
            aria-current={path.startsWith("/profile") ? "page" : undefined}
            className="btn-lavender flex h-10 items-center whitespace-nowrap rounded-[11px] px-4 text-[15px] font-semibold hover:brightness-110 active:scale-[0.97] aria-[current=page]:ring-2 aria-[current=page]:ring-white/40"
          >
            Your profile
          </Link>
        </div>
      </div>
      <nav aria-label="Main" className="-mx-1 flex gap-1 overflow-x-auto pb-1 md:hidden">
        {tabs}
      </nav>
    </header>
  );
}
