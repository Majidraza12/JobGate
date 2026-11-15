// Landing point for Supabase email links (password reset now, email
// confirmation later). Two link styles are accepted:
//   token_hash + type: the email template links here directly. Works on any
//     device, so it's the one the hosted templates should use.
//   code: Supabase's default PKCE redirect. Works only in the browser that
//     asked for the email, because the code verifier is a cookie there.
// Either way the result is a session cookie, then a redirect to `next`.
import type { EmailOtpType } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safeNext";

const OTP_TYPES: readonly string[] = ["recovery", "signup", "email", "invite", "magiclink", "email_change"];

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  const code = params.get("code");

  const supabase = await createClient();
  let ok = false;
  if (tokenHash && type && OTP_TYPES.includes(type)) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as EmailOtpType })).error;
  } else if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  }

  // A relative Location: the browser resolves it against the host it is
  // already on, so the session cookie set above is always sent with it.
  const to = ok ? safeNext(params.get("next")) : "/login?error=link";
  return new Response(null, { status: 303, headers: { Location: to } });
}
