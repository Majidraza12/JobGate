// The JobGate mark: a gate, two posts and a bar, in the brand indigo.
export function Mark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#6631FB" />
      <rect x="6" y="6" width="3" height="12" rx="1" fill="#fff" />
      <rect x="15" y="6" width="3" height="12" rx="1" fill="#fff" />
      <rect x="6" y="10" width="12" height="3" rx="1" fill="#88F9C0" />
    </svg>
  );
}
