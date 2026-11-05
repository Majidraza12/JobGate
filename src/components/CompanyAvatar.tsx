// The company's initial on a dark tile, where the references show a logo. We
// don't know company domains (apply links point at the ATS), so no logos
// rather than wrong ones. A faint hue per company keeps tiles apart.
const HUES = ["#a68bfa", "#88f9c0", "#ffc861", "#8fb8ff", "#ff8f9c", "#f0abfc"];

export function CompanyAvatar({ company, size = 40 }: { company: string; size?: number }) {
  const letter = company.match(/[A-Za-z0-9]/)?.[0]?.toUpperCase() ?? "?";
  let h = 0;
  for (const c of company) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const hue = HUES[h % HUES.length];
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        borderRadius: Math.round(size * 0.22),
        background: `radial-gradient(120% 120% at 30% 0%, ${hue}26, transparent 60%), #0c0b13`,
        color: hue,
      }}
      className="grid flex-none place-items-center border border-white/[0.09] font-extrabold shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]"
    >
      {letter}
    </span>
  );
}
