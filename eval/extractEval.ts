// Extraction eval. Scores cached predictions against gold labels and writes a
// dated results file. With --live, first fills in predictions for labeled JDs
// that don't have one yet (costs money; shares the daily cap with the
// pipeline because each eval run is logged as an extraction run).
//
//   npm run eval:extract                 score what's cached; no API calls
//   npm run eval:extract -- --live       predict missing labeled JDs, then score
//   npm run eval:extract -- --dataset v1 --cap 1
//   npm run eval:extract -- --via-cli --model sonnet   predict through `claude -p` on the subscription ($0)

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import * as db from "../pipeline/db";
import { extractOne } from "../pipeline/extract/extract";
import { claudeCliClient, CLI_MODELS, type CliModelName } from "../pipeline/extract/claudeCli";
import { anthropicClient, MODEL } from "../pipeline/extract/llm";
import { PROMPT_VERSION } from "../pipeline/extract/prompt";
import { DEFAULT_DAILY_CAP_USD, SpendGuard } from "../pipeline/extract/spend";
import { Dataset, Label } from "./labelSchema";
import { scoreExtraction, type Prediction } from "./score";
import { ruleOfThree, type Proportion } from "./stats";

const { values: args } = parseArgs({
  options: {
    dataset: { type: "string", default: "v1" },
    live: { type: "boolean", default: false },
    "via-cli": { type: "boolean", default: false },
    model: { type: "string" },
    cap: { type: "string" },
  },
});

if (args.live && args["via-cli"]) throw new Error("pick one of --live and --via-cli");
if (args.model !== undefined && !(args.model in CLI_MODELS)) throw new Error(`--model must be one of ${Object.keys(CLI_MODELS).join(", ")}`);
// The model whose predictions are scored. Without --model it is the pinned API model.
const model = args.model === undefined ? MODEL : CLI_MODELS[args.model as CliModelName];
if (args.live && model !== MODEL) throw new Error(`--live only runs the pinned API model ${MODEL}`);
const predict = args.live || args["via-cli"];

const root = new URL("./", import.meta.url);
const dataset = Dataset.parse(JSON.parse(readFileSync(new URL(`dataset/${args.dataset}.json`, root), "utf8")));
const labelDir = new URL(`labels/${dataset.version}/`, root);
const labels = existsSync(labelDir)
  ? readdirSync(labelDir).filter((f) => f.endsWith(".json")).map((f) => Label.parse(JSON.parse(readFileSync(new URL(f, labelDir), "utf8"))))
  : [];
const predDir = new URL(`predictions/${dataset.version}/${model}/${PROMPT_VERSION}/`, root);
mkdirSync(predDir, { recursive: true });

type StoredPrediction = Prediction & { responses: string[]; error: string | null; inputTokens: number; outputTokens: number; at: string };
const loadPrediction = (id: string): StoredPrediction | null => {
  const f = new URL(`${id}.json`, predDir);
  return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null;
};

const items = new Map(dataset.items.map((i) => [i.id, i]));
const missing = labels.filter((l) => !loadPrediction(l.id));

