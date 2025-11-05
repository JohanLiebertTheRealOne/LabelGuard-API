import type { Request, Response } from "express";
import { getConfig } from "../config/env.js";
import { getCacheProvider } from "../cache/index.js";
import { getCircuitBreaker } from "../resilience/circuitBreaker.js";

const startTime = Date.now();

/**
 * Health check endpoint
 * Returns server status, uptime, and timestamp
 *
 * @example
 * GET /health
 * Response: { status: "ok", uptime: 12345, timestamp: "2024-01-01T00:00:00.000Z" }
 */
export function getHealth(_req: Request, res: Response): void {
  const uptime = Math.floor((Date.now() - startTime) / 1000);

  res.json({
    status: "ok",
    uptime,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Liveness probe endpoint
 * Used by orchestrators to check if the container is running
 */
export function getLiveness(_req: Request, res: Response): void {
  res.json({ status: "alive" });
}

/**
 * Readiness probe endpoint
 * Used by orchestrators to check if the service is ready to accept traffic
 * Checks: cache, circuit breaker, USDA API key
 */
export async function getReadiness(_req: Request, res: Response): Promise<void> {
  const checks: Record<string, { status: string; details?: unknown }> = {};
  let allReady = true;

  // Check configuration
  try {
    const config = getConfig();
    checks.config = {
      status: "ok",
      details: {
        hasUsdaKey: !!config.USDA_API_KEY,
        cacheBackend: config.CACHE_BACKEND,
      },
    };
  } catch (error) {
    checks.config = {
      status: "error",
      details: { error: error instanceof Error ? error.message : String(error) },
    };
    allReady = false;
  }

  // Check cache
  try {
    const config = getConfig();
    const cache = await getCacheProvider(config);
    await cache.get("health-check-test");
    checks.cache = { status: "ok" };
  } catch (error) {
    checks.cache = {
      status: "error",
      details: { error: error instanceof Error ? error.message : String(error) },
    };
    // Cache failure doesn't make service unready, but we log it
  }

  // Check circuit breaker
  try {
    const circuitBreaker = getCircuitBreaker("usda-api");
    const state = circuitBreaker.getState();
    const stats = circuitBreaker.getStats();
    checks.circuitBreaker = {
      status: state === "open" ? "open" : "ok",
      details: {
        state,
        failureCount: stats.failureCount,
        openCount: stats.openCount,
      },
    };
    if (state === "open") {
      // Circuit breaker open means service might not be fully ready
      // But we don't fail readiness, just warn
    }
  } catch (error) {
    checks.circuitBreaker = {
      status: "error",
      details: { error: error instanceof Error ? error.message : String(error) },
    };
  }

  if (allReady) {
    res.json({
      status: "ready",
      checks,
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(503).json({
      status: "not_ready",
      checks,
      timestamp: new Date().toISOString(),
    });
  }
}

