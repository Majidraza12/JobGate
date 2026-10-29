// Local labeling tool: serves eval/label.html and reads/writes one JSON file
// per JD under eval/labels/<dataset version>/. Bound to 127.0.0.1 only.
//
//   npm run label                       uses eval/dataset/v1.json
//   npm run label -- --dataset v1 --port 5174

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { parseArgs } from "node:util";
import { Dataset, Label } from "./labelSchema";

const { values: args } = parseArgs({
  options: { dataset: { type: "string", default: "v1" }, port: { type: "string", default: "5174" } },
});

const root = new URL("./", import.meta.url);
const dataset = Dataset.parse(JSON.parse(readFileSync(new URL(`dataset/${args.dataset}.json`, root), "utf8")));
const labelDir = new URL(`labels/${dataset.version}/`, root);
mkdirSync(labelDir, { recursive: true });
const ids = new Set(dataset.items.map((i) => i.id));

function loadLabels(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of readdirSync(labelDir)) if (f.endsWith(".json")) out[f.slice(0, -5)] = JSON.parse(readFileSync(new URL(f, labelDir), "utf8"));
  return out;
}

const send = (res: import("node:http").ServerResponse, status: number, body: unknown, type = "application/json") => {
  res.writeHead(status, { "content-type": type });
  res.end(type === "application/json" ? JSON.stringify(body) : body);
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (req.method === "GET" && url.pathname === "/") return send(res, 200, readFileSync(new URL("label.html", root), "utf8"), "text/html; charset=utf-8");
    if (req.method === "GET" && url.pathname === "/api/state") return send(res, 200, { dataset, labels: loadLabels() });
    const m = url.pathname.match(/^\/api\/labels\/([\w-]+)$/);
    if (req.method === "PUT" && m) {
      const id = m[1]!;
      if (!ids.has(id)) return send(res, 404, { error: `unknown id ${id}` });
      let body = "";
      for await (const chunk of req) body += chunk;
      const parsed = Label.safeParse({ ...JSON.parse(body), id, datasetVersion: dataset.version, labeledAt: new Date().toISOString() });
      if (!parsed.success)
        return send(res, 400, { errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) });
      writeFileSync(new URL(`${id}.json`, labelDir), JSON.stringify(parsed.data, null, 2) + "\n");
      return send(res, 200, parsed.data);
    }
    send(res, 404, { error: "not found" });
  } catch (e) {
    send(res, 500, { error: e instanceof Error ? e.message : String(e) });
  }
}).listen(Number(args.port), "127.0.0.1", () => {
  console.log(`Labeling ${dataset.items.length} JDs (dataset ${dataset.version}) at http://127.0.0.1:${args.port}`);
});
