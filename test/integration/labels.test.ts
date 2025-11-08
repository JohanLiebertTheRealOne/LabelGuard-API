import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import request from "supertest";
import axios from "axios";
import { buildExpressApp } from "../../src/server.js";
import { loadConfig, resetConfigForTesting } from "../../src/config/env.js";

vi.mock("axios", () => {
  const get = vi.fn();
  return {
    default: { get },
    get,
  };
});

const mockedGet = vi.mocked(axios.get);

describe("Labels validation endpoint", () => {
  let app: ReturnType<typeof buildExpressApp>;

  beforeAll(() => {
    resetConfigForTesting();
    process.env.USDA_API_KEY = "test-key";
    process.env.NODE_ENV = "test";
    loadConfig();
    app = buildExpressApp();
  });

  beforeEach(() => {
    mockedGet.mockReset();
    mockedGet.mockResolvedValue({
      data: {
        totalHits: 1,
        foods: [
          {
            fdcId: 1,
            description: "Greek Yogurt",
            dataType: "SR Legacy",
            servingSize: 170,
            servingSizeUnit: "g",
            foodNutrients: [
              { number: "1003", value: 15, unitName: "g" },
              { number: "1004", value: 0, unitName: "g" },
              { number: "1005", value: 5, unitName: "g" },
              { number: "1008", value: 120, unitName: "kcal" },
            ],
          },
        ],
      },
    });
  });

  it("POST /labels/validate should require labelText", async () => {
    const response = await request(app).post("/labels/validate").send({});
    expect(response.status).toBe(400);
    expect(response.body.issues[0].id).toBe("INVALID_INPUT");
  });

  it("returns valid=true for compliant label with high protein claim", async () => {
    const response = await request(app)
      .post("/labels/validate")
      .send({
        labelText: "Ingredients: milk, cultures. Contains: milk",
        declaredAllergens: ["milk"],
        servingSize: { value: 170, unit: "g" },
        claimTexts: ["high protein"],
        referenceFoodQuery: "greek yogurt",
      });

    expect(response.status).toBe(200);
    expect(response.body.valid).toBe(true);
  });

  it("detects undeclared wheat allergen", async () => {
    const response = await request(app)
      .post("/labels/validate")
      .send({
        labelText: "Ingredients: wheat flour, water",
        declaredAllergens: [],
      });

    expect(response.status).toBe(200);
    expect(response.body.valid).toBe(false);
    expect(response.body.issues.some((issue: { id: string }) => issue.id === "ALLERGEN_MISSING")).toBe(true);
  });

  it("flags invalid serving size", async () => {
    const response = await request(app)
      .post("/labels/validate")
      .send({
        labelText: "Ingredients: milk",
        declaredAllergens: ["milk"],
        servingSize: { value: -5, unit: "g" },
      });

    expect(response.status).toBe(200);
    expect(response.body.issues.some((issue: { id: string }) => issue.id === "SERVING_SIZE_INVALID")).toBe(
      true
    );
  });

  it("reports unsupported high protein claim when macros low", async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
        totalHits: 1,
        foods: [
          {
            fdcId: 2,
            description: "Low Protein Yogurt",
            dataType: "SR Legacy",
            servingSize: 170,
            servingSizeUnit: "g",
            foodNutrients: [
              { number: "1003", value: 4, unitName: "g" },
              { number: "1004", value: 1, unitName: "g" },
              { number: "1005", value: 10, unitName: "g" },
            ],
          },
        ],
      },
    });

    const response = await request(app)
      .post("/labels/validate")
      .send({
        labelText: "High protein yogurt",
        declaredAllergens: ["milk"],
        servingSize: { value: 170, unit: "g" },
        claimTexts: ["high protein"],
        referenceFoodQuery: "yogurt low protein",
      });

    expect(response.status).toBe(200);
    expect(
      response.body.issues.some((issue: { id: string }) => issue.id === "CLAIM_HIGH_PROTEIN_UNSUPPORTED")
    ).toBe(true);
  });
});

