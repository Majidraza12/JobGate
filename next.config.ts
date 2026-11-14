import type { NextConfig } from "next";

// Sent on every response. The CSP here is the part that needs no per-request
// nonce: it forbids framing (clickjacking), plugins, <base> hijacking, and
// forms posting to other sites. A script-src policy would need nonces wired
// through the middleware and is not set yet.
export const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
];

const config: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  webpack(webpackConfig, { dev }) {
    // Tool output written into the repo (browser test logs, design screenshots)
    // must not trigger rebuilds, or a test that logs on rebuild loops forever.
    if (dev) webpackConfig.watchOptions = { ...webpackConfig.watchOptions, ignored: ["**/node_modules/**", "**/.git/**", "**/.playwright-mcp/**", "**/.taste-skill/**", "**/eval/**", "**/test/**"] };
    return webpackConfig;
  },
};

export default config;
