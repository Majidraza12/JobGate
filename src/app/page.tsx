import Link from "next/link";
import { Ambient } from "@/components/Ambient";
import { Icon, type IconName } from "@/components/Icon";
import { Mark } from "@/components/Mark";
import { BUTTON, IconTile, TowerArt } from "@/components/ui";
import { LandingDemo } from "./LandingDemo";

// The public front door. Signed-in users never see it: the middleware sends
// them to /feed.

const STEPS: { n: string; icon: IconName; title: string; body: string }[] = [
  {
    n: "01",
    icon: "inbox",
    title: "We collect the postings",
    body: "Internship and new-grad listings from open trackers. Each job description is fetched from the company's own careers system.",
  },
  {
    n: "02",
    icon: "file",
    title: "We read every rule once",
    body: "Each description is read for the rules buried in it: graduation window, return to school, class year, degree, citizenship, sponsorship, clearance. Every rule keeps the exact sentence it came from.",
  },
  {
    n: "03",
    icon: "bolt",
    title: "You get matched instantly",
    body: "Your profile is checked against every posting in plain code, so your feed is instant and your answers are never sent to an AI.",
  },
];

const WHY: { icon: IconName; tone: string; title: string; body: string }[] = [
  {
    icon: "globe",
    tone: "!bg-mint/10 !text-mint !ring-mint/20",
    title: "A green card isn't citizenship",
    body: "Most trackers lump everything into one “citizens only” flag. JobGate checks citizenship, ITAR U.S. person, sponsorship now, sponsorship later, and clearance separately, so a permanent resident is never hidden from a job they can take.",
  },
  {
    icon: "quote",
    tone: "!bg-amber/10 !text-amber !ring-amber/20",
    title: "Every verdict shows its sentence",
    body: "No black box. Each Eligible, Check, or Not eligible comes with the exact quote from the posting that decided it, checked word for word against the original text.",
  },
  {
    icon: "help",
    tone: "",
    title: "Silence isn't a yes",
    body: "When a posting never mentions a rule, JobGate says “not stated”. When it couldn't read one, it says so. Those are never shown as the same thing.",
  },
];

