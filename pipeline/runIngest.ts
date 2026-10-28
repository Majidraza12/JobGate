// Ingest step: fetch every source, identify and dedupe, write to Postgres in
// one transaction. A crash leaves nothing half-written and a rerun is
// idempotent, so this step needs no finer-grained checkpointing.

import { isInRegion } from "@core/region";
import * as db from "./db";
import { canonicalize, findPossibleDuplicates, type CanonicalListing } from "./dedupe";
import type { SourceAdapter, SourceBatch, SourceId } from "./types";

export interface SourceCounts {
  status: "ok" | "failed";
  records: number;
  skipped: number;
  inactive: number;
  error?: string;
}

export interface IngestCounts {
  sources: Partial<Record<SourceId, SourceCounts>>;
  records: number;
  unidentifiable: number;
  canonical: number;
  mergedRecords: number;
  outOfRegion: number;
  listings: number;
  byIdentity: Record<string, number>;
  inserted: number;
  updated: number;
  missesRecorded: number;
  closed: number;
  possibleDuplicates: number;
}

export interface IngestOptions {
  adapters: SourceAdapter[];
  trigger: "schedule" | "manual" | "local";
  dryRun?: boolean;
  databaseUrl?: string;
  log?: boolean;
}

export interface IngestResult {
  status: "succeeded" | "partial" | "failed" | "locked";
  runId: number | null;
  counts: IngestCounts;
  errors: object[];
}

export async function runIngest({ adapters, trigger, dryRun = false, databaseUrl, log = true }: IngestOptions): Promise<IngestResult> {
  const settled = await Promise.allSettled(adapters.map((a) => a.fetch()));
  const batches: SourceBatch[] = [];
  const sources: IngestCounts["sources"] = {};
  const errors: object[] = [];
  settled.forEach((r, i) => {
    const id = adapters[i]!.id;
    if (r.status === "fulfilled") {
      batches.push(r.value);
      sources[id] = { status: "ok", records: r.value.listings.length, skipped: r.value.skipped.length, inactive: r.value.inactive };
      for (const s of r.value.skipped.slice(0, 20)) errors.push({ step: "parse", source: id, ...s });
    } else {
      const message = r.reason instanceof Error ? r.reason.message : String(r.reason);
      sources[id] = { status: "failed", records: 0, skipped: 0, inactive: 0, error: message };
      errors.push({ step: "fetch", source: id, message });
    }
  });

  const records = batches.flatMap((b) => b.listings);
  const { canonical, unidentifiable } = canonicalize(records);
  const inRegion = canonical.filter((c) => isInRegion(c.locations));
  for (const u of unidentifiable.slice(0, 20))
    errors.push({ step: "identify", source: u.record.sourceId, externalId: u.record.externalId, message: u.reason });

  const counts: IngestCounts = {
    sources,
    records: records.length,
    unidentifiable: unidentifiable.length,
    canonical: canonical.length,
    mergedRecords: records.length - unidentifiable.length - canonical.length,
    outOfRegion: canonical.length - inRegion.length,
    listings: inRegion.length,
    byIdentity: tally(inRegion),
    inserted: 0,
    updated: 0,
    missesRecorded: 0,
    closed: 0,
    possibleDuplicates: 0,
  };
  const status: "succeeded" | "partial" | "failed" =
    batches.length === 0 ? "failed" : batches.length < adapters.length ? "partial" : "succeeded";
  const report = (label: string, s: string) => log && printReport(label, s, counts, errors);

  if (dryRun) {
    counts.possibleDuplicates = findPossibleDuplicates(
      inRegion.map((c, i) => ({
        id: i,
        company: c.company,
        title: c.title,
        season: c.season,
        locations: c.locations,
        ats: c.identity.kind === "ats" ? c.identity.ats : null,
        atsTenant: c.identity.kind === "ats" ? c.identity.tenant : null,
        atsReqId: c.identity.kind === "ats" ? c.identity.reqId : null,
      })),
    ).length;
    report("dry run (no database writes)", status);
    return { status, runId: null, counts, errors };
  }

  const client = await db.connect(databaseUrl);
  try {
    if (!(await db.tryLock(client))) {
      if (log) console.log("Another pipeline run holds the lock. Exiting without changes.");
      return { status: "locked", runId: null, counts, errors };
    }
    const runId = await db.startRun(client, trigger);
    try {
      await client.query("begin");
      await db.upsertRawListings(client, runId, records);
      const { ids, inserted, updated } = await db.upsertListings(client, inRegion);
      const links = inRegion.flatMap((c) =>
        c.members.map((m) => ({ sourceId: m.sourceId, externalId: m.externalId, listingId: ids.get(c.identity.key)! })),
      );
      await db.upsertListingSources(client, runId, links);
      // Only complete reads count as evidence that a posting is gone.
      for (const b of batches) counts.missesRecorded += await db.recordMisses(client, runId, b.sourceId);
      counts.closed = await db.closeMissingListings(client);
      const dups = findPossibleDuplicates(await db.openDuplicateCandidates(client));
      await db.replacePossibleDuplicates(client, dups);
      await client.query("commit");
      Object.assign(counts, { inserted, updated, possibleDuplicates: dups.length });
      await db.finishRun(client, runId, status, counts, errors);
      report(`run ${runId}`, status);
      return { status, runId, counts, errors };
    } catch (e) {
      await client.query("rollback");
      const message = e instanceof Error ? e.message : String(e);
      errors.push({ step: "write", message });
      await db.finishRun(client, runId, "failed", counts, errors);
      report(`run ${runId}`, "failed");
      return { status: "failed", runId, counts, errors };
    }
  } finally {
    await client.end();
  }
}

function tally(listings: CanonicalListing[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const l of listings) {
    const k = l.identity.kind === "ats" ? l.identity.ats : "url";
    out[k] = (out[k] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1]));
}

function printReport(label: string, status: string, counts: IngestCounts, errors: object[]) {
  const { sources, byIdentity, ...rest } = counts;
  console.log(`\n${label}: ${status}`);
  console.table(sources);
  console.table(rest);
  console.log("listings by identity:", byIdentity);
  if (errors.length) console.log(`${errors.length} error(s), first few:`, errors.slice(0, 5));
}
