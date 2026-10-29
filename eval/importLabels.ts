// Validates hand labels and writes one gold label per JD. Conversion lives in
// handLabels.ts.
//
//   npm run label:import    reads eval/labels-v1.json, writes eval/labels/v1/<id>.json

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { fromHand, type HandItem } from "./handLabels";
import { Dataset, Label } from "./labelSchema";

const { values: args } = parseArgs({
  options: { dataset: { type: "string", default: "v1" }, labeler: { type: "string", default: "majid" } },
});

const root = new URL("./", import.meta.url);
const dataset = Dataset.parse(JSON.parse(readFileSync(new URL(`dataset/${args.dataset}.json`, root), "utf8")));
const hand = JSON.parse(readFileSync(new URL(`labels-${dataset.version}.json`, root), "utf8")) as { items: HandItem[] };
const ids = new Set(dataset.items.map((i) => i.id));
const labelDir = new URL(`labels/${dataset.version}/`, root);
mkdirSync(labelDir, { recursive: true });

const errors: string[] = [];
const valid: Label[] = [];
for (const item of hand.items) {
  if (!ids.has(item.id)) {
    errors.push(`${item.id}: not in dataset ${dataset.version}`);
    continue;
  }
  const { body, unknown } = fromHand(item);
  for (const k of unknown) errors.push(`${item.id}: unknown field "${k}"`);
  const parsed = Label.safeParse({ ...body, id: item.id, datasetVersion: dataset.version, labeler: args.labeler, labeledAt: new Date().toISOString() });
  if (!parsed.success) for (const i of parsed.error.issues) errors.push(`${item.id}: ${i.path.join(".")}: ${i.message}`);
  else if (!unknown.length) valid.push(parsed.data);
}
const missing = [...ids].filter((id) => !hand.items.some((i) => i.id === id));
if (missing.length) errors.push(`no label for ${missing.join(", ")}`);

// All or nothing, so the label set never mixes two versions of the file.
if (errors.length) {
  console.error(`${errors.length} error(s), nothing written:\n  ${errors.join("\n  ")}`);
  process.exitCode = 1;
} else {
  for (const l of valid) writeFileSync(new URL(`${l.id}.json`, labelDir), JSON.stringify(l, null, 2) + "\n");
  console.log(`Wrote ${valid.length} labels to eval/labels/${dataset.version}/`);
}
