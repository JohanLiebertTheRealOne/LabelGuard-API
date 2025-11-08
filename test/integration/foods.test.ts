import { describe, it, expect, beforeAll, vi } from "vitest";
import request from "supertest";
import { buildExpressApp } from "../../src/server.js";
import { loadConfig, resetConfigForTesting } from "../../src/config/env.js";

// Mock fetch
global.fetch = vi.fn();

describe("Foods endpoint", () => {
  let app: ReturnType<typeof buildExpressApp>;

  beforeAll(() => {
    resetConfigForTesting();
    process.env.USDA_API_KEY = "test-key";
    process.env.NODE_ENV = "test";
    loadConfig();
    app = buildExpressApp();
  });

  it("GET /foods should require q parameter", async () => {
    const response = await request(app).get("/foods");

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("BAD_REQUEST");
  });

  it("GET /foods should return search results", async () => {
    const mockResponse = {
      totalHits: 1,
      foods: [
        {
          fdcId: 173430,
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

    const response = await request(app).get("/foods?q=test");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("items");
    expect(response.body).toHaveProperty("meta");
    expect(response.body.items).toBeInstanceOf(Array);
  });

  it("GET /foods should enforce limit max", async () => {
    const response = await request(app).get("/foods?q=test&limit=100");

    expect(response.status).toBe(400);
  });
});

