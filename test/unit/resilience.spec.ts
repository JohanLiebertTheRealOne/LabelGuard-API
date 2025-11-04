import { describe, it, expect, vi, beforeEach } from "vitest";
import { retryWithBackoff } from "../../src/resilience/retry.js";
import { CircuitBreaker } from "../../src/resilience/circuitBreaker.js";

describe("Resilience", () => {
  describe("retryWithBackoff", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it("should succeed on first attempt", async () => {
      const fn = vi.fn().mockResolvedValue("success");
      const result = await retryWithBackoff(fn);
      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should retry on network error", async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error("ECONNREFUSED"))
        .mockRejectedValueOnce(new Error("ECONNREFUSED"))
        .mockResolvedValueOnce("success");

      const promise = retryWithBackoff(fn, { maxAttempts: 3, baseDelayMs: 10 });
      
      // Advance timers to allow retries
      await vi.advanceTimersByTimeAsync(100);
      
      const result = await promise;
      expect(result).toBe("success");
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it("should not retry on non-retryable error", async () => {
      const fn = vi.fn().mockRejectedValue(new Error("Validation failed"));
      
      await expect(retryWithBackoff(fn)).rejects.toThrow("Validation failed");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should throw after max attempts", async () => {
      const fn = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
      
      const promise = retryWithBackoff(fn, { maxAttempts: 3, baseDelayMs: 10 });
      await vi.advanceTimersByTimeAsync(1000);
      
      await expect(promise).rejects.toThrow("ECONNREFUSED");
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });

  describe("CircuitBreaker", () => {
    it("should start in closed state", () => {
      const breaker = new CircuitBreaker();
      expect(breaker.getState()).toBe("closed");
    });

    it("should open after failure threshold", async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 3 });
      const fn = vi.fn().mockRejectedValue(new Error("Service down"));

      // Trigger failures
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute("test", fn);
        } catch {
          // Expected
        }
      }

      expect(breaker.getState()).toBe("open");
      
      // Should throw immediately when open
      await expect(breaker.execute("test", vi.fn())).rejects.toThrow("Circuit breaker is OPEN");
    });

    it("should transition to half-open after cooldown", async () => {
      vi.useFakeTimers();
      const breaker = new CircuitBreaker({ 
        failureThreshold: 2, 
        coolDownMs: 100 
      });
      const fn = vi.fn().mockRejectedValue(new Error("Service down"));

      // Open the circuit
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute("test", fn);
        } catch {
          // Expected
        }
      }

      expect(breaker.getState()).toBe("open");

      // Advance time past cooldown
      vi.advanceTimersByTime(150);

      // Should transition to half-open
      const successFn = vi.fn().mockResolvedValue("success");
      const result = await breaker.execute("test", successFn);
      
      expect(result).toBe("success");
      expect(breaker.getState()).toBe("closed");
    });

    it("should reset failure count on success", async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 3 });
      const failFn = vi.fn().mockRejectedValue(new Error("Error"));
      const successFn = vi.fn().mockResolvedValue("success");

      // One failure
      try {
        await breaker.execute("test", failFn);
      } catch {
        // Expected
      }

      // Success should reset
      await breaker.execute("test", successFn);
      const stats = breaker.getStats();
      expect(stats.failureCount).toBe(0);
    });
  });
});
