import type { Request, Response, NextFunction } from "express";
import {
  httpRequestCounter,
  httpRequestDuration,
  activeRequests,
  httpRequestSize,
  httpResponseSize,
} from "../observability/metrics.js";

/**
 * Normalize route path for metrics (remove IDs, etc.)
 */
function normalizeRoute(path: string): string {
  return path
    .replace(/\/\d+/g, "/:id")
    .replace(/\/[a-f0-9-]{36}/gi, "/:uuid")
    .split("?")[0];
}

/**
 * Middleware to collect Prometheus metrics for HTTP requests
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const route = normalizeRoute(req.route?.path || req.path);
  const method = req.method;

  // Track active requests
  activeRequests.inc({ method, route });

  // Track request size
  const requestSize = req.headers["content-length"]
    ? parseInt(req.headers["content-length"], 10)
    : 0;
  if (requestSize > 0) {
    httpRequestSize.observe({ method, route }, requestSize);
  }

  // Override res.end to track response metrics
  const originalEnd = res.end.bind(res);
  res.end = function (chunk?: any, encoding?: any) {
    const duration = (Date.now() - startTime) / 1000;
    const statusCode = res.statusCode.toString();

    // Track request counter
    httpRequestCounter.inc({
      method,
      route,
      status_code: statusCode,
    });

    // Track request duration
    httpRequestDuration.observe(
      {
        method,
        route,
        status_code: statusCode,
      },
      duration
    );

    // Track response size
    if (chunk) {
      const responseSize = Buffer.isBuffer(chunk)
        ? chunk.length
        : typeof chunk === "string"
          ? Buffer.byteLength(chunk, encoding as BufferEncoding)
          : 0;
      if (responseSize > 0) {
        httpResponseSize.observe({ method, route, status_code: statusCode }, responseSize);
      }
    }

    // Decrease active requests
    activeRequests.dec({ method, route });

    // Call original end
    return originalEnd(chunk, encoding);
  };

  next();
}
