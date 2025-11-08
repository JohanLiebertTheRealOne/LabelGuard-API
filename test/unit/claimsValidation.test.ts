import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import axios from "axios";
import {
  validateClaims,
  fetchAndValidateFromFDC,
  chooseBestFood,
} from "../../src/services/claimsValidation.js";
import type { FoodSummary } from "../../src/domain/food.js";
import { loadConfig } from "../../src/config/env.js";

vi.mock("axios", () => {
  const get = vi.fn();
  return {
    default: { get },
    get,
  };
});

const mockedGet = vi.mocked(axios.get);

describe("claimsValidation", () => {
  beforeAll(() => {
    process.env.USDA_API_KEY = "test-key";
    loadConfig();
  });

  beforeEach(() => {
    mockedGet.mockReset();
  });

  it("validateClaims reports unsupported high protein claim", () => {
    const issues = validateClaims({
      claimTexts: ["high protein"],
      macros: { proteinG: 5 },
    });

    expect(issues.some((issue) => issue.id === "CLAIM_HIGH_PROTEIN_UNSUPPORTED")).toBe(true);
  });

  it("fetchAndValidateFromFDC queries axios and returns issues when macros insufficient", async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
        totalHits: 1,
        foods: [
          {
            fdcId: 1,
            description: "Sample Food",
            dataType: "SR Legacy",
            servingSize: 100,
            servingSizeUnit: "g",
            foodNutrients: [
              { number: "1003", value: 5, unitName: "g" }, // protein
              { number: "1004", value: 2, unitName: "g" }, // fat
              { number: "1005", value: 10, unitName: "g" }, // carbs
              { number: "1008", value: 100, unitName: "kcal" }, // calories
            ],
          },
        ],
      },
    });

    const result = await fetchAndValidateFromFDC({
      claimTexts: ["high protein"],
      referenceFoodQuery: "sample food",
    });

    expect(mockedGet).toHaveBeenCalledWith("https://api.nal.usda.gov/fdc/v1/foods/search", {
      params: {
        query: "sample food",
        api_key: "test-key",
        pageSize: 10,
      },
    });
    expect(result.issues.some((issue) => issue.id === "CLAIM_HIGH_PROTEIN_UNSUPPORTED")).toBe(true);
  });

  it("fetchAndValidateFromFDC falls back when API fails", async () => {
    mockedGet.mockRejectedValueOnce(new Error("network"));

    const result = await fetchAndValidateFromFDC({
      claimTexts: ["high protein"],
      referenceFoodQuery: "sample food",
      nutrition: {
        protein: { value: 12, unit: "g" },
      },
    });

    expect(result.source).toBe("fallback");
    expect(result.issues.some((issue) => issue.id === "FDC_LOOKUP_FAILED")).toBe(true);
  });

  it("chooseBestFood favors closest match and populates warnings when macros missing", () => {
    const foods: FoodSummary[] = [
      {
        fdcId: 1,
        description: "Plain Yogurt",
        dataType: "SR Legacy",
        macros: {},
      },
      {
        fdcId: 2,
        description: "Greek Yogurt, Plain, Nonfat",
        dataType: "SR Legacy",
        servingSize: 170,
        macros: { proteinG: 15, fatG: 0, carbsG: 6 },
      },
    ];

    const result = chooseBestFood({
      foods,
      productName: "Greek Yogurt",
      servingSize: { value: 170, unit: "g" },
      claimTexts: ["high protein"],
    });

    expect(result.food?.fdcId).toBe(2);
    expect(result.warnings.length).toBe(0);
  });
});

