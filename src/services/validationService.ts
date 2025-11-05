import type { FoodSummary } from "../domain/food.js";
import type { Issue, ValidationReport } from "../domain/validation.js";
import { CLAIM_THRESHOLDS, MAJOR_US_ALLERGENS } from "../domain/validation.js";
import { getMessage } from "../i18n/messages.js";

/**
 * Validate a food label for compliance issues
 * @param input - Validation input with label text and optional context
 * @returns Validation report with issues and summary
 */
export function validateLabel(input: {
  labelText: string;
  markets?: string[];
  declaredAllergens?: string[];
  servingSize?: { value: number; unit: string };
  claimTexts?: string[];
  contextFoods?: FoodSummary[];
}): ValidationReport {
  const issues: Issue[] = [];
  const lowerText = input.labelText.toLowerCase();

  // Detect allergens in label text
  const allergensFound: string[] = [];
  const declaredSet = new Set((input.declaredAllergens || []).map((a) => a.toLowerCase().trim()));

  // Check each major allergen
  for (const allergen of MAJOR_US_ALLERGENS) {
    const variations = getAllergenVariations(allergen);
    const found = variations.some((variant) => lowerText.includes(variant.toLowerCase()));

    if (found) {
      allergensFound.push(allergen);
      const isDeclared = Array.from(declaredSet).some(
        (declared) => declared.includes(allergen) || allergen.includes(declared)
      );

      if (!isDeclared) {
        issues.push({
          id: "ALLERGEN_MISSING",
          category: "allergen",
          severity: "high",
          message: getMessage("en", "ALLERGEN_MISSING", allergen),
          hint: getMessage("en", "ALLERGEN_MISSING_HINT"),
          regulationRef: "US 21 CFR 101.4; FALCPA",
        });
      }
    }
  }

  // Check serving size presence
  if (!input.servingSize) {
    issues.push({
      id: "SERVING_SIZE_MISSING",
      category: "serving",
      severity: "medium",
      message: getMessage("en", "SERVING_SIZE_MISSING"),
      hint: getMessage("en", "SERVING_SIZE_MISSING_HINT"),
      regulationRef: "US 21 CFR 101.9",
    });
  } else {
    // Check for uncommon serving size units (non-SI)
    const unit = input.servingSize.unit.toLowerCase().trim();
    const commonUnits = ["g", "gram", "grams", "ml", "milliliter", "milliliters", "oz", "ounce", "fl oz"];
    const isCommon = commonUnits.some((common) => unit.includes(common));

    if (!isCommon) {
      issues.push({
        id: "SERVING_SIZE_UNIT_UNCOMMON",
        category: "serving",
        severity: "low",
        message: getMessage("en", "SERVING_SIZE_UNIT_UNCOMMON", input.servingSize.unit),
        hint: getMessage("en", "SERVING_SIZE_UNIT_UNCOMMON_HINT"),
      });
    }
  }

  // Claims plausibility checks (use first context food if available)
  const claimSet = new Set((input.claimTexts || []).map((c) => c.toLowerCase().trim()));
  const refFood = input.contextFoods?.[0];

  if (refFood) {
    // High protein claim
    if (claimSet.has("high protein")) {
      const proteinG = refFood.macros.proteinG ?? 0;
      if (proteinG < CLAIM_THRESHOLDS.HIGH_PROTEIN_MIN_G) {
        issues.push({
          id: "CLAIM_HIGH_PROTEIN_UNSUPPORTED",
          category: "claims",
          severity: "medium",
          message: getMessage("en", "CLAIM_HIGH_PROTEIN_UNSUPPORTED", proteinG.toString()),
          hint: getMessage("en", "CLAIM_HIGH_PROTEIN_UNSUPPORTED_HINT"),
        });
      }
    }

    // Low fat claim
    if (claimSet.has("low fat")) {
      const fatG = refFood.macros.fatG ?? 0;
      if (fatG > CLAIM_THRESHOLDS.LOW_FAT_MAX_G) {
        issues.push({
          id: "CLAIM_LOW_FAT_UNSUPPORTED",
          category: "claims",
          severity: "medium",
          message: getMessage("en", "CLAIM_LOW_FAT_UNSUPPORTED", fatG.toString()),
          hint: getMessage("en", "CLAIM_LOW_FAT_UNSUPPORTED_HINT"),
        });
      }
    }

    // Sugar free claim
    if (claimSet.has("sugar free") || claimSet.has("sugar-free")) {
      const carbsG = refFood.macros.carbsG ?? 0;
      if (carbsG > CLAIM_THRESHOLDS.SUGAR_FREE_MAX_G) {
        issues.push({
          id: "CLAIM_SUGAR_FREE_UNSUPPORTED",
          category: "claims",
          severity: "medium",
          message: getMessage("en", "CLAIM_SUGAR_FREE_UNSUPPORTED", carbsG.toString()),
          hint: getMessage("en", "CLAIM_SUGAR_FREE_UNSUPPORTED_HINT"),
        });
      }
    }
  }

  // Formatting checks
  const hasIngredients = lowerText.includes("ingredients") || lowerText.includes("ingredient");
  const hasContains = lowerText.includes("contains:") || lowerText.includes("contains");

  if (hasIngredients && !hasContains && allergensFound.length > 0) {
    issues.push({
      id: "CONTAINS_SECTION_MISSING",
      category: "format",
      severity: "low",
      message: getMessage("en", "CONTAINS_SECTION_MISSING"),
      hint: getMessage("en", "CONTAINS_SECTION_MISSING_HINT"),
    });
  }

  return {
    valid: issues.length === 0,
    issues,
    summary: {
      allergensFound: allergensFound.length > 0 ? allergensFound : undefined,
      totalIssues: issues.length,
    },
    context: input.contextFoods && input.contextFoods.length > 0
      ? {
          foods: input.contextFoods,
          chosen: input.contextFoods[0],
        }
      : undefined,
  };
}

/**
 * Get allergen name variations for detection
 */
export function getAllergenVariations(allergen: string): string[] {
  const variations: Record<string, string[]> = {
    milk: ["milk", "dairy", "lactose", "whey", "casein"],
    egg: ["egg", "eggs", "albumin", "lecithin"],
    fish: ["fish", "anchovy", "tuna", "salmon"],
    "crustacean shellfish": ["shellfish", "shrimp", "crab", "lobster", "crustacean"],
    "tree nut": ["tree nut", "almond", "walnut", "pecan", "cashew", "hazelnut", "pistachio"],
    peanut: ["peanut", "groundnut"],
    wheat: ["wheat", "gluten", "flour"],
    soy: ["soy", "soya", "soybean", "tofu"],
    sesame: ["sesame", "tahini", "sesame seed"],
  };

  return variations[allergen.toLowerCase()] || [allergen];
}

