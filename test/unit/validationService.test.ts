import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { validateLabel } from "../../src/services/validationService.js";
import type { FDCValidationResult } from "../../src/services/claimsValidation.js";

vi.mock("../../src/services/claimsValidation.js", () => ({
  fetchAndValidateFromFDC: vi.fn(),
}));

const { fetchAndValidateFromFDC } = await import("../../src/services/claimsValidation.js");
const mockedFetch = vi.mocked(fetchAndValidateFromFDC);

describe("validationService", () => {
  beforeEach(() => {
    mockedFetch.mockResolvedValue({
      issues: [],
      foods: [],
      chosenFood: undefined,
      macros: { proteinG: 15, fatG: 2, carbsG: 5 },
      source: "input",
      warnings: [],
    } satisfies FDCValidationResult);
  });

  afterEach(() => {
    mockedFetch.mockReset();
  });

  it("detects undeclared allergens", async () => {
    const report = await validateLabel({
      labelText: "Ingredients: milk, sugar, vanilla extract",
      declaredAllergens: [],
    });

    expect(report.valid).toBe(false);
    expect(report.issues.some((issue) => issue.id === "ALLERGEN_MISSING")).toBe(true);
    expect(report.summary.allergensFound).toContain("milk");
  });

  it("respects contains statement declarations", async () => {
    const report = await validateLabel({
      labelText: "Ingredients: milk, sugar",
      declaredAllergens: [],
      containsStatement: "Contains: Milk",
    });

    const allergenIssues = report.issues.filter((issue) => issue.id === "ALLERGEN_MISSING");
    expect(allergenIssues.length).toBe(0);
  });

  it("flags invalid serving size values", async () => {
    const report = await validateLabel({
      labelText: "Ingredients: milk",
      servingSize: { value: 0, unit: "g" },
    });

    expect(report.issues.some((issue) => issue.id === "SERVING_SIZE_INVALID")).toBe(true);
  });
});

