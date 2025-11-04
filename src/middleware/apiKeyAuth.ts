import type { Request, Response, NextFunction } from "express";
import { HttpErrors } from "../utils/http.js";

declare global {
  namespace Express {
    interface Request {
      apiKey?: string;
    }
  }
}

/**
 * Load API keys from environment
 * Supports comma-separated list or single key
 */
function loadAPIKeys(): Set<string> {
  const keysEnv = process.env.API_KEYS || process.env.API_KEY || "";
  if (!keysEnv.trim()) {
    return new Set();
  }

  return new Set(
    keysEnv
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean)
  );
}

const validAPIKeys = loadAPIKeys();

/**
 * API Key authentication middleware
 * Reads X-Api-Key header and validates against configured keys
 * If no keys are configured, allows all requests (development mode)
 */
export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  // If no API keys configured, skip auth (development mode)
  if (validAPIKeys.size === 0) {
    next();
    return;
  }

  const apiKey = req.headers["x-api-key"]?.toString();

  if (!apiKey) {
    throw HttpErrors.unauthorized("Missing API key", "Provide X-Api-Key header");
  }

  if (!validAPIKeys.has(apiKey)) {
    throw HttpErrors.unauthorized("Invalid API key", "The provided API key is not valid");
  }

  // Attach API key to request for rate limiting
  req.apiKey = apiKey;
  next();
}
