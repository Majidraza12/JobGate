// Where to get each listing's job description and how to turn the response into
// text. Pure: no network here, so every parser is tested against saved real
// responses. The runner (fetchJd.ts) does robots.txt, rate limiting, and retries.

import { decodeEntities, htmlToText, pageToText } from "./text";

export interface JdTarget {
  applyUrl: string;
  ats: string | null;
  atsTenant: string | null;
  atsReqId: string | null;
}

export interface Plan {
  kind: string; // reported in per-ATS fetch metrics
  url: string;
  accept: "json" | "html";
  // The response covers many postings, so the runner keeps it for the run.
  shared?: boolean;
  // Text of the description, or null when the response doesn't contain this
  // posting (e.g. an unlisted Ashby job), which the runner records as not_found.
  extract(body: unknown, finalUrl: string): string | null;
}

type Json = Record<string, any>;

// Join non-empty HTML sections, skipping exact repeats (Oracle often repeats
// the same block in several fields).
function sections(parts: (string | null | undefined)[]): string {
  const seen = new Set<string>();
  const texts: string[] = [];
  for (const p of parts) {
    if (!p) continue;
    const t = htmlToText(p);
    if (t && !seen.has(t)) {
      seen.add(t);
      texts.push(t);
    }
  }
  return texts.join("\n\n");
}

function greenhouse(t: JdTarget): Plan {
  return {
    kind: "greenhouse",
    url: `https://boards-api.greenhouse.io/v1/boards/${t.atsTenant}/jobs/${t.atsReqId}`,
    accept: "json",
    extract: (b) => {
      const content = (b as Json).content;
      return typeof content === "string" ? htmlToText(decodeEntities(content)) : null;
    },
  };
}

function lever(t: JdTarget, u: URL): Plan {
  const host = u.hostname === "jobs.eu.lever.co" ? "api.eu.lever.co" : "api.lever.co";
  return {
    kind: "lever",
    url: `https://${host}/v0/postings/${t.atsTenant}/${t.atsReqId}`,
    accept: "json",
    extract: (b) => {
      const j = b as Json;
      if (typeof j.description !== "string") return null;
      const lists = (j.lists ?? []).map((l: Json) => `<h3>${l.text ?? ""}</h3><ul>${l.content ?? ""}</ul>`);
      return sections([j.description, ...lists, j.additional]);
    },
  };
}

// Ashby has no public single-job endpoint, only the whole board. The runner
// memoizes responses by URL, so a board is downloaded once per run.
function ashby(t: JdTarget, u: URL): Plan {
  // Board names are case-sensitive in URLs ("Preference-Model"); the stored
  // tenant is lowercased, so prefer the original spelling from the apply URL.
  const board = u.hostname === "jobs.ashbyhq.com" ? u.pathname.split("/")[1]! : t.atsTenant!;
  return {
    kind: "ashby",
    url: `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(board)}`,
    accept: "json",
    shared: true,
    extract: (b) => {
      const job = ((b as Json).jobs ?? []).find((j: Json) => String(j.id).toLowerCase() === t.atsReqId);
      return job?.descriptionHtml ? htmlToText(job.descriptionHtml) : null;
    },
  };
}

// /[locale/]{site}/job/{location}/{slug}_{REQ} -> /wday/cxs/{tenant}/{site}/job/{location}/{slug}_{REQ}
function workday(u: URL): Plan | null {
  const segs = u.pathname.split("/").filter(Boolean);
  const i = segs.indexOf("job");
  if (i < 1) return null;
  const site = segs[i - 1]!;
  const rest = segs.slice(i).filter((x) => x !== "apply" && x !== "autofillWithResume");
  const tenant = u.hostname.split(".")[0]!;
  return {
    kind: "workday",
    url: `https://${u.hostname}/wday/cxs/${tenant}/${site}/${rest.join("/")}`,
    accept: "json",
    extract: (b) => {
      const html = (b as Json).jobPostingInfo?.jobDescription;
      return typeof html === "string" ? htmlToText(html) : null;
    },
  };
}

function oracle(t: JdTarget, u: URL): Plan | null {
  const segs = u.pathname.split("/").filter(Boolean);
  const site = segs[segs.indexOf("sites") + 1];
  if (!segs.includes("sites") || !site) return null;
  const finder = `ById;siteNumber=${site},Id=%22${t.atsReqId}%22`;
  return {
    kind: "oracle",
    url: `https://${u.hostname}/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails?expand=all&onlyData=true&finder=${finder}`,
    accept: "json",
    extract: (b) => {
      const item = (b as Json).items?.[0];
      if (!item) return null;
      return sections([
        item.ExternalDescriptionStr,
        item.ExternalResponsibilitiesStr,
        item.ExternalQualificationsStr,
        item.CorporateDescriptionStr,
        item.OrganizationDescriptionStr,
      ]);
    },
  };
}

// Any HTML page, SmartRecruiters job pages included (its API host disallows
// crawlers, so we only read the public page, and only where robots.txt allows).
function page(kind: string, url: string): Plan {
  return { kind, url, accept: "html", extract: (b, finalUrl) => pageToText(b as string, finalUrl) };
}

export function planFetch(t: JdTarget): Plan {
  const u = new URL(t.applyUrl);
  const hasIds = t.atsTenant !== null && t.atsReqId !== null;
  switch (t.ats) {
    case "greenhouse":
      if (hasIds) return greenhouse(t);
      break;
    case "lever":
      if (hasIds) return lever(t, u);
      break;
    case "ashby":
      if (hasIds) return ashby(t, u);
      break;
    case "workday":
      return workday(u) ?? page("workday", t.applyUrl);
    case "oracle":
      if (hasIds) return oracle(t, u) ?? page("oracle", t.applyUrl);
      break;
    case "smartrecruiters":
      return page("smartrecruiters", t.applyUrl);
  }
  return page(t.ats ?? "other", t.applyUrl);
}
