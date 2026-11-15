import type { Metadata } from "next";
import { AuthShell } from "../login/AuthShell";
import { ResetForm } from "./ResetForm";

// Reached from the reset email via /auth/confirm, which signs the user in
// first. The middleware sends anyone without a session to /login.
export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Choose a new password" intro="At least 8 characters. You'll stay signed in afterwards.">
      <ResetForm />
    </AuthShell>
  );
}
