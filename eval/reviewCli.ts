// Writes the adjudication list for cached predictions. No API calls, no
// database. Logic lives in review.ts.
//
//   npm run eval:review                 eval/review/v1-<model>-<prompt>.md
//   npm run eval:review -- --dataset v1
//   npm run eval:review -- --model sonnet

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { CLI_MODELS, type CliModelName } from "../pipeline/extract/claudeCli";
import { MODEL } from "../pipeline/extract/llm";
import { PROMPT_VERSION } from "../pipeline/extract/prompt";
import { Dataset, Label } from "./labelSchema";
import { renderReview, review } from "./review";
import type { Prediction } from "./score";

const { values: args } = parseArgs({ options: { dataset: { type: "string", default: "v1" }, model: { type: "string" } } });
const model = args.model === undefined ? MODEL : CLI_MODELS[args.model as CliModelName];
if (!model) throw new Error(`--model must be one of ${Object.keys(CLI_MODELS).join(", ")}`);

const root = new URL("./", import.meta.url);
const dataset = Dataset.parse(JSON.parse(readFileSync(new URL(`dataset/${args.dataset}.json`, root), "utf8")));
const labelDir = new URL(`labels/${dataset.version}/`, root);
const labels = readdirSync(labelDir).filter((f) => f.endsWith(".json")).map((f) => Label.parse(JSON.parse(readFileSync(new URL(f, labelDir), "utf8"))));
const predDir = new URL(`predictions/${dataset.version}/${model}/${PROMPT_VERSION}/`, root);
const predictions: Prediction[] = existsSync(predDir)
  ? readdirSync(predDir).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(new URL(f, predDir), "utf8")))
  : [];

const r = review(labels, predictions);
const name = `${dataset.version}-${model}-${PROMPT_VERSION}`;
mkdirSync(new URL("review/", root), { recursive: true });
writeFileSync(new URL(`review/${name}.md`, root), renderReview(r, dataset, `Extraction review: ${name}`));
console.log(
  `${r.disagreements.length} disagreements over ${labels.length - r.unpredicted.length} predicted JDs` +
    `${r.failed.length ? `, ${r.failed.length} failed extractions` : ""}` +
    `${r.unpredicted.length ? `, ${r.unpredicted.length} without a prediction` : ""}. Wrote eval/review/${name}.md`,
);
