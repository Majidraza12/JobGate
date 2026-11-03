// Page buttons for the feed pager: always the first and last page, the current
// page with one neighbour each side, and null where pages are skipped (shown
// as an ellipsis). Pages are 1-based.
export function pageNumbers(current: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const keep = new Set([1, total, current - 1, current, current + 1].filter((p) => p >= 1 && p <= total));
  // Near either end, show enough pages that the ellipsis never hides just one page.
  if (current <= 4) [2, 3, 4, 5].forEach((p) => keep.add(p));
  if (current >= total - 3) [total - 4, total - 3, total - 2, total - 1].forEach((p) => keep.add(p));
  const sorted = [...keep].sort((a, b) => a - b);
  const out: (number | null)[] = [];
  for (const p of sorted) {
    if (out.length && p - (out.at(-1) as number) > 1) out.push(null);
    out.push(p);
  }
  return out;
}
