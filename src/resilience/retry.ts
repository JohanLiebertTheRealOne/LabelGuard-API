/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitter?: boolean;
}

/**
 * Default retry configuration
 */
const DEFAULT_CONFIG: Required<RetryConfig> = {
  maxAttempts: 3,
  baseDelayMs: 100,
  maxDelayMs: 5000,
  jitter: true,
};

/**
 * Calculate exponential backoff delay with optional jitter
 */
function calculateDelay(attempt: number, config: Required<RetryConfig>): number {
  const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt);
  const delay = Math.min(exponentialDelay, config.maxDelayMs);

  if (config.jitter) {
    // Add random jitter (±20%)
    const jitterAmount = delay * 0.2 * (Math.random() * 2 - 1);
    return Math.max(0, Math.floor(delay + jitterAmount));
  }

  return Math.floor(delay);
}

/**
 * Check if an error should trigger a retry
 */
function shouldRetry(error: unknown): boolean {
  if (error instanceof Error) {
    // Network errors
    if (error.name === "AbortError" || error.message.includes("ECONN") || error.message.includes("ETIMEDOUT")) {
      return true;
    }

    // HTTP 5xx errors (server errors)
    if ("status" in error && typeof error.status === "number") {
      const status = error.status;
      return status >= 500 && status < 600;
    }
  }

  return false;
}

/**
 * Retry a function with exponential backoff and jitter
 * Only retries on network errors and 5xx HTTP status codes
 * @param fn - Function to retry (should throw on failure)
 * @param config - Retry configuration
 * @returns Result of the function
 * @throws Last error if all retries are exhausted
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  let lastError: unknown;

  for (let attempt = 0; attempt < finalConfig.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if error is not retryable
      if (!shouldRetry(error)) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === finalConfig.maxAttempts - 1) {
        throw error;
      }

      // Calculate delay and wait
      const delay = calculateDelay(attempt, finalConfig);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
}
