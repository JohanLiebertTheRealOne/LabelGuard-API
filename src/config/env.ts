import { z } from "zod";

/**
 * Environment configuration schema with validation
 */
const envSchema = z.object({
  USDA_API_KEY: z.string().min(1, "USDA_API_KEY is required"),
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CORS_ORIGIN: z.string().optional().transform((val) => {
    if (!val || val.trim() === "") return [];
    return val.split(",").map((origin) => origin.trim()).filter(Boolean);
  }),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  TRUST_PROXY: z
    .string()
    .optional()
    .default("false")
    .transform((val) => val === "true" || val === "1"),
  CACHE_BACKEND: z.enum(["lru", "kv", "redis"]).optional().default("lru"),
  CACHE_TTL_MS: z.coerce.number().int().positive().default(60000),
  CACHE_MAX_SIZE: z.coerce.number().int().positive().default(1000),
  REDIS_URL: z.string().url().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

let config: EnvConfig | null = null;

/**
 * Load and validate environment configuration
 * @throws {Error} If required environment variables are missing or invalid
 */
export function loadConfig(): EnvConfig {
  if (config) {
    return config;
  }

  try {
    config = envSchema.parse(process.env);
    return config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join(", ");
      throw new Error(`Invalid environment configuration: ${issues}`);
    }
    throw error;
  }
}

/**
 * Get the current configuration (must call loadConfig() first)
 */
export function getConfig(): EnvConfig {
  if (!config) {
    throw new Error("Configuration not loaded. Call loadConfig() first.");
  }
  return config;
}

/**
 * Reset configuration cache (useful for tests)
 */
export function resetConfigForTesting(): void {
  config = null;
}

