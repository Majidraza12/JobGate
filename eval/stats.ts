// Small-sample statistics for the eval. Proportions get 95% Wilson score
// intervals, which behave sensibly near 0 and 1 and at small n (unlike the
// normal approximation). With zero errors, also report the rule of three.

export interface Proportion {
  k: number;
  n: number;
  rate: number | null; // null when n = 0
  low: number | null;
  high: number | null;
}

const Z95 = 1.959963984540054;

export function wilson(k: number, n: number, z = Z95): Proportion {
  if (n === 0) return { k, n, rate: null, low: null, high: null };
  const p = k / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  return { k, n, rate: p, low: Math.max(0, center - half), high: Math.min(1, center + half) };
}

// Upper 95% bound on an error rate when 0 errors were seen in n trials.
export const ruleOfThree = (n: number) => (n > 0 ? 3 / n : null);

export function percentile(xs: number[], p: number): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const i = Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1));
  return s[i]!;
}
