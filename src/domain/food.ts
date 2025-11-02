import { z } from "zod";

/**
 * Nutrient schema from USDA API
 * Note: USDA API sometimes returns nutrients without a name field
 */
export const NutrientSchema = z.object({
  number: z.string().optional(),
  name: z.string().optional(),
  unitName: z.string().optional(),
  value: z.number().optional(),
  nutrientId: z.number().optional(),
});

/**
 * Food item schema from USDA API
 */
export const FoodSchema = z.object({
  fdcId: z.number(),
  description: z.string(),
  brandOwner: z.string().optional(),
  dataType: z.string(),
  gtinUpc: z.string().optional(),
  servingSize: z.number().optional(),
  servingSizeUnit: z.string().optional(),
  foodNutrients: z.array(NutrientSchema).optional(),
});

/**
 * USDA Search API response schema
 */
export const SearchResponseSchema = z.object({
  totalHits: z.number().default(0),
  foods: z.array(FoodSchema).default([]),
  currentPage: z.number().optional(),
  totalPages: z.number().optional(),
});

/**
 * Clean FoodSummary type for API responses
 */
export type FoodSummary = {
  fdcId: number;
  description: string;
  brandOwner?: string;
  gtinUpc?: string;
  dataType: string;
  servingSize?: number;
  servingSizeUnit?: string;
  caloriesKcal?: number;
  macros: {
    proteinG?: number;
    fatG?: number;
    carbsG?: number;
  };
};

/**
 * Search result with metadata
 */
export type SearchResult = {
  items: FoodSummary[];
  meta: {
    totalHits: number;
    limit: number;
  };
};

/**
 * USDA API search parameters
 */
export type SearchParams = {
  q: string;
  limit: number;
  dataType?: string[];
};

