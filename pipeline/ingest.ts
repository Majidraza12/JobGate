// Ingest CLI. The work happens in runIngest.ts.
//
//   npm run ingest                      live sources -> local database
//   npm run ingest -- --dry-run         live sources, print counts, no database
//   npm run ingest -- --from <dir>      read <dir>/zshah101.json and <dir>/simplify-newgrad.json
//   npm run ingest -- --trigger manual  recorded on the pipeline_runs row

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { simplifyNewGradAdapter } from "./adapters/simplifyNewGrad";
import { zshah101Adapter } from "./adapters/zshah101";
import { runIngest } from "./runIngest";
import type { SourceAdapter } from "./types";

const { values: args } = parseArgs({
  options: {
    "dry-run": { type: "boolean", default: false },
    from: { type: "string" },
    trigger: { type: "string", default: "local" },
  },
});

const trigger = args.trigger as "schedule" | "manual" | "local";
if (!["schedule", "manual", "local"].includes(trigger)) throw new Error(`unknown --trigger ${args.trigger}`);

const fromFile = (name: string) => async () => JSON.parse(await readFile(join(args.from!, name), "utf8"));
const adapters: SourceAdapter[] = args.from
  ? [zshah101Adapter(fromFile("zshah101.json")), simplifyNewGradAdapter(fromFile("simplify-newgrad.json"))]
  : [zshah101Adapter(), simplifyNewGradAdapter()];

const result = await runIngest({ adapters, trigger, dryRun: args["dry-run"] });
process.exitCode = result.status === "failed" ? 1 : 0;
