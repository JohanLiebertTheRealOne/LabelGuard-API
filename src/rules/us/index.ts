import type { ValidationRequest, Issue } from "../../domain/validation.js";
import { getAllergenVariations } from "../../services/validationService.js";
import type { RuleFunction } from "../engine.js";

/**
 * US Rule: Requires explicit "Contains:" section for major allergens
 */
export const requiresContainsSection: RuleFunction = (request): Issue[] => {
  const issues: Issue[] = [];
  const labelText = request.labelText.toLowerCase();

  // Check if ingredients section exists
  const hasIngredients = /ingredients?:/i.test(request.labelText);
  
  // Check if Contains section exists
  const hasContains = /contains?:/i.test(request.labelText);

  // Major allergens in US
  const majorAllergens = ["milk", "eggs", "fish", "shellfish", "tree nuts", "peanuts", "wheat", "soybeans"];

  // Detect allergens in label text
  const detectedAllergens: string[] = [];
  for (const allergen of majorAllergens) {
    const variations = getAllergenVariations(allergen);
    for (const variation of variations) {
      if (labelText.includes(variation.toLowerCase())) {
        detectedAllergens.push(allergen);
        break;
      }
    }
  }

  if (hasIngredients && detectedAllergens.length > 0 && !hasContains) {
    issues.push({
      id: "US_CONTAINS_SECTION_MISSING",
      severity: "low",
      category: "format",
      message: "Ingredients list found but no explicit 'Contains:' allergen statement.",
      hint: "US regulations recommend (and may require) an explicit 'Contains:' section listing major allergens present.",
    });
  }

  return issues;
};

/**
 * US Rule: Serving size must be in standard units
 */
export const validateServingSize: RuleFunction = (request): Issue[] => {
  const issues: Issue[] = [];

  if (request.servingSize) {
    const { value, unit } = request.servingSize;
    const unitLower = unit.toLowerCase();

    // US standard units
    const validUnits = ["g", "kg", "ml", "l", "oz", "fl oz", "cup", "tbsp", "tsp"];

    if (!validUnits.includes(unitLower)) {
      issues.push({
        id: "US_INVALID_SERVING_SIZE_UNIT",
        severity: "medium",
        category: "serving",
        message: `Serving size unit '${unit}' may not be a standard US unit.`,
        hint: "Use standard US units: g, kg, ml, l, oz, fl oz, cup, tbsp, tsp",
      });
    }

    // Serving size should be reasonable
    if (unitLower === "g" && (value < 1 || value > 1000)) {
      issues.push({
        id: "US_UNUSUAL_SERVING_SIZE",
        severity: "low",
        category: "serving",
        message: `Serving size of ${value}${unit} seems unusual.`,
        hint: "Verify that the serving size is correct and reasonable.",
      });
    }
  }

  return issues;
};

/**
 * US Rule: Nutrition facts panel required
 */
export const requiresNutritionFacts: RuleFunction = (request): Issue[] => {
  const issues: Issue[] = [];
  const labelText = request.labelText.toLowerCase();

  const nutritionKeywords = [
    "nutrition facts",
    "nutrition information",
    "nutritional information",
    "calories",
    "total fat",
    "sodium",
    "total carbohydrate",
    "protein",
  ];

  const hasNutritionInfo = nutritionKeywords.some((keyword) => labelText.includes(keyword));

  if (!hasNutritionInfo) {
    issues.push({
      id: "US_NUTRITION_FACTS_MISSING",
      severity: "high",
      category: "format",
      message: "Nutrition Facts panel not detected in label text.",
      hint: "US regulations require a Nutrition Facts panel for most packaged foods.",
    });
  }

  return issues;
};

/**
 * Export all US rules
 */
export const usRules: RuleFunction[] = [
  requiresContainsSection,
  validateServingSize,
  requiresNutritionFacts,
];
