import type { Request, Response, NextFunction } from "express";
import pino from "pino";
import { generateRequestId, getRequestId, withRequestId } from "../utils/tracing.js";
import { recordRequest } from "../utils/metrics.js";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport:
    process.env.NODE_ENV !== "production"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss Z",
            ignore: "pid,hostname",
          },
        }
      : undefined,
});

/**
 * Request logging middleware with request ID
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const requestId = req.headers["x-request-id"]?.toString() || generateRequestId();
  req.id = requestId;

  // Store request ID in async context
  withRequestId(requestId, () => {
    const start = Date.now();

    // Log request
    logger.info(
      {
        requestId,
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get("user-agent"),
      },
      "Incoming request"
    );

    // Log response when finished
    res.on("finish", () => {
      const duration = Date.now() - start;
      const level = res.statusCode >= 400 ? "error" : "info";

      // Record metrics
      recordRequest(req.method, res.statusCode, duration);

      logger[level](
        {
          requestId,
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration,
        },
        "Request completed"
      );
    });

    next();
  });
}

export { logger };

