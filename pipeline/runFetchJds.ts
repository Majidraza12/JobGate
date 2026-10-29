// Fetch-JD step: fetch job descriptions for open listings that need one and
// save each result as soon as it arrives. Saving per listing is the checkpoint:
// a crashed run keeps its progress, and a rerun picks up only what's left.

import * as db from "./db";
import { JdFetcher, type FetcherOptions, type JdFetchStatus } from "./jd/fetchJd";
import { planFetch } from "./jd/plans";

export interface FetchJdsOptions {
  trigger: "schedule" | "manual" | "local";
  databaseUrl?: string;
  ats?: string | null;
  limit?: number | null;
  refreshDays?: number | null;
  concurrency?: number;
  fetcher?: FetcherOptions;
  log?: boolean;
}

// kind -> status -> count, e.g. { workday: { ok: 120, blocked: 31 } }
export type FetchCounts = Record<string, Partial<Record<JdFetchStatus, number>>>;

export interface FetchJdsResult {
  status: "succeeded" | "failed" | "locked";
  runId: number | null;
  counts: FetchCounts;
}

const hostOf = (url: string) => {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
};

// Round-robin across the hosts we will actually request (every Greenhouse job
// goes to boards-api.greenhouse.io whatever its apply URL), so workers spread
// over many hosts instead of all queueing behind one host's delay.
export function interleaveByHost<T extends { applyUrl: string }>(items: T[], requestUrl = (t: T) => t.applyUrl): T[] {
  const groups = new Map<string, T[]>();
  for (const it of items) {
    const h = hostOf(requestUrl(it));
    groups.set(h, [...(groups.get(h) ?? []), it]);
  }
  const queues = [...groups.values()];
  const out: T[] = [];
  for (let i = 0; out.length < items.length; i++) for (const q of queues) if (i < q.length) out.push(q[i]!);
  return out;
}

export async function runFetchJds(o: FetchJdsOptions): Promise<FetchJdsResult> {
  const log = o.log ?? true;
  const counts: FetchCounts = {};
  const client = await db.connect(o.databaseUrl);
  try {
    if (!(await db.tryLock(client))) {
      if (log) console.log("Another pipeline run holds the lock. Exiting without changes.");
      return { status: "locked", runId: null, counts };
    }
    const runId = await db.startRun(client, o.trigger);
    const errors: object[] = [];
    try {
      const targets = interleaveByHost(
        await db.jdFetchTargets(client, { ats: o.ats ?? null, limit: o.limit ?? null, refreshDays: o.refreshDays ?? null }),
        (t) => planFetch(t)?.url ?? t.applyUrl,
      );
      if (log) console.log(`Fetching ${targets.length} job descriptions...`);
      const fetcher = new JdFetcher(o.fetcher);
      let next = 0;
      let done = 0;
      const worker = async () => {
        while (next < targets.length) {
          const t = targets[next++]!;
          const r = await fetcher.fetch(t);
          await db.saveJdFetch(client, t.id, r);
          const byStatus = (counts[r.kind] ??= {});
          byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
          if (r.status !== "ok" && errors.length < 50) errors.push({ step: "fetch_jd", listingId: t.id, kind: r.kind, status: r.status, message: r.error });
          if (log && ++done % 100 === 0) console.log(`  ${done}/${targets.length}`);
        }
      };
      await Promise.all(Array.from({ length: o.concurrency ?? 8 }, worker));
      await db.finishRun(client, runId, "succeeded", { step: "fetch_jd", byKind: counts }, errors);
      if (log) printReport(runId, counts);
      return { status: "succeeded", runId, counts };
    } catch (e) {
      errors.push({ step: "fetch_jd", message: e instanceof Error ? e.message : String(e) });
      await db.finishRun(client, runId, "failed", { step: "fetch_jd", byKind: counts }, errors);
      if (log) console.log(`run ${runId}: failed`, errors.at(-1));
      return { status: "failed", runId, counts };
    }
  } finally {
    await client.end();
  }
}

function printReport(runId: number, counts: FetchCounts) {
  const rows = Object.entries(counts).map(([kind, s]) => {
    const total = Object.values(s).reduce((a, b) => a + (b ?? 0), 0);
    return { kind, total, ...s, "ok %": total ? Math.round((100 * (s.ok ?? 0)) / total) : 0 };
  });
  console.log(`\nrun ${runId}: succeeded`);
  console.table(rows.sort((a, b) => b.total - a.total));
}
