import { AsyncLocalStorage } from "async_hooks";

/**
 * AsyncLocalStorage for request ID tracking
 * Enables request-scoped tracing throughout the application
 */
const requestIdStorage = new AsyncLocalStorage<string>();

/**
 * Get the current request ID from context
 * @returns Request ID or undefined if not in request context
 */
export function getRequestId(): string | undefined {
  return requestIdStorage.getStore();
}

/**
 * Run a function with a request ID context
 * @param requestId - Unique request identifier
 * @param fn - Function to execute in the context
 */
export function withRequestId<T>(requestId: string, fn: () => T): T {
  return requestIdStorage.run(requestId, fn);
}

/**
 * Generate a unique request ID
 * @returns UUID-like string
 */
export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

