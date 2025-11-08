import { describe, it, expect } from "vitest";
import { validateServingSize } from "../../src/services/servingSizeValidation.js";

describe("validateServingSize", () => {
  it("returns issue when serving size missing", () => {
    const issues = validateServingSize(undefined);
    expect(issues.map((issue) => issue.id)).toContain("SERVING_SIZE_MISSING");
  });

  it("flags invalid negative serving size", () => {
    const issues = validateServingSize({ value: -10, unit: "g" });
    expect(issues.map((issue) => issue.id)).toContain("SERVING_SIZE_INVALID");
  });

  it("allows valid serving size", () => {
    const issues = validateServingSize({ value: 30, unit: "g" });
    expect(issues.length).toBe(0);
  });
});

