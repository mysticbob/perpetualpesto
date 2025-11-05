import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getCacheService, CacheService } from './cache'

describe('CacheService', () => {
  let cache: CacheService

  beforeEach(() => {
    // Get fresh cache instance for each test
    cache = getCacheService()
  })

  afterEach(async () => {
    // Clear cache after each test
    await cache.clear()
  })

  describe('Basic get/set operations', () => {
    it('should set and get a value', async () => {
      await cache.set('test-key', 'test-value')

      const result = await cache.get('test-key')
      expect(result).toBe('test-value')
    })

    it('should return null for non-existent key', async () => {
      const result = await cache.get('non-existent')
      expect(result).toBeNull()
    })

    it('should handle different value types', async () => {
      // String
      await cache.set('string', 'hello')
      expect(await cache.get('string')).toBe('hello')

      // Number
      await cache.set('number', 42)
      expect(await cache.get('number')).toBe(42)

      // Boolean
      await cache.set('boolean', true)
      expect(await cache.get('boolean')).toBe(true)

      // Object
      const obj = { name: 'test', count: 10 }
      await cache.set('object', obj)
      expect(await cache.get('object')).toEqual(obj)

      // Array
      const arr = [1, 2, 3]
      await cache.set('array', arr)
      expect(await cache.get('array')).toEqual(arr)
    })

    it('should overwrite existing value', async () => {
      await cache.set('key', 'value1')
      await cache.set('key', 'value2')

      const result = await cache.get('key')
      expect(result).toBe('value2')
    })
  })

  describe('TTL (Time To Live)', () => {
    it('should set custom TTL', async () => {
      await cache.set('short-lived', 'value', { ttl: 100 })

      // Should exist immediately
      const result1 = await cache.get('short-lived')
      expect(result1).toBe('value')

      // Should still exist after 50ms
      await new Promise(resolve => setTimeout(resolve, 50))
      const result2 = await cache.get('short-lived')
      expect(result2).toBe('value')

      // Should expire after 150ms
      await new Promise(resolve => setTimeout(resolve, 100))
      const result3 = await cache.get('short-lived')
      expect(result3).toBeNull()
    })

    it('should use default TTL when not specified', async () => {
      await cache.set('default-ttl', 'value')

      // Should exist for at least a few seconds
      const result = await cache.get('default-ttl')
      expect(result).toBe('value')
    })
  })

  describe('Delete operations', () => {
    it('should delete a single key', async () => {
      await cache.set('to-delete', 'value')

      await cache.delete('to-delete')

      const result = await cache.get('to-delete')
      expect(result).toBeNull()
    })

    it('should not error when deleting non-existent key', async () => {
      await expect(cache.delete('non-existent')).resolves.not.toThrow()
    })

    it('should delete keys by pattern', async () => {
      await cache.set('recipe:1', 'value1')
      await cache.set('recipe:2', 'value2')
      await cache.set('user:1', 'value3')

      await cache.deletePattern('recipe:*')

      expect(await cache.get('recipe:1')).toBeNull()
      expect(await cache.get('recipe:2')).toBeNull()
      expect(await cache.get('user:1')).toBe('value3')
    })

    it('should delete all keys matching complex pattern', async () => {
      await cache.set('api:recipes:list', 'list')
      await cache.set('api:recipes:detail:1', 'detail1')
      await cache.set('api:recipes:detail:2', 'detail2')
      await cache.set('api:users:list', 'users')

      await cache.deletePattern('api:recipes:*')

      expect(await cache.get('api:recipes:list')).toBeNull()
      expect(await cache.get('api:recipes:detail:1')).toBeNull()
      expect(await cache.get('api:recipes:detail:2')).toBeNull()
      expect(await cache.get('api:users:list')).toBe('users')
    })
  })

  describe('Clear operation', () => {
    it('should clear all cache entries', async () => {
      await cache.set('key1', 'value1')
      await cache.set('key2', 'value2')
      await cache.set('key3', 'value3')

      await cache.clear()

      expect(await cache.get('key1')).toBeNull()
      expect(await cache.get('key2')).toBeNull()
      expect(await cache.get('key3')).toBeNull()
    })
  })

  describe('getOrCompute', () => {
    it('should compute value when not in cache', async () => {
      const compute = vi.fn(async () => 'computed-value')

      const result = await cache.getOrCompute('compute-key', compute)

      expect(result).toBe('computed-value')
      expect(compute).toHaveBeenCalledTimes(1)
    })

    it('should return cached value without computing', async () => {
      const compute = vi.fn(async () => 'computed-value')

      // First call - should compute
      const result1 = await cache.getOrCompute('compute-key', compute)
      expect(result1).toBe('computed-value')
      expect(compute).toHaveBeenCalledTimes(1)

      // Second call - should use cache
      const result2 = await cache.getOrCompute('compute-key', compute)
      expect(result2).toBe('computed-value')
      expect(compute).toHaveBeenCalledTimes(1) // Still 1, not called again
    })

    it('should compute and cache complex objects', async () => {
      const expensiveData = {
        recipes: ['Recipe 1', 'Recipe 2'],
        count: 2,
        timestamp: Date.now()
      }

      const compute = vi.fn(async () => expensiveData)

      const result1 = await cache.getOrCompute('recipes-list', compute)
      expect(result1).toEqual(expensiveData)
      expect(compute).toHaveBeenCalledTimes(1)

      const result2 = await cache.getOrCompute('recipes-list', compute)
      expect(result2).toEqual(expensiveData)
      expect(compute).toHaveBeenCalledTimes(1)
    })

    it('should handle async compute functions', async () => {
      const compute = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return 'async-result'
      })

      const result = await cache.getOrCompute('async-key', compute)

      expect(result).toBe('async-result')
      expect(compute).toHaveBeenCalledTimes(1)
    })

    it('should respect custom TTL in getOrCompute', async () => {
      const compute = vi.fn(async () => 'value')

      await cache.getOrCompute('ttl-key', compute, { ttl: 100 })

      expect(await cache.get('ttl-key')).toBe('value')

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150))

      // Should recompute after expiration
      await cache.getOrCompute('ttl-key', compute)
      expect(compute).toHaveBeenCalledTimes(2)
    })
  })

  describe('wrap helper', () => {
    it('should wrap function with caching', async () => {
      let callCount = 0
      const expensiveFunction = async (id: string) => {
        callCount++
        return `result-${id}`
      }

      const cachedFn = cache.wrap(expensiveFunction)

      // First call
      const result1 = await cachedFn('123')
      expect(result1).toBe('result-123')
      expect(callCount).toBe(1)

      // Second call with same arg - should use cache
      const result2 = await cachedFn('123')
      expect(result2).toBe('result-123')
      expect(callCount).toBe(1)

      // Call with different arg - should compute
      const result3 = await cachedFn('456')
      expect(result3).toBe('result-456')
      expect(callCount).toBe(2)
    })

    it('should use custom key generator', async () => {
      const compute = vi.fn(async (a: number, b: number) => a + b)

      const cachedFn = cache.wrap(compute, {
        keyGenerator: (...args) => `sum:${args.join('+')}`
      })

      const result1 = await cachedFn(2, 3)
      expect(result1).toBe(5)
      expect(compute).toHaveBeenCalledTimes(1)

      // Should hit cache
      const result2 = await cachedFn(2, 3)
      expect(result2).toBe(5)
      expect(compute).toHaveBeenCalledTimes(1)

      // Different args, should compute
      const result3 = await cachedFn(4, 5)
      expect(result3).toBe(9)
      expect(compute).toHaveBeenCalledTimes(2)
    })
  })

  describe('Statistics', () => {
    it('should return cache stats', () => {
      const stats = cache.getStats()

      expect(stats).toHaveProperty('memory')
      expect(stats).toHaveProperty('redis')

      expect(stats.memory).toHaveProperty('enabled')
      expect(stats.memory).toHaveProperty('size')
      expect(stats.memory).toHaveProperty('max')

      expect(stats.redis).toHaveProperty('enabled')
      expect(stats.redis).toHaveProperty('connected')
    })

    it('should track cache size', async () => {
      await cache.set('key1', 'value1')
      await cache.set('key2', 'value2')

      const stats = cache.getStats()

      // Memory cache should have entries
      expect(stats.memory.size).toBeGreaterThan(0)
    })
  })

  describe('Singleton pattern', () => {
    it('should return same instance', () => {
      const cache1 = getCacheService()
      const cache2 = getCacheService()

      expect(cache1).toBe(cache2)
    })

    it('should share cache between instances', async () => {
      const cache1 = getCacheService()
      const cache2 = getCacheService()

      await cache1.set('shared-key', 'shared-value')

      const result = await cache2.get('shared-key')
      expect(result).toBe('shared-value')
    })
  })

  describe('Real-world scenarios', () => {
    it('should cache database query results', async () => {
      const dbQuery = vi.fn(async (userId: string) => ({
        id: userId,
        name: 'John Doe',
        email: 'john@example.com'
      }))

      const getUserCached = cache.wrap(dbQuery, {
        keyGenerator: (userId) => `user:${userId}`,
        ttl: 300000 // 5 minutes
      })

      // First call - hits database
      const user1 = await getUserCached('123')
      expect(user1).toEqual({ id: '123', name: 'John Doe', email: 'john@example.com' })
      expect(dbQuery).toHaveBeenCalledTimes(1)

      // Second call - from cache
      const user2 = await getUserCached('123')
      expect(user2).toEqual({ id: '123', name: 'John Doe', email: 'john@example.com' })
      expect(dbQuery).toHaveBeenCalledTimes(1)
    })

    it('should cache API responses', async () => {
      const apiCall = vi.fn(async (recipeId: string) => ({
        id: recipeId,
        title: 'Chocolate Cake',
        ingredients: ['flour', 'sugar', 'cocoa']
      }))

      const getRecipeCached = cache.wrap(apiCall, {
        keyGenerator: (id) => `api:recipe:${id}`
      })

      const recipe1 = await getRecipeCached('456')
      expect(recipe1).toEqual({
        id: '456',
        title: 'Chocolate Cake',
        ingredients: ['flour', 'sugar', 'cocoa']
      })
      expect(apiCall).toHaveBeenCalledTimes(1)

      const recipe2 = await getRecipeCached('456')
      expect(apiCall).toHaveBeenCalledTimes(1) // Still 1
    })

    it('should invalidate cache on data update', async () => {
      await cache.set('recipe:123', { title: 'Old Recipe' })

      // Simulate data update
      await cache.delete('recipe:123')
      await cache.set('recipe:123', { title: 'Updated Recipe' })

      const result = await cache.get('recipe:123')
      expect(result).toEqual({ title: 'Updated Recipe' })
    })

    it('should invalidate related caches with pattern', async () => {
      // Cache recipe list and individual recipes
      await cache.set('recipes:list', ['1', '2', '3'])
      await cache.set('recipe:1', { id: '1', title: 'Recipe 1' })
      await cache.set('recipe:2', { id: '2', title: 'Recipe 2' })
      await cache.set('recipe:3', { id: '3', title: 'Recipe 3' })

      // When a recipe is deleted, invalidate all recipe caches
      await cache.deletePattern('recipe*')

      expect(await cache.get('recipes:list')).toBeNull()
      expect(await cache.get('recipe:1')).toBeNull()
      expect(await cache.get('recipe:2')).toBeNull()
      expect(await cache.get('recipe:3')).toBeNull()
    })
  })

  describe('Performance', () => {
    it('should be faster than recomputing', async () => {
      const slowCompute = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
        return 'result'
      })

      // First call - slow
      const start1 = Date.now()
      await cache.getOrCompute('perf-test', slowCompute)
      const duration1 = Date.now() - start1

      // Second call - from cache (should be much faster)
      const start2 = Date.now()
      await cache.getOrCompute('perf-test', slowCompute)
      const duration2 = Date.now() - start2

      // Cache access should be at least 10x faster
      expect(duration2).toBeLessThan(duration1 / 10)
      expect(slowCompute).toHaveBeenCalledTimes(1)
    })
  })
})
