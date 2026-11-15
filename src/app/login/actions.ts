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
  if (creds.password !== String(form.get("confirm") ?? "")) return { error: "The two passwords don't match.", notice: null };
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

// What the visitor sees when a limit stops a reset email. Honest about what
// happened and what to do; never "under maintenance".
const RESET_LIMIT_MESSAGES = {
  email_limit: "You've asked for 3 reset links today. Use the newest one in your inbox (check spam too), or try again tomorrow.",
  ip_limit: "Too many reset requests from this network. Wait an hour and try again.",
  wait: "A reset link was just sent. Wait a minute before asking for another one.",
  busy: "We're sending a lot of emails right now. Try again in an hour.",
  failed: "Couldn't send a reset link right now. Try again in a few minutes.",
} as const;

// Vercel sets x-real-ip and puts the client first in x-forwarded-for.
function clientIp(h: Headers) {
  return (h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0] ?? "").trim().slice(0, 100);
}

export async function requestPasswordReset(_prev: AuthState, form: FormData): Promise<AuthState> {
  const email = z.email().max(320).safeParse(String(form.get("email") ?? "").trim());
  if (!email.success) return { error: "Enter a valid email address.", notice: null };

  const h = await headers();
  const supabase = await createClient();

  // Our own limits first (3 per address a day, 10 per network an hour), so
  // one person can't use up the project's email quota for everyone else.
  const { data, error: slotError } = await supabase.rpc("claim_password_reset", { p_email: email.data, p_ip: clientIp(h) });
  const slot = data as "ok" | "email_limit" | "ip_limit" | null;
  if (slotError) return { error: RESET_LIMIT_MESSAGES.failed, notice: null };
  if (slot === "email_limit" || slot === "ip_limit") return { error: RESET_LIMIT_MESSAGES[slot], notice: null };

  // Next.js checks that a server action's Origin matches the host, and
  // Supabase only accepts redirect URLs on its allowlist, so this can't be
  // pointed at another site.
  const origin = h.get("origin") ?? `https://${h.get("host")}`;
  const { error } = await supabase.auth.resetPasswordForEmail(email.data, { redirectTo: `${origin}/auth/confirm?next=/reset-password` });

  // The same answer whether or not the account exists, so this form can't be
  // used to find out who has signed up. Only rate limits are surfaced:
  // Supabase's one-per-minute per address, or the project-wide email cap.
  if (error?.status === 429) {
    const perAddress = /seconds|security purposes/i.test(error.message);
    return { error: perAddress ? RESET_LIMIT_MESSAGES.wait : RESET_LIMIT_MESSAGES.busy, notice: null };
  }
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
