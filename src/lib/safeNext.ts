// Where to send someone after they click an email link. Only plain same-site
// paths are allowed: "//evil.com", "https://evil.com", or a path with a
// backslash would make the link an open redirect.
const SAFE_PATH = /^(\/[A-Za-z0-9_-]+)+$/;

export function safeNext(next: string | null | undefined, fallback = "/feed"): string {
  return next && SAFE_PATH.test(next) ? next : fallback;
}
