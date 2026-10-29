// Fetch-JD CLI. The work happens in runFetchJds.ts.
//
//   npm run fetch-jds                        every open listing that needs a JD
//   npm run fetch-jds -- --limit 50          stop after 50 listings
//   npm run fetch-jds -- --ats lever         one ATS only ("other" = no ATS)
//   npm run fetch-jds -- --refresh-days 7    also re-fetch JDs older than 7 days
//   npm run fetch-jds -- --trigger manual    recorded on the pipeline_runs row

import { parseArgs } from "node:util";
import { runFetchJds } from "./runFetchJds";

const { values: args } = parseArgs({
  options: {
    limit: { type: "string" },
    ats: { type: "string" },
    "refresh-days": { type: "string" },
    concurrency: { type: "string", default: "8" },
    trigger: { type: "string", default: "local" },
  },
});

const trigger = args.trigger as "schedule" | "manual" | "local";
if (!["schedule", "manual", "local"].includes(trigger)) throw new Error(`unknown --trigger ${args.trigger}`);
const int = (s: string | undefined) => (s === undefined ? null : Number.parseInt(s, 10));

const result = await runFetchJds({
  trigger,
  ats: args.ats ?? null,
  limit: int(args.limit),
  refreshDays: int(args["refresh-days"]),
  concurrency: int(args.concurrency) ?? 8,
});
process.exitCode = result.status === "failed" ? 1 : 0;
