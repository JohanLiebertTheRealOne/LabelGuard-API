import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { buildExpressApp } from "../../src/server.js";
import { loadConfig } from "../../src/config/env.js";

describe("Foods Pagination (v1)", () => {
  let app: ReturnType<typeof buildExpressApp>;

  beforeAll(() => {
    loadConfig();
    app = buildExpressApp();
  });

  it("should support cursor-based pagination", async () => {
    const response = await request(app)
      .get("/v1/foods?q=yogurt&limit=5")
      .set("X-Api-Key", process.env.API_KEYS?.split(",")[0] || "test-key");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("data");
    expect(response.body).toHaveProperty("meta");
    expect(response.body.meta).toHaveProperty("limit");
    expect(response.body.meta).toHaveProperty("nextCursor");

    if (response.body.meta.nextCursor) {
      // Test pagination with cursor
      const nextResponse = await request(app)
        .get(`/v1/foods?q=yogurt&limit=5&cursor=${response.body.meta.nextCursor}`)
        .set("X-Api-Key", process.env.API_KEYS?.split(",")[0] || "test-key");

      expect(nextResponse.status).toBe(200);
      expect(nextResponse.body).toHaveProperty("data");
      expect(nextResponse.body.data.length).toBeLessThanOrEqual(5);
    }
  });

  it("should support page-based pagination", async () => {
    const response = await request(app)
      .get("/v1/foods?q=yogurt&page=1&pageSize=5")
      .set("X-Api-Key", process.env.API_KEYS?.split(",")[0] || "test-key");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("data");
    expect(response.body).toHaveProperty("meta");
    expect(response.body.meta).toHaveProperty("page");
    expect(response.body.meta).toHaveProperty("pageSize");
    expect(response.body.meta.page).toBe(1);
    expect(response.body.meta.pageSize).toBe(5);
  });

  it("should validate limit maximum", async () => {
    const response = await request(app)
      .get("/v1/foods?q=yogurt&limit=100")
      .set("X-Api-Key", process.env.API_KEYS?.split(",")[0] || "test-key");

    // Should reject or cap at 50
    expect([400, 200]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body.meta.limit).toBeLessThanOrEqual(50);
    }
  });

  it("should validate query length", async () => {
    const longQuery = "a".repeat(200);
    const response = await request(app)
      .get(`/v1/foods?q=${longQuery}`)
      .set("X-Api-Key", process.env.API_KEYS?.split(",")[0] || "test-key");

    expect(response.status).toBe(400);
  });
});
