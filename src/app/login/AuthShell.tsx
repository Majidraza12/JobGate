import Link from "next/link";
import type { ReactNode } from "react";
import { Ambient } from "@/components/Ambient";
import { Mark } from "@/components/Mark";

// The centered card layout shared by sign in, forgot password, and reset password.
export function AuthShell({ title, intro, children }: { title: ReactNode; intro: string; children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-x-clip">
      <Ambient hero />
      <main className="relative z-10 grid min-h-screen place-items-center px-4 py-10">
        <div className="w-full max-w-[420px] animate-rise">
          <Link href="/" className="mb-8 flex items-center justify-center gap-2 text-[21px] font-bold tracking-[-0.02em]">
            <Mark size={26} />
            JobGate
          </Link>
          <h1 className="text-center text-[36px] font-semibold leading-[1.1] tracking-[-0.03em]">{title}</h1>
          <p className="mt-3 text-center text-soft">{intro}</p>
          {children}
        </div>
      </main>
    </div>
  );
}
