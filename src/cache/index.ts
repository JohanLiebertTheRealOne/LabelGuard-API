import type { EnvConfig } from "../config/env.js";
import { LRUCacheProvider } from "./lru.js";

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
 * 
 * Note: KV and Redis are optional dependencies, so they may not be available.
 * If they're not available, falls back to LRU cache.
 */
export async function getCacheProvider(config?: EnvConfig): Promise<CacheProvider> {
  if (cacheProvider) {
    return cacheProvider;
  }

  const backend = config?.CACHE_BACKEND || process.env.CACHE_BACKEND || "lru";
  const maxSize = config?.CACHE_MAX_SIZE || parseInt(process.env.CACHE_MAX_SIZE || "1000", 10);
  const ttl = config?.CACHE_TTL_MS || parseInt(process.env.CACHE_TTL_MS || "60000", 10);

  switch (backend) {
    case "kv": {
      // KV is optional - try dynamic import, fallback to LRU
      try {
        const { VercelKVProvider } = await import("./kv.js");
        cacheProvider = new VercelKVProvider();
      } catch {
        // Fallback to LRU if KV not available
        console.warn("Vercel KV not available, falling back to LRU cache");
        cacheProvider = new LRUCacheProvider({ maxSize, ttl });
      }
      break;
    }
    case "redis": {
      // Redis is optional - try dynamic import, fallback to LRU
      try {
        const redisUrl = config?.REDIS_URL || process.env.REDIS_URL;
        if (!redisUrl) {
          throw new Error("REDIS_URL is required when CACHE_BACKEND=redis");
        }
        const { RedisProvider } = await import("./redis.js");
        cacheProvider = new RedisProvider(redisUrl);
      } catch (error) {
        // Fallback to LRU if Redis not available
        console.warn("Redis not available, falling back to LRU cache:", error instanceof Error ? error.message : String(error));
        cacheProvider = new LRUCacheProvider({ maxSize, ttl });
      }
      break;
    }
    case "lru":
    default: {
      // Default: LRU in-memory cache
      cacheProvider = new LRUCacheProvider({ maxSize, ttl });
      break;
    }
  }

  if (!cacheProvider) {
    throw new Error("Failed to initialize cache provider");
  }

  return cacheProvider;
}
