import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { buildExpressApp } from "../../src/server.js";
import { loadConfig } from "../../src/config/env.js";

describe("Foods HTTP Cache (v1)", () => {
  let app: ReturnType<typeof buildExpressApp>;
  const apiKey = process.env.API_KEYS?.split(",")[0] || "test-key";

  beforeAll(() => {
    loadConfig();
    app = buildExpressApp();
  });

  it("should return ETag header", async () => {
    const response = await request(app)
      .get("/v1/foods?q=yogurt&limit=5")
      .set("X-Api-Key", apiKey);

    expect(response.status).toBe(200);
    expect(response.headers).toHaveProperty("etag");
    expect(response.headers.etag).toMatch(/^W\/"/);
    expect(response.headers).toHaveProperty("cache-control");
    expect(response.headers["cache-control"]).toContain("max-age=60");
  });

  it("should return 304 Not Modified with If-None-Match", async () => {
    // First request
    const firstResponse = await request(app)
      .get("/v1/foods?q=yogurt&limit=5")
      .set("X-Api-Key", apiKey);

    expect(firstResponse.status).toBe(200);
    const etag = firstResponse.headers.etag;
    expect(etag).toBeDefined();

    // Second request with If-None-Match
    const secondResponse = await request(app)
      .get("/v1/foods?q=yogurt&limit=5")
      .set("X-Api-Key", apiKey)
      .set("If-None-Match", etag as string);

    expect(secondResponse.status).toBe(304);
    expect(secondResponse.body).toEqual({});
  });

  it("should include Cache-Control headers", async () => {
    const response = await request(app)
      .get("/v1/foods?q=yogurt&limit=5")
      .set("X-Api-Key", apiKey);

    expect(response.status).toBe(200);
    const cacheControl = response.headers["cache-control"];
    expect(cacheControl).toContain("public");
    expect(cacheControl).toContain("max-age=60");
    expect(cacheControl).toContain("stale-while-revalidate=300");
  });

  it("should include Last-Modified header", async () => {
    const response = await request(app)
      .get("/v1/foods?q=yogurt&limit=5")
      .set("X-Api-Key", apiKey);

    expect(response.status).toBe(200);
    expect(response.headers).toHaveProperty("last-modified");
  });
});
