// Role tracks for the feed's category pills. The extracted role_family wins
// when we have one; most postings aren't read yet, so the title decides the
// rest. This only sorts postings into tabs: it never changes a verdict.
export const ROLES = [
  { value: "swe", label: "Software" },
  { value: "ml", label: "ML / AI" },
  { value: "fullstack", label: "Full-stack" },
  { value: "data", label: "Data" },
  { value: "quant", label: "Quant" },
] as const;

export type Role = (typeof ROLES)[number]["value"] | "other";

// Most specific first: "Machine Learning Software Engineer" is ML, not SWE.
const TITLE_RULES: [Role, RegExp][] = [
  ["quant", /\bquant|trading|\bhft\b/i],
  ["ml", /machine learning|\bml\b|\bai\b|artificial intelligence|deep learning|computer vision|\bnlp\b|\bllm|applied scien|research scien/i],
  ["data", /\bdata\b|analytics|\banalyst\b|business intelligence|\bbi\b/i],
  ["fullstack", /full[\s-]?stack/i],
  ["swe", /software|\bswe\b|\bsde\b|developer|engineer|front[\s-]?end|back[\s-]?end|mobile|\bios\b|android|platform|infrastructure|devops|\bsre\b|programmer/i],
];

export function roleOf(title: string, extracted: string | null): Role {
  if (extracted && extracted !== "other") return extracted as Role;
  for (const [role, re] of TITLE_RULES) if (re.test(title)) return role;
  return "other";
}
