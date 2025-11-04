import { z } from "zod";
import type { FoodSummary, SearchParams, SearchResult } from "../domain/food.js";
import { FoodSchema, SearchResponseSchema } from "../domain/food.js";
import { HttpError, HttpErrors } from "../utils/http.js";
import { getConfig } from "../config/env.js";
import { getCacheProvider } from "../cache/index.js";
import stringify from "fast-json-stable-stringify";
import { USDAClient } from "../http/usdaClient.js";

const USDA_URL = "https://api.nal.usda.gov/fdc/v1/foods/search";
const REQUEST_TIMEOUT_MS = 8000;

// Global USDA client instance
let usdaClient: USDAClient | null = null;

/**
 * Nutrient number to name mapping
 */
const nutrientNumberToName: Record<string, string> = {
  "1003": "Protein",
  "1004": "Total lipid",
  "1005": "Carbohydrate",
  "1008": "Energy",
};

/**
 * Convert energy value to kcal
 * Handles kJ to kcal conversion (1 kcal = 4.184 kJ)
 */
function toKcal(value: number | undefined, unitName: string | undefined): number | undefined {
  if (value == null || isNaN(value)) return undefined;

  const unit = (unitName || "").toLowerCase().trim();
  if (unit === "kcal" || unit === "cal") {
    return round(value);
  }
  if (unit === "kj" || unit === "kilojoule") {
    return round(value / 4.184);
  }

  // Default assumption: if no unit, treat as kcal
  return round(value);
}

/**
 * Convert value to grams
 * Handles mg to g conversion
 */
function toGrams(value: number | undefined, unitName: string | undefined): number | undefined {
  if (value == null || isNaN(value)) return undefined;

  const unit = (unitName || "").toLowerCase().trim();
  if (unit === "g" || unit === "gram" || unit === "grams") {
    return round(value);
  }
  if (unit === "mg" || unit === "milligram") {
    return round(value / 1000);
  }

  // Default assumption: if no unit, treat as grams
  return round(value);
}

/**
 * Round to 2 decimal places
 */
function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Extract nutrient by number or name pattern
 */
function findNutrient(
  nutrients: z.infer<typeof FoodSchema>["foodNutrients"],
  number: string,
  namePattern?: string
) {
  if (!nutrients) return undefined;

  return nutrients.find((nutrient) => {
    // Match by nutrient number first (most reliable)
    if (nutrient.number === number) return true;
    
    // If we have a name pattern, check against nutrient name
    if (namePattern && nutrient.name) {
      const name = nutrient.name.toLowerCase();
      return name.includes(namePattern.toLowerCase());
    }
    
    // Try to match by expected name for this nutrient number
    const expectedName = nutrientNumberToName[number];
    if (expectedName && nutrient.name) {
      const nutrientName = nutrient.name.toLowerCase();
      return nutrientName.includes(expectedName.toLowerCase());
    }
    
    return false;
  });
}

/**
 * Map USDA Food to clean FoodSummary
 */
function mapFood(food: z.infer<typeof FoodSchema>): FoodSummary {
  const nutrients = food.foodNutrients || [];

  // Extract energy (calories)
  const energyNutrient =
    findNutrient(nutrients, "1008", "energy") ||
    nutrients.find((n) => {
      const name = (n.name || "").toLowerCase();
      return name.includes("energy") && (name.includes("kcal") || name.includes("cal"));
    });
  const caloriesKcal = energyNutrient
    ? toKcal(energyNutrient.value, energyNutrient.unitName)
    : undefined;

  // Extract macros by nutrient number
  const proteinNutrient = findNutrient(nutrients, "1003");
  const fatNutrient = findNutrient(nutrients, "1004");
  const carbsNutrient = findNutrient(nutrients, "1005");

  return {
    fdcId: food.fdcId,
    description: food.description,
    brandOwner: food.brandOwner,
    gtinUpc: food.gtinUpc,
    dataType: food.dataType,
    servingSize: food.servingSize,
    servingSizeUnit: food.servingSizeUnit,
    caloriesKcal,
    macros: {
      proteinG: toGrams(proteinNutrient?.value, proteinNutrient?.unitName),
      fatG: toGrams(fatNutrient?.value, fatNutrient?.unitName),
      carbsG: toGrams(carbsNutrient?.value, carbsNutrient?.unitName),
    },
  };
}

/**
 * Generate normalized cache key from search params
 */
function getCacheKey(params: SearchParams): string {
  // Normalize params for consistent cache keys
  const normalized = {
    q: (params.q || "").trim().toLowerCase(),
    limit: params.limit || 10,
    dataType: params.dataType?.sort().join(",") || "",
  };
  const keyStr = stringify(normalized);
  return `usda:search:${Buffer.from(keyStr).toString("base64url")}`;
}

/**
 * Get or create USDA client instance
 */
function getUSDAClient(): USDAClient {
  if (!usdaClient) {
    const config = getConfig();
    usdaClient = new USDAClient(USDA_URL, config.USDA_API_KEY);
  }
  return usdaClient;
}

/**
 * Search foods in USDA FoodData Central
 * Uses application cache to reduce API calls
 * Uses resilient HTTP client with retry and circuit breaker
 * @param params - Search parameters
 * @param abortSignal - Optional AbortSignal for request cancellation
 * @returns Search results with items and metadata
 * @throws {HttpError} On upstream errors or timeouts
 */
export async function searchFoods(
  params: SearchParams,
  abortSignal?: AbortSignal
): Promise<SearchResult> {
  const config = getConfig();
  const cache = getCacheProvider(config);
  const cacheKey = getCacheKey(params);

  // Try cache first
  const cached = await cache.get<SearchResult>(cacheKey);
  if (cached) {
    return cached;
  }

  // Cache miss: fetch from USDA API using resilient client
  try {
    const client = getUSDAClient();
    const requestBody = {
      query: params.q,
      pageSize: params.limit,
      ...(params.dataType && params.dataType.length > 0 && { dataType: params.dataType }),
      requireAllWords: false,
    };

    const json = await client.post("/foods/search", requestBody, abortSignal, REQUEST_TIMEOUT_MS);
    const parsed = SearchResponseSchema.parse(json);

    const items = parsed.foods.map(mapFood);

    const result: SearchResult = {
      items,
      meta: {
        totalHits: parsed.totalHits,
        limit: params.limit,
      },
    };

    // Store in cache (use config TTL)
    await cache.set(cacheKey, result, config.CACHE_TTL_MS);

    return result;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw HttpErrors.badGateway(
        "Invalid response from USDA API",
        `Schema validation failed: ${error.message}`
      );
    }

    // Re-throw HttpError instances
    if (error instanceof HttpError) {
      throw error;
    }

    if (error instanceof Error) {
      throw HttpErrors.badGateway("Failed to fetch food data", error.message);
    }

    throw HttpErrors.badGateway("Unknown error occurred while fetching food data");
  }
}

