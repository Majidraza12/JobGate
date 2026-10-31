import { LoginForm } from "./LoginForm";
import { Mark } from "@/components/Mark";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-[380px]">
        <div className="mb-8 flex items-center gap-2.5">
          <Mark />
          <span className="text-[16px] font-medium">JobGate</span>
        </div>
        <h1 className="text-[24px] font-medium leading-8">Check your eligibility before you apply</h1>
        <p className="mt-2 text-muted">
          Internship and new-grad postings matched to your graduation date and work authorization, with the sentence from each posting
          that decides it.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
