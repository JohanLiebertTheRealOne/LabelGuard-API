import type { ValidationRequest, Issue } from "../../domain/validation.js";
import { getAllergenVariations } from "../../services/validationService.js";
import type { RuleFunction } from "../engine.js";

/**
 * EU Rule: Allergens must be emphasized (bold/italic/caps) in ingredients list
 */
export const requiresAllergenEmphasis: RuleFunction = (request): Issue[] => {
  const issues: Issue[] = [];
  const labelText = request.labelText;

  // EU major allergens
  const majorAllergens = [
    "celery",
    "cereals containing gluten",
    "crustaceans",
    "eggs",
    "fish",
    "lupin",
    "milk",
    "molluscs",
    "mustard",
    "peanuts",
    "sesame",
    "soybeans",
    "sulphur dioxide",
    "tree nuts",
  ];

  // Check if allergens are mentioned but not emphasized
  for (const allergen of majorAllergens) {
    const variations = getAllergenVariations(allergen);
    for (const variation of variations) {
      const regex = new RegExp(`\\b${variation}\\b`, "i");
      if (regex.test(labelText)) {
        // Check if it's emphasized (bold, italic, caps, or in ALLERGENS list)
        const isEmphasized =
          labelText.includes(`**${variation}**`) ||
          labelText.includes(`*${variation}*`) ||
          labelText.includes(`_${variation}_`) ||
          variation.toUpperCase() === variation ||
          /allergens?:/i.test(labelText);

        if (!isEmphasized) {
          issues.push({
            id: "EU_ALLERGEN_NOT_EMPHASIZED",
            severity: "high",
            category: "allergen",
            message: `Allergen '${variation}' is mentioned but not clearly emphasized in the ingredients list.`,
            hint: "EU regulations require allergens to be emphasized (bold, italic, or in capitals) in the ingredients list.",
          });
          break;
        }
      }
    }
  }

  return issues;
};

/**
 * EU Rule: QUID declaration required for ingredients present at >2% or >5%
 */
export const requiresQUID: RuleFunction = (request): Issue[] => {
  const issues: Issue[] = [];
  const labelText = request.labelText.toLowerCase();

  // Check if QUID percentages are mentioned
  const hasQUID = /\d+%/.test(labelText) && /ingredients?:/i.test(request.labelText);

  if (!hasQUID) {
    issues.push({
      id: "EU_QUID_MISSING",
      severity: "low",
      category: "format",
      message: "QUID (Quantitative Ingredient Declaration) percentages not detected.",
      hint: "EU regulations may require QUID percentages for ingredients present at >2% or >5% of the finished product.",
    });
  }

  return issues;
};

/**
 * Export all EU rules
 */
export const euRules: RuleFunction[] = [requiresAllergenEmphasis, requiresQUID];