if (missing.length && predict) {
  const cap = Number(args.cap ?? process.env.EXTRACT_DAILY_CAP_USD ?? DEFAULT_DAILY_CAP_USD);
  const llm = args["via-cli"] ? claudeCliClient(model) : anthropicClient();
  const client = await db.connect();
  try {
    if (!(await db.tryLock(client))) throw new Error("another pipeline run holds the lock");
    const guard = new SpendGuard(cap, await db.spentTodayUsd(client));
    const runId = await db.startExtractionRun(client, model, PROMPT_VERSION);
    let done = 0;
    let status: "succeeded" | "cap_reached" = "succeeded";
    for (const l of missing) {
      const item = items.get(l.id)!;
      if (!llm.subscription && !guard.canAfford(model, item.jdText)) {
        status = "cap_reached";
        console.log(`Daily cap $${cap} reached after ${done} predictions (spent $${guard.spent.toFixed(4)} today). Rerun tomorrow or raise --cap.`);
        break;
      }
      const r = await extractOne(llm, item.jdText);
      guard.record(r.costUsd);
      await db.addExtractionRunUsage(client, runId, r.inputTokens, r.outputTokens, r.costUsd);
      const p: StoredPrediction = {
        id: l.id,
        status: r.status,
        extracted: r.extracted,
        quoteFailures: r.quoteFailures.length,
        costUsd: r.costUsd,
        latencyMs: r.latencyMs,
        responses: r.responses,
        error: r.error,
        inputTokens: r.inputTokens,
        outputTokens: r.outputTokens,
        at: new Date().toISOString(),
      };
      writeFileSync(new URL(`${l.id}.json`, predDir), JSON.stringify(p, null, 2) + "\n");
      console.log(`  ${l.id} ${r.status} $${r.costUsd.toFixed(4)} ${r.latencyMs}ms`);
      done++;
    }
    await db.finishExtractionRun(client, runId, status, { eval: dataset.version, predicted: done }, []);
  } finally {
    await client.end();
  }
}

const predictions = labels.map((l) => loadPrediction(l.id)).filter((p): p is StoredPrediction => p !== null);
const stillMissing = labels.length - predictions.length;
if (stillMissing) console.log(`${stillMissing} labeled JDs have no prediction yet${predict ? "" : " (run with --live or --via-cli to create them)"}.`);
if (!predictions.length) {
  console.log(`Nothing to score: ${labels.length} labels, 0 predictions.`);
  process.exit(0);
}

const report = scoreExtraction(dataset, labels, predictions);
const date = new Date().toISOString().slice(0, 10);
const results = {
  kind: "extraction",
  date,
  model,
  promptVersion: PROMPT_VERSION,
  datasetVersion: dataset.version,
  datasetSeed: dataset.seed,
  ...report,
};
mkdirSync(new URL("results/", root), { recursive: true });
const outName = `results/${date}-extract-${dataset.version}-${model}-${PROMPT_VERSION}.json`;
writeFileSync(new URL(outName, root), JSON.stringify(results, null, 2) + "\n");

const pct = (p: Proportion) =>
  p.rate === null ? "n/a" : `${(100 * p.rate).toFixed(0)}% [${(100 * p.low!).toFixed(0)}-${(100 * p.high!).toFixed(0)}] n=${p.n}`;
for (const s of report.strata) {
  console.log(`\n== ${s.stratum}: ${s.jds} JDs | extraction failures ${pct(s.extractionFailure)} | quote-failed fields ${pct(s.quoteFailedFields)}`);
  console.table(
    Object.fromEntries(
      s.fields.map((f) => [
        f.field,
        { gold_pos: f.goldPositive, precision: pct(f.detectionPrecision), recall: pct(f.detectionRecall), decision: pct(f.decisionAccuracy) },
      ]),
    ),
  );
  const b = s.baseline;
  if (b.n)
    console.log(
      `baseline (n=${b.n}, any work-auth restriction): regex P ${pct(b.baseline.precision)} R ${pct(b.baseline.recall)} | ` +
        `model P ${pct(b.model.precision)} R ${pct(b.model.recall)} | citizens-only that is truly citizenship ${pct(b.citizensOnlyIsCitizenship)}`,
    );
}
const zeroFail = report.strata[0]!.extractionFailure;
if (zeroFail.k === 0 && zeroFail.n > 0) console.log(`\nNo extraction failures in ${zeroFail.n}; 95% upper bound ${(100 * ruleOfThree(zeroFail.n)!).toFixed(1)}% (rule of three).`);
console.log(`\ncost: total $${report.costUsd.total.toFixed(4)}, mean $${report.costUsd.mean?.toFixed(4)}, p95 $${report.costUsd.p95?.toFixed(4)} | latency p50 ${report.latencyMs.p50}ms p95 ${report.latencyMs.p95}ms`);
console.log(`Wrote eval/${outName}`);
