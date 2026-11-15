"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error: string | null; notice: string | null };

function credentials(form: FormData) {
  return { email: String(form.get("email") ?? "").trim(), password: String(form.get("password") ?? "") };
}

// New passwords: 8 is the floor (matches the hosted Auth setting), 72 is
// bcrypt's limit, past which Supabase rejects the password.
function passwordProblem(password: string): string | null {
  if (password.length < 8) return "Use a password of at least 8 characters.";
  if (password.length > 72) return "Use a password of at most 72 characters.";
  return null;
}

export async function signIn(_prev: AuthState, form: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(credentials(form));
  if (error) return { error: error.message, notice: null };
  redirect("/feed");
}

export async function signUp(_prev: AuthState, form: FormData): Promise<AuthState> {
  const creds = credentials(form);
  const problem = passwordProblem(creds.password);
  if (problem) return { error: problem, notice: null };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp(creds);
  if (error) return { error: error.message, notice: null };
  // With "Confirm email" on, Supabase returns no session until the link is clicked.
  if (!data.session) return { error: null, notice: "Check your email for a confirmation link, then sign in." };
  redirect("/profile");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

const RESET_SENT = "If that email has an account, a reset link is on its way. Check your inbox and spam folder.";

export async function requestPasswordReset(_prev: AuthState, form: FormData): Promise<AuthState> {
  const email = z.email().max(320).safeParse(String(form.get("email") ?? "").trim());
  if (!email.success) return { error: "Enter a valid email address.", notice: null };

  // Next.js checks that a server action's Origin matches the host, and
  // Supabase only accepts redirect URLs on its allowlist, so this can't be
  // pointed at another site.
  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email.data, { redirectTo: `${origin}/auth/confirm?next=/reset-password` });

  // The same answer whether or not the account exists, so this form can't be
  // used to find out who has signed up. Only rate limiting is surfaced.
  if (error?.status === 429) return { error: "Too many reset requests. Wait a few minutes and try again.", notice: null };
  return { error: null, notice: RESET_SENT };
}

export async function updatePassword(_prev: AuthState, form: FormData): Promise<AuthState> {
  const password = String(form.get("password") ?? "");
  const problem = passwordProblem(password);
  if (problem) return { error: problem, notice: null };
  if (password !== String(form.get("confirm") ?? "")) return { error: "The two passwords don't match.", notice: null };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message, notice: null };
  redirect("/feed");
}
