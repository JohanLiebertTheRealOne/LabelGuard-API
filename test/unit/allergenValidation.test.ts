import { describe, it, expect } from "vitest";
import {
  detectAndValidateAllergens,
  inferAllergensFromText,
} from "../../src/services/allergenValidation.js";

describe("allergenValidation", () => {
  it("detects undeclared wheat from foreign language synonyms", () => {
    const result = detectAndValidateAllergens({
      labelText: "Ingrédients: farine de blé, eau, sel",
      declaredAllergens: [],
    });

    expect(result.detectedAllergens).toContain("wheat");
    expect(result.issues.some((issue) => issue.id === "ALLERGEN_MISSING")).toBe(true);
  });

  it("suppresses inferred wheat when contains statement declares none", () => {
    const result = detectAndValidateAllergens({
      labelText: "Produit Bio - Sans Gluten",
      declaredAllergens: [],
      containsStatement: "Contains: None (Gluten-Free)",
    });

    expect(result.issues.some((issue) => issue.id === "ALLERGEN_MISSING")).toBe(false);
  });

  it("infers allergens using NLP for Sans Gluten text", () => {
    const inferred = inferAllergensFromText({
      labelText: "Produit Bio - Sans Gluten",
    });

    expect(inferred.some((item) => item.name === "wheat")).toBe(true);
    const wheatNegated = inferred.find((item) => item.name === "wheat" && item.negated === true);
    expect(wheatNegated).toBeDefined();
  });
});

