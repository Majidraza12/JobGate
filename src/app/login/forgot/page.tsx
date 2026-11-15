import type { Metadata } from "next";
import { AuthShell } from "../AuthShell";
import { ForgotForm } from "./ForgotForm";

export const metadata: Metadata = { title: "Reset your password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Reset your password" intro="Enter the email you signed up with and we'll send you a link to set a new password.">
      <ForgotForm />
    </AuthShell>
  );
}
