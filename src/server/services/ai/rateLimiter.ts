interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  maxTokensPerWindow?: number;
}

interface UserUsage {
  requests: number;
  tokens: number;
  windowStart: number;
  lastRequest: number;
}

class RateLimiter {
  private usage: Map<string, UserUsage> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  async checkLimit(userId: string, tokenEstimate: number = 0): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: number;
    reason?: string;
  }> {
    const now = Date.now();
    const userUsage = this.usage.get(userId) || {
      requests: 0,
      tokens: 0,
      windowStart: now,
      lastRequest: now,
    };

    // Reset window if expired
    if (now - userUsage.windowStart > this.config.windowMs) {
      userUsage.requests = 0;
      userUsage.tokens = 0;
      userUsage.windowStart = now;
    }

    // Check request limit
    if (userUsage.requests >= this.config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: userUsage.windowStart + this.config.windowMs,
        reason: 'Request limit exceeded',
      };
    }

    // Check token limit if configured
    if (this.config.maxTokensPerWindow && 
        userUsage.tokens + tokenEstimate > this.config.maxTokensPerWindow) {
      return {
        allowed: false,
        remaining: this.config.maxRequests - userUsage.requests,
        resetAt: userUsage.windowStart + this.config.windowMs,
        reason: 'Token limit exceeded',
      };
    }

    // Update usage
    userUsage.requests++;
    userUsage.tokens += tokenEstimate;
    userUsage.lastRequest = now;
    this.usage.set(userId, userUsage);

    return {
      allowed: true,
      remaining: this.config.maxRequests - userUsage.requests,
      resetAt: userUsage.windowStart + this.config.windowMs,
    };
  }

  getUsage(userId: string): UserUsage | undefined {
    return this.usage.get(userId);
  }

  reset(userId: string): void {
    this.usage.delete(userId);
  }

  // Clean up old entries periodically
  cleanup(): void {
    const now = Date.now();
    for (const [userId, usage] of this.usage.entries()) {
      if (now - usage.lastRequest > this.config.windowMs * 2) {
        this.usage.delete(userId);
      }
    }
  }
}

// Create rate limiters for different AI operations
export const chatRateLimiter = new RateLimiter({
  maxRequests: 100,
  windowMs: 60 * 60 * 1000, // 1 hour
  maxTokensPerWindow: 50000,
});

export const visionRateLimiter = new RateLimiter({
  maxRequests: 50,
  windowMs: 60 * 60 * 1000, // 1 hour
  maxTokensPerWindow: 100000,
});

export const embeddingRateLimiter = new RateLimiter({
  maxRequests: 200,
  windowMs: 60 * 60 * 1000, // 1 hour
});

// Cleanup job - run every hour
setInterval(() => {
  chatRateLimiter.cleanup();
  visionRateLimiter.cleanup();
  embeddingRateLimiter.cleanup();
}, 60 * 60 * 1000);

export { RateLimiter, type RateLimitConfig, type UserUsage };