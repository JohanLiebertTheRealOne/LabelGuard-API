import { Agent, setGlobalDispatcher, request } from "undici";
import { getCircuitBreaker } from "../resilience/circuitBreaker.js";
import { retryWithBackoff } from "../resilience/retry.js";
import { HttpErrors } from "../utils/http.js";

/**
 * Global HTTP agent with keep-alive
 * Reuses connections for better performance
 */
const agent = new Agent({
  connections: 10,
  pipelining: 1,
  keepAliveTimeout: 60_000,
  keepAliveMaxTimeout: 600_000,
});

// Set as global dispatcher for undici
setGlobalDispatcher(agent);

/**
 * USDA API client with resilience features:
 * - Keep-alive connections
 * - Retry with exponential backoff
 * - Circuit breaker
 * - Request cancellation
 */
export class USDAClient {
  private baseUrl: string;
  private apiKey: string;
  private circuitBreaker: ReturnType<typeof getCircuitBreaker>;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.circuitBreaker = getCircuitBreaker("usda-api", {
      failureThreshold: 5,
      coolDownMs: 20_000,
      halfOpenMaxAttempts: 2,
    });
  }

  /**
   * Make a POST request to USDA API with retry and circuit breaker
   */
  async post(
    path: string,
    body: unknown,
    signal?: AbortSignal,
    timeoutMs = 8000
  ): Promise<unknown> {
    return this.circuitBreaker.execute("usda-post", async () => {
      return retryWithBackoff(
        async () => {
          // Construct full URL (baseUrl is already the full endpoint URL)
          const url = new URL(this.baseUrl);
          url.searchParams.set("api_key", this.apiKey);

          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), timeoutMs);

          // Combine signals if both provided
          if (signal) {
            signal.addEventListener("abort", () => controller.abort());
          }

          try {
            const fullUrl = url.toString();
            const response = await request(fullUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(body),
              signal: controller.signal,
              headersTimeout: timeoutMs,
              bodyTimeout: timeoutMs,
            });

            clearTimeout(timeout);

            if (response.statusCode >= 500) {
              // Create error object with status for retry logic
              const error = new Error(`USDA API returned ${response.statusCode}`);
              (error as { status?: number }).status = response.statusCode;
              throw error;
            }

            if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
              const text = await response.body.text().catch(() => "Unknown error");
              throw HttpErrors.badGateway(
                `USDA API returned ${response.statusCode}`,
                `Failed to fetch food data: ${text}`
              );
            }

            return await response.body.json();
          } catch (error) {
            clearTimeout(timeout);

            if (error instanceof Error) {
              if (error.name === "AbortError" || controller.signal.aborted) {
                throw HttpErrors.serviceUnavailable("Request to USDA API timed out or was cancelled");
              }

              // Re-throw HttpError instances
              if ("statusCode" in error && typeof error.statusCode === "number") {
                throw error;
              }
            }

            throw error;
          }
        },
        {
          maxAttempts: 3,
          baseDelayMs: 100,
          maxDelayMs: 5000,
          jitter: true,
        }
      );
    });
  }
}
