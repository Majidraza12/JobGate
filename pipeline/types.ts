import type { AtsHint } from "@core/identity";

export type SourceId = "zshah101" | "simplify-newgrad";

export type JobType = "internship" | "co-op" | "new_grad";

// One record from one source, after per-record validation. Field values here
// are only the facts a source is allowed to give us (see CLAUDE.md section 7).
export interface RawListing {
  sourceId: SourceId;
  externalId: string;
  company: string;
  title: string;
  locations: string[];
  applyUrl: string;
  postedAt: string | null; // ISO 8601
  postedAtPrecision: "date" | "datetime" | null;
  jobType: JobType;
  season: string | null;
  remote: boolean | null;
  baselineSponsorship: string | null;
  atsHint?: AtsHint;
  record: unknown; // what gets stored in raw_listings
}

export interface SkippedRecord {
  externalId: string | null;
  reason: string;
}

// A complete read of one source. If the source can't be read in full the
// adapter throws instead, so a partial read can never close listings.
export interface SourceBatch {
  sourceId: SourceId;
  listings: RawListing[];
  skipped: SkippedRecord[];
  inactive: number;
}

export interface SourceAdapter {
  id: SourceId;
  fetch(): Promise<SourceBatch>;
}
