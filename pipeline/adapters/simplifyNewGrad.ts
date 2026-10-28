import { z } from "zod";
import { fetchJson } from "../http";
import type { RawListing, SkippedRecord, SourceAdapter, SourceBatch } from "../types";

export const SIMPLIFY_NEWGRAD_URL =
  "https://raw.githubusercontent.com/SimplifyJobs/New-Grad-Positions/dev/.github/scripts/listings.json";

// Discovery only (CLAUDE.md section 19): we read company, title, locations,
// posted date and the employer apply link. Simplify's own fields (sponsorship,
// category, degrees) are never read, stored, or passed on.
const Listing = z.object({
  id: z.string().min(1),
  company_name: z.string().min(1),
  title: z.string().min(1),
  locations: z.array(z.string()),
  url: z.url(),
  date_posted: z.number().int().positive(),
  active: z.boolean(),
  is_visible: z.boolean().optional(),
});

export function parseSimplifyNewGrad(json: unknown): SourceBatch {
  const records = z.array(z.unknown()).parse(json);
  const listings: RawListing[] = [];
  const skipped: SkippedRecord[] = [];
  let inactive = 0;
  for (const rec of records) {
    const r = Listing.safeParse(rec);
    if (!r.success) {
      const id = typeof (rec as { id?: unknown })?.id === "string" ? (rec as { id: string }).id : null;
      skipped.push({ externalId: id, reason: r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") });
      continue;
    }
    const j = r.data;
    if (!j.active || j.is_visible === false) {
      inactive++;
      continue;
    }
    const postedAt = new Date(j.date_posted * 1000).toISOString();
    listings.push({
      sourceId: "simplify-newgrad",
      externalId: j.id,
      company: j.company_name.trim(),
      title: j.title.trim(),
      locations: j.locations.map((l) => l.trim()).filter(Boolean),
      applyUrl: j.url,
      postedAt,
      postedAtPrecision: "datetime",
      jobType: "new_grad",
      season: null,
      remote: null,
      baselineSponsorship: null,
      record: {
        id: j.id,
        company_name: j.company_name,
        title: j.title,
        locations: j.locations,
        url: j.url,
        date_posted: j.date_posted,
      },
    });
  }
  return { sourceId: "simplify-newgrad", listings, skipped, inactive };
}

export const simplifyNewGradAdapter = (
  load: () => Promise<unknown> = () => fetchJson(SIMPLIFY_NEWGRAD_URL),
): SourceAdapter => ({
  id: "simplify-newgrad",
  fetch: async () => parseSimplifyNewGrad(await load()),
});
