import type { ValidationRequest, Issue } from "../../domain/validation.js";
import type { RuleFunction } from "../engine.js";

/**
 * FR Rule: Label text must be in French (or at least partially)
 */
export const requiresFrenchLanguage: RuleFunction = (request): Issue[] => {
  const issues: Issue[] = [];
  const labelText = request.labelText.toLowerCase();

  // Common French words in food labels
  const frenchKeywords = [
    "ingrédients",
    "ingrédient",
    "contenant",
    "contient",
    "allergènes",
    "valeurs nutritionnelles",
    "pour 100g",
    "matière grasse",
    "glucides",
    "protéines",
    "sel",
  ];

  const hasFrench = frenchKeywords.some((keyword) => labelText.includes(keyword));

  if (!hasFrench) {
    issues.push({
      id: "FR_FRENCH_LANGUAGE_REQUIRED",
      severity: "medium",
      category: "format",
      message: "Label does not appear to contain French text.",
      hint: "French regulations require labels to be in French. Include French translations for all mandatory information.",
    });
  }

  return issues;
};

/**
 * FR Rule: Nutri-Score should be present (voluntary but recommended)
 */
export const recommendsNutriScore: RuleFunction = (request): Issue[] => {
  const issues: Issue[] = [];
  const labelText = request.labelText.toLowerCase();

  const hasNutriScore =
    /nutri.?score/i.test(labelText) ||
    /nutriscore/i.test(labelText) ||
    /[a-e]/i.test(labelText.match(/nutri.?score[:\s]+([a-e])/i)?.[1] || "");

  if (!hasNutriScore) {
    issues.push({
      id: "FR_NUTRISCORE_RECOMMENDED",
      severity: "low",
      category: "format",
      message: "Nutri-Score not detected (voluntary but recommended).",
      hint: "While not mandatory, the Nutri-Score is strongly recommended in France to help consumers make healthier choices.",
    });
  }

  return issues;
};

/**
 * Export all FR rules (includes EU rules + FR-specific)
 */
export const frRules: RuleFunction[] = [requiresFrenchLanguage, recommendsNutriScore];
