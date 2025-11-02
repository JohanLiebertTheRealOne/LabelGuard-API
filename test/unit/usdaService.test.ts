import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchFoods } from "../../src/services/usdaService.js";
import { loadConfig } from "../../src/config/env.js";

// Mock environment
vi.mock("../../src/config/env.js", () => ({
  loadConfig: vi.fn(() => ({
    USDA_API_KEY: "test-api-key",
  })),
  getConfig: vi.fn(() => ({
    USDA_API_KEY: "test-api-key",
  })),
}));

// Mock fetch globally
global.fetch = vi.fn();

describe("usdaService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should map foods correctly with kcal energy", async () => {
    const mockResponse = {
      totalHits: 1,
      foods: [
        {
          fdcId: 173430,
          description: "Test Food",
          dataType: "SR Legacy",
          servingSize: 100,
          servingSizeUnit: "g",
          foodNutrients: [
            {
              number: "1008",
              name: "Energy",
              unitName: "kcal",
              value: 100,
            },
            {
              number: "1003",
              name: "Protein",
              unitName: "g",
              value: 10,
            },
            {
              number: "1004",
              name: "Total lipid (fat)",
              unitName: "g",
              value: 5,
            },
            {
              number: "1005",
              name: "Carbohydrate, by difference",
              unitName: "g",
              value: 15,
            },
          ],
        },
      ],
    };

    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await searchFoods({ q: "test", limit: 10 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      fdcId: 173430,
      description: "Test Food",
      caloriesKcal: 100,
      macros: {
        proteinG: 10,
        fatG: 5,
        carbsG: 15,
      },
    });
    expect(result.meta.totalHits).toBe(1);
  });

  it("should convert kJ to kcal", async () => {
    const mockResponse = {
      totalHits: 1,
      foods: [
        {
          fdcId: 1,
          description: "Test Food",
          dataType: "SR Legacy",
          foodNutrients: [
            {
              number: "1008",
              name: "Energy",
              unitName: "kJ",
              value: 418.4, // 100 kcal
            },
          ],
        },
      ],
    };

    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await searchFoods({ q: "test", limit: 10 });

    expect(result.items[0].caloriesKcal).toBeCloseTo(100, 1);
  });

  it("should convert mg to grams for macros", async () => {
    const mockResponse = {
      totalHits: 1,
      foods: [
        {
          fdcId: 1,
          description: "Test Food",
          dataType: "SR Legacy",
          foodNutrients: [
            {
              number: "1003",
              name: "Protein",
              unitName: "mg",
              value: 10000, // 10g
            },
          ],
        },
      ],
    };

    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await searchFoods({ q: "test", limit: 10 });

    expect(result.items[0].macros.proteinG).toBeCloseTo(10, 1);
  });

  it("should return empty array if no foods", async () => {
    const mockResponse = {
      totalHits: 0,
      foods: [],
    };

    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await searchFoods({ q: "nonexistent", limit: 10 });

    expect(result.items).toHaveLength(0);
    expect(result.meta.totalHits).toBe(0);
  });

  it("should omit undefined fields", async () => {
    const mockResponse = {
      totalHits: 1,
      foods: [
        {
          fdcId: 1,
          description: "Test Food",
          dataType: "SR Legacy",
          foodNutrients: [],
        },
      ],
    };

    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await searchFoods({ q: "test", limit: 10 });

    expect(result.items[0].caloriesKcal).toBeUndefined();
    expect(result.items[0].macros.proteinG).toBeUndefined();
    expect(result.items[0].macros.fatG).toBeUndefined();
    expect(result.items[0].macros.carbsG).toBeUndefined();
  });
});

