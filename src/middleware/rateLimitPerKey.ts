import { RateLimiterMemory, RateLimiterRedis } from "rate-limiter-flexible";
import type { Request, Response, NextFunction } from "express";
import { HttpErrors } from "../utils/http.js";
import { getConfig } from "../config/env.js";

// Use in-memory limiter by default
let limiter: RateLimiterMemory | RateLimiterRedis | null = null;

/**
 * Initialize rate limiter (in-memory or Redis)
 */
function getRateLimiter() {
  if (limiter) {
    return limiter;
  }

  const config = getConfig();
  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    // Use Redis for distributed rate limiting
    const Redis = require("ioredis");
    const redisClient = new Redis(redisUrl);
    limiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: "rlflx",
      points: config.RATE_LIMIT_MAX,
      duration: Math.floor(config.RATE_LIMIT_WINDOW_MS / 1000),
      blockDuration: 60, // Block for 60 seconds after limit exceeded
    });
  } else {
    // Use in-memory limiter
    limiter = new RateLimiterMemory({
      points: config.RATE_LIMIT_MAX,
      duration: Math.floor(config.RATE_LIMIT_WINDOW_MS / 1000),
      blockDuration: 60,
    });
  }

  return limiter;
}

/**
 * Rate limiting middleware with per-key (API key or IP) limiting
 * Follows RFC 9239 for rate limit headers
 */
export async function rateLimitPerKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const limiter = getRateLimiter();
    
    // Use API key if available, otherwise use IP
    const key = req.apiKey || req.ip || "anonymous";
    const keyPrefix = req.apiKey ? `api-key:${key}` : `ip:${key}`;

    try {
      const rateLimiterRes = await limiter.consume(keyPrefix);

      // Set RFC 9239 rate limit headers
      const points = "points" in limiter ? (limiter.points as number) : 100;
      const totalHits = ("totalHits" in rateLimiterRes ? (rateLimiterRes.totalHits as number) : points) || points;
      const remaining = ("remainingPoints" in rateLimiterRes ? (rateLimiterRes.remainingPoints as number) : 0) || 0;
      const msBeforeNext = ("msBeforeNext" in rateLimiterRes ? (rateLimiterRes.msBeforeNext as number) : 0) || 0;

      res.setHeader("RateLimit-Limit", totalHits.toString());
      res.setHeader("RateLimit-Remaining", remaining.toString());
      res.setHeader("RateLimit-Reset", new Date(Date.now() + (typeof msBeforeNext === "number" ? msBeforeNext : 0)).toISOString());

      next();
    } catch (rateLimiterRes: any) {
      // Rate limit exceeded
      const points = "points" in limiter ? (limiter.points as number) : 100;
      const totalHits = ((rateLimiterRes as any)?.totalHits as number) || points;
      const msBeforeNext = ((rateLimiterRes as any)?.msBeforeNext as number) || 60000;
      const retryAfter = Math.ceil(msBeforeNext / 1000);
      
      res.setHeader("Retry-After", retryAfter.toString());
      res.setHeader("RateLimit-Limit", totalHits.toString());
      res.setHeader("RateLimit-Remaining", "0");
      res.setHeader("RateLimit-Reset", new Date(Date.now() + (typeof msBeforeNext === "number" ? msBeforeNext : 60000)).toISOString());

      throw HttpErrors.tooManyRequests(
        "Rate limit exceeded",
        `Too many requests. Please retry after ${retryAfter} seconds.`
      );
    }
  } catch (error) {
    next(error);
  }
}
