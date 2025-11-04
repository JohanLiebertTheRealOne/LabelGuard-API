import type { Request, Response, NextFunction } from "express";
import pino from "pino";
import { generateRequestId, getRequestId, withRequestId } from "../utils/tracing.js";
import { recordRequest } from "../utils/metrics.js";

// Configure logger based on environment
// In Vercel/serverless/production, use JSON output
// In development, use pino-pretty for readable output
const isDevelopment = 
  process.env.NODE_ENV === "development" && 
  !process.env.VERCEL;

const loggerConfig: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || "info",
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.headers['set-cookie']",
      "req.headers['x-api-key']",
      "req.query.q",
      "req.body.labelText",
      "res.headers['set-cookie']",
    ],
    remove: true,
  },
  serializers: {
    req: (req) => {
      return {
        id: req.id,
        method: req.method,
        url: req.url,
        headers: req.headers,
        remoteAddress: req.remoteAddress,
        remotePort: req.remotePort,
      };
    },
  },
};

// Apply sampling in production if high traffic
if (process.env.NODE_ENV === "production" && process.env.LOG_SAMPLE_RATE) {
  const sampleRate = parseFloat(process.env.LOG_SAMPLE_RATE) || 1.0;
  loggerConfig.formatters = {
    level: (label) => {
      return { level: label };
    },
  };
  // Sampling is typically handled at the transport level
  // For now, we'll log all errors but sample info/debug logs
}

// Only use pino-pretty in development (not in Vercel or production)
// In production/Vercel, pino will use default JSON output
if (isDevelopment) {
  loggerConfig.transport = {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "HH:MM:ss Z",
      ignore: "pid,hostname",
    },
  };
}

const logger = pino(loggerConfig);

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

