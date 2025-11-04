import type { CacheProvider } from "./index.js";

/**
 * Redis cache provider
 * Uses ioredis for Redis caching
 */
export class RedisProvider implements CacheProvider {
  private redis: any;

  constructor(redisUrl: string) {
    try {
      // Lazy load ioredis
      const Redis = require("ioredis");
      this.redis = new Redis(redisUrl);
    } catch (error) {
      throw new Error(
        "ioredis is required for Redis cache backend. Install it with: npm i ioredis"
      );
    }
  }

  async get<T>(key: string): Promise<T | undefined> {
    try {
      const value = await this.redis.get(key);
      if (value === null) {
        return undefined;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      console.error("Redis cache get error:", error);
      return undefined;
    }
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlMs !== undefined) {
        const ttlSeconds = Math.floor(ttlMs / 1000);
        await this.redis.setex(key, ttlSeconds, serialized);
      } else {
        await this.redis.set(key, serialized);
      }
    } catch (error) {
      console.error("Redis cache set error:", error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error("Redis cache delete error:", error);
    }
  }

  async clear(): Promise<void> {
    try {
      await this.redis.flushdb();
    } catch (error) {
      console.error("Redis cache clear error:", error);
    }
  }

  /**
   * Close Redis connection
   */
  async disconnect(): Promise<void> {
    await this.redis.quit();
  }
}
