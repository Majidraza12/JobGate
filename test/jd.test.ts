// JD fetching: HTML to text, per-ATS request plans against saved real
// responses (captured 2026-10-28), and the polite runner against a fake fetch.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { JdFetcher } from "../pipeline/jd/fetchJd";
import { planFetch, type JdTarget } from "../pipeline/jd/plans";
import { cleanText, decodeEntities, htmlToText, sha256 } from "../pipeline/jd/text";

const plan = (t: JdTarget) => {
  const p = planFetch(t);
  if (!p) throw new Error(`no plan for ${t.applyUrl}`);
  return p;
};
const fixture = (name: string) => readFileSync(`test/fixtures/jd/${name}`, "utf8");
const json = (name: string) => JSON.parse(fixture(name));

const GREENHOUSE: JdTarget = {
  applyUrl: "https://job-boards.greenhouse.io/asteralabs/jobs/4718443005",
  ats: "greenhouse",
  atsTenant: "asteralabs",
  atsReqId: "4718443005",
};
const LEVER: JdTarget = {
  applyUrl: "https://jobs.lever.co/kitware/ff25a349-a362-45d2-b1e4-2487c1df4f75/apply",
  ats: "lever",
  atsTenant: "kitware",
  atsReqId: "ff25a349-a362-45d2-b1e4-2487c1df4f75",
};
const ASHBY: JdTarget = {
  applyUrl: "https://jobs.ashbyhq.com/hadrian-automation/f718bcfe-3f5b-4682-a294-697499caf813",
  ats: "ashby",
  atsTenant: "hadrian-automation",
  atsReqId: "f718bcfe-3f5b-4682-a294-697499caf813",
};
const WORKDAY: JdTarget = {
  applyUrl: "https://leidos.wd5.myworkdayjobs.com/External/job/Laurel-MD/Junior-Software-Engineer_R-00190592",
  ats: "workday",
  atsTenant: "leidos",
  atsReqId: "r-00190592",
};
const ORACLE: JdTarget = {
  applyUrl: "https://egug.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/26011784",
  ats: "oracle",
  atsTenant: "egug.fa.us2.oraclecloud.com",
  atsReqId: "26011784",
};
const SMARTRECRUITERS: JdTarget = {
  applyUrl: "https://jobs.smartrecruiters.com/BoschGroup/744000154759734",
  ats: "smartrecruiters",
  atsTenant: "boschgroup",
  atsReqId: "744000154759734",
};

