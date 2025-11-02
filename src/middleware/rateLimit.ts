import rateLimit from "express-rate-limit";
import type { Request, Response, NextFunction } from "express";
import { getConfig } from "../config/env.js";

// Cache for created limiters (created after config is loaded)
let defaultLimiter: ReturnType<typeof rateLimit> | null = null;
let strictLimiter: ReturnType<typeof rateLimit> | null = null;

/**
 * Get default rate limiter (lazy initialization after config is loaded)
 */
function getDefaultRateLimiter(): ReturnType<typeof rateLimit> {
  if (!defaultLimiter) {
    const config = getConfig();
    defaultLimiter = rateLimit({
      windowMs: config.RATE_LIMIT_WINDOW_MS,
      max: config.RATE_LIMIT_MAX,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        error: "Too many requests",
        code: "RATE_LIMIT_EXCEEDED",
      },
      skip: (req) => {
        // Skip rate limiting for health checks in production
        return process.env.NODE_ENV === "production" && req.path === "/health";
      },
    });
  }
  return defaultLimiter;
}

/**
 * Get strict rate limiter (lazy initialization after config is loaded)
 */
function getStrictRateLimiter(): ReturnType<typeof rateLimit> {
  if (!strictLimiter) {
    const config = getConfig();
    strictLimiter = rateLimit({
      windowMs: config.RATE_LIMIT_WINDOW_MS,
      max: Math.floor(config.RATE_LIMIT_MAX / 2),
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        error: "Too many validation requests",
        code: "RATE_LIMIT_EXCEEDED",
      },
    });
  }
  return strictLimiter;
}

/**
 * Default rate limiter middleware (lazy initialization on first request)
 * This returns middleware that will initialize the limiter on first use
 */
export function defaultRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const limiter = getDefaultRateLimiter();
  limiter(req, res, next);
}

/**
 * Strict rate limiter middleware (lazy initialization on first request)
 * This returns middleware that will initialize the limiter on first use
 */
export function strictRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const limiter = getStrictRateLimiter();
  limiter(req, res, next);
}

