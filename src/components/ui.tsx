// Shared, hook-free building blocks for the Midnight UI: usable from server
// and client components alike.
import { Icon, type IconName } from "./Icon";

export function Panel({ children, className = "", as: Tag = "section", ...rest }: { children: React.ReactNode; className?: string; as?: "section" | "div" | "aside" | "article" } & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag className={`glass rounded-[18px] ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

// Page title in the references' style: big, tight, with one italic violet word.
export function PageTitle({ lead, shine, sub, center = false, className = "" }: { lead: string; shine?: string; sub?: React.ReactNode; center?: boolean; className?: string }) {
  return (
    <div className={`${center ? "text-center" : ""} ${className}`}>
      <h1 className="text-[40px] font-bold leading-[1.05] tracking-[-0.035em] sm:text-[52px] lg:text-[60px]">
        {lead}
        {shine && (
          <>
            {" "}
            <span className="text-shine pr-[0.08em] italic">{shine}</span>
          </>
        )}
      </h1>
      {sub && <p className={`mt-3 text-[17px] text-muted sm:text-[19px] ${center ? "mx-auto max-w-[60ch]" : ""}`}>{sub}</p>}
    </div>
  );
}

// The references' checkbox: a rounded square that fills lavender when ticked.
export function CheckMark({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`grid size-[18px] flex-none place-items-center rounded-[5px] border transition-colors ${on ? "border-lavender bg-lavender text-on-lavender" : "border-white/25 bg-white/[0.02]"}`}
    >
      {on && <Icon name="check" size={13} strokeWidth={3} />}
    </span>
  );
}

export function Tag({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`inline-flex h-7 items-center rounded-full bg-white/[0.06] px-3 text-[12.5px] font-medium text-soft ${className}`}>{children}</span>;
}

export function IconTile({ name, className = "" }: { name: IconName; className?: string }) {
  return (
    <span className={`grid size-11 flex-none place-items-center rounded-full bg-lavender/10 text-lavender ring-1 ring-inset ring-lavender/15 ${className}`}>
      <Icon name={name} size={21} />
    </span>
  );
}

export function EmptyState({ icon, title, children, action }: { icon: IconName; title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="glass flex flex-col items-center rounded-[18px] px-6 py-14 text-center">
      <IconTile name={icon} className="size-14" />
      <p className="mt-4 text-[18px] font-semibold">{title}</p>
      {children && <p className="mt-1.5 max-w-[46ch] text-muted">{children}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export const BUTTON = {
  primary: "btn-lavender inline-flex items-center justify-center gap-2 rounded-full font-semibold hover:brightness-110 active:scale-[0.97] disabled:opacity-60",
  ghost: "inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.03] font-medium hover:border-lavender/50 hover:bg-white/[0.06] disabled:opacity-60",
  white: "inline-flex items-center justify-center gap-2 rounded-full bg-white font-semibold text-[#140c2c] shadow-[0_6px_20px_-6px_rgb(255_255_255/0.4)] hover:bg-[#ece6ff] active:scale-[0.97]",
};

// The decorative glass tower in the top-right corner of the references'
// promo cards: violet faces with a lattice of window lines, fading out.
export function TowerArt({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 200 220" className={`pointer-events-none ${className}`} preserveAspectRatio="xMaxYMin slice">
      <defs>
        <linearGradient id="tw-face" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8b63ff" stopOpacity="0.85" />
          <stop offset="0.55" stopColor="#4a22b8" stopOpacity="0.45" />
          <stop offset="1" stopColor="#1a0f3a" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="tw-side" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c7b4ff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#3a1c96" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="tw-fade" cx="1" cy="0" r="1.05">
          <stop offset="0" stopColor="#fff" stopOpacity="1" />
          <stop offset="0.6" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id="tw-mask">
          <rect width="200" height="220" fill="url(#tw-fade)" />
        </mask>
      </defs>
      <g mask="url(#tw-mask)">
        <path d="M70 0h130v220H40Z" fill="url(#tw-face)" />
        <path d="M150 0h50v220h-90Z" fill="url(#tw-side)" opacity="0.5" />
        {Array.from({ length: 9 }, (_, i) => (
          <path key={`v${i}`} d={`M${80 + i * 15} 0 L${54 + i * 18} 220`} stroke="#d9ccff" strokeOpacity={0.18 + (i % 3) * 0.06} strokeWidth="0.8" />
        ))}
        {Array.from({ length: 14 }, (_, i) => (
          <path key={`h${i}`} d={`M${66 - i * 2} ${i * 16} H200`} stroke="#d9ccff" strokeOpacity="0.14" strokeWidth="0.7" />
        ))}
        <path d="M70 0 40 220" stroke="#e9e1ff" strokeOpacity="0.55" strokeWidth="1.2" />
      </g>
    </svg>
  );
}
