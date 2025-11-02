/**
 * Simple in-memory metrics collector
 * This is a stub implementation that can be extended with Prometheus or other exporters
 */

interface MetricsCollector {
  requests: {
    total: number;
    byMethod: Record<string, number>;
    byStatus: Record<string, number>;
  };
  latency: {
    sum: number;
    count: number;
    buckets: Record<string, number>;
  };
}

const metrics: MetricsCollector = {
  requests: {
    total: 0,
    byMethod: {},
    byStatus: {},
  },
  latency: {
    sum: 0,
    count: 0,
    buckets: {
      "0-100": 0,
      "100-500": 0,
      "500-1000": 0,
      "1000+": 0,
    },
  },
};

/**
 * Record a request metric
 */
export function recordRequest(method: string, statusCode: number, durationMs: number): void {
  metrics.requests.total++;
  metrics.requests.byMethod[method] = (metrics.requests.byMethod[method] || 0) + 1;
  const statusClass = `${Math.floor(statusCode / 100)}xx`;
  metrics.requests.byStatus[statusClass] = (metrics.requests.byStatus[statusClass] || 0) + 1;

  // Record latency
  metrics.latency.sum += durationMs;
  metrics.latency.count++;

  // Bucket latency
  if (durationMs < 100) {
    metrics.latency.buckets["0-100"]++;
  } else if (durationMs < 500) {
    metrics.latency.buckets["100-500"]++;
  } else if (durationMs < 1000) {
    metrics.latency.buckets["500-1000"]++;
  } else {
    metrics.latency.buckets["1000+"]++;
  }
}

/**
 * Get current metrics as text (simple format)
 * This can be extended to export Prometheus format
 */
export function getMetricsText(): string {
  const avgLatency = metrics.latency.count > 0
    ? (metrics.latency.sum / metrics.latency.count).toFixed(2)
    : "0";

  return `# LabelGuard API Metrics

requests_total ${metrics.requests.total}
requests_by_method_total{method="GET"} ${metrics.requests.byMethod.GET || 0}
requests_by_method_total{method="POST"} ${metrics.requests.byMethod.POST || 0}
requests_by_status_total{status="2xx"} ${metrics.requests.byStatus["2xx"] || 0}
requests_by_status_total{status="4xx"} ${metrics.requests.byStatus["4xx"] || 0}
requests_by_status_total{status="5xx"} ${metrics.requests.byStatus["5xx"] || 0}
latency_ms_sum ${metrics.latency.sum.toFixed(2)}
latency_ms_count ${metrics.latency.count}
latency_ms_avg ${avgLatency}
latency_ms_bucket{le="100"} ${metrics.latency.buckets["0-100"]}
latency_ms_bucket{le="500"} ${metrics.latency.buckets["100-500"]}
latency_ms_bucket{le="1000"} ${metrics.latency.buckets["500-1000"]}
latency_ms_bucket{le="+Inf"} ${metrics.latency.buckets["1000+"]}
`;
}

/**
 * Reset metrics (useful for testing)
 */
export function resetMetrics(): void {
  metrics.requests.total = 0;
  metrics.requests.byMethod = {};
  metrics.requests.byStatus = {};
  metrics.latency.sum = 0;
  metrics.latency.count = 0;
  metrics.latency.buckets = {
    "0-100": 0,
    "100-500": 0,
    "500-1000": 0,
    "1000+": 0,
  };
}

/**
 * Get metrics object (for JSON export)
 */
export function getMetrics(): MetricsCollector {
  return { ...metrics };
}

