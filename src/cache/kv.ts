import type { CacheProvider } from "./index.js";

/**
 * Vercel KV cache provider
 * Uses Vercel KV for distributed caching
 */
export class VercelKVProvider implements CacheProvider {
  private kv: any;

  constructor() {
    try {
      // Lazy load @vercel/kv to avoid errors if not installed
      const kvModule = require("@vercel/kv");
      this.kv = kvModule.kv;
    } catch (error) {
      throw new Error(
        "@vercel/kv is required for KV cache backend. Install it with: npm i @vercel/kv"
      );
    }
  }

  async get<T>(key: string): Promise<T | undefined> {
    try {
      const value = await this.kv.get(key);
      return (value ?? undefined) as T | undefined;
    } catch (error) {
      // Log error but don't fail the request
      console.error("KV cache get error:", error);
      return undefined;
    }
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    try {
      if (ttlMs !== undefined) {
        // Convert milliseconds to seconds for KV
        const ttlSeconds = Math.floor(ttlMs / 1000);
        await this.kv.setex(key, ttlSeconds, value);
      } else {
        await this.kv.set(key, value);
      }
    } catch (error) {
      // Log error but don't fail the request
      console.error("KV cache set error:", error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.kv.del(key);
    } catch (error) {
      console.error("KV cache delete error:", error);
    }
  }

  async clear(): Promise<void> {
    // Vercel KV doesn't have a clear all operation
    // This would require iterating and deleting, which is expensive
    // For now, we'll log a warning
    console.warn("KV cache clear() is not supported. Use delete() for specific keys.");
  }
}
