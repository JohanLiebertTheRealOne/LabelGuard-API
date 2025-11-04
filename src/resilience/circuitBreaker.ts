/**
 * Circuit breaker state
 */
export type CircuitState = "closed" | "open" | "half-open";

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold?: number;
  coolDownMs?: number;
  halfOpenMaxAttempts?: number;
}

/**
 * Default circuit breaker configuration
 */
const DEFAULT_CONFIG: Required<CircuitBreakerConfig> = {
  failureThreshold: 5,
  coolDownMs: 20_000,
  halfOpenMaxAttempts: 2,
};

/**
 * Circuit breaker state machine
 * Prevents cascading failures by stopping requests after repeated failures
 */
export class CircuitBreaker {
  private state: CircuitState = "closed";
  private failureCount = 0;
  private lastFailureTime: number | null = null;
  private halfOpenAttempts = 0;
  private openCount = 0;

  constructor(private config: CircuitBreakerConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Execute a function with circuit breaker protection
   * @param key - Unique key for this circuit (for logging/monitoring)
   * @param fn - Function to execute
   * @returns Result of the function
   * @throws Error if circuit is open or function fails
   */
  async execute<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // Check if we should attempt to close the circuit
    if (this.state === "open") {
      const now = Date.now();
      if (this.lastFailureTime && now - this.lastFailureTime >= this.config.coolDownMs!) {
        // Move to half-open state
        this.state = "half-open";
        this.halfOpenAttempts = 0;
      } else {
        throw new Error(`Circuit breaker is OPEN for ${key}. Please retry later.`);
      }
    }

    // Half-open state: allow limited attempts
    if (this.state === "half-open") {
      if (this.halfOpenAttempts >= this.config.halfOpenMaxAttempts!) {
        // Too many attempts in half-open, go back to open
        this.state = "open";
        this.lastFailureTime = Date.now();
        throw new Error(`Circuit breaker HALF-OPEN limit reached for ${key}`);
      }
      this.halfOpenAttempts++;
    }

    try {
      const result = await fn();

      // Success: reset state
      if (this.state === "half-open") {
        // Success in half-open: close the circuit
        this.state = "closed";
        this.failureCount = 0;
        this.halfOpenAttempts = 0;
        this.lastFailureTime = null;
      } else if (this.state === "closed") {
        // Success in closed: reset failure count
        this.failureCount = 0;
      }

      return result;
    } catch (error) {
      // Failure: increment counter
      this.failureCount++;
      this.lastFailureTime = Date.now();

      // Check if we should open the circuit
      if (this.state === "closed" && this.failureCount >= this.config.failureThreshold!) {
        this.state = "open";
        this.openCount++;
      } else if (this.state === "half-open") {
        // Failure in half-open: go back to open
        this.state = "open";
        this.lastFailureTime = Date.now();
      }

      throw error;
    }
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get circuit breaker statistics
   */
  getStats() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      openCount: this.openCount,
      lastFailureTime: this.lastFailureTime,
      halfOpenAttempts: this.halfOpenAttempts,
    };
  }

  /**
   * Reset circuit breaker (for testing)
   */
  reset(): void {
    this.state = "closed";
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.halfOpenAttempts = 0;
    this.openCount = 0;
  }
}

/**
 * Global circuit breaker instances (one per service)
 */
const circuitBreakers = new Map<string, CircuitBreaker>();

/**
 * Get or create a circuit breaker instance for a given key
 */
export function getCircuitBreaker(key: string, config?: CircuitBreakerConfig): CircuitBreaker {
  if (!circuitBreakers.has(key)) {
    circuitBreakers.set(key, new CircuitBreaker(config));
  }
  return circuitBreakers.get(key)!;
}
