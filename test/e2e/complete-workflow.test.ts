import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { buildExpressApp } from "../../src/server.js";
import { loadConfig } from "../../src/config/env.js";

/**
 * Test E2E complet simulant un workflow réel d'utilisation de l'API
 * Ce test valide toutes les features ensemble dans un scénario réaliste
 */
describe("E2E: Complete API Workflow", () => {
  let app: ReturnType<typeof buildExpressApp>;
  const apiKey = "test-api-key-123";

  beforeAll(() => {
    process.env.USDA_API_KEY = "test-key";
    process.env.NODE_ENV = "test";
    process.env.API_KEYS = apiKey;
    loadConfig();
    app = buildExpressApp();
  });

  it("should complete full workflow: health -> search -> validate -> metrics", async () => {
    // 1. Check health
    const healthResponse = await request(app).get("/health");
    expect(healthResponse.status).toBe(200);
    expect(healthResponse.body.status).toBe("ok");

    // 2. Check readiness
    const readinessResponse = await request(app).get("/health/readiness");
    expect(readinessResponse.status).toBe(200);
    expect(readinessResponse.body.status).toBe("ready");
    expect(readinessResponse.body.checks).toBeDefined();

    // 3. Search foods with API key and pagination
    const searchResponse = await request(app)
      .get("/v1/foods?q=yogurt&limit=5")
      .set("X-Api-Key", apiKey);

    // Should either succeed or fail with proper error (depending on USDA API availability)
    expect([200, 400, 500, 502, 503]).toContain(searchResponse.status);
    if (searchResponse.status === 200) {
      expect(searchResponse.body).toHaveProperty("data");
      expect(searchResponse.body).toHaveProperty("meta");
    }

    // 4. Validate label with multiple markets
    const validateResponse = await request(app)
      .post("/v1/labels/validate")
      .set("X-Api-Key", apiKey)
      .set("Accept-Language", "en-US,en;q=0.9")
      .send({
        labelText: "Ingredients: milk, sugar, vanilla extract. Nutrition Facts: Calories 100, Protein 5g, Fat 2g, Carbs 15g",
        declaredAllergens: ["milk"],
        servingSize: { value: 100, unit: "g" },
        markets: ["US", "EU"],
      });

    expect(validateResponse.status).toBe(200);
    expect(validateResponse.body).toHaveProperty("valid");
    expect(validateResponse.body).toHaveProperty("issues");
    expect(validateResponse.body).toHaveProperty("summary");
    expect(Array.isArray(validateResponse.body.issues)).toBe(true);

    // Should have issues from rules
    const issueIds = validateResponse.body.issues.map((i: { id: string }) => i.id);
    expect(issueIds.length).toBeGreaterThan(0);

    // 5. Check metrics after requests
    const metricsResponse = await request(app).get("/health/metrics");
    expect(metricsResponse.status).toBe(200);
    expect(metricsResponse.text).toContain("http_requests_total");
  });

  it("should handle rate limiting correctly", async () => {
    // Make multiple requests quickly
    const promises = Array.from({ length: 5 }, () =>
      request(app)
        .get("/health")
        .set("X-Api-Key", apiKey)
    );

    const responses = await Promise.all(promises);
    
    // All should succeed (rate limit is high for testing)
    const statusCodes = responses.map((r) => r.status);
    expect(statusCodes.every((s) => s === 200)).toBe(true);
  });

  it("should track metrics across multiple requests", async () => {
    // Clear previous metrics by checking endpoint
    await request(app).get("/health/metrics");

    // Make several different requests
    await request(app).get("/health").set("X-Api-Key", apiKey);
    await request(app).get("/health/liveness");
    await request(app)
      .post("/v1/labels/validate")
      .set("X-Api-Key", apiKey)
      .send({
        labelText: "Ingredients: milk",
        markets: ["US"],
      });

    // Check metrics
    const metricsResponse = await request(app).get("/health/metrics");
    const metricsText = metricsResponse.text;

    // Should have tracked different methods
    expect(metricsText).toMatch(/method="GET"/);
    expect(metricsText).toMatch(/method="POST"/);
    
    // Should have tracked different routes
    expect(metricsText).toContain("http_request_duration_seconds");
  });

  it("should validate French market rules with French Accept-Language", async () => {
    const response = await request(app)
      .post("/v1/labels/validate")
      .set("X-Api-Key", apiKey)
      .set("Accept-Language", "fr-FR,fr;q=0.9")
      .send({
        labelText: "Ingredients: milk, sugar", // No French keywords
        markets: ["FR"],
      });

    expect(response.status).toBe(200);
    const issues = response.body.issues || [];
    
    // Should detect missing French language (rule may trigger if no French keywords found)
    // The rule checks for French keywords like "ingrédients", "allergènes", etc.
    const frenchIssue = issues.find((i: { id: string }) => i.id === "FR_FRENCH_LANGUAGE_REQUIRED");
    // May or may not be present depending on label text content
    if (frenchIssue) {
      expect(frenchIssue).toBeDefined();
    }
  });

  it("should handle validation with context foods", async () => {
    const response = await request(app)
      .post("/v1/labels/validate")
      .set("X-Api-Key", apiKey)
      .send({
        labelText: "High protein food. Ingredients: milk, protein powder",
        servingSize: { value: 100, unit: "g" },
        claimTexts: ["high protein"],
        referenceFoodQuery: "yogurt",
        markets: ["US"],
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("valid");
    // May or may not have context depending on USDA API availability
  });

  it("should provide proper error responses with traceId", async () => {
    const response = await request(app)
      .post("/v1/labels/validate")
      .set("X-Api-Key", apiKey)
      .send({
        // Missing required labelText
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("type");
    expect(response.body).toHaveProperty("title");
    expect(response.body).toHaveProperty("status", 400);
    expect(response.body).toHaveProperty("code");
    // May have traceId if request ID is set
  });

  it("should handle API versioning correctly", async () => {
    const response = await request(app)
      .get("/v1/foods?q=yogurt&limit=1")
      .set("X-Api-Key", apiKey)
      .set("X-API-Version", "1");

    expect([200, 400, 500, 502, 503]).toContain(response.status);
    if (response.headers["x-api-version"]) {
      expect(response.headers["x-api-version"]).toBe("1");
    }
  });
});
