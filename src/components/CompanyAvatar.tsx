// The company's initial on a brand colour. We don't know company domains
// (apply links point at the ATS), so no logos rather than wrong ones.
const COLOURS = ["bg-brand text-on-brand", "bg-mint text-ground", "bg-amber text-ground", "bg-lav text-ground", "bg-rose text-ground"];

export function CompanyAvatar({ company, size = 40 }: { company: string; size?: number }) {
  const letter = company.match(/[A-Za-z0-9]/)?.[0]?.toUpperCase() ?? "?";
  let h = 0;
  for (const c of company) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
      className={`grid flex-none place-items-center rounded-[12px] font-display font-bold ${COLOURS[h % COLOURS.length]}`}
    >
      {letter}
    </span>
  );
}
