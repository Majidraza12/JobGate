import Link from "next/link";
import { LoginForm } from "./LoginForm";
import { Mark } from "@/components/Mark";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode } = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-[400px]">
        <Link href="/" className="mb-8 flex items-center gap-2.5 font-display text-[22px] font-bold">
          <Mark size={30} />
          JobGate
        </Link>
        <h1 className="font-display text-[36px] font-bold leading-[1.02] tracking-[-0.03em]">
          Know if you can apply <span className="text-mint">before you apply.</span>
        </h1>
        <p className="mt-3 text-muted">Internship and new-grad postings matched to your graduation date and work authorization, with the sentence that decides each one.</p>
        <LoginForm initialMode={mode === "signup" ? "up" : "in"} />
      </div>
    </main>
  );
}
