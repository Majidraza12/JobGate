// Extraction CLI. The work happens in runExtract.ts.
//
//   npm run extract -- --dry-run                     count JDs to extract and the worst-case API cost
//   npm run extract -- --via-cli --model haiku       run through `claude -p` on the subscription ($0)
//   npm run extract -- --live --limit 5              call the paid Claude API (needs ANTHROPIC_API_KEY)
//   npm run extract -- --live --cap 0.5              daily cap in USD (default 1, or EXTRACT_DAILY_CAP_USD)
//
// --live or --via-cli is required for any model call, so nothing runs by accident.

import { parseArgs } from "node:util";
import { claudeCliClient, CLI_MODELS, type CliModelName } from "./extract/claudeCli";
import { anthropicClient, MODEL } from "./extract/llm";
import { DEFAULT_DAILY_CAP_USD } from "./extract/spend";
import { runExtract } from "./runExtract";

const { values: args } = parseArgs({
  options: {
    "dry-run": { type: "boolean", default: false },
    live: { type: "boolean", default: false },
    "via-cli": { type: "boolean", default: false },
    model: { type: "string", default: "haiku" },
    limit: { type: "string" },
    cap: { type: "string" },
  },
});

if (!args["dry-run"] && !args.live && !args["via-cli"]) {
  console.log("Refusing to call a model without --live (paid API) or --via-cli (subscription). Use --dry-run to see what would be extracted.");
  process.exit(1);
}
if (args.live && args["via-cli"]) {
  console.log("Pick one of --live and --via-cli.");
  process.exit(1);
}
if (!(args.model in CLI_MODELS)) {
  console.log(`--model must be one of ${Object.keys(CLI_MODELS).join(", ")}`);
  process.exit(1);
}
const cliModel = CLI_MODELS[args.model as CliModelName];

const cap = Number(args.cap ?? process.env.EXTRACT_DAILY_CAP_USD ?? DEFAULT_DAILY_CAP_USD);
if (!(cap > 0)) throw new Error(`invalid cap ${args.cap}`);

// A dry run never calls the model, so it gets a client that would throw.
const llm = args["via-cli"]
  ? claudeCliClient(cliModel)
  : args.live
    ? anthropicClient()
    : { model: MODEL, complete: () => Promise.reject(new Error("dry run makes no model calls")) };

const result = await runExtract({
  llm,
  capUsd: cap,
  limit: args.limit === undefined ? null : Number.parseInt(args.limit, 10),
  dryRun: args["dry-run"],
});
process.exitCode = result.status === "failed" ? 1 : 0;
