import { http, HttpResponse } from "msw";
import type { FoodSummary } from "../../src/domain/food.js";

/**
 * Mock USDA API responses for testing
 */

export const mockUSDASearchResponse = {
  totalHits: 2,
  foods: [
    {
      fdcId: 173430,
      description: "Yogurt, Greek, plain, lowfat",
      dataType: "SR Legacy",
      foodNutrients: [
        {
          nutrientId: 1008,
          nutrientName: "Energy",
          unitName: "kcal",
          value: 73,
        },
        {
          nutrientId: 1003,
          nutrientName: "Protein",
          unitName: "g",
          value: 10,
        },
        {
          nutrientId: 1004,
          nutrientName: "Total lipid (fat)",
          unitName: "g",
          value: 1.92,
        },
        {
          nutrientId: 1005,
          nutrientName: "Carbohydrate, by difference",
          unitName: "g",
          value: 3.87,
        },
      ],
      servingSize: 170,
      servingSizeUnit: "g",
    },
    {
      fdcId: 173431,
      description: "Yogurt, Greek, plain, whole milk",
      dataType: "SR Legacy",
      foodNutrients: [
        {
          nutrientId: 1008,
          nutrientName: "Energy",
          unitName: "kcal",
          value: 97,
        },
        {
          nutrientId: 1003,
          nutrientName: "Protein",
          unitName: "g",
          value: 9,
        },
        {
          nutrientId: 1004,
          nutrientName: "Total lipid (fat)",
          unitName: "g",
          value: 5,
        },
        {
          nutrientId: 1005,
          nutrientName: "Carbohydrate, by difference",
          unitName: "g",
          value: 3.6,
        },
      ],
      servingSize: 170,
      servingSizeUnit: "g",
    },
  ],
};

/**
 * Mock handler for USDA API search endpoint
 */
export const usdaSearchHandler = http.post(
  "https://api.nal.usda.gov/fdc/v1/foods/search",
  () => {
    return HttpResponse.json(mockUSDASearchResponse);
  }
);

/**
 * Helper to create mock food summaries
 */
export function createMockFood(overrides?: Partial<FoodSummary>): FoodSummary {
  return {
    fdcId: 173430,
    description: "Yogurt, Greek, plain, lowfat",
    dataType: "SR Legacy",
    servingSize: 170,
    servingSizeUnit: "g",
    caloriesKcal: 73,
    macros: {
      proteinG: 10,
      fatG: 1.92,
      carbsG: 3.87,
    },
    ...overrides,
  };
}
