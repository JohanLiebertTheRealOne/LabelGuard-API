import { getRequestId } from "./tracing.js";

/**
 * HTTP Error class with RFC 7807 Problem Details support
 */
export class HttpError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly detail?: string;
  public readonly errors?: Record<string, unknown>;

  constructor(
    status: number,
    code: string,
    message: string,
    detail?: string,
    errors?: Record<string, unknown>
  ) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.detail = detail;
    this.errors = errors;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, HttpError);
    }
  }

  /**
   * Convert to RFC 7807 Problem Details format
   */
  toProblemDetails(instance: string): {
    type: string;
    title: string;
    status: number;
    detail: string;
    instance: string;
    code: string;
    traceId?: string;
    errors?: Record<string, unknown>;
  } {
    const traceId = getRequestId();
    return {
      type: `https://labelguard.api/errors/${this.code}`,
      title: this.message,
      status: this.status,
      detail: this.detail || this.message,
      instance,
      code: this.code,
      ...(traceId && { traceId }),
      ...(this.errors && { errors: this.errors }),
    };
  }
}

/**
 * Common HTTP error factory functions
 */
export const HttpErrors = {
  badRequest: (message: string, detail?: string, errors?: Record<string, unknown>) =>
    new HttpError(400, "BAD_REQUEST", message, detail, errors),

  unauthorized: (message = "Unauthorized", detail?: string) =>
    new HttpError(401, "UNAUTHORIZED", message, detail),

  forbidden: (message = "Forbidden", detail?: string) =>
    new HttpError(403, "FORBIDDEN", message, detail),

  notFound: (message = "Not found", detail?: string) =>
    new HttpError(404, "NOT_FOUND", message, detail),

  conflict: (message: string, detail?: string) =>
    new HttpError(409, "CONFLICT", message, detail),

  tooManyRequests: (message = "Too many requests", detail?: string) =>
    new HttpError(429, "TOO_MANY_REQUESTS", message, detail),

  internal: (message = "Internal server error", detail?: string) =>
    new HttpError(500, "INTERNAL_ERROR", message, detail),

  badGateway: (message = "Bad gateway", detail?: string) =>
    new HttpError(502, "BAD_GATEWAY", message, detail),

  serviceUnavailable: (message = "Service unavailable", detail?: string) =>
    new HttpError(503, "SERVICE_UNAVAILABLE", message, detail),
};