describe("htmlToText", () => {
  it("keeps headings and list items on their own lines", () => {
    expect(htmlToText("<h3>Preferred Qualifications:</h3><ul><li><p>Rust</p></li><li>Go</li></ul>")).toBe(
      "Preferred Qualifications:\n\n- Rust\n\n- Go",
    );
  });

  it("collapses whitespace and drops scripts and styles", () => {
    expect(htmlToText("<p>Must  be\n a <b>U.S.</b>&nbsp;citizen</p><script>x()</script><style>p{}</style>")).toBe(
      "Must be a U.S. citizen",
    );
  });

  it("removes zero-width characters the model would never copy into a quote", () => {
    expect(cleanText("no visa​ sponsorship﻿")).toBe("no visa sponsorship");
  });

  it("decodes entity-escaped HTML", () => {
    expect(decodeEntities("&lt;p&gt;A &amp;amp; B&lt;/p&gt;")).toBe("<p>A &amp; B</p>");
  });

  it("hashes text with SHA-256", () => {
    expect(sha256("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});

describe("planFetch request URLs", () => {
  it("builds each ATS API URL", () => {
    expect(plan(GREENHOUSE).url).toBe("https://boards-api.greenhouse.io/v1/boards/asteralabs/jobs/4718443005");
    expect(plan(LEVER).url).toBe("https://api.lever.co/v0/postings/kitware/ff25a349-a362-45d2-b1e4-2487c1df4f75");
    expect(plan(ASHBY).url).toBe("https://api.ashbyhq.com/posting-api/job-board/hadrian-automation");
    expect(plan(WORKDAY).url).toBe(
      "https://leidos.wd5.myworkdayjobs.com/wday/cxs/leidos/External/job/Laurel-MD/Junior-Software-Engineer_R-00190592",
    );
    expect(plan(ORACLE).url).toBe(
      "https://egug.fa.us2.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails?expand=all&onlyData=true&finder=ById;siteNumber=CX_1,Id=%2226011784%22",
    );
  });

  it("uses the Greenhouse API for postings hosted on the employer's own domain", () => {
    const p = plan({
      applyUrl: "https://www.mongodb.com/careers/job/?gh_jid=8209134",
      ats: "greenhouse",
      atsTenant: "mongodb",
      atsReqId: "8209134",
    });
    expect(p.url).toBe("https://boards-api.greenhouse.io/v1/boards/mongodb/jobs/8209134");
  });

  it("uses the EU Lever API for EU postings", () => {
    expect(plan({ ...LEVER, applyUrl: "https://jobs.eu.lever.co/kitware/x" }).url).toMatch(/^https:\/\/api\.eu\.lever\.co\//);
  });

  it("keeps the Ashby board's original capitalization", () => {
    const p = plan({
      applyUrl: "https://jobs.ashbyhq.com/Preference-Model/44642065-e592-44ba-810d-a019703463b6/application",
      ats: "ashby",
      atsTenant: "preference-model",
      atsReqId: "44642065-e592-44ba-810d-a019703463b6",
    });
    expect(p.url).toBe("https://api.ashbyhq.com/posting-api/job-board/Preference-Model");
    expect(p.shared).toBe(true);
  });

  it("strips the Workday locale and apply segments", () => {
    const p = plan({
      applyUrl: "https://brambles.wd5.myworkdayjobs.com/en-US/Brambles_Careers/job/Orlando-Florida-USA/Data-Analyst_JR24773/apply",
      ats: "workday",
      atsTenant: "brambles",
      atsReqId: "jr24773",
    });
    expect(p.url).toBe("https://brambles.wd5.myworkdayjobs.com/wday/cxs/brambles/Brambles_Careers/job/Orlando-Florida-USA/Data-Analyst_JR24773");
  });

  it("reads SmartRecruiters job pages as HTML", () => {
    expect(plan(SMARTRECRUITERS)).toMatchObject({ kind: "smartrecruiters", accept: "html", url: SMARTRECRUITERS.applyUrl });
  });

  it("has no plan for generic career pages or ATSs without a fetcher", () => {
    expect(planFetch({ applyUrl: "https://careers.example.com/jobs/1", ats: null, atsTenant: null, atsReqId: null })).toBeNull();
    expect(planFetch({ applyUrl: "https://apply.workable.com/acme/j/ABC123", ats: "workable", atsTenant: "acme", atsReqId: "abc123" })).toBeNull();
    expect(planFetch({ ...WORKDAY, applyUrl: "https://leidos.wd5.myworkdayjobs.com/External" })).toBeNull();
  });
});

describe("planFetch extraction from saved responses", () => {
  const text = (t: JdTarget, body: unknown) => plan(t).extract(body, t.applyUrl)!;

  it("Greenhouse: decodes the escaped HTML", () => {
    const t = text(GREENHOUSE, json("greenhouse.json"));
    expect(t).toContain("Basic Qualifications");
    expect(t).not.toContain("&lt;");
  });

  it("Lever: includes list sections with their headings", () => {
    const t = text(LEVER, json("lever.json"));
    expect(t).toContain("- Due to contractual requirements, only U.S. citizens will be considered for this position.");
    expect(t).toMatch(/Preferred Qualifications:\n\n- Experience with multiple large multimodal AI models/);
  });

  it("Ashby: picks the posting by id from the board", () => {
    expect(text(ASHBY, json("ashby.json"))).toContain("International Traffic in Arms Regulations (ITAR)");
    expect(plan({ ...ASHBY, atsReqId: "00000000-0000-0000-0000-000000000000" }).extract(json("ashby.json"), "")).toBeNull();
  });

  it("Workday: reads jobPostingInfo.jobDescription", () => {
    expect(text(WORKDAY, json("workday.json"))).toContain("- TS/SCI with Polygraph required upon Application, to be considered for this position.");
  });

  it("Oracle: joins the external description sections", () => {
    const t = text(ORACLE, json("oracle.json"));
    expect(t).toContain("expected graduation date between December 2027 and June 2028");
    expect(t).toContain("will not pursue visa sponsorship");
    expect(plan(ORACLE).extract({ items: [] }, "")).toBeNull();
  });

  it("SmartRecruiters: extracts the main content from the page", () => {
    const t = text(SMARTRECRUITERS, fixture("smartrecruiters.html"));
    expect(t).toContain("Required Qualifications:");
    expect(t).not.toMatch(/<\/?[a-z]+>/);
  });

  it("SmartRecruiters: a redirect away from the posting is not_found, not the landing page", () => {
    expect(plan(SMARTRECRUITERS).extract(fixture("smartrecruiters.html"), "https://jobs.smartrecruiters.com/BoschGroup")).toBeNull();
  });
});

// Fake network: a map from URL to a response factory. Records every request.
function fakeNet(routes: Record<string, () => Response>) {
  const calls: { url: string; headers: Record<string, string> }[] = [];
  const sleeps: number[] = [];
  const fetchImpl = (async (url: string, init?: RequestInit) => {
    calls.push({ url, headers: (init?.headers ?? {}) as Record<string, string> });
    const route = routes[url];
    if (!route) throw new Error(`unexpected request ${url}`);
    return route();
  }) as typeof fetch;
  const fetcher = new JdFetcher({ fetchImpl, sleep: async (ms) => void sleeps.push(ms), minDelayMs: 1000 });
  return { fetcher, calls, sleeps };
}

const ok = (body: string, type = "text/html; charset=utf-8") => () => new Response(body, { status: 200, headers: { "content-type": type } });
const status = (n: number, headers: Record<string, string> = {}) => () => new Response(null, { status: n, headers });
const jsonRes = (body: unknown) => ok(JSON.stringify(body), "application/json");
const LONG = "<p>" + "Must be a U.S. citizen to apply for this role. ".repeat(10) + "</p>";
const page = (url: string): JdTarget => ({ applyUrl: url, ats: "smartrecruiters", atsTenant: "a", atsReqId: url.split("/").at(-1)! });

describe("JdFetcher", () => {
  it("fetches, cleans, and hashes a page that robots.txt allows", async () => {
    const { fetcher, calls } = fakeNet({
      "https://a.com/robots.txt": ok("User-agent: *\nDisallow: /private/", "text/plain"),
      "https://a.com/jobs/1": ok(`<html><body><article>${LONG}</article></body></html>`),
    });
    const r = await fetcher.fetch(page("https://a.com/jobs/1"));
    expect(r.status).toBe("ok");
    expect(r.text).toContain("Must be a U.S. citizen");
    expect(r.hash).toBe(sha256(r.text!));
    expect(calls[1]!.headers["User-Agent"]).toMatch(/^JobGate\//);
  });

  it("never requests a path robots.txt disallows", async () => {
    const { fetcher, calls } = fakeNet({
      "https://a.com/robots.txt": ok("User-agent: *\nDisallow: /jobs/", "text/plain"),
    });
    expect((await fetcher.fetch(page("https://a.com/jobs/1"))).status).toBe("robots_disallowed");
    expect(calls.map((c) => c.url)).toEqual(["https://a.com/robots.txt"]);
  });

  it("treats a 4xx robots.txt as allow-all and a 5xx as disallow-all (RFC 9309)", async () => {
    const { fetcher } = fakeNet({
      "https://a.com/robots.txt": status(401),
      "https://a.com/jobs/1": ok(LONG),
      "https://b.com/robots.txt": status(503),
    });
    expect((await fetcher.fetch(page("https://a.com/jobs/1"))).status).toBe("ok");
    expect((await fetcher.fetch(page("https://b.com/jobs/1"))).status).toBe("robots_disallowed");
  });

  it("checks robots.txt again when a redirect goes to another host", async () => {
    const { fetcher } = fakeNet({
      "https://a.com/robots.txt": status(404),
      "https://a.com/jobs/1": status(302, { location: "https://b.com/careers/1" }),
      "https://b.com/robots.txt": ok("User-agent: *\nDisallow: /careers/", "text/plain"),
    });
    expect((await fetcher.fetch(page("https://a.com/jobs/1"))).status).toBe("robots_disallowed");
  });

  it("maps HTTP failures to statuses", async () => {
    const { fetcher } = fakeNet({
      "https://a.com/robots.txt": status(404),
      "https://a.com/403": status(403),
      "https://a.com/410": status(410),
      "https://a.com/pdf": ok("%PDF", "application/pdf"),
      "https://a.com/shell": ok("<html><body><div id=root></div></body></html>"),
    });
    expect((await fetcher.fetch(page("https://a.com/403"))).status).toBe("blocked");
    expect((await fetcher.fetch(page("https://a.com/410"))).status).toBe("not_found");
    expect((await fetcher.fetch(page("https://a.com/pdf"))).status).toBe("unsupported");
    expect((await fetcher.fetch(page("https://a.com/shell"))).status).toBe("empty");
  });

  it("retries transient errors with backoff, then gives up cleanly", async () => {
    let n = 0;
    const { fetcher, sleeps } = fakeNet({
      "https://a.com/robots.txt": status(404),
      "https://a.com/flaky": () => (++n < 3 ? status(503)() : ok(LONG)()),
      "https://a.com/down": status(502),
    });
    expect((await fetcher.fetch(page("https://a.com/flaky"))).status).toBe("ok");
    expect(sleeps).toEqual(expect.arrayContaining([2000, 4000]));
    const down = await fetcher.fetch(page("https://a.com/down"));
    expect(down).toMatchObject({ status: "error", error: "GET https://a.com/down returned 502" });
  });

  it("spaces requests to one host and honors a larger Crawl-delay", async () => {
    const { fetcher, sleeps } = fakeNet({
      "https://a.com/robots.txt": ok("User-agent: *\nCrawl-delay: 3", "text/plain"),
      "https://a.com/1": ok(LONG),
      "https://a.com/2": ok(LONG),
    });
    await Promise.all([fetcher.fetch(page("https://a.com/1")), fetcher.fetch(page("https://a.com/2"))]);
    expect(sleeps).toContain(3000);
  });

  it("downloads an Ashby board once for several postings and reports unlisted ones as not_found", async () => {
    const board = json("ashby.json");
    const { fetcher, calls } = fakeNet({
      "https://api.ashbyhq.com/robots.txt": status(401),
      "https://api.ashbyhq.com/posting-api/job-board/hadrian-automation": jsonRes(board),
    });
    const other = { ...ASHBY, atsReqId: board.jobs[1].id };
    const missing = { ...ASHBY, atsReqId: "00000000-0000-0000-0000-000000000000" };
    const results = await Promise.all([fetcher.fetch(ASHBY), fetcher.fetch(other), fetcher.fetch(missing)]);
    expect(results.map((r) => r.status)).toEqual(["ok", "ok", "not_found"]);
    expect(calls.filter((c) => c.url.includes("job-board"))).toHaveLength(1);
  });

  it("records generic career pages as unsupported without any request", async () => {
    const { fetcher, calls } = fakeNet({});
    const r = await fetcher.fetch({ applyUrl: "https://careers.example.com/jobs/1", ats: null, atsTenant: null, atsReqId: null });
    expect(r).toMatchObject({ kind: "other", status: "unsupported" });
    expect(calls).toHaveLength(0);
  });

  it("reports a network failure as error instead of throwing", async () => {
    const fetcher = new JdFetcher({
      fetchImpl: (async () => {
        throw new TypeError("fetch failed");
      }) as typeof fetch,
      sleep: async () => {},
    });
    // robots.txt unreachable means disallow-all, so the page is never requested.
    expect((await fetcher.fetch(page("https://a.com/1"))).status).toBe("robots_disallowed");
  });
});
