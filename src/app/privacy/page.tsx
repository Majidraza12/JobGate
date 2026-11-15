import type { Metadata } from "next";
import { CONTACT_EMAIL, LegalPage } from "../LegalPage";

export const metadata: Metadata = { title: "Privacy policy", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="November 14, 2026">
      <p>
        JobGate is a free tool that checks internship and new-grad job postings against your graduation date and work authorization. This page explains what we
        store about you, why, and what you can do about it. The short version: we keep only what the tool needs to work, we never sell it, and there are no ads.
      </p>

      <h2>What we store</h2>
      <ul>
        <li>
          <strong>Your account:</strong> your email address and a securely hashed password. If you sign in with Google, we receive your name, email address, and
          profile picture link from Google, and no password is stored.
        </li>
        <li>
          <strong>Your eligibility profile:</strong> graduation month, degree level, your answers to the work authorization questions (citizenship, permanent
          residency, whether you need visa sponsorship now or later), security clearance, the start terms and cities you picked, and the job types you want.
        </li>
        <li>
          <strong>What you do in the app:</strong> postings you save, applications you track (stage and any notes you write), and &ldquo;Wrong verdict?&rdquo;
          reports you send.
        </li>
        <li>
          <strong>Password reset requests:</strong> a one-way hash (not the readable value) of the email address and network address each request came from,
          used only to limit how often resets can be requested, and deleted after two days.
        </li>
      </ul>

      <h2>Your work authorization answers</h2>
      <p>
        These are sensitive, so they get extra care. They are used only to compute verdicts for you. They are never shown to anyone else, never written to our
        logs, never sent to analytics, and never shared with employers. Database rules make your profile, applications, saved jobs, and reports readable only by
        your own account.
      </p>

      <h2>Why we store it</h2>
      <p>
        To sign you in, to show which postings you meet the stated requirements of, to remember what you saved and applied to, and to improve how accurately
        postings are read (that is what &ldquo;Wrong verdict?&rdquo; reports are for). We do not use your data for advertising and we do not sell or rent it to
        anyone.
      </p>

      <h2>Services that handle data for us</h2>
      <ul>
        <li>
          <strong>Supabase:</strong> our database and sign-in provider. Everything listed above is stored there.
        </li>
        <li>
          <strong>Vercel:</strong> hosts the website. Like any web host, it processes standard request information such as IP addresses to serve pages.
        </li>
        <li>
          <strong>Resend:</strong> sends account emails such as password resets. It receives the email address and the message.
        </li>
        <li>
          <strong>Google:</strong> only if you choose &ldquo;Continue with Google&rdquo;, under Google&apos;s own privacy policy.
        </li>
      </ul>

      <h2>Cookies</h2>
      <p>We use only the cookies needed to keep you signed in. No advertising or tracking cookies.</p>

      <h2>Job postings</h2>
      <p>
        Postings come from public sources and the employers&apos; own career sites. The requirement checks are done once per posting and are the same for every
        user; your profile is only compared with them when you view your feed.
      </p>

      <h2>Keeping or deleting your data</h2>
      <p>
        We keep your data while you have an account. To delete your account and everything linked to it, or to get a copy of your data, email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> from the address you signed up with. We will do it within 30 days and confirm by email.
      </p>

      <h2>Children</h2>
      <p>JobGate is meant for college students and recent graduates. It is not intended for anyone under 16.</p>

      <h2>Changes</h2>
      <p>If this policy changes, we will update this page and the date at the top. For a significant change, we will email account holders first.</p>

      <h2>Contact</h2>
      <p>
        Questions: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
    </LegalPage>
  );
}
