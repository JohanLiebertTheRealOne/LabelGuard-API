import type { Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface Request {
      apiVersion?: string;
    }
  }
}

/**
 * API Versioning middleware
 * Forces X-API-Version header and exposes version in request
 */
export function apiVersioning(req: Request, res: Response, next: NextFunction): void {
  const requestedVersion = req.headers["x-api-version"]?.toString() || "1";
  
  // Always set response header to current API version
  res.setHeader("X-API-Version", "1");
  
  // Expose version in request for controllers
  req.apiVersion = requestedVersion;
  
  // If requested version is not supported, we could log a warning
  // For now, we only support v1, so accept any request
  if (requestedVersion !== "1") {
    res.setHeader("X-API-Version-Supported", "1");
  }
  
  next();
}
