import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "./AuthShell";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in or create an account", alternates: { canonical: "/login" } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ mode?: string; error?: string }> }) {
  const { mode, error } = await searchParams;
  return (
    <AuthShell
      title={
        <>
          Know if you can apply <span className="text-shine pr-[0.06em] italic">before</span> you apply
        </>
      }
      intro="Internship and new-grad postings matched to your graduation date and work authorization, with the sentence that decides each one."
    >
      <LoginForm initialMode={mode === "signup" ? "up" : "in"} linkError={error === "link"} />
      <p className="mt-5 text-center text-[12.5px] leading-[1.6] text-muted">
        By continuing, you agree to the{" "}
        <Link href="/terms" className="text-soft underline decoration-white/20 underline-offset-4 hover:text-ink">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="text-soft underline decoration-white/20 underline-offset-4 hover:text-ink">
          Privacy policy
        </Link>
        .
      </p>
    </AuthShell>
  );
}
