import Link from "next/link";
import { Ambient } from "@/components/Ambient";
import { Mark } from "@/components/Mark";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode } = await searchParams;
  return (
    <div className="relative min-h-screen overflow-x-clip">
      <Ambient hero />
      <main className="relative z-10 grid min-h-screen place-items-center px-4 py-10">
        <div className="w-full max-w-[420px] animate-rise">
          <Link href="/" className="mb-8 flex items-center justify-center gap-2 text-[21px] font-bold tracking-[-0.02em]">
            <Mark size={26} />
            JobGate
          </Link>
          <h1 className="text-center text-[36px] font-semibold leading-[1.1] tracking-[-0.03em]">
            Know if you can apply <span className="text-shine pr-[0.06em] italic">before</span> you apply
          </h1>
          <p className="mt-3 text-center text-soft">Internship and new-grad postings matched to your graduation date and work authorization, with the sentence that decides each one.</p>
          <LoginForm initialMode={mode === "signup" ? "up" : "in"} />
        </div>
      </main>
    </div>
  );
}
