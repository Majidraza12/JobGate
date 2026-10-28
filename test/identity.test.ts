import { describe, expect, it } from "vitest";
import { identify, normalizeUrl } from "@core/identity";

describe("normalizeUrl", () => {
  it("lowercases host, drops www, fragment, trailing slash, and tracking params", () => {
    expect(normalizeUrl("HTTP://WWW.Example.com/Careers/Job/?utm_source=x&gh_src=y&ref=z#apply")).toBe(
      "https://example.com/Careers/Job",
    );
  });

  it("keeps identifying params and sorts them", () => {
    expect(normalizeUrl("https://mongodb.com/careers/job/?utm_medium=a&gh_jid=8209134&b=2")).toBe(
      "https://mongodb.com/careers/job?b=2&gh_jid=8209134",
    );
  });

  it("does not touch slashes inside the query string", () => {
    expect(normalizeUrl("https://a.com/x/?next=/foo/")).toBe("https://a.com/x?next=%2Ffoo%2F");
  });

  it("maps the bare host to no path", () => {
    expect(normalizeUrl("https://a.com/")).toBe("https://a.com");
  });
});

describe("identify: ATS URLs", () => {
  const cases: [string, string][] = [
    ["https://job-boards.greenhouse.io/cssmerge/jobs/8919606002", "greenhouse:cssmerge:8919606002"],
    ["https://boards.greenhouse.io/spacex/jobs/7669159003?gh_jid=7669159003", "greenhouse:spacex:7669159003"],
    ["https://job-boards.eu.greenhouse.io/imc/jobs/4738026101", "greenhouse:imc:4738026101"],
    ["https://boards.greenhouse.io/embed/job_app?for=stripe&token=7918610", "greenhouse:stripe:7918610"],
    [
      "https://jobs.lever.co/palantir/b3d81928-6c26-432f-8a0a-36602c2eefcb/apply",
      "lever:palantir:b3d81928-6c26-432f-8a0a-36602c2eefcb",
    ],
    ["https://jobs.lever.co/hp/b3d81928-6c26-432f-8a0a-36602c2eefcb", "lever:hp:b3d81928-6c26-432f-8a0a-36602c2eefcb"],
    [
      "https://jobs.ashbyhq.com/skydio/ec82eb16-a5b4-46e7-827a-326b33d7d2cb/application",
      "ashby:skydio:ec82eb16-a5b4-46e7-827a-326b33d7d2cb",
    ],
    [
      "https://aaaie.wd1.myworkdayjobs.com/CSAACareers2/job/Arizona---Home-Teleworkers/Data-Science-Intern_R8002",
      "workday:aaaie:r8002",
    ],
    [
      "https://generalmotors.wd5.myworkdayjobs.com/en-US/Careers_GM/job/Sunnyvale-California/Software-Engineer--University-Grad-_JR-202604577/apply",
      "workday:generalmotors:jr-202604577",
    ],
    [
      "https://oracle.wd1.myworkdayjobs.com/External/details/Software-Engineer_JR123",
      "workday:oracle:jr123",
    ],
    [
      "https://hdjq.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/26010630",
      "oracle:hdjq.fa.us2.oraclecloud.com:26010630",
    ],
    ["https://jobs.smartrecruiters.com/AbbVie/3743990016414086-software-intern", "smartrecruiters:abbvie:3743990016414086"],
    ["https://www.amazon.jobs/en/jobs/10590290/database-engineer-intern-summer-2027", "amazon:amazon:10590290"],
    ["https://amazon.jobs/jobs/10590290", "amazon:amazon:10590290"],
    ["https://apply.workable.com/connectprep/j/1AF4F8C65F/", "workable:connectprep:1af4f8c65f"],
    ["https://ninjaholdings.breezy.hr/p/85be8c78a2ba-data-science-intern", "breezy:ninjaholdings:85be8c78a2ba"],
    [
      "https://ats.rippling.com/rippling/jobs/a07e4e46-3721-4934-b57b-0d58412e22ba",
      "rippling:rippling:a07e4e46-3721-4934-b57b-0d58412e22ba",
    ],
    ["https://qualcomm.eightfold.ai/careers/job/446700000000", "eightfold:qualcomm:446700000000"],
  ];
  it.each(cases)("%s", (url, key) => {
    expect(identify(url).key).toBe(key);
  });

  it("ignores the Workday location slug, so zshah101 and other feeds agree", () => {
    const a = identify("https://bah.wd1.myworkdayjobs.com/BAH_Jobs/job/McLean-VA/Intern_R0001");
    const b = identify("https://bah.wd1.myworkdayjobs.com/bah_jobs/job/Remote/Intern_R0001");
    expect(a.key).toBe(b.key);
  });

  it("keeps Workday posting suffixes distinct: -1 and -2 are separate postings", () => {
    const a = identify("https://visa.wd5.myworkdayjobs.com/Visa/job/US---Austin-TX/SWE-Intern_REF089882W-1");
    const b = identify("https://visa.wd5.myworkdayjobs.com/Visa/job/US---Bellevue-WA/SWE-Intern_REF089882W-2");
    expect(a.key).not.toBe(b.key);
  });

  it("namespaces by tenant: same req id at two employers is two listings", () => {
    expect(identify("https://jobs.lever.co/a/b3d81928-6c26-432f-8a0a-36602c2eefcb").key).not.toBe(
      identify("https://jobs.lever.co/b/b3d81928-6c26-432f-8a0a-36602c2eefcb").key,
    );
  });
});

describe("identify: fallbacks", () => {
  it("falls back to the normalized URL for unknown hosts", () => {
    expect(identify("https://jobs.apple.com/en-us/details/200612345/swe?utm_source=x")).toEqual({
      kind: "url",
      key: "https://jobs.apple.com/en-us/details/200612345/swe",
    });
  });

  it("uses a source hint when the URL is a company-hosted ATS page", () => {
    const id = identify("https://www.mongodb.com/careers/job/?gh_jid=8209134", {
      ats: "greenhouse",
      tenant: "mongodb",
      reqId: "8209134",
    });
    expect(id.key).toBe("greenhouse:mongodb:8209134");
  });

  it("prefers what the URL proves over the hint", () => {
    const id = identify("https://kla.wd1.myworkdayjobs.com/Search/job/Ann-Arbor-MI/Intern_2642033-2", {
      ats: "workday",
      tenant: "kla",
      reqId: "2642033-1",
    });
    expect(id.key).toBe("workday:kla:2642033-2");
  });

  it("falls back to URL when a Greenhouse embed has no board", () => {
    expect(identify("https://boards.greenhouse.io/embed/job_app?token=7918610").kind).toBe("url");
  });

  it("falls back to URL when a Workday path has no req suffix", () => {
    expect(identify("https://x.wd1.myworkdayjobs.com/Site/job/Remote/NoSuffix").kind).toBe("url");
  });

  it("throws on a non-URL so the adapter can log and skip", () => {
    expect(() => identify("not a url")).toThrow();
  });
});
