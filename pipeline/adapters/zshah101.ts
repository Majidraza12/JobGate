import { z } from "zod";
import type { Ats, AtsHint } from "@core/identity";
import { splitLocations } from "@core/region";
import { fetchJson } from "../http";
import type { JobType, RawListing, SkippedRecord, SourceAdapter, SourceBatch } from "../types";

export const ZSHAH101_URL =
  "https://zshah101.github.io/Automated-List-Of-Summer-2027-and-Fall-2026-Tech-Internships/api/jobs.json";

const Job = z.object({
  id: z.string().min(1),
  company: z.string().min(1),
  title: z.string().min(1),
  season: z.string().nullable(),
  location: z.string().nullable(),
  url: z.url(),
  posted_at: z.string().nullable(),
  posted_at_source: z.string().nullable().optional(),
  sponsorship: z.string().nullable(),
  program: z.string().nullable(),
  remote: z.boolean().nullable(),
});

// Only the wrapper is validated strictly; records are validated one by one so
// a single bad record is skipped instead of failing the whole read.
const Feed = z.object({ count: z.number(), jobs: z.array(z.unknown()) });

const HINT_ATS = new Set<Ats>([
  "greenhouse", "lever", "ashby", "workday", "oracle", "smartrecruiters",
  "amazon", "workable", "breezy", "rippling", "icims", "eightfold",
]);

// "greenhouse:mongodb:8209134" -> hint. Workday ids are URL paths, so keep only
// the suffix after the last "_", matching how identify() parses Workday URLs.
export function hintFromId(id: string): AtsHint | undefined {
  const [ats, tenant, ...rest] = id.split(":");
  let reqId = rest.join(":");
  if (!ats || !tenant || !reqId || !HINT_ATS.has(ats as Ats)) return undefined;
  if (ats === "workday") {
    const us = reqId.lastIndexOf("_");
    if (us < 0 || us === reqId.length - 1) return undefined;
    reqId = reqId.slice(us + 1);
  }
  return { ats: ats as Ats, tenant, reqId };
}

function jobType(program: string | null): JobType {
  return program?.trim().toLowerCase() === "co-op" ? "co-op" : "internship";
}

function postedAt(value: string | null, source: string | null | undefined) {
  if (!value) return { postedAt: null, postedAtPrecision: null } as const;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value) || source === "date_only";
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(d.getTime())) return { postedAt: null, postedAtPrecision: null } as const;
  return { postedAt: d.toISOString(), postedAtPrecision: dateOnly ? "date" : "datetime" } as const;
}

export function parseZshah101(json: unknown): SourceBatch {
  const feed = Feed.parse(json);
  const listings: RawListing[] = [];
  const skipped: SkippedRecord[] = [];
  for (const rec of feed.jobs) {
    const r = Job.safeParse(rec);
    if (!r.success) {
      const id = typeof (rec as { id?: unknown })?.id === "string" ? (rec as { id: string }).id : null;
      skipped.push({ externalId: id, reason: r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") });
      continue;
    }
    const j = r.data;
    listings.push({
      sourceId: "zshah101",
      externalId: j.id,
      company: j.company.trim(),
      title: j.title.trim(),
      locations: splitLocations(j.location ?? ""),
      applyUrl: j.url,
      ...postedAt(j.posted_at, j.posted_at_source),
      jobType: jobType(j.program),
      season: j.season && j.season !== "Not stated" ? j.season : null,
      remote: j.remote,
      baselineSponsorship: j.sponsorship,
      atsHint: hintFromId(j.id),
      record: rec,
    });
  }
  return { sourceId: "zshah101", listings, skipped, inactive: 0 };
}

export const zshah101Adapter = (load: () => Promise<unknown> = () => fetchJson(ZSHAH101_URL)): SourceAdapter => ({
  id: "zshah101",
  fetch: async () => parseZshah101(await load()),
});
