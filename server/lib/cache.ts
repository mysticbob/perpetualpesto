/**
 * High-performance caching layer using Redis and in-memory LRU cache
 * Provides multi-tier caching for optimal performance
 */

import { Redis } from 'ioredis'
import { LRUCache } from 'lru-cache'

interface CacheConfig {
  enableRedis: boolean
  enableMemoryCache: boolean
  defaultTTL: number // seconds
  redisUrl?: string
}

interface CacheOptions {
  ttl?: number // seconds
  skipMemory?: boolean
  skipRedis?: boolean
}

class CacheService {
  private redis: Redis | null = null
  private memoryCache: LRUCache<string, any>
  private config: CacheConfig
  private isRedisConnected = false

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      enableRedis: process.env.REDIS_ENABLED === 'true',
      enableMemoryCache: true,
      defaultTTL: 300, // 5 minutes
      redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
      ...config,
    }

    // Initialize in-memory LRU cache
    this.memoryCache = new LRUCache({
      max: 500, // Maximum 500 items
      ttl: this.config.defaultTTL * 1000, // Convert to milliseconds
      updateAgeOnGet: true,
      updateAgeOnHas: true,
    })

    // Initialize Redis if enabled
    if (this.config.enableRedis) {
      this.initializeRedis()
    }
  }

  private initializeRedis() {
    try {
      this.redis = new Redis(this.config.redisUrl!, {
        retryStrategy: (times) => {
          if (times > 3) {
            console.warn('Redis connection failed after 3 retries. Falling back to memory cache.')
            return null // Stop retrying
          }
          return Math.min(times * 100, 2000) // Exponential backoff
        },
        lazyConnect: true,
        enableReadyCheck: true,
      })

      this.redis.on('connect', () => {
        console.log('✅ Redis cache connected')
        this.isRedisConnected = true
      })

      this.redis.on('error', (err) => {
        console.error('❌ Redis error:', err.message)
        this.isRedisConnected = false
      })

      this.redis.on('close', () => {
        console.warn('⚠️ Redis connection closed')
        this.isRedisConnected = false
      })

      // Connect to Redis
      this.redis.connect().catch((err) => {
        console.error('Failed to connect to Redis:', err.message)
      })
    } catch (error) {
      console.error('Redis initialization failed:', error)
    }
  }

  /**
   * Get value from cache (tries memory first, then Redis)
   */
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    // Try memory cache first
    if (this.config.enableMemoryCache && !options.skipMemory) {
      const memValue = this.memoryCache.get(key)
      if (memValue !== undefined) {
        return memValue as T
      }
    }

    // Try Redis if memory miss
    if (this.isRedisConnected && this.redis && !options.skipRedis) {
      try {
        const redisValue = await this.redis.get(key)
        if (redisValue) {
          const parsed = JSON.parse(redisValue)
          // Populate memory cache
          if (this.config.enableMemoryCache) {
            this.memoryCache.set(key, parsed)
          }
          return parsed as T
        }
      } catch (error) {
        console.error('Redis get error:', error)
      }
    }

    return null
  }

  /**
   * Set value in cache (writes to both memory and Redis)
   */
  async set(key: string, value: any, options: CacheOptions = {}): Promise<void> {
    const ttl = options.ttl || this.config.defaultTTL

    // Set in memory cache
    if (this.config.enableMemoryCache && !options.skipMemory) {
      this.memoryCache.set(key, value, { ttl: ttl * 1000 })
    }

    // Set in Redis
    if (this.isRedisConnected && this.redis && !options.skipRedis) {
      try {
        await this.redis.setex(key, ttl, JSON.stringify(value))
      } catch (error) {
        console.error('Redis set error:', error)
      }
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    // Delete from memory
    if (this.config.enableMemoryCache) {
      this.memoryCache.delete(key)
    }

    // Delete from Redis
    if (this.isRedisConnected && this.redis) {
      try {
        await this.redis.del(key)
      } catch (error) {
        console.error('Redis delete error:', error)
      }
    }
  }

  /**
   * Delete all keys matching a pattern (Redis only)
   */
  async deletePattern(pattern: string): Promise<void> {
    if (this.isRedisConnected && this.redis) {
      try {
        const keys = await this.redis.keys(pattern)
        if (keys.length > 0) {
          await this.redis.del(...keys)
        }
      } catch (error) {
        console.error('Redis deletePattern error:', error)
      }
    }

    // For memory cache, clear all if pattern is wildcard
    if (pattern === '*' && this.config.enableMemoryCache) {
      this.memoryCache.clear()
    }
  }

  /**
   * Clear all caches
   */
  async clear(): Promise<void> {
    // Clear memory cache
    if (this.config.enableMemoryCache) {
      this.memoryCache.clear()
    }

    // Clear Redis
    if (this.isRedisConnected && this.redis) {
      try {
        await this.redis.flushdb()
      } catch (error) {
        console.error('Redis clear error:', error)
      }
    }
  }

  /**
   * Get or compute: Try to get from cache, if miss, compute and store
   */
  async getOrCompute<T>(
    key: string,
    computeFn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key, options)
    if (cached !== null) {
      return cached
    }

    const computed = await computeFn()
    await this.set(key, computed, options)
    return computed
  }

  /**
   * Wrap a function with caching
   */
  wrap<T>(
    keyGenerator: (...args: any[]) => string,
    fn: (...args: any[]) => Promise<T>,
    options: CacheOptions = {}
  ) {
    return async (...args: any[]): Promise<T> => {
      const key = keyGenerator(...args)
      return this.getOrCompute(key, () => fn(...args), options)
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      memory: {
        size: this.memoryCache.size,
        max: this.memoryCache.max,
        enabled: this.config.enableMemoryCache,
      },
      redis: {
        connected: this.isRedisConnected,
        enabled: this.config.enableRedis,
      },
    }
  }

  /**
   * Disconnect Redis
   */
  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit()
    }
  }
}

// Singleton instance
let cacheService: CacheService | null = null

export function getCacheService(): CacheService {
  if (!cacheService) {
    cacheService = new CacheService()
  }
  return cacheService
}

export { CacheService, type CacheConfig, type CacheOptions }
