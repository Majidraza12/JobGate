// Paths a signed-out visitor may open. Kept apart from the middleware so the
// rule can be unit-tested without a request.
// Crawler files and the link-preview image must be reachable without an
// account, or Google and LinkedIn just get redirected to /login.
const PUBLIC_PATHS = ["/login", "/auth", "/privacy", "/terms", "/robots.txt", "/sitemap.xml", "/opengraph-image"];

// Whole path segments: "/login" and "/auth/..." are public, "/login-anything" is not.
export const isPublicPath = (path: string) => path === "/" || PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
