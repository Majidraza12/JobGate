import Link from "next/link";
import type { ReactNode } from "react";
import { Ambient } from "@/components/Ambient";
import { Mark } from "@/components/Mark";

export const CONTACT_EMAIL = "support@jobgate.dev";

// Plain reading layout for the privacy policy and terms.
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-x-clip">
      <Ambient />
      <main className="relative z-10 mx-auto max-w-[760px] px-4 py-12 sm:py-16">
        <Link href="/" className="mb-10 flex items-center gap-2 text-[21px] font-bold tracking-[-0.02em]">
          <Mark size={26} />
          JobGate
        </Link>
        <h1 className="text-[38px] font-semibold leading-[1.1] tracking-[-0.03em]">{title}</h1>
        <p className="mt-2 text-[14px] text-muted">Last updated {updated}</p>
        <div className="mt-8 space-y-4 text-[15.5px] leading-[1.7] text-soft [&_a]:text-lavender [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mt-10 [&_h2]:text-[21px] [&_h2]:font-semibold [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-ink [&_ul]:space-y-1.5">
          {children}
        </div>
        <p className="mt-12 flex gap-5 border-t border-white/[0.07] pt-6 text-[13.5px] text-muted">
          <Link href="/privacy" className="hover:text-ink">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-ink">
            Terms
          </Link>
          <Link href="/" className="hover:text-ink">
            Home
          </Link>
        </p>
      </main>
    </div>
  );
}
