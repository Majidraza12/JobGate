import { AuthShell } from "../AuthShell";
import { ForgotForm } from "./ForgotForm";

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Reset your password" intro="Enter the email you signed up with and we'll send you a link to set a new password.">
      <ForgotForm />
    </AuthShell>
  );
}
