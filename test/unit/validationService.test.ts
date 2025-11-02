import { describe, it, expect } from "vitest";
import { validateLabel } from "../../src/services/validationService.js";
import type { FoodSummary } from "../../src/domain/food.js";

describe("validationService", () => {
  it("should detect undeclared allergens", () => {
    const report = validateLabel({
      labelText: "Ingredients: milk, sugar, vanilla extract",
      declaredAllergens: [],
    });

    expect(report.valid).toBe(false);
    expect(report.issues.some((i) => i.id === "ALLERGEN_MISSING")).toBe(true);
    expect(report.summary.allergensFound).toContain("milk");
  });

  it("should not flag declared allergens", () => {
    const report = validateLabel({
      labelText: "Ingredients: milk, sugar",
      declaredAllergens: ["milk"],
    });

    const allergenIssues = report.issues.filter((i) => i.category === "allergen");
    expect(allergenIssues.length).toBe(0);
  });

  it("should flag missing serving size", () => {
    const report = validateLabel({
      labelText: "Ingredients: milk",
    });

    expect(report.issues.some((i) => i.id === "SERVING_SIZE_MISSING")).toBe(true);
  });

  it("should validate high protein claim", () => {
    const contextFood: FoodSummary = {
      fdcId: 1,
      description: "Test",
      dataType: "SR Legacy",
      macros: {
        proteinG: 5, // Too low for "high protein"
      },
    };

    const report = validateLabel({
      labelText: "High protein food",
      servingSize: { value: 100, unit: "g" },
      claimTexts: ["high protein"],
      contextFoods: [contextFood],
    });

    expect(report.issues.some((i) => i.id === "CLAIM_HIGH_PROTEIN_UNSUPPORTED")).toBe(true);
  });

  it("should validate low fat claim", () => {
    const contextFood: FoodSummary = {
      fdcId: 1,
      description: "Test",
      dataType: "SR Legacy",
      macros: {
        fatG: 10, // Too high for "low fat"
      },
    };

    const report = validateLabel({
      labelText: "Low fat food",
      servingSize: { value: 100, unit: "g" },
      claimTexts: ["low fat"],
      contextFoods: [contextFood],
    });

    expect(report.issues.some((i) => i.id === "CLAIM_LOW_FAT_UNSUPPORTED")).toBe(true);
  });

  it("should pass validation for valid label", () => {
    const contextFood: FoodSummary = {
      fdcId: 1,
      description: "Test",
      dataType: "SR Legacy",
      macros: {
        proteinG: 15,
        fatG: 2,
      },
    };

    const report = validateLabel({
      labelText: "Ingredients: milk. Contains: milk",
      declaredAllergens: ["milk"],
      servingSize: { value: 100, unit: "g" },
      claimTexts: ["high protein", "low fat"],
      contextFoods: [contextFood],
    });

    expect(report.valid).toBe(true);
    expect(report.issues.length).toBe(0);
  });

  it("should flag missing Contains section when allergens present", () => {
    const report = validateLabel({
      labelText: "Ingredients: milk, sugar",
      declaredAllergens: ["milk"],
    });

    expect(report.issues.some((i) => i.id === "CONTAINS_SECTION_MISSING")).toBe(true);
  });
});

