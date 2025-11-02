import { describe, it, expect, beforeAll, vi } from "vitest";
import request from "supertest";
import { buildExpressApp } from "../../src/server.js";
import { loadConfig } from "../../src/config/env.js";

// Mock fetch
global.fetch = vi.fn();

describe("Labels validation endpoint", () => {
  let app: ReturnType<typeof buildExpressApp>;

  beforeAll(() => {
    process.env.USDA_API_KEY = "test-key";
    process.env.NODE_ENV = "test";
    loadConfig();
    app = buildExpressApp();
  });

  it("POST /labels/validate should require labelText", async () => {
    const response = await request(app).post("/labels/validate").send({});

    expect(response.status).toBe(400);
  });

  it("POST /labels/validate should validate label without context", async () => {
    const response = await request(app)
      .post("/labels/validate")
      .send({
        labelText: "Ingredients: milk",
        declaredAllergens: [],
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("valid");
    expect(response.body).toHaveProperty("issues");
    expect(response.body.valid).toBe(false);
    expect(response.body.issues.length).toBeGreaterThan(0);
  });

  it("POST /labels/validate should validate with USDA context", async () => {
    const mockFoodResponse = {
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
              unitName: "g",
              value: 5,
            },
          ],
        },
      ],
    };

    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockFoodResponse,
    });

    const response = await request(app)
      .post("/labels/validate")
      .send({
        labelText: "High protein food",
        servingSize: { value: 100, unit: "g" },
        referenceFoodQuery: "test",
        claimTexts: ["high protein"],
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("context");
  });
});

