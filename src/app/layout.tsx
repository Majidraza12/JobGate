import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from "@/lib/site";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", weight: ["400", "500", "600", "700", "800"], style: ["normal", "italic"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // Pages set a short title ("Sign in"); the template adds the brand.
  title: { default: SITE_TITLE, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "internship eligibility",
    "new grad jobs",
    "internships no sponsorship",
    "F-1 student internships",
    "OPT jobs",
    "graduation date requirement",
    "summer 2027 internships",
    "software engineering internships",
  ],
  openGraph: { type: "website", siteName: SITE_NAME, url: SITE_URL, title: SITE_TITLE, description: SITE_DESCRIPTION, locale: "en_US" },
  twitter: { card: "summary_large_image", title: SITE_TITLE, description: SITE_DESCRIPTION },
  // The site is already dark. This tells the Dark Reader extension to leave it
  // alone; its rewritten inline styles otherwise break React hydration.
  other: { "darkreader-lock": "true" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
