// Password reset: the redirect guard, the email-link landing route, and the
// two server actions. Supabase, next/headers, and redirect() are fakes; no
// network and no database.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { safeNext } from "../src/lib/safeNext";

const auth = {
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  verifyOtp: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  signUp: vi.fn(),
};
const rpc = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth, rpc }) }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ origin: "https://jobgate.dev", host: "jobgate.dev", "x-forwarded-for": "203.0.113.7, 10.0.0.1" }) }));
class Redirect extends Error {
  constructor(public to: string) {
    super(`redirect ${to}`);
  }
}
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Redirect(to);
  },
}));

const { requestPasswordReset, signUp, updatePassword } = await import("../src/app/login/actions");
const { GET } = await import("../src/app/auth/confirm/route");
const { NextRequest } = await import("next/server");

const empty = { error: null, notice: null };
const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};

beforeEach(() => {
  for (const fn of Object.values(auth)) fn.mockReset();
  rpc.mockReset();
  rpc.mockResolvedValue({ data: "ok", error: null });
});

describe("safeNext", () => {
  it("keeps plain same-site paths", () => {
    expect(safeNext("/reset-password")).toBe("/reset-password");
    expect(safeNext("/listing/42")).toBe("/listing/42");
  });

  it("falls back for anything that could leave the site", () => {
    for (const bad of ["//evil.com", "https://evil.com", "/\evil.com", "/a//b", "/", "", "feed", "/feed?x=1", "/%2F%2Fevil.com"]) {
      expect(safeNext(bad)).toBe("/feed");
    }
    expect(safeNext(null)).toBe("/feed");
  });
});

describe("requestPasswordReset", () => {
  it("rejects a malformed email without calling Supabase", async () => {
    const res = await requestPasswordReset(empty, form({ email: "not-an-email" }));
    expect(res.error).toMatch(/valid email/);
    expect(auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("sends the link through /auth/confirm on this site", async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ error: null });
    await requestPasswordReset(empty, form({ email: "  me@example.com " }));
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith("me@example.com", {
      redirectTo: "https://jobgate.dev/auth/confirm?next=/reset-password",
    });
  });

  it("answers the same whether or not the account exists", async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ error: null });
    const known = await requestPasswordReset(empty, form({ email: "known@example.com" }));
    auth.resetPasswordForEmail.mockResolvedValue({ error: { status: 400, message: "User not found" } });
    const unknown = await requestPasswordReset(empty, form({ email: "nobody@example.com" }));
    expect(unknown).toEqual(known);
    expect(known.notice).toMatch(/If that email has an account/);
  });

  it("checks our limits with the email and the client's IP before sending", async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ error: null });
    await requestPasswordReset(empty, form({ email: "me@example.com" }));
    expect(rpc).toHaveBeenCalledWith("claim_password_reset", { p_email: "me@example.com", p_ip: "203.0.113.7" });
  });

  it("stops at 3 a day per address, or 10 an hour per network, without sending", async () => {
    rpc.mockResolvedValue({ data: "email_limit", error: null });
    expect((await requestPasswordReset(empty, form({ email: "me@example.com" }))).error).toMatch(/3 reset links today/);
    rpc.mockResolvedValue({ data: "ip_limit", error: null });
    expect((await requestPasswordReset(empty, form({ email: "me@example.com" }))).error).toMatch(/this network/);
    expect(auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("doesn't send when the limit check itself fails", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "db down" } });
    expect((await requestPasswordReset(empty, form({ email: "me@example.com" }))).error).toMatch(/Couldn't send/);
    expect(auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("tells apart Supabase's per-minute limit and the project-wide cap", async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ error: { status: 429, message: "For security purposes, you can only request this after 42 seconds." } });
    expect((await requestPasswordReset(empty, form({ email: "me@example.com" }))).error).toMatch(/Wait a minute/);
    auth.resetPasswordForEmail.mockResolvedValue({ error: { status: 429, message: "email rate limit exceeded" } });
    expect((await requestPasswordReset(empty, form({ email: "me@example.com" }))).error).toMatch(/lot of emails/);
  });
});

describe("updatePassword", () => {
  it("enforces 8 to 72 characters and a matching confirmation", async () => {
    expect((await updatePassword(empty, form({ password: "short", confirm: "short" }))).error).toMatch(/at least 8/);
    const long = "x".repeat(73);
    expect((await updatePassword(empty, form({ password: long, confirm: long }))).error).toMatch(/at most 72/);
    expect((await updatePassword(empty, form({ password: "longenough1", confirm: "longenough2" }))).error).toMatch(/match/);
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it("saves the password and goes to the feed", async () => {
    auth.updateUser.mockResolvedValue({ error: null });
    await expect(updatePassword(empty, form({ password: "longenough1", confirm: "longenough1" }))).rejects.toMatchObject({ to: "/feed" });
    expect(auth.updateUser).toHaveBeenCalledWith({ password: "longenough1" });
  });

  it("shows Supabase's error", async () => {
    auth.updateUser.mockResolvedValue({ error: { message: "New password should be different from the old password." } });
    const res = await updatePassword(empty, form({ password: "longenough1", confirm: "longenough1" }));
    expect(res.error).toMatch(/different/);
  });
});

describe("GET /auth/confirm", () => {
  const get = (qs: string) => GET(new NextRequest(`https://jobgate.dev/auth/confirm?${qs}`));

  it("verifies a token_hash link and goes to next", async () => {
    auth.verifyOtp.mockResolvedValue({ error: null });
    const res = await get("token_hash=abc&type=recovery&next=/reset-password");
    expect(auth.verifyOtp).toHaveBeenCalledWith({ token_hash: "abc", type: "recovery" });
    expect(res.headers.get("location")).toBe("/reset-password");
  });

  it("exchanges a PKCE code", async () => {
    auth.exchangeCodeForSession.mockResolvedValue({ error: null });
    const res = await get("code=xyz&next=/reset-password");
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith("xyz");
    expect(res.headers.get("location")).toBe("/reset-password");
  });

  it("sends a bad or expired link to login with an error", async () => {
    auth.verifyOtp.mockResolvedValue({ error: { message: "expired" } });
    const res = await get("token_hash=abc&type=recovery&next=/reset-password");
    expect(res.headers.get("location")).toBe("/login?error=link");
  });

  it("ignores unknown link types and links with no token", async () => {
    expect((await get("token_hash=abc&type=evil")).headers.get("location")).toBe("/login?error=link");
    expect((await get("next=/feed")).headers.get("location")).toBe("/login?error=link");
    expect(auth.verifyOtp).not.toHaveBeenCalled();
  });

  it("never redirects off the site", async () => {
    auth.exchangeCodeForSession.mockResolvedValue({ error: null });
    const res = await get("code=xyz&next=//evil.com");
    expect(res.headers.get("location")).toBe("/feed");
  });
});

describe("signUp", () => {
  it("needs the confirmation to match before creating the account", async () => {
    const res = await signUp(empty, form({ email: "me@example.com", password: "longenough1", confirm: "longenough2" }));
    expect(res.error).toMatch(/match/);
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it("creates the account when they match", async () => {
    auth.signUp.mockResolvedValue({ data: { session: {} }, error: null });
    await expect(signUp(empty, form({ email: "me@example.com", password: "longenough1", confirm: "longenough1" }))).rejects.toMatchObject({ to: "/profile" });
    expect(auth.signUp).toHaveBeenCalledWith({ email: "me@example.com", password: "longenough1" });
  });
});
