// Paths a signed-out visitor may open. Kept apart from the middleware so the
// rule can be unit-tested without a request.
const PUBLIC_PATHS = ["/login", "/auth"];

// Whole path segments: "/login" and "/auth/..." are public, "/login-anything" is not.
export const isPublicPath = (path: string) => path === "/" || PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
