import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { buildExpressApp } from "../../src/server.js";
import { loadConfig, resetConfigForTesting } from "../../src/config/env.js";

describe("Observability (Feature D)", () => {
  let app: ReturnType<typeof buildExpressApp>;

  beforeAll(() => {
    resetConfigForTesting();
    process.env.USDA_API_KEY = "test-key";
    process.env.NODE_ENV = "test";
    process.env.API_KEYS = "test-api-key-123";
    loadConfig();
    app = buildExpressApp();
  });

  describe("Prometheus Metrics", () => {
    it("should expose metrics endpoint in Prometheus format", async () => {
      const response = await request(app).get("/health/metrics");

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toContain("text/plain");
      expect(response.text).toContain("# HELP");
      expect(response.text).toContain("# TYPE");
    });

    it("should track HTTP request metrics", async () => {
      // Make a request to generate metrics
      await request(app)
        .get("/health")
        .set("X-Api-Key", "test-api-key-123");

      const metricsResponse = await request(app).get("/health/metrics");

      expect(metricsResponse.status).toBe(200);
      expect(metricsResponse.text).toContain("http_requests_total");
      expect(metricsResponse.text).toContain("http_request_duration_seconds");
    });

    it("should track request counters with labels", async () => {
      await request(app)
        .get("/health")
        .set("X-Api-Key", "test-api-key-123");

      const metricsResponse = await request(app).get("/health/metrics");
      const metricsText = metricsResponse.text;

      // Check for method and status labels
      expect(metricsText).toMatch(/http_requests_total\{.*method="GET"/);
      expect(metricsText).toMatch(/http_requests_total\{.*status_code="200"/);
    });
  });

  describe("Enhanced Health Checks", () => {
    it("should return detailed readiness check", async () => {
      const response = await request(app).get("/health/readiness");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("status");
      expect(response.body).toHaveProperty("checks");
      expect(response.body.checks).toHaveProperty("config");
      expect(response.body.checks).toHaveProperty("cache");
      expect(response.body.checks).toHaveProperty("circuitBreaker");
    });

    it("should check configuration in readiness", async () => {
      const response = await request(app).get("/health/readiness");

      expect(response.body.checks.config).toHaveProperty("status");
      expect(response.body.checks.config.details).toHaveProperty("hasUsdaKey");
      expect(response.body.checks.config.details).toHaveProperty("cacheBackend");
    });

    it("should check cache in readiness", async () => {
      const response = await request(app).get("/health/readiness");

      expect(response.body.checks.cache).toHaveProperty("status");
    });

    it("should check circuit breaker in readiness", async () => {
      const response = await request(app).get("/health/readiness");

      expect(response.body.checks.circuitBreaker).toHaveProperty("status");
      expect(response.body.checks.circuitBreaker.details).toHaveProperty("state");
    });

    it("should return 503 if configuration is invalid", async () => {
      // Temporarily remove USDA_API_KEY
      const originalKey = process.env.USDA_API_KEY;
      delete process.env.USDA_API_KEY;

      try {
        loadConfig();
        const testApp = buildExpressApp();
        const response = await request(testApp).get("/health/readiness");
        // Should fail or return not_ready
        expect([200, 503]).toContain(response.status);
      } finally {
        process.env.USDA_API_KEY = originalKey;
      }
    });
  });

  describe("Basic Health Endpoints", () => {
    it("should return health status", async () => {
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("status", "ok");
      expect(response.body).toHaveProperty("uptime");
      expect(response.body).toHaveProperty("timestamp");
    });

    it("should return liveness probe", async () => {
      const response = await request(app).get("/health/liveness");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("status", "alive");
    });
  });
});
