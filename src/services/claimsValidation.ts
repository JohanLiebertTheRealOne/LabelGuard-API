import axios from "axios";
import { compareTwoStrings } from "string-similarity";
import type { FoodSummary } from "../domain/food.js";
import { SearchResponseSchema } from "../domain/food.js";
import type { Issue } from "../domain/validation.js";
import { CLAIM_THRESHOLDS } from "../domain/validation.js";
import { getConfig } from "../config/env.js";
import type { ServingSize } from "./servingSizeValidation.js";
import { mapUSDAFoodToSummary } from "./usdaService.js";

type MacroValue = {
  value?: number;
  unit?: string;
};

export type NutritionProfile = {
  protein?: MacroValue;
  fat?: MacroValue;
  carbs?: MacroValue;
  calories?: MacroValue;
};

export type MacroSnapshot = {
  proteinG?: number;
  fatG?: number;
  carbsG?: number;
  caloriesKcal?: number;
};

export type ClaimValidationInput = {
  claimTexts?: string[];
  macros?: MacroSnapshot;
  nutrition?: NutritionProfile;
};

export type ClaimValidationResult = {
  issues: Issue[];
};

export type FDCValidationInput = ClaimValidationInput & {
  referenceFoodQuery?: string;
  servingSize?: ServingSize;
  productName?: string;
  markets?: string[];
};

export type FDCValidationResult = ClaimValidationResult & {
  foods: FoodSummary[];
  chosenFood?: FoodSummary;
  macros?: MacroSnapshot;
  source: "fdc" | "fallback" | "input" | "none";
  warnings: string[];
};

const MACRO_FALLBACKS: Record<string, MacroSnapshot> = {
  "greek yogurt": { proteinG: 12, fatG: 4, carbsG: 6 },
  yogurt: { proteinG: 9, fatG: 4, carbsG: 9 },
};

const VALID_UNITS = new Set(["g", "gram", "grams", "oz", "ounce", "ounces"]);

function normalizeClaim(claim: string): string {
  return claim.trim().toLowerCase();
}

function toGrams(value?: number, unit?: string): number | undefined {
  if (value == null || Number.isNaN(value)) return undefined;
  const normalizedUnit = unit?.toLowerCase();
  if (!normalizedUnit || normalizedUnit === "g" || normalizedUnit === "gram" || normalizedUnit === "grams") {
    return value;
  }
  if (normalizedUnit === "mg" || normalizedUnit === "milligram" || normalizedUnit === "milligrams") {
    return value / 1000;
  }
  if (normalizedUnit === "oz" || normalizedUnit === "ounce" || normalizedUnit === "ounces") {
    return value * 28.3495;
  }
  return value;
}

function resolveMacros(input: ClaimValidationInput): MacroSnapshot {
  const macros: MacroSnapshot = { ...(input.macros || {}) };

  if (!macros.proteinG && input.nutrition?.protein) {
    macros.proteinG = toGrams(input.nutrition.protein.value, input.nutrition.protein.unit);
  }
  if (!macros.fatG && input.nutrition?.fat) {
    macros.fatG = toGrams(input.nutrition.fat.value, input.nutrition.fat.unit);
  }
  if (!macros.carbsG && input.nutrition?.carbs) {
    macros.carbsG = toGrams(input.nutrition.carbs.value, input.nutrition.carbs.unit);
  }
  if (!macros.caloriesKcal && input.nutrition?.calories?.value) {
    const unit = input.nutrition.calories.unit?.toLowerCase();
    const value = input.nutrition.calories.value;
    if (!unit || unit === "kcal" || unit === "cal") {
      macros.caloriesKcal = value;
    } else if (unit === "kj") {
      macros.caloriesKcal = value / 4.184;
    }
  }

  return macros;
}

export function validateClaims(input: ClaimValidationInput): Issue[] {
  const issues: Issue[] = [];
  const claims = (input.claimTexts || []).map(normalizeClaim);
  if (claims.length === 0) {
    return issues;
  }

  const macros = resolveMacros(input);

  const protein = macros.proteinG ?? 0;
  const fat = macros.fatG ?? 0;

  if (claims.includes("high protein")) {
    if (!macros.proteinG && !input.nutrition?.protein?.value) {
      issues.push({
        id: "CLAIM_HIGH_PROTEIN_DATA_MISSING",
        category: "claims",
        severity: "medium",
        message: "Claim 'high protein' cannot be validated: protein data missing.",
        hint: "Provide protein grams per serving.",
        regulationRef: "21 CFR 101.54",
      });
    } else if (protein < CLAIM_THRESHOLDS.HIGH_PROTEIN_MIN_G) {
      issues.push({
        id: "CLAIM_HIGH_PROTEIN_UNSUPPORTED",
        category: "claims",
        severity: "medium",
        message: `Claim 'high protein' unsupported: ${protein.toFixed(1)}g < 10g required.`,
        hint: "Ensure ≥10g protein per serving per 21 CFR 101.54.",
        regulationRef: "21 CFR 101.54",
      });
    }
  }

  if (claims.includes("low fat")) {
    if (!macros.fatG && !input.nutrition?.fat?.value) {
      issues.push({
        id: "CLAIM_LOW_FAT_DATA_MISSING",
        category: "claims",
        severity: "medium",
        message: "Claim 'low fat' cannot be validated: fat data missing.",
        hint: "Provide fat grams per serving.",
        regulationRef: "21 CFR 101.62(b)(2)",
      });
    } else if (fat >= CLAIM_THRESHOLDS.LOW_FAT_MAX_G) {
      issues.push({
        id: "CLAIM_LOW_FAT_UNSUPPORTED",
        category: "claims",
        severity: "medium",
        message: `Claim 'low fat' unsupported: ${fat.toFixed(1)}g ≥ 3g threshold.`,
        hint: "Reduce fat content to <3g per serving for 'low fat' claim.",
        regulationRef: "21 CFR 101.62(b)(2)",
      });
    }
  }

  return issues;
}

