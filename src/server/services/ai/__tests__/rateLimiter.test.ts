import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RateLimiter } from '../rateLimiter';
import type { RateLimitConfig } from '../rateLimiter';

describe('RateLimiter', () => {
  let limiter: RateLimiter;
  const testConfig: RateLimitConfig = {
    maxRequests: 5,
    windowMs: 1000, // 1 second for fast tests
    maxTokensPerWindow: 1000,
  };

  beforeEach(() => {
    limiter = new RateLimiter(testConfig);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Request Limiting', () => {
    it('should allow requests within limit', async () => {
      const userId = 'test-user-1';

      for (let i = 0; i < testConfig.maxRequests; i++) {
        const result = await limiter.checkLimit(userId, 100);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(testConfig.maxRequests - (i + 1));
      }
    });

    it('should block requests exceeding limit', async () => {
      const userId = 'test-user-2';

      // Use up all allowed requests
      for (let i = 0; i < testConfig.maxRequests; i++) {
        await limiter.checkLimit(userId, 100);
      }

      // Next request should be blocked
      const result = await limiter.checkLimit(userId, 100);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.reason).toBe('Request limit exceeded');
    });

    it('should provide correct reset time', async () => {
      const userId = 'test-user-3';
      const startTime = Date.now();

      await limiter.checkLimit(userId, 100);

      const result = await limiter.checkLimit(userId, 100);
      expect(result.resetAt).toBe(startTime + testConfig.windowMs);
    });
  });

  describe('Token Limiting', () => {
    it('should allow requests within token limit', async () => {
      const userId = 'test-user-4';

      const result = await limiter.checkLimit(userId, 500);
      expect(result.allowed).toBe(true);

      const result2 = await limiter.checkLimit(userId, 400);
      expect(result2.allowed).toBe(true);
    });

    it('should block requests exceeding token limit', async () => {
      const userId = 'test-user-5';

      await limiter.checkLimit(userId, 800);

      // This should exceed the 1000 token limit
      const result = await limiter.checkLimit(userId, 300);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Token limit exceeded');
    });

    it('should track token usage correctly', async () => {
      const userId = 'test-user-6';

      await limiter.checkLimit(userId, 100);
      await limiter.checkLimit(userId, 200);
      await limiter.checkLimit(userId, 300);

      const usage = limiter.getUsage(userId);
      expect(usage?.tokens).toBe(600);
    });
  });

  describe('Window Reset', () => {
    it('should reset limits after window expires', async () => {
      const userId = 'test-user-7';

      // Use up all requests
      for (let i = 0; i < testConfig.maxRequests; i++) {
        await limiter.checkLimit(userId, 100);
      }

      // Should be blocked
      let result = await limiter.checkLimit(userId, 100);
      expect(result.allowed).toBe(false);

      // Advance time past window
      vi.advanceTimersByTime(testConfig.windowMs + 1);

      // Should be allowed again
      result = await limiter.checkLimit(userId, 100);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(testConfig.maxRequests - 1);
    });

    it('should reset token count after window expires', async () => {
      const userId = 'test-user-8';

      await limiter.checkLimit(userId, 1000);

      // Should be blocked (at token limit)
      let result = await limiter.checkLimit(userId, 100);
      expect(result.allowed).toBe(false);

      // Advance time past window
      vi.advanceTimersByTime(testConfig.windowMs + 1);

      // Should be allowed with reset tokens
      result = await limiter.checkLimit(userId, 100);
      expect(result.allowed).toBe(true);
    });
  });

  describe('Multi-User Isolation', () => {
    it('should track different users separately', async () => {
      const user1 = 'user-1';
      const user2 = 'user-2';

      // User 1 uses all requests
      for (let i = 0; i < testConfig.maxRequests; i++) {
        await limiter.checkLimit(user1, 100);
      }

      const user1Result = await limiter.checkLimit(user1, 100);
      expect(user1Result.allowed).toBe(false);

      // User 2 should still have full quota
      const user2Result = await limiter.checkLimit(user2, 100);
      expect(user2Result.allowed).toBe(true);
      expect(user2Result.remaining).toBe(testConfig.maxRequests - 1);
    });
  });

  describe('Usage Tracking', () => {
    it('should return usage information', async () => {
      const userId = 'test-user-9';

      await limiter.checkLimit(userId, 100);
      await limiter.checkLimit(userId, 200);

      const usage = limiter.getUsage(userId);

      expect(usage).toBeDefined();
      expect(usage?.requests).toBe(2);
      expect(usage?.tokens).toBe(300);
      expect(usage?.windowStart).toBeDefined();
      expect(usage?.lastRequest).toBeDefined();
    });

    it('should return undefined for unknown user', () => {
      const usage = limiter.getUsage('unknown-user');
      expect(usage).toBeUndefined();
    });
  });

  describe('Reset Functionality', () => {
    it('should reset specific user limits', async () => {
      const userId = 'test-user-10';

      // Use up requests
      for (let i = 0; i < testConfig.maxRequests; i++) {
        await limiter.checkLimit(userId, 100);
      }

      // Should be blocked
      let result = await limiter.checkLimit(userId, 100);
      expect(result.allowed).toBe(false);

      // Reset user
      limiter.reset(userId);

      // Should be allowed now
      result = await limiter.checkLimit(userId, 100);
      expect(result.allowed).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should clean up old user entries', async () => {
      const oldUser = 'old-user';
      const recentUser = 'recent-user';

      // Create old user entry
      await limiter.checkLimit(oldUser, 100);

      // Advance time beyond 2x window
      vi.advanceTimersByTime(testConfig.windowMs * 2 + 1);

      // Create recent user entry
      await limiter.checkLimit(recentUser, 100);

      // Run cleanup
      limiter.cleanup();

      // Old user should be removed
      expect(limiter.getUsage(oldUser)).toBeUndefined();

      // Recent user should still exist
      expect(limiter.getUsage(recentUser)).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero token estimate', async () => {
      const userId = 'test-user-11';

      const result = await limiter.checkLimit(userId, 0);
      expect(result.allowed).toBe(true);
    });

    it('should handle negative token estimate gracefully', async () => {
      const userId = 'test-user-12';

      const result = await limiter.checkLimit(userId, -100);
      expect(result.allowed).toBe(true);
    });

    it('should handle very large token estimates', async () => {
      const userId = 'test-user-13';

      const result = await limiter.checkLimit(userId, 999999);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Token limit exceeded');
    });
  });

  describe('Configuration Without Token Limits', () => {
    it('should work without token limiting', async () => {
      const limiterNoTokens = new RateLimiter({
        maxRequests: 3,
        windowMs: 1000,
      });

      const userId = 'test-user-14';

      // Should only check request limit, not tokens
      for (let i = 0; i < 3; i++) {
        const result = await limiterNoTokens.checkLimit(userId, 999999);
        expect(result.allowed).toBe(true);
      }

      // Fourth request should be blocked
      const result = await limiterNoTokens.checkLimit(userId, 999999);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Request limit exceeded');
    });
  });
});
