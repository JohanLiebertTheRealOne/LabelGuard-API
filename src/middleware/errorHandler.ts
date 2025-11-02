import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { HttpError, HttpErrors } from "../utils/http.js";
import { logger } from "./requestLogger.js";
import { getConfig } from "../config/env.js";

/**
 * Centralized error handler with RFC 7807 Problem Details format
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const config = getConfig();
  const instance = req.path;
  let httpError: HttpError;

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const errors = err.errors.reduce(
      (acc, e) => {
        const path = e.path.join(".");
        acc[path] = e.message;
        return acc;
      },
      {} as Record<string, string>
    );

    httpError = HttpErrors.badRequest("Validation failed", "Invalid request data", errors);
  }
  // Handle custom HttpError
  else if (err instanceof HttpError) {
    httpError = err;
  }
  // Handle unknown errors
  else if (err instanceof Error) {
    // Log full error details
    logger.error(
      {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
      },
      "Unhandled error"
    );

    // In production, don't expose internal errors
    if (config.NODE_ENV === "production") {
      httpError = HttpErrors.internal("An unexpected error occurred");
    } else {
      httpError = HttpErrors.internal(err.message, err.stack);
    }
  }
  // Handle non-Error objects
  else {
    logger.error({ error: err, path: req.path, method: req.method }, "Unknown error type");
    httpError = HttpErrors.internal("An unexpected error occurred");
  }

  // Log error if not in production or if it's a server error
  if (httpError.status >= 500 || config.NODE_ENV !== "production") {
    logger.error(
      {
        status: httpError.status,
        code: httpError.code,
        message: httpError.message,
        path: req.path,
        method: req.method,
      },
      "HTTP Error"
    );
  }

  // Send RFC 7807 Problem Details response
  res.status(httpError.status).json(httpError.toProblemDetails(instance));
}

