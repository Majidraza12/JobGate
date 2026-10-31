// Throwaway prototype: the 60 eval JDs that already have prompt v4 extractions,
// matched live against a profile typed into the page. No API calls, no auth,
// nothing saved server-side. Bound to 127.0.0.1 only. The real app is M3.
//
//   npm run demo            http://127.0.0.1:5175
//
// The profile arrives in each /api/match request and is never logged.

import { readdirSync, readFileSync } from "node:fs";
import { createServer, type ServerResponse } from "node:http";
import { EligibilityProfile } from "@core/profile";
import { match, type JobType, type StoredRequirements } from "@core/match";
import { connect } from "../pipeline/db";
import { MODEL } from "../pipeline/extract/llm";
import { PROMPT_VERSION } from "../pipeline/extract/prompt";

const PORT = 5175;
const root = new URL("../eval/", import.meta.url);
const dataset = JSON.parse(readFileSync(new URL("dataset/v1.json", root), "utf8")) as {
  items: { id: string; jdHash: string; company: string; title: string; applyUrl: string; jdText: string }[];
};
const predDir = new URL(`predictions/v1/${MODEL}/${PROMPT_VERSION}/`, root);
const predictions = new Map<string, StoredRequirements>(
  readdirSync(predDir).map((f) => {
    const p = JSON.parse(readFileSync(new URL(f, predDir), "utf8"));
    return [p.id, { extraction_status: p.status, extracted: p.extracted }];
  }),
);

type Meta = { locations: string[]; jobType: JobType | null; postedAt: string | null };

// Location, job type, and posted date come from the local database when it's
// up; the page still works without it, using the extracted employment type.
async function loadMeta(): Promise<Map<string, Meta>> {
  const out = new Map<string, Meta>();
  try {
    const db = await connect();
    const r = await db.query<{ jd_hash: string; locations: string[]; job_type: string; posted_at: Date | null }>(
      "select distinct on (jd_hash) jd_hash, locations, job_type, posted_at from listings where jd_hash = any($1) order by jd_hash, posted_at desc nulls last",
      [dataset.items.map((i) => i.jdHash)],
    );
    for (const row of r.rows)
      out.set(row.jd_hash, {
        locations: row.locations,
        jobType: row.job_type === "new_grad" ? "full-time" : (row.job_type as JobType),
        postedAt: row.posted_at?.toISOString().slice(0, 10) ?? null,
      });
    await db.end();
  } catch (e) {
    console.warn(`Database not reachable (${e instanceof Error ? e.message : e}); showing listings without location or date.`);
  }
  return out;
}

const meta = await loadMeta();

const listings = dataset.items.map((i) => {
  const req = predictions.get(i.id) ?? { extraction_status: "llm_failed" as const, extracted: null };
  const m = meta.get(i.jdHash);
  const extractedType = req.extracted?.employment_type;
  const jobType: JobType = m?.jobType ?? (extractedType === "internship" || extractedType === "co-op" ? extractedType : "full-time");
  return { id: i.id, company: i.company, title: i.title, applyUrl: i.applyUrl, jdText: i.jdText, locations: m?.locations ?? [], postedAt: m?.postedAt ?? null, jobType, req };
});

const send = (res: ServerResponse, status: number, body: unknown, type = "application/json") => {
  res.writeHead(status, { "content-type": type });
  res.end(type === "application/json" ? JSON.stringify(body) : body);
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (req.method === "GET" && url.pathname === "/")
      return send(res, 200, readFileSync(new URL("index.html", import.meta.url), "utf8"), "text/html; charset=utf-8");
    if (req.method === "GET" && url.pathname.startsWith("/api/jd/")) {
      const l = listings.find((x) => x.id === url.pathname.slice("/api/jd/".length));
      return l ? send(res, 200, { jdText: l.jdText }) : send(res, 404, { error: "not found" });
    }
    if (req.method === "POST" && url.pathname === "/api/match") {
      let body = "";
      for await (const chunk of req) body += chunk;
      const parsed = EligibilityProfile.safeParse(JSON.parse(body));
      if (!parsed.success) return send(res, 400, { errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) });
      const results = listings.map(({ jdText: _jd, req: r, ...l }) => ({ ...l, ...match(r, parsed.data, l.jobType) }));
      return send(res, 200, { model: MODEL, promptVersion: PROMPT_VERSION, results });
    }
    send(res, 404, { error: "not found" });
  } catch (e) {
    send(res, 500, { error: e instanceof Error ? e.message : String(e) });
  }
}).listen(PORT, "127.0.0.1", () => {
  console.log(`JobGate prototype: ${listings.length} listings at http://127.0.0.1:${PORT}`);
});
