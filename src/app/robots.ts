import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Only the landing page and sign-in are public. Everything else needs an
// account, so crawlers would only ever see a redirect to /login.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: ["/", "/login"], disallow: ["/feed", "/listing/", "/applied", "/saved", "/profile", "/reset-password", "/auth/", "/login/forgot"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
