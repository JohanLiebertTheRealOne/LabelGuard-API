import type { EnvConfig } from "../config/env.js";

/**
 * Cache provider interface
 */
export interface CacheProvider {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttlMs?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

let cacheProvider: CacheProvider | null = null;

/**
 * Get cache provider instance (singleton)
 * Chooses implementation based on CACHE_BACKEND env var
 */
export function getCacheProvider(config?: EnvConfig): CacheProvider {
  if (cacheProvider) {
    return cacheProvider;
  }

  // Dynamic import to avoid loading all implementations
  const backend = config?.CACHE_BACKEND || process.env.CACHE_BACKEND || "lru";

  switch (backend) {
    case "kv": {
      try {
        // Lazy load Vercel KV
        const { VercelKVProvider } = require("./kv.js");
        cacheProvider = new VercelKVProvider();
      } catch (error) {
        throw new Error("@vercel/kv is required for KV cache backend. Install it with: npm i @vercel/kv");
      }
      break;
    }
    case "redis": {
      try {
        // Lazy load Redis
        const { RedisProvider } = require("./redis.js");
        const redisUrl = config?.REDIS_URL || process.env.REDIS_URL;
        if (!redisUrl) {
          throw new Error("REDIS_URL is required when CACHE_BACKEND=redis");
        }
        cacheProvider = new RedisProvider(redisUrl);
      } catch (error) {
        throw new Error("ioredis is required for Redis cache backend. Install it with: npm i ioredis");
      }
      break;
    }
    case "lru":
    default: {
      // Default: LRU in-memory cache
      const { LRUCacheProvider } = require("./lru.js");
      const maxSize = config?.CACHE_MAX_SIZE || parseInt(process.env.CACHE_MAX_SIZE || "1000", 10);
      const ttl = config?.CACHE_TTL_MS || parseInt(process.env.CACHE_TTL_MS || "60000", 10);
      cacheProvider = new LRUCacheProvider({ maxSize, ttl });
      break;
    }
  }

  if (!cacheProvider) {
    throw new Error("Failed to initialize cache provider");
  }

  return cacheProvider;
}
