import { describe, expect, it } from "vitest";
import { roleOf } from "../src/lib/roles";

describe("roleOf", () => {
  it("trusts the extracted role family over the title", () => {
    expect(roleOf("Software Engineer Intern", "data")).toBe("data");
  });

  it("falls back to the title when the role wasn't extracted or is other", () => {
    expect(roleOf("Machine Learning Software Engineer", null)).toBe("ml");
    expect(roleOf("Quantitative Developer", "other")).toBe("quant");
    expect(roleOf("Full Stack Engineer, New Grad", null)).toBe("fullstack");
    expect(roleOf("Data Analyst Intern", null)).toBe("data");
    expect(roleOf("Backend Engineer", null)).toBe("swe");
    expect(roleOf("Marketing Coordinator", null)).toBe("other");
  });

  it("doesn't read 'ai' inside other words", () => {
    expect(roleOf("Maintenance Planner", null)).toBe("other");
  });
});
