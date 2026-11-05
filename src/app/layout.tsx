import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", weight: ["400", "500", "600", "700", "800"], style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: "JobGate",
  description: "Which internship and new-grad postings you're eligible for, with the sentence that decides it.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