export default function Landing() {
  return (
    <div className="relative min-h-screen overflow-x-clip">
      <Ambient hero />
      <header className="relative z-20 mx-auto flex h-[60px] max-w-[1410px] items-center gap-2 px-4 md:px-8">
        <Link href="/" className="mr-10 flex items-center gap-2 text-[21px] font-bold tracking-[-0.02em]">
          <Mark size={26} />
          JobGate
        </Link>
        <nav className="hidden items-center gap-1.5 md:flex" aria-label="Sections">
          {[
            ["#demo", "Demo"],
            ["#how", "How it works"],
            ["#why", "Why JobGate"],
          ].map(([href, label]) => (
            <a key={href} href={href} className="flex h-10 items-center rounded-[10px] px-4 text-[15px] font-medium text-soft hover:bg-white/[0.04] hover:text-ink">
              {label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Link href="/login" className="flex h-10 items-center whitespace-nowrap rounded-[10px] px-3 text-[15px] font-medium text-soft hover:text-ink sm:px-4">
            Sign in
          </Link>
          <Link href="/login?mode=signup" className={`${BUTTON.primary} h-10 rounded-[11px] px-4 text-[15px]`}>
            Get Started
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[1240px] px-4 md:px-8">
        {/* Hero */}
        <section className="flex flex-col items-center pb-20 pt-10 text-center sm:pt-[30px]">
          <p className="inline-flex h-10 items-center gap-2.5 rounded-full border border-white/12 bg-white/[0.03] px-4 text-[14.5px] text-soft backdrop-blur">
            <Icon name="bolt" size={17} className="fill-lavender text-lavender" />
            For internship and new-grad hunters
          </p>
          <h1 className="mt-6 max-w-[16ch] text-[44px] font-semibold leading-[1.06] tracking-[-0.035em] sm:text-[60px] lg:text-[68px]">
            Know if you can apply <span className="text-shine pr-[0.08em] italic">before</span> you apply
          </h1>
          <p className="mt-5 max-w-[60ch] text-[17px] leading-[1.6] text-soft sm:text-[19px]">
            Postings hide their rules: graduate between December and June, must return to school, U.S. citizens only, no sponsorship. JobGate reads them for you and
            shows which jobs you can actually apply to, with the sentence that decides each one.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link href="/login?mode=signup" className={`${BUTTON.primary} h-[52px] px-7 text-[16px]`}>
              Check my eligibility
              <Icon name="arrowRight" size={18} />
            </Link>
            <a href="#demo" className={`${BUTTON.ghost} h-[52px] px-7 text-[16px]`}>
              Try the demo
            </a>
          </div>
        </section>

        {/* Demo */}
        <section id="demo" className="glass scroll-mt-8 rounded-[24px] p-5 md:p-8">
          <h2 className="text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] md:text-[38px]">
            Try it on <span className="text-shine pr-[0.06em] italic">real</span> postings
          </h2>
          <p className="mt-2 max-w-[62ch] text-soft">
            Four real job descriptions, already read. Change who you are and watch the verdicts move. The highlighted phrase is the sentence that decided it.
          </p>
          <div className="mt-6">
            <LandingDemo />
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-8 pt-24">
          <h2 className="text-[30px] font-semibold tracking-[-0.03em] md:text-[38px]">How it works</h2>
          <ol className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="glass rounded-[18px] p-6 transition-[background,border-color,box-shadow] duration-200 hover:glow">
                <span className="flex items-center gap-3">
                  <IconTile name={s.icon} />
                  <span className="num text-[14px] font-semibold text-lavender">{s.n}</span>
                </span>
                <h3 className="mt-4 text-[20px] font-semibold leading-[1.25]">{s.title}</h3>
                <p className="mt-2 text-[15px] leading-[1.55] text-soft">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Why */}
        <section id="why" className="scroll-mt-8 pt-24">
          <h2 className="text-[30px] font-semibold tracking-[-0.03em] md:text-[38px]">Why it&apos;s different</h2>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            {WHY.map((w) => (
              <article key={w.title} className="glass rounded-[18px] p-6 transition-[background,border-color,box-shadow] duration-200 hover:glow">
                <IconTile name={w.icon} className={w.tone} />
                <h3 className="mt-4 text-[20px] font-semibold leading-[1.25]">{w.title}</h3>
                <p className="mt-2 text-[15px] leading-[1.55] text-soft">{w.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Closing call to action */}
        <section className="py-24">
          <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(160deg,#1f1636_0%,#130f20_55%,#100d19_100%)] px-6 py-12 text-center shadow-[inset_0_1px_0_rgb(255_255_255/0.06)] md:px-10 md:py-16">
            <TowerArt className="absolute right-0 top-0 h-[260px] w-[240px] opacity-80" />
            <div className="absolute -right-16 -top-16 size-64 rounded-full bg-brand/30 blur-3xl" aria-hidden="true" />
            <div className="relative">
              <h2 className="mx-auto max-w-[20ch] text-[32px] font-semibold leading-[1.1] tracking-[-0.03em] md:text-[46px]">
                Stop opening postings you <span className="text-shine pr-[0.06em] italic">can&apos;t</span> apply to
              </h2>
              <p className="mx-auto mt-4 max-w-[48ch] text-soft">Set your graduation date and work authorization once. It takes under a minute.</p>
              <Link href="/login?mode=signup" className={`${BUTTON.white} mt-8 h-[52px] px-7 text-[16px]`}>
                Create my free account
                <Icon name="arrowRight" size={18} />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/[0.07]">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-3 px-4 py-8 text-[13px] text-muted md:flex-row md:justify-between md:px-8">
          <p className="max-w-[70ch]">“Eligible” means you meet every requirement the posting states that JobGate evaluated. It is not a guarantee from the employer.</p>
          <p>
            Listings from{" "}
            <a
              className="text-soft underline decoration-white/20 underline-offset-4 hover:text-ink hover:decoration-lavender"
              href="https://github.com/zshah101/Automated-List-Of-Summer-2027-and-Fall-2026-Tech-Internships"
            >
              zshah101
            </a>{" "}
            (MIT) and{" "}
            <a className="text-soft underline decoration-white/20 underline-offset-4 hover:text-ink hover:decoration-lavender" href="https://github.com/SimplifyJobs/New-Grad-Positions">
              SimplifyJobs
            </a>
            .
          </p>
        </div>
      </footer>
    </div>
  );
}
