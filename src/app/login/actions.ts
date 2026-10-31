"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error: string | null; notice: string | null };

function credentials(form: FormData) {
  return { email: String(form.get("email") ?? "").trim(), password: String(form.get("password") ?? "") };
}

export async function signIn(_prev: AuthState, form: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(credentials(form));
  if (error) return { error: error.message, notice: null };
  redirect("/");
}

export async function signUp(_prev: AuthState, form: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp(credentials(form));
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
