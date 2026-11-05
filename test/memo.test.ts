import { beforeEach, describe, expect, it } from "vitest";
import { clearMemo, memo } from "../src/lib/memo";

describe("memo", () => {
  beforeEach(clearMemo);

  it("loads once within the time limit, then again after it", async () => {
    let t = 0;
    let loads = 0;
    const load = async () => ++loads;
    expect(await memo("k", 1000, load, () => t)).toBe(1);
    t = 999;
    expect(await memo("k", 1000, load, () => t)).toBe(1);
    t = 1000;
    expect(await memo("k", 1000, load, () => t)).toBe(2);
  });

  it("shares one load between requests that arrive while it runs", async () => {
    let loads = 0;
    const load = () => new Promise<number>((r) => setTimeout(() => r(++loads), 5));
    const [a, b] = await Promise.all([memo("k", 1000, load), memo("k", 1000, load)]);
    expect([a, b, loads]).toEqual([1, 1, 1]);
  });

  it("drops a failed load so the next request retries", async () => {
    await expect(memo("k", 1000, async () => Promise.reject(new Error("down")))).rejects.toThrow("down");
    expect(await memo("k", 1000, async () => 7)).toBe(7);
  });
});
