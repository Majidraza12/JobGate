import Link from "next/link";
import { Mark } from "@/components/Mark";
import { LandingDemo } from "./LandingDemo";

// The public front door. Signed-in users never see it: the middleware sends
// them to /feed.

const STEPS = [
  {
    n: "01",
    title: "We collect the postings",
    body: "Internship and new-grad listings from open trackers. Each job description is fetched from the company's own careers system.",
  },
  {
    n: "02",
    title: "We read every rule once",
    body: "Each description is read for the rules buried in it: graduation window, return to school, class year, degree, citizenship, sponsorship, clearance. Every rule keeps the exact sentence it came from.",
  },
  {
    n: "03",
    title: "You get matched instantly",
    body: "Your profile is checked against every posting in plain code, so your feed is instant and your answers are never sent to an AI.",
  },
];

const WHY = [
  {
    tone: "bg-mint text-ground",
    title: "A green card isn't citizenship",
    body: "Most trackers lump everything into one “citizens only” flag. JobGate checks citizenship, ITAR U.S. person, sponsorship now, sponsorship later, and clearance separately, so a permanent resident is never hidden from a job they can take.",
  },
  {
    tone: "bg-amber text-ground",
    title: "Every verdict shows its sentence",
    body: "No black box. Each Eligible, Check, or Not eligible comes with the exact quote from the posting that decided it, checked word for word against the original text.",
  },
  {
    tone: "bg-lav text-ground",
    title: "Silence isn't a yes",
    body: "When a posting never mentions a rule, JobGate says “not stated”. When it couldn't read one, it says so. Those are never shown as the same thing.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-[1240px] items-center gap-3 px-4 pt-5 md:px-8 md:pt-7">
        <Link href="/" className="flex items-center gap-2.5 font-display text-[22px] font-bold">
          <Mark size={30} />
          JobGate
        </Link>
        <nav className="ml-auto flex items-center gap-1 sm:gap-2">
          <Link href="/login" className="flex h-11 items-center whitespace-nowrap rounded-[12px] px-3 font-semibold text-muted hover:text-ink sm:px-4">
            Log in
          </Link>
          <Link href="/login?mode=signup" className="flex h-11 items-center whitespace-nowrap rounded-[12px] bg-mint px-3 font-bold text-ground hover:bg-ink active:scale-95 sm:px-4">
            Sign up free
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-[1240px] px-4 md:px-8">
        {/* Hero */}
        <section className="grid items-center gap-10 pb-16 pt-14 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:pt-20">
          <div>
            <p className="inline-flex rotate-[-2deg] rounded-[10px] bg-amber px-3 py-1 font-mono text-[12px] font-bold uppercase tracking-wide text-ground">
              For internship and new-grad hunters
            </p>
            <h1 className="mt-5 font-display text-[44px] font-bold leading-[0.98] tracking-[-0.04em] md:text-[68px]">
              Know if you can apply <span className="text-mint">before you apply.</span>
            </h1>
            <p className="mt-5 max-w-[52ch] text-[17px] leading-[1.6] text-muted">
              Postings hide their rules: graduate between December and June, must return to school, U.S. citizens only, no sponsorship. JobGate reads them for
              you and shows which jobs you can actually apply to, with the sentence that decides each one.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login?mode=signup"
                className="flex h-13 items-center rounded-[14px] bg-brand px-6 text-[16px] font-bold text-on-brand shadow-[6px_6px_0_var(--color-mint)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[8px_8px_0_var(--color-mint)] active:translate-x-0 active:translate-y-0 active:shadow-none"
              >
                Check my eligibility
              </Link>
              <a href="#demo" className="flex h-13 items-center rounded-[14px] border-2 border-line bg-surface px-6 text-[16px] font-bold hover:border-lav active:scale-95">
                Try the demo ↓
              </a>
            </div>
          </div>

          {/* The gate: open for you, closed for the rest. */}
          <div className="relative mx-auto aspect-square w-full max-w-[440px] rounded-[32px] bg-brand shadow-[10px_10px_0_var(--color-mint)]" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="absolute inset-[14%]">
              <rect x="3" y="3" width="3.2" height="19" rx="1.2" fill="#fff" />
              <rect x="17.8" y="3" width="3.2" height="19" rx="1.2" fill="#fff" />
              <rect x="3" y="8" width="18" height="3" rx="1.2" fill="var(--color-mint)" transform="rotate(-24 3 9.5)" />
            </svg>
            <span className="absolute left-5 top-6 rotate-[-6deg] rounded-[10px] bg-mint px-3 py-1.5 font-mono text-[13px] font-bold uppercase text-ground">Eligible</span>
            <span className="absolute bottom-8 right-5 rotate-[5deg] rounded-[10px] bg-amber px-3 py-1.5 font-mono text-[13px] font-bold uppercase text-ground">Check</span>
            <span className="absolute bottom-24 left-4 rotate-[-3deg] rounded-[10px] bg-rose px-3 py-1.5 font-mono text-[13px] font-bold uppercase text-ground">Not eligible</span>
          </div>
        </section>

        {/* Demo */}
        <section id="demo" className="scroll-mt-8 rounded-[28px] border-2 border-line bg-sunken/80 p-5 md:p-8">
          <h2 className="font-display text-[32px] font-bold leading-[1.05] tracking-[-0.03em] md:text-[40px]">Try it on real postings.</h2>
          <p className="mt-2 max-w-[60ch] text-muted">
            Four real job descriptions, already read. Change who you are and watch the verdicts move. The highlighted phrase is the sentence that decided it.
          </p>
          <div className="mt-6">
            <LandingDemo />
          </div>
        </section>

        {/* How it works */}
        <section className="pt-20">
          <h2 className="font-display text-[32px] font-bold tracking-[-0.03em] md:text-[40px]">How it works</h2>
          <ol className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="rounded-[22px] border-2 border-line bg-surface p-6">
                <span className="font-mono text-[14px] font-bold text-lav">{s.n}</span>
                <h3 className="mt-3 font-display text-[22px] font-bold leading-[1.15]">{s.title}</h3>
                <p className="mt-2 text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Why */}
        <section className="pt-20">
          <h2 className="font-display text-[32px] font-bold tracking-[-0.03em] md:text-[40px]">Why it's different</h2>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            {WHY.map((w) => (
              <article key={w.title} className="rounded-[22px] border-2 border-line bg-surface p-6">
                <span className={`inline-block rotate-[-3deg] rounded-[8px] px-2 py-0.5 font-mono text-[11px] font-bold uppercase ${w.tone}`}>Why</span>
                <h3 className="mt-3 font-display text-[22px] font-bold leading-[1.15]">{w.title}</h3>
                <p className="mt-2 text-muted">{w.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Closing call to action */}
        <section className="py-20">
          <div className="rounded-[28px] bg-brand px-6 py-10 text-center shadow-[10px_10px_0_var(--color-mint)] md:px-10 md:py-14">
            <h2 className="mx-auto max-w-[20ch] font-display text-[34px] font-bold leading-[1.02] tracking-[-0.03em] text-on-brand md:text-[48px]">
              Stop opening postings you can't apply to.
            </h2>
            <p className="mx-auto mt-4 max-w-[48ch] text-[#e5dcff]">Set your graduation date and work authorization once. It takes under a minute.</p>
            <Link href="/login?mode=signup" className="mt-8 inline-flex h-13 items-center rounded-[14px] bg-mint px-7 text-[16px] font-bold text-ground hover:bg-ink active:scale-95">
              Create my free account
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t-2 border-line">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-3 px-4 py-8 text-[13px] text-muted md:flex-row md:justify-between md:px-8">
          <p className="max-w-[70ch]">
            “Eligible” means you meet every requirement the posting states that JobGate evaluated. It is not a guarantee from the employer.
          </p>
          <p>
            Listings from{" "}
            <a className="text-ink underline decoration-line underline-offset-4 hover:decoration-lav" href="https://github.com/zshah101/Automated-List-Of-Summer-2027-and-Fall-2026-Tech-Internships">
              zshah101
            </a>{" "}
            (MIT) and{" "}
            <a className="text-ink underline decoration-line underline-offset-4 hover:decoration-lav" href="https://github.com/SimplifyJobs/New-Grad-Positions">
              SimplifyJobs
            </a>
            .
          </p>
        </div>
      </footer>
    </div>
  );
}
