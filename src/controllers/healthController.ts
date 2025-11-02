import type { Request, Response } from "express";

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
 */
export function getReadiness(_req: Request, res: Response): void {
  // In a real application, you might check database connections, external APIs, etc.
  res.json({ status: "ready" });
}

