import type { Issue } from "../domain/validation.js";

const VALID_UNITS = new Set([
  "g",
  "gram",
  "grams",
  "kg",
  "ml",
  "milliliter",
  "milliliters",
  "l",
  "oz",
  "ounce",
  "ounces",
  "fl oz",
  "cup",
  "cups",
  "tbsp",
 "tsp",
  "slice",
]);

export type ServingSize = {
  value?: number;
  unit?: string;
};

export function validateServingSize(servingSize?: ServingSize): Issue[] {
  const issues: Issue[] = [];

  if (!servingSize) {
    issues.push({
      id: "SERVING_SIZE_MISSING",
      category: "serving",
      severity: "medium",
      message: "Serving size is required for nutrition labeling.",
      hint: "Provide serving size with value and unit per 21 CFR 101.9.",
      regulationRef: "US 21 CFR 101.9",
    });
    return issues;
  }

  const value = servingSize.value;
  const unit = servingSize.unit?.trim().toLowerCase();

  if (value == null || isNaN(value) || value <= 0) {
    issues.push({
      id: "SERVING_SIZE_INVALID",
      category: "nutrition",
      severity: "medium",
      message: "Serving size must be positive and have a valid unit.",
      hint: "Use positive number and units like 'g' or 'ml'.",
      regulationRef: "US 21 CFR 101.9",
    });
  }

  if (!unit) {
    issues.push({
      id: "SERVING_SIZE_UNIT_MISSING",
      category: "serving",
      severity: "medium",
      message: "Serving size unit is required.",
      hint: "Common units include 'g', 'ml', 'cup'.",
      regulationRef: "US 21 CFR 101.9",
    });
  } else if (!VALID_UNITS.has(unit)) {
    issues.push({
      id: "SERVING_SIZE_UNIT_INVALID",
      category: "serving",
      severity: "low",
      message: `Serving size unit '${servingSize.unit}' is not recognized.`,
      hint: "Use SI units such as g, ml, or customary units like cup.",
    });
  }

  return issues;
}

