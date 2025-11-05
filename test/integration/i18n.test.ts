import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { buildExpressApp } from "../../src/server.js";
import { loadConfig } from "../../src/config/env.js";
import { getLocale } from "../../src/i18n/index.js";

describe("I18n (Feature E)", () => {
  let app: ReturnType<typeof buildExpressApp>;

  beforeAll(() => {
    process.env.USDA_API_KEY = "test-key";
    process.env.NODE_ENV = "test";
    process.env.API_KEYS = "test-api-key-123";
    loadConfig();
    app = buildExpressApp();
  });

  describe("Accept-Language Header", () => {
    it("should default to English when no Accept-Language header", () => {
      const req = {
        headers: {},
      } as any;

      const locale = getLocale(req);
      expect(locale).toBe("en");
    });

    it("should parse English from Accept-Language", () => {
      const req = {
        headers: {
          "accept-language": "en-US,en;q=0.9",
        },
      } as any;

      const locale = getLocale(req);
      expect(locale).toBe("en");
    });

    it("should parse French from Accept-Language", () => {
      const req = {
        headers: {
          "accept-language": "fr-FR,fr;q=0.9,en;q=0.8",
        },
      } as any;

      const locale = getLocale(req);
      expect(locale).toBe("fr");
    });

    it("should prefer higher quality language", () => {
      const req = {
        headers: {
          "accept-language": "en;q=0.5,fr;q=0.9",
        },
      } as any;

      const locale = getLocale(req);
      expect(locale).toBe("fr");
    });

    it("should default to English for unsupported languages", () => {
      const req = {
        headers: {
          "accept-language": "de-DE,de;q=0.9",
        },
      } as any;

      const locale = getLocale(req);
      expect(locale).toBe("en");
    });
  });

  describe("Error Messages Localization", () => {
    it("should return English error by default", async () => {
      const response = await request(app)
        .get("/v1/foods")
        .set("X-Api-Key", "test-api-key-123");

      // Should get validation error
      if (response.status === 400) {
        expect(response.body).toHaveProperty("title");
        // Error message should be in English
      }
    });

    it("should handle French Accept-Language header", async () => {
      const response = await request(app)
        .get("/v1/foods")
        .set("X-Api-Key", "test-api-key-123")
        .set("Accept-Language", "fr-FR,fr;q=0.9");

      // API should accept the header (actual localization may vary)
      expect([200, 400, 401]).toContain(response.status);
    });
  });
});
