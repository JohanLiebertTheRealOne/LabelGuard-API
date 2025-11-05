import { Registry, Counter, Histogram, Gauge } from "prom-client";

/**
 * Prometheus metrics registry
 */
export const register = new Registry();

// Collect default Node.js metrics
register.setDefaultLabels({
  app: "labelguard-api",
});

/**
 * HTTP request counter
 */
export const httpRequestCounter = new Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
  registers: [register],
});

/**
 * HTTP request duration histogram
 */
export const httpRequestDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

/**
 * HTTP request size histogram
 */
export const httpRequestSize = new Histogram({
  name: "http_request_size_bytes",
  help: "Size of HTTP requests in bytes",
  labelNames: ["method", "route"],
  buckets: [100, 500, 1000, 5000, 10000, 50000, 100000],
  registers: [register],
});

/**
 * HTTP response size histogram
 */
export const httpResponseSize = new Histogram({
  name: "http_response_size_bytes",
  help: "Size of HTTP responses in bytes",
  labelNames: ["method", "route", "status_code"],
  buckets: [100, 500, 1000, 5000, 10000, 50000, 100000, 500000],
  registers: [register],
});

/**
 * Active requests gauge
 */
export const activeRequests = new Gauge({
  name: "http_active_requests",
  help: "Number of active HTTP requests",
  labelNames: ["method", "route"],
  registers: [register],
});

/**
 * USDA API requests counter
 */
export const usdaApiCounter = new Counter({
  name: "usda_api_requests_total",
  help: "Total number of USDA API requests",
  labelNames: ["status"],
  registers: [register],
});

/**
 * USDA API duration histogram
 */
export const usdaApiDuration = new Histogram({
  name: "usda_api_duration_seconds",
  help: "Duration of USDA API requests in seconds",
  labelNames: ["status"],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register],
});

/**
 * Cache operations counter
 */
export const cacheOperations = new Counter({
  name: "cache_operations_total",
  help: "Total number of cache operations",
  labelNames: ["operation", "status"],
  registers: [register],
});

/**
 * Cache hit rate gauge
 */
export const cacheHitRate = new Gauge({
  name: "cache_hit_rate",
  help: "Cache hit rate (0-1)",
  registers: [register],
});

/**
 * Rate limit hits counter
 */
export const rateLimitHits = new Counter({
  name: "rate_limit_hits_total",
  help: "Total number of rate limit hits",
  labelNames: ["key_type"],
  registers: [register],
});

/**
 * Circuit breaker state gauge
 */
export const circuitBreakerState = new Gauge({
  name: "circuit_breaker_state",
  help: "Circuit breaker state (0=closed, 1=open, 2=half-open)",
  labelNames: ["breaker"],
  registers: [register],
});

/**
 * Get metrics in Prometheus format
 */
export function getMetrics(): Promise<string> {
  return register.metrics();
}

/**
 * Reset all metrics (useful for testing)
 */
export function resetMetrics(): void {
  register.resetMetrics();
}
