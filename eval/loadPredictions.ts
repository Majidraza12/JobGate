// Loads stored eval predictions into the requirements table, so the app shows
// verdicts for the eval JDs without paying to extract them again. Rows are
// keyed (jd_hash, prompt_version, model) like the extract step's, so a later
// live extraction of the same JD with the same prompt overwrites nothing new.
//
//   npm run load:predictions     current prompt version, local database

import { readdirSync, readFileSync } from "node:fs";
import { connect } from "../pipeline/db";
import { MODEL } from "../pipeline/extract/llm";
import { PROMPT_VERSION } from "../pipeline/extract/prompt";

const root = new URL("./", import.meta.url);
const dataset = JSON.parse(readFileSync(new URL("dataset/v1.json", root), "utf8")) as { items: { id: string; jdHash: string }[] };
const hashOf = new Map(dataset.items.map((i) => [i.id, i.jdHash]));
const dir = new URL(`predictions/v1/${MODEL}/${PROMPT_VERSION}/`, root);

const db = await connect();
let n = 0;
for (const f of readdirSync(dir)) {
  const p = JSON.parse(readFileSync(new URL(f, dir), "utf8"));
  const hash = hashOf.get(p.id);
  if (!hash) throw new Error(`${p.id} is not in dataset v1`);
  await db.query(
    `insert into requirements (jd_hash, prompt_version, model, extraction_status, extracted, quote_failures, error,
                               input_tokens, output_tokens, cost_usd, latency_ms, extracted_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     on conflict (jd_hash, prompt_version, model) do update set
       extraction_status = excluded.extraction_status, extracted = excluded.extracted,
       quote_failures = excluded.quote_failures, error = excluded.error, input_tokens = excluded.input_tokens,
       output_tokens = excluded.output_tokens, cost_usd = excluded.cost_usd, latency_ms = excluded.latency_ms,
       extracted_at = excluded.extracted_at`,
    [hash, PROMPT_VERSION, MODEL, p.status, p.extracted, p.quoteFailures, p.error, p.inputTokens, p.outputTokens, p.costUsd, p.latencyMs, p.at],
  );
  n++;
}
await db.end();
console.log(`Loaded ${n} ${MODEL} ${PROMPT_VERSION} predictions into requirements.`);
