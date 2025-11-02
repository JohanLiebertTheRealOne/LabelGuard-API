import { describe, it, expect } from "vitest";
import { loadConfig } from "../../src/config/env.js";

describe("config", () => {
  it("should load valid configuration", () => {
    process.env.USDA_API_KEY = "test-key";
    process.env.PORT = "3000";
    process.env.NODE_ENV = "development";

    const config = loadConfig();

    expect(config.USDA_API_KEY).toBe("test-key");
    expect(config.PORT).toBe(3000);
    expect(config.NODE_ENV).toBe("development");
  });

  it("should throw error on missing USDA_API_KEY", () => {
    delete process.env.USDA_API_KEY;

    expect(() => {
      loadConfig();
    }).toThrow("USDA_API_KEY");
  });

  it("should parse CORS_ORIGIN correctly", () => {
    process.env.USDA_API_KEY = "test-key";
    process.env.CORS_ORIGIN = "https://example.com,https://app.example.com";

    const config = loadConfig();

    expect(config.CORS_ORIGIN).toEqual(["https://example.com", "https://app.example.com"]);
  });

  it("should default PORT to 3000", () => {
    process.env.USDA_API_KEY = "test-key";
    delete process.env.PORT;

    const config = loadConfig();

    expect(config.PORT).toBe(3000);
  });
});