function scoreFood(options: {
  food: FoodSummary;
  productName?: string;
  servingSize?: ServingSize;
  claimTexts?: string[];
}): number {
  const { food, productName, servingSize, claimTexts } = options;
  let score = 0;

  if (productName) {
    const similarity = compareTwoStrings(productName.toLowerCase(), food.description.toLowerCase());
    score += similarity * 0.6;
  }

  if (servingSize?.value && VALID_UNITS.has(servingSize.unit?.toLowerCase() ?? "g") && food.servingSize) {
    const diff = Math.abs(food.servingSize - servingSize.value) / servingSize.value;
    const proximity = diff <= 0.2 ? 1 : Math.max(0, 1 - diff);
    score += proximity * 0.25;
  }

  const macros = food.macros || {};
  const macroCount = ["proteinG", "fatG", "carbsG"].reduce(
    (count, key) => (macros[key as keyof typeof macros] != null ? count + 1 : count),
    0
  );
  score += (macroCount / 3) * 0.15;

  if (claimTexts?.some((claim) => claim.toLowerCase() === "high protein")) {
    score += Math.min(1, (food.macros.proteinG ?? 0) / 20) * 0.2;
  }

  return score;
}

export function chooseBestFood(options: {
  foods: FoodSummary[];
  productName?: string;
  servingSize?: ServingSize;
  claimTexts?: string[];
}): { food?: FoodSummary; warnings: string[]; fallbackMacros?: MacroSnapshot } {
  if (!options.foods || options.foods.length === 0) {
    return { warnings: ["No foods returned from FDC search."] };
  }

  let bestFood: FoodSummary | undefined;
  let bestScore = -Infinity;

  for (const food of options.foods) {
    const score = scoreFood({
      food,
      productName: options.productName,
      servingSize: options.servingSize,
      claimTexts: options.claimTexts,
    });
    if (score > bestScore) {
      bestScore = score;
      bestFood = food;
    }
  }

  const warnings: string[] = [];
  let fallbackMacros: MacroSnapshot | undefined;

  if (bestFood) {
    const macros = bestFood.macros || {};
    const protein = macros.proteinG ?? 0;
    const fat = macros.fatG ?? 0;
    const carbs = macros.carbsG ?? 0;
    const macrosMissing = [protein, fat, carbs].every((value) => !value || value <= 0);

    if (macrosMissing) {
      warnings.push(
        `Chosen food ${bestFood.description} lacks macro data. Falling back to averages if available.`
      );
      const key = Object.keys(MACRO_FALLBACKS).find((name) =>
        (options.productName || options.foods[0].description).toLowerCase().includes(name)
      );
      if (key) {
        fallbackMacros = MACRO_FALLBACKS[key];
      }
    }
  }

  return { food: bestFood, warnings, fallbackMacros };
}

export async function fetchAndValidateFromFDC(input: FDCValidationInput): Promise<FDCValidationResult> {
  const issues: Issue[] = [];
  const warnings: string[] = [];

  if (!input.referenceFoodQuery) {
    const issuesFromClaims = validateClaims({
      claimTexts: input.claimTexts,
      macros: input.macros,
      nutrition: input.nutrition,
    });
    return {
      issues: issuesFromClaims,
      foods: [],
      chosenFood: undefined,
      macros: resolveMacros(input),
      source: input.macros ? "input" : "none",
      warnings,
    };
  }

  try {
    const config = getConfig();
    const endpoint = "https://api.nal.usda.gov/fdc/v1/foods/search";
    const { data } = await axios.get(endpoint, {
      params: {
        query: input.referenceFoodQuery,
        api_key: config.USDA_API_KEY,
        pageSize: 10,
      },
    });

    const parsed = SearchResponseSchema.parse(data);
    const foods = parsed.foods.map((food) => mapUSDAFoodToSummary(food));

    const selection = chooseBestFood({
      foods,
      productName: input.productName || input.referenceFoodQuery,
      servingSize: input.servingSize,
      claimTexts: input.claimTexts,
    });

    if (selection.warnings.length > 0) {
      warnings.push(...selection.warnings);
    }

    let macros = resolveMacros({
      ...input,
      macros: selection.food?.macros ?? input.macros,
    });

    if (selection.fallbackMacros) {
      macros = { ...selection.fallbackMacros, caloriesKcal: macros.caloriesKcal };
    }

    const claimIssues = validateClaims({
      claimTexts: input.claimTexts,
      macros,
      nutrition: input.nutrition,
    });

    return {
      issues: [...issues, ...claimIssues],
      foods,
      chosenFood: selection.food,
      macros,
      source: "fdc",
      warnings,
    };
  } catch (error) {
    warnings.push(
      error instanceof Error ? error.message : "Unknown error occurred while contacting FDC API."
    );

    const macros = resolveMacros(input);
    const fallbackIssues = validateClaims({
      claimTexts: input.claimTexts,
      macros,
      nutrition: input.nutrition,
    });

    issues.push({
      id: "FDC_LOOKUP_FAILED",
      category: "claims",
      severity: "low",
      message: "Unable to validate claims against USDA FoodData Central.",
      hint: "Check API key or provide explicit nutrition data.",
    });

    return {
      issues: [...issues, ...fallbackIssues],
      foods: [],
      chosenFood: undefined,
      macros,
      source: input.macros ? "input" : "fallback",
      warnings,
    };
  }
}

