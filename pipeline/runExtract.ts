// Extract step: run the LLM once per distinct JD text that has no usable
// extraction for the current prompt version and model. Each result is saved as
// it arrives, and its cost is added to the run row right away, so a crash
// loses nothing and still counts toward the daily cap.

import * as db from "./db";
import { extractOne } from "./extract/extract";
import type { LlmClient } from "./extract/llm";
import { PROMPT_VERSION } from "./extract/prompt";
import { SpendGuard, worstCaseUsd } from "./extract/spend";

export interface ExtractOptions {
  llm: LlmClient;
  capUsd: number;
  limit?: number | null;
  dryRun?: boolean;
  databaseUrl?: string;
  log?: boolean;
}

export interface ExtractCounts {
  targets: number;
  listingsCovered: number;
  ok: number;
  llm_failed: number;
  schema_invalid: number;
  quoteFailures: number;
  fieldsUnverified: number;
  skippedForCap: number;
  costUsd: number;
}

export interface ExtractResult {
  status: "succeeded" | "partial" | "cap_reached" | "failed" | "locked" | "dry_run";
  runId: number | null;
  counts: ExtractCounts;
  worstCaseUsd?: number;
}

export async function runExtract(o: ExtractOptions): Promise<ExtractResult> {
  const log = o.log ?? true;
  const counts: ExtractCounts = {
    targets: 0,
    listingsCovered: 0,
    ok: 0,
    llm_failed: 0,
    schema_invalid: 0,
    quoteFailures: 0,
    fieldsUnverified: 0,
    skippedForCap: 0,
    costUsd: 0,
  };
  const client = await db.connect(o.databaseUrl);
  try {
    const targets = await db.extractionTargets(client, o.llm.model, PROMPT_VERSION, o.limit ?? null);
    counts.targets = targets.length;
    counts.listingsCovered = targets.reduce((a, t) => a + t.listings, 0);

    if (o.dryRun) {
      const worst = targets.reduce((a, t) => a + worstCaseUsd(o.llm.model, t.jdText), 0);
      if (log) {
        console.log(`${targets.length} distinct JDs to extract (${counts.listingsCovered} listings), prompt ${PROMPT_VERSION}, ${o.llm.model}`);
        console.log(`Worst-case cost (two calls at max output each): $${worst.toFixed(2)}. Typical cost is far lower.`);
      }
      return { status: "dry_run", runId: null, counts, worstCaseUsd: worst };
    }

    if (!(await db.tryLock(client))) {
      if (log) console.log("Another pipeline run holds the lock. Exiting without changes.");
      return { status: "locked", runId: null, counts };
    }
    const guard = new SpendGuard(o.capUsd, await db.spentTodayUsd(client));
    const runId = await db.startExtractionRun(client, o.llm.model, PROMPT_VERSION);
    const errors: object[] = [];
    let capped = false;
    try {
      for (const t of targets) {
        if (!guard.canAfford(o.llm.model, t.jdText)) {
          capped = true;
          counts.skippedForCap = targets.length - (counts.ok + counts.llm_failed + counts.schema_invalid);
          if (log) console.log(`Daily cap $${o.capUsd} reached (spent $${guard.spent.toFixed(4)} today). Stopping.`);
          break;
        }
        const r = await extractOne(o.llm, t.jdText);
        guard.record(r.costUsd);
        counts.costUsd += r.costUsd;
        await db.addExtractionRunUsage(client, runId, r.inputTokens, r.outputTokens, r.costUsd);
        await db.upsertRequirement(client, {
          jdHash: t.jdHash,
          promptVersion: PROMPT_VERSION,
          model: o.llm.model,
          status: r.status,
          extracted: r.extracted,
          quoteFailures: r.quoteFailures.length,
          error: r.error,
          inputTokens: r.inputTokens,
          outputTokens: r.outputTokens,
          costUsd: r.costUsd,
          latencyMs: r.latencyMs,
          runId,
        });
        counts[r.status]++;
        counts.quoteFailures += r.quoteFailures.length;
        counts.fieldsUnverified += new Set(r.quoteFailures.map((f) => f.field)).size;
        // Quotes are JD text, never user data, so logging them is safe.
        for (const f of r.quoteFailures) if (errors.length < 100) errors.push({ kind: "quote_failure", jdHash: t.jdHash, ...f });
        if (r.status !== "ok" && errors.length < 100) errors.push({ kind: r.status, jdHash: t.jdHash, message: r.error });
        if (log) console.log(`  ${t.jdHash.slice(0, 12)} ${r.status} $${r.costUsd.toFixed(4)} ${r.latencyMs}ms`);
      }
      const status = capped ? "cap_reached" : counts.llm_failed + counts.schema_invalid > 0 ? "partial" : "succeeded";
      await db.finishExtractionRun(client, runId, status, counts, errors);
      if (log) console.table(counts);
      return { status, runId, counts };
    } catch (e) {
      errors.push({ kind: "run", message: e instanceof Error ? e.message : String(e) });
      await db.finishExtractionRun(client, runId, "failed", counts, errors);
      if (log) console.log(`run ${runId}: failed`, errors.at(-1));
      return { status: "failed", runId, counts };
    }
  } finally {
    await client.end();
  }
}
