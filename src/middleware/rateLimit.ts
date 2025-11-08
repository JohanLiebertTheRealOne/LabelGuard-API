import rateLimit from "express-rate-limit";
import type { Request, Response, NextFunction } from "express";
import { getConfig } from "../config/env.js";

function resolveRateLimitSettings() {
  try {
    const config = getConfig();
    return {
      windowMs: config.RATE_LIMIT_WINDOW_MS,
      max: config.RATE_LIMIT_MAX,
    };
  } catch {
    const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
    const max = Number(process.env.RATE_LIMIT_MAX) || 100;
    return { windowMs, max };
  }
}

const rateLimitSettings = resolveRateLimitSettings();

const defaultLimiter = rateLimit({
  windowMs: rateLimitSettings.windowMs,
  max: rateLimitSettings.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: "Rate limit exceeded" });
  },
  skip: (req) => {
    // Skip rate limiting for health checks in production
    return process.env.NODE_ENV === "production" && req.path === "/health";
  },
});

const strictLimiterInstance = rateLimit({
  windowMs: rateLimitSettings.windowMs,
  max: rateLimitSettings.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: "Rate limit exceeded" });
  },
});

export function defaultRateLimiter(req: Request, res: Response, next: NextFunction): void {
  defaultLimiter(req, res, next);
}

export function strictRateLimiter(req: Request, res: Response, next: NextFunction): void {
  strictLimiterInstance(req, res, next);
}

