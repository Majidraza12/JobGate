// Deciding-phrase highlights, on real quotes from the feed.
import { describe, expect, it } from "vitest";
import { highlight } from "../src/lib/highlight";

const hits = (q: string, f: Parameters<typeof highlight>[1]) => highlight(q, f).filter((s) => s.hit).map((s) => s.text);

describe("highlight", () => {
  it("marks a graduation range as one phrase", () => {
    expect(hits("with an expected graduation date of December 2026 – June 2027", "grad_requirements")).toEqual(["December 2026 – June 2027"]);
    expect(hits("Graduating in December 2027 or May/June 2028", "grad_requirements")).toEqual(["December 2027 or May/June 2028"]);
  });

  it("marks class years, degrees, and work authorization", () => {
    expect(hits("Students entering their Junior or Senior year at the start", "class_years")).toEqual(["Junior or Senior year"]);
    expect(hits("Bachelor's degree, OR 3+ years of relevant work experience.", "degree_levels")).toEqual(["Bachelor's degree"]);
    expect(hits("Bachelor's or Master's degree in Computer Science", "degree_levels")).toEqual(["Bachelor's or Master's degree"]);
    expect(hits("Must be a U.S. citizen.", "citizenship_required")).toEqual(["U.S. citizen"]);
    expect(hits("We will not sponsor visas now or in the future", "sponsorship_future_unavailable")).toEqual(["will not sponsor", "now or in the future"]);
    expect(hits("Must hold an active Top Secret clearance", "clearance")).toEqual(["active Top Secret clearance"]);
  });

  it("keeps the whole quote, in order", () => {
    const q = "Must be a continuing college or university student in good standing";
    expect(highlight(q, "must_return_to_school").map((s) => s.text).join("")).toBe(q);
    expect(hits(q, "must_return_to_school")).toEqual(["continuing college or university student"]);
  });

  it("returns the plain quote when nothing matches or there is no field", () => {
    expect(highlight("Nothing here", "clearance")).toEqual([{ text: "Nothing here", hit: false }]);
    expect(highlight("Anything", null)).toEqual([{ text: "Anything", hit: false }]);
  });
});
