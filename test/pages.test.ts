import { describe, expect, it } from "vitest";
import { pageNumbers } from "../src/lib/pages";

describe("pageNumbers", () => {
  it("lists every page when there are 7 or fewer", () => {
    expect(pageNumbers(1, 1)).toEqual([1]);
    expect(pageNumbers(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("collapses the far end near the start", () => {
    expect(pageNumbers(1, 12)).toEqual([1, 2, 3, 4, 5, null, 12]);
    expect(pageNumbers(4, 12)).toEqual([1, 2, 3, 4, 5, null, 12]);
  });

  it("collapses both sides in the middle", () => {
    expect(pageNumbers(6, 12)).toEqual([1, null, 5, 6, 7, null, 12]);
  });

  it("collapses the near end near the last page", () => {
    expect(pageNumbers(12, 12)).toEqual([1, null, 8, 9, 10, 11, 12]);
    expect(pageNumbers(9, 12)).toEqual([1, null, 8, 9, 10, 11, 12]);
  });
});
