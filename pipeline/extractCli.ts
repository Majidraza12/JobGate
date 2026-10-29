// Extraction CLI. The work happens in runExtract.ts.
//
//   npm run extract -- --dry-run         count JDs to extract and the worst-case cost; no API calls
//   npm run extract -- --live --limit 5  call the Claude API (needs ANTHROPIC_API_KEY)
//   npm run extract -- --live --cap 0.5  daily cap in USD (default 1, or EXTRACT_DAILY_CAP_USD)
//
// --live is required for any API call, so nothing spends money by accident.

import { parseArgs } from "node:util";
import { anthropicClient, MODEL } from "./extract/llm";
import { DEFAULT_DAILY_CAP_USD } from "./extract/spend";
import { runExtract } from "./runExtract";

const { values: args } = parseArgs({
  options: {
    "dry-run": { type: "boolean", default: false },
    live: { type: "boolean", default: false },
    limit: { type: "string" },
    cap: { type: "string" },
  },
});

if (!args["dry-run"] && !args.live) {
  console.log("Refusing to call the API without --live. Use --dry-run to see what would be extracted.");
  process.exit(1);
}

const cap = Number(args.cap ?? process.env.EXTRACT_DAILY_CAP_USD ?? DEFAULT_DAILY_CAP_USD);
if (!(cap > 0)) throw new Error(`invalid cap ${args.cap}`);

// A dry run never calls the model, so it gets a client that would throw.
const llm = args.live
  ? anthropicClient()
  : { model: MODEL, complete: () => Promise.reject(new Error("dry run makes no API calls")) };

const result = await runExtract({
  llm,
  capUsd: cap,
  limit: args.limit === undefined ? null : Number.parseInt(args.limit, 10),
  dryRun: args["dry-run"],
});
process.exitCode = result.status === "failed" ? 1 : 0;
