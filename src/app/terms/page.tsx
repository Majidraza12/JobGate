import type { Metadata } from "next";
import { CONTACT_EMAIL, LegalPage } from "../LegalPage";

export const metadata: Metadata = { title: "Terms of service", alternates: { canonical: "/terms" } };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of service" updated="November 14, 2026">
      <p>By creating an account or using JobGate, you agree to these terms. They are short on purpose.</p>

      <h2>What JobGate is</h2>
      <p>
        A free tool that reads job postings for stated eligibility requirements, such as graduation windows, return-to-school rules, citizenship, visa
        sponsorship, and security clearance, and compares them with the profile you give it.
      </p>

      <h2>Verdicts are guidance, not guarantees</h2>
      <p>
        Requirements are read from posting text automatically and can be wrong or out of date, and employers can change postings at any time.
        &ldquo;Eligible&rdquo; means you meet every requirement the posting states that JobGate evaluated. It is not a promise from the employer, and it is not
        legal or immigration advice. Always read the original posting, linked on every listing, before you apply. If a verdict looks wrong, the &ldquo;Wrong
        verdict?&rdquo; button tells us.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>Give accurate profile answers; verdicts are only as good as they are.</li>
        <li>Keep your sign-in details to yourself. You are responsible for activity on your account.</li>
        <li>One person per account.</li>
      </ul>

      <h2>Fair use</h2>
      <p>
        Don&apos;t try to break, overload, or get around the limits of the service, access other people&apos;s data, or copy listings or verdicts in bulk. We may
        suspend accounts that do.
      </p>

      <h2>Job listings</h2>
      <p>
        Listings belong to the employers that posted them and link to their own sites. JobGate is not affiliated with those employers or with any job board, and
        is not responsible for their hiring decisions or the content of their postings.
      </p>

      <h2>The service</h2>
      <p>
        JobGate is provided free and &ldquo;as is&rdquo;, without warranties of any kind. It may change, pause, or stop. To the extent the law allows, JobGate is
        not liable for decisions you make based on it, including applications you did or did not send.
      </p>

      <h2>Ending your account</h2>
      <p>
        You can stop using JobGate at any time. To delete your account and data, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <h2>Changes</h2>
      <p>If these terms change, we will update this page and the date at the top.</p>

      <h2>Contact</h2>
      <p>
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
    </LegalPage>
  );
}
