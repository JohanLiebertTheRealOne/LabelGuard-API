import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { buildExpressApp } from "../../src/server.js";
import { loadConfig, resetConfigForTesting } from "../../src/config/env.js";

describe("Health endpoints", () => {
  let app: ReturnType<typeof buildExpressApp>;

  beforeAll(() => {
    resetConfigForTesting();
    process.env.USDA_API_KEY = "test-key";
    process.env.NODE_ENV = "test";
    loadConfig();
    app = buildExpressApp();
  });

  it("GET /health should return 200 with status ok", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("status", "ok");
    expect(response.body).toHaveProperty("uptime");
    expect(response.body).toHaveProperty("timestamp");
  });

  it("GET /health/liveness should return 200", async () => {
    const response = await request(app).get("/health/liveness");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("status", "alive");
  });

  it("GET /health/readiness should return 200", async () => {
    const response = await request(app).get("/health/readiness");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("status", "ready");
  });
});

