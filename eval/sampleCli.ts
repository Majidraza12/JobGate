// Draw and freeze the labeling sample. Logic lives in sample.ts.
//
//   npm run eval:sample -- --version v1 --random 30 --keyword 30 --seed 20261028

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { connect } from "../pipeline/db";
import { Dataset } from "./labelSchema";
import { drawSample, KEYWORDS, type Row } from "./sample";

const { values: args } = parseArgs({
  options: {
    version: { type: "string", default: "v1" },
    random: { type: "string", default: "30" },
    keyword: { type: "string", default: "30" },
    seed: { type: "string", default: "20261028" },
  },
});
const out = new URL(`./dataset/${args.version}.json`, import.meta.url);
if (existsSync(out)) {
  console.log(`eval/dataset/${args.version}.json already exists. Datasets are frozen; pick a new --version.`);
  process.exit(1);
}
const db = await connect();
// One row per distinct JD text; the representative listing is the oldest.
const { rows } = await db.query<Row>(
  `select distinct on (jd_hash) jd_hash, jd_text, ats, company, title, apply_url, baseline_sponsorship
   from listings where status = 'open' and jd_fetch_status = 'ok' and jd_hash is not null
   order by jd_hash, id`,
);
await db.end();
const seed = Number(args.seed);
const items = drawSample(rows, { random: Number(args.random), keyword: Number(args.keyword), seed });
const dataset = Dataset.parse({
  version: args.version,
  createdAt: new Date().toISOString(),
  seed,
  keywordPattern: KEYWORDS.source,
  items,
});
mkdirSync(new URL("./dataset/", import.meta.url), { recursive: true });
writeFileSync(out, JSON.stringify(dataset, null, 2) + "\n");
const by = (k: "stratum" | "ats") => Object.entries(items.reduce<Record<string, number>>((a, i) => ((a[i[k] ?? "other"] = (a[i[k] ?? "other"] ?? 0) + 1), a), {}));
console.log(`Wrote ${items.length} JDs from ${rows.length} distinct fetched JDs to eval/dataset/${args.version}.json`);
console.log("by stratum:", Object.fromEntries(by("stratum")), "by ATS:", Object.fromEntries(by("ats")));
