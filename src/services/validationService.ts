import type { FoodSummary } from "../domain/food.js";
import type { Issue, ValidationReport } from "../domain/validation.js";
import { detectAndValidateAllergens, getAllergenVariations } from "./allergenValidation.js";
import { validateServingSize } from "./servingSizeValidation.js";
import {
  fetchAndValidateFromFDC,
  type FDCValidationResult,
  type MacroSnapshot,
} from "./claimsValidation.js";
import { applyMarketRegulations } from "./marketRegulations.js";

type LabelValidationInput = {
  labelText: string;
  markets?: string[];
  declaredAllergens?: string[];
  allergens?: string[];
  ingredients?: string | string[];
  containsStatement?: string;
  servingSize?: { value?: number; unit?: string };
  claimTexts?: string[];
  referenceFoodQuery?: string;
  productName?: string;
  nutrition?: {
    protein?: { value?: number; unit?: string };
    fat?: { value?: number; unit?: string };
    carbs?: { value?: number; unit?: string };
    calories?: { value?: number; unit?: string };
  };
  contextFoods?: FoodSummary[];
  glutenFree?: boolean;
};

function dedupeIssues(issues: Issue[]): Issue[] {
  const seen = new Set<string>();
  const result: Issue[] = [];
  for (const issue of issues) {
    const key = `${issue.id}:${issue.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(issue);
  }
  return result;
}

function mergeContextFoods(existing: FoodSummary[] | undefined, fdc: FDCValidationResult): {
  foods?: FoodSummary[];
  chosen?: FoodSummary;
  warnings?: string[];
} {
  const foods = fdc.foods.length > 0 ? fdc.foods : existing;
  const chosen = fdc.chosenFood ?? foods?.[0];
  const warnings = fdc.warnings.length > 0 ? fdc.warnings : undefined;
  if (foods && foods.length > 0) {
    return {
      foods,
      chosen,
      warnings,
    };
  }
  if (existing && existing.length > 0) {
    return {
      foods: existing,
      chosen: existing[0],
      warnings,
    };
  }
  return warnings ? { warnings } : {};
}

function resolveMacros(result: FDCValidationResult, contextFoods?: FoodSummary[]): MacroSnapshot {
  if (result.macros) {
    return result.macros;
  }
  const fallback = contextFoods?.[0]?.macros;
  return fallback ?? {};
}

/**
 * Validate a food label for compliance issues
 */
export async function validateLabel(input: LabelValidationInput): Promise<ValidationReport> {
  const issues: Issue[] = [];

  const allergenResult = detectAndValidateAllergens({
    labelText: input.labelText,
    ingredients: input.ingredients,
    declaredAllergens: input.declaredAllergens,
    allergens: input.allergens,
    containsStatement: input.containsStatement,
    glutenFree: input.glutenFree,
  });
  issues.push(...allergenResult.issues);

  const servingIssues = validateServingSize(input.servingSize);
  issues.push(...servingIssues);

  const fdcResult = await fetchAndValidateFromFDC({
    claimTexts: input.claimTexts,
    referenceFoodQuery: input.referenceFoodQuery,
    servingSize: input.servingSize,
    productName: input.productName,
    macros: input.contextFoods?.[0]?.macros,
    nutrition: input.nutrition,
  });
  issues.push(...fdcResult.issues);

  const macros = resolveMacros(fdcResult, input.contextFoods);
  const marketIssues = applyMarketRegulations({
    markets: input.markets,
    claims: input.claimTexts,
    macros,
  });
  issues.push(...marketIssues);

  const dedupedIssues = dedupeIssues(issues);
  const context = mergeContextFoods(input.contextFoods, fdcResult);

  const report: ValidationReport = {
    valid: dedupedIssues.length === 0,
    issues: dedupedIssues,
    summary: {
      allergensFound:
        allergenResult.detectedAllergens.length > 0 ? allergenResult.detectedAllergens : undefined,
      totalIssues: dedupedIssues.length,
    },
    context: context.foods
      ? {
          foods: context.foods,
          chosen: context.chosen,
          warnings: context.warnings,
        }
      : context.warnings
      ? {
          foods: [],
          warnings: context.warnings,
        }
      : undefined,
  };

  return report;
}

export { getAllergenVariations };

