import { LRUCache } from "lru-cache";
import type { CacheProvider } from "./index.js";

export interface LRUCacheOptions {
  maxSize?: number;
  ttl?: number;
}

/**
 * LRU in-memory cache provider
 * Uses lru-cache for efficient memory management
 */
export class LRUCacheProvider implements CacheProvider {
  private cache: LRUCache<string, any>;

  constructor(options: LRUCacheOptions = {}) {
    const { maxSize = 1000, ttl = 60_000 } = options;

    this.cache = new LRUCache<string, any>({
      max: maxSize,
      ttl: ttl,
      updateAgeOnGet: false,
      updateAgeOnHas: false,
    });
  }

  async get<T>(key: string): Promise<T | undefined> {
    const value = this.cache.get(key);
    return value as T | undefined;
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    if (ttlMs !== undefined) {
      this.cache.set(key, value, { ttl: ttlMs });
    } else {
      this.cache.set(key, value);
    }
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  /**
   * Get cache statistics (for monitoring)
   */
  getStats() {
    return {
      size: this.cache.size,
      calculatedSize: this.cache.calculatedSize,
    };
  }
}
