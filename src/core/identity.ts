// Listing identity: ATS requisition ID when the apply URL proves one, else a
// normalized URL. Every source goes through the same parser so the same posting
// gets the same key regardless of which feed found it.

export type Ats =
  | "greenhouse"
  | "lever"
  | "ashby"
  | "workday"
  | "oracle"
  | "smartrecruiters"
  | "amazon"
  | "workable"
  | "breezy"
  | "rippling"
  | "icims"
  | "eightfold";

export type Identity =
  | { kind: "ats"; ats: Ats; tenant: string; reqId: string; key: string }
  | { kind: "url"; key: string };

// Query params that track the click, not the posting. Anything not listed here
// is kept, because dropping an identifying param could merge two postings.
const TRACKING_PARAMS = new Set([
  "gh_src",
  "ref",
  "referrer",
  "source",
  "src",
  "lever-source",
  "lever-origin",
  "lever-source[]",
  "iis",
  "iisn",
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
]);

export function normalizeUrl(raw: string): string {
  const u = new URL(raw.trim());
  u.hostname = u.hostname.toLowerCase().replace(/^www\./, "");
  const kept = [...u.searchParams.entries()]
    .filter(([k]) => !k.toLowerCase().startsWith("utm_") && !TRACKING_PARAMS.has(k.toLowerCase()))
    .sort(([a], [b]) => a.localeCompare(b));
  const search = new URLSearchParams(kept).toString();
  const path = u.pathname.replace(/\/+$/, "");
  return `https://${u.hostname}${path}${search ? `?${search}` : ""}`;
}

function ats(ats: Ats, tenant: string, reqId: string): Identity {
  const t = tenant.toLowerCase();
  const r = reqId.toLowerCase();
  return { kind: "ats", ats, tenant: t, reqId: r, key: `${ats}:${t}:${r}` };
}

type Parser = (u: URL, segs: string[]) => Identity | null;

const PARSERS: [RegExp, Parser][] = [
  [
    /(^|\.)greenhouse\.io$/,
    (u, s) => {
      // /{board}/jobs/{id}; embed URLs carry the board only as ?for=
      if (s[1] === "jobs" && s[0] && /^\d+$/.test(s[2] ?? "")) return ats("greenhouse", s[0], s[2]!);
      const token = u.searchParams.get("token") ?? u.searchParams.get("gh_jid");
      const board = u.searchParams.get("for");
      if (s[0] === "embed" && board && token && /^\d+$/.test(token)) return ats("greenhouse", board, token);
      return null;
    },
  ],
  [
    /^jobs\.(eu\.)?lever\.co$/,
    (_u, s) => (s[0] && s[1] && /^[0-9a-f-]{36}$/i.test(s[1]) ? ats("lever", s[0], s[1]) : null),
  ],
  [
    /^jobs\.ashbyhq\.com$/,
    (_u, s) => (s[0] && s[1] && /^[0-9a-f-]{36}$/i.test(s[1]) ? ats("ashby", s[0], s[1]) : null),
  ],
  [
    /^[a-z0-9-]+\.wd\d+\.myworkdayjobs\.com$/,
    (u, s) => {
      // /[locale/]{site}/job/{location}/{slug}_{REQ} or /[locale/]{site}/details/{slug}_{REQ}.
      // The site and location slug are excluded from the key: one requisition can
      // appear under several sites, and zshah101's ids include the location slug.
      // The full suffix after the last "_" is kept, including Workday's "-1", "-2"
      // posting suffixes, so separate postings of one req are never merged.
      const i = s.findIndex((x) => x === "job" || x === "details");
      if (i < 0) return null;
      const rest = s.slice(i + 1).filter((x) => x !== "apply" && x !== "autofillWithResume");
      const last = rest[rest.length - 1];
      const us = last?.lastIndexOf("_") ?? -1;
      if (!last || us < 0 || us === last.length - 1) return null;
      return ats("workday", u.hostname.split(".")[0]!, last.slice(us + 1));
    },
  ],
  [
    /\.oraclecloud\.com$/,
    (u, s) => {
      const i = s.findIndex((x) => x === "job" || x === "preview");
      const id = i >= 0 ? s[i + 1] : undefined;
      return id && /^\d+$/.test(id) ? ats("oracle", u.hostname, id) : null;
    },
  ],
  [
    /^(jobs|careers)\.smartrecruiters\.com$/,
    (_u, s) => {
      const id = s[1]?.match(/^(\d+)/)?.[1];
      return s[0] && id ? ats("smartrecruiters", s[0], id) : null;
    },
  ],
  [
    /^amazon\.jobs$/,
    (_u, s) => {
      const i = s.indexOf("jobs");
      const id = i >= 0 ? s[i + 1] : undefined;
      return id && /^\d+$/.test(id) ? ats("amazon", "amazon", id) : null;
    },
  ],
  [
    /^apply\.workable\.com$/,
    (_u, s) => (s[0] && s[1] === "j" && s[2] ? ats("workable", s[0], s[2]) : null),
  ],
  [
    /^[a-z0-9-]+\.breezy\.hr$/,
    (u, s) => {
      const id = s[0] === "p" ? s[1]?.match(/^([0-9a-f]+)(-|$)/i)?.[1] : undefined;
      return id ? ats("breezy", u.hostname.split(".")[0]!, id) : null;
    },
  ],
  [
    /^ats\.rippling\.com$/,
    (_u, s) => (s[0] && s[1] === "jobs" && s[2] ? ats("rippling", s[0], s[2]) : null),
  ],
  [
    /^[a-z0-9-]+\.icims\.com$/,
    (u, s) => (s[0] === "jobs" && /^\d+$/.test(s[1] ?? "") ? ats("icims", u.hostname.split(".")[0]!, s[1]!) : null),
  ],
  [
    /^[a-z0-9-]+\.eightfold\.ai$/,
    (u, s) => {
      const id = s[0] === "careers" && s[1] === "job" ? s[2] : u.searchParams.get("pid");
      return id && /^\d+$/.test(id) ? ats("eightfold", u.hostname.split(".")[0]!, id) : null;
    },
  ],
];

// A source-provided ATS id, e.g. zshah101's "greenhouse:mongodb:8209134".
// Used only when the URL itself proves nothing, because some employers host
// ATS postings on their own domain (mongodb.com/careers/job?gh_jid=...).
export type AtsHint = { ats: Ats; tenant: string; reqId: string };

export function identify(rawUrl: string, hint?: AtsHint): Identity {
  const normalized = normalizeUrl(rawUrl);
  const u = new URL(normalized);
  const segs = u.pathname.split("/").filter(Boolean);
  for (const [host, parse] of PARSERS) {
    if (!host.test(u.hostname)) continue;
    const id = parse(u, segs);
    if (id) return id;
  }
  if (hint) return ats(hint.ats, hint.tenant, hint.reqId);
  return { kind: "url", key: normalized };
}
