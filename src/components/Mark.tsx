// The JobGate mark: a gate (two posts and a slanted bar) in a lavender-to-violet
// gradient, set on its own like the references' logo glyph.
export function Mark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id="jg-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d9ccff" />
          <stop offset="0.5" stopColor="#a68bfa" />
          <stop offset="1" stopColor="#6631fb" />
        </linearGradient>
      </defs>
      <rect x="3.5" y="3" width="4" height="18" rx="2" fill="url(#jg-mark)" />
      <rect x="16.5" y="3" width="4" height="18" rx="2" fill="url(#jg-mark)" />
      <rect x="2" y="10.2" width="20" height="4" rx="2" transform="rotate(-18 12 12.2)" fill="url(#jg-mark)" />
    </svg>
  );
}
