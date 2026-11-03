// City normalization: real spellings seen in the open listings.
import { describe, expect, it } from "vitest";
import { cityCounts, cityCountsFromLocations, cityOf, cityOptions } from "@core/cities";
import usCities from "@core/usCities.json";

describe("cityOf", () => {
  it("keeps City, ST", () => {
    expect(cityOf("Chicago, IL")).toBe("Chicago, IL");
    expect(cityOf("Annapolis Junction, MD")).toBe("Annapolis Junction, MD");
  });

  it("expands short names", () => {
    expect(cityOf("NYC")).toBe("New York, NY");
    expect(cityOf("New York City")).toBe("New York, NY");
    expect(cityOf("SF")).toBe("San Francisco, CA");
    expect(cityOf("LA")).toBe("Los Angeles, CA");
  });

  it("drops the country and turns state names into codes", () => {
    expect(cityOf("New York, NY, United States")).toBe("New York, NY");
    expect(cityOf("Seattle, Washington, USA")).toBe("Seattle, WA");
    expect(cityOf("Sunnyvale, California, United States of America")).toBe("Sunnyvale, CA");
    expect(cityOf("San Francisco, California")).toBe("San Francisco, CA");
  });

  it("reads other layouts", () => {
    expect(cityOf("United States - California - Foster City")).toBe("Foster City, CA");
    expect(cityOf("Atlanta GA")).toBe("Atlanta, GA");
    expect(cityOf("Arlington County, Arlington, VA")).toBe("Arlington, VA");
    expect(cityOf("Boise, ID - Main Site")).toBe("Boise, ID");
  });

  it("returns null for anything that isn't one U.S. city", () => {
    for (const l of ["Remote in USA", "United States", "California", "Texas", "Remote in Canada", "United States - Remote", "US-IA-CEDAR RAPIDS-131 ~ 5450 C Ave NE ~ BLDG 131"]) {
      expect(cityOf(l)).toBeNull();
    }
  });
});

describe("cityCountsFromLocations", () => {
  it("adds up strings that name the same city, most first", () => {
    expect(
      cityCountsFromLocations([
        { location: "NYC", listings: 2 },
        { location: "New York, NY", listings: 3 },
        { location: "Chicago, IL", listings: 4 },
        { location: "Remote", listings: 9 },
      ]),
    ).toEqual([
      { city: "New York, NY", count: 5 },
      { city: "Chicago, IL", count: 4 },
    ]);
  });
});

describe("cityCounts", () => {
  it("counts each listing once per city, most first", () => {
    expect(cityCounts([["NYC", "New York, NY"], ["Chicago, IL"], ["New York, NY, United States"]])).toEqual([
      { city: "New York, NY", count: 2 },
      { city: "Chicago, IL", count: 1 },
    ]);
  });
});

describe("cityOptions", () => {
  it("puts cities with postings first, then the rest with no postings", () => {
    expect(cityOptions([{ city: "Chicago, IL", count: 3 }], ["New York, NY", "Chicago, IL", "Milwaukee, WI"])).toEqual([
      { city: "Chicago, IL", count: 3 },
      { city: "New York, NY", count: 0 },
      { city: "Milwaukee, WI", count: 0 },
    ]);
  });

  it("uses the same City, ST form as cityOf", () => {
    expect(usCities.length).toBeGreaterThan(3000);
    for (const c of usCities.slice(0, 200)) expect(cityOf(c)).toBe(c);
  });
});
