import { describe, expect, it } from "vitest";
import { classifyLocation, isInRegion, splitLocations } from "@core/region";

// Strings below are real values from the zshah101 and Simplify snapshots.
describe("classifyLocation", () => {
  it.each([
    "McLean, VA",
    "San Francisco, CA",
    "New York, NY, United States",
    "Sunnyvale, California, United States of America",
    "United States - California - Foster City",
    "United States - Remote",
    "US-IA-CEDAR RAPIDS-131 ~ 5450 C Ave NE ~ BLDG 131",
    "USA LA Bossier City",
    "Remote in USA",
    "United States (Hybrid)",
    "NYC",
    "SF",
    "California",
    "Washington, DC",
    "Vancouver, Washington, United States",
    "London, KY",
  ])("us: %s", (loc) => expect(classifyLocation(loc)).toBe("us"));

  it.each([
    "London, UK",
    "Toronto, ON, Canada",
    "Remote in Canada",
    "Vancouver, BC",
    "Bengaluru",
    "Amsterdam, North Holland, Netherlands",
  ])("non_us: %s", (loc) => expect(classifyLocation(loc)).toBe("non_us"));

  it.each(["Remote", "London, England, New York, New York", "New York City", "Atlanta GA", "", "Hybrid"])("unknown stays unknown: %s", (loc) =>
    expect(classifyLocation(loc)).toBe("unknown"),
  );
});

describe("isInRegion", () => {
  it("keeps a listing if any location is US", () => {
    expect(isInRegion(splitLocations("Amsterdam, North Holland, Netherlands; London, England, United Kingdom; New York, NY"))).toBe(true);
  });
  it("drops a listing only when every location is non-US", () => {
    expect(isInRegion(["London, UK", "Toronto, ON, Canada"])).toBe(false);
  });
  it("keeps unplaceable locations", () => {
    expect(isInRegion(["Remote"])).toBe(true);
    expect(isInRegion([])).toBe(true);
  });
});
