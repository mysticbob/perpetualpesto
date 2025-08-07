import { getOpenAIService } from './openai.service';
import { chatRateLimiter, visionRateLimiter } from './rateLimiter';
import { defaultRetryHandler, handleOpenAIError, AIError, AIErrorCode } from './errorHandler';
import type { ChatMessage, VisionAnalysisRequest, VisionAnalysisResult } from './openai.service';

interface AIServiceConfig {
  enableRateLimiting: boolean;
  enableRetry: boolean;
  enableLogging: boolean;
  cacheEnabled: boolean;
  cacheTTL: number; // in seconds
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class AIService {
  private openAI = getOpenAIService();
  private config: AIServiceConfig;
  private cache = new Map<string, CacheEntry<any>>();

  constructor(config: Partial<AIServiceConfig> = {}) {
    this.config = {
      enableRateLimiting: true,
      enableRetry: true,
      enableLogging: true,
      cacheEnabled: true,
      cacheTTL: 300, // 5 minutes default
      ...config,
    };

    // Clean up cache periodically
    if (this.config.cacheEnabled) {
      setInterval(() => this.cleanCache(), 60000); // Every minute
    }
  }

  async processChat(
    userId: string,
    messages: ChatMessage[],
    systemPrompt?: string
  ): Promise<{
    response: string;
    usage?: {
      tokensUsed: number;
      remaining: number;
    };
  }> {
    try {
      // Check rate limit
      if (this.config.enableRateLimiting) {
        const tokenEstimate = this.estimateTokens(messages);
        const limitCheck = await chatRateLimiter.checkLimit(userId, tokenEstimate);
        
        if (!limitCheck.allowed) {
          throw new AIError(
            limitCheck.reason || 'Rate limit exceeded',
            AIErrorCode.RATE_LIMIT,
            429,
            true,
            limitCheck.resetAt - Date.now()
          );
        }
      }

      // Check cache
      const cacheKey = this.getCacheKey('chat', messages, systemPrompt);
      const cached = this.getFromCache<string>(cacheKey);
      if (cached) {
        this.log('Cache hit for chat request');
        return { response: cached };
      }

      // Process with retry
      const response = await this.executeWithRetry(
        () => this.openAI.chat(messages, systemPrompt),
        'chat'
      );

      // Cache the response
      if (this.config.cacheEnabled && response) {
        this.setCache(cacheKey, response, this.config.cacheTTL);
      }

      // Log usage
      if (this.config.enableLogging) {
        this.logUsage(userId, 'chat', messages);
      }

      return {
        response,
        usage: this.config.enableRateLimiting 
          ? {
              tokensUsed: this.estimateTokens(messages),
              remaining: (await chatRateLimiter.getUsage(userId))?.requests || 0,
            }
          : undefined,
      };
    } catch (error) {
      this.handleError(error, 'chat');
      throw error;
    }
  }

  async analyzeImage(
    userId: string,
    request: VisionAnalysisRequest
  ): Promise<VisionAnalysisResult> {
    try {
      // Check rate limit
      if (this.config.enableRateLimiting) {
        const limitCheck = await visionRateLimiter.checkLimit(userId, 1000);
        
        if (!limitCheck.allowed) {
          throw new AIError(
            limitCheck.reason || 'Rate limit exceeded',
            AIErrorCode.RATE_LIMIT,
            429,
            true,
            limitCheck.resetAt - Date.now()
          );
        }
      }

      // Check cache
      const cacheKey = this.getCacheKey('vision', request);
      const cached = this.getFromCache<VisionAnalysisResult>(cacheKey);
      if (cached) {
        this.log('Cache hit for vision request');
        return cached;
      }

      // Process with retry
      const result = await this.executeWithRetry(
        () => this.openAI.analyzeImage(request),
        'vision'
      );

      // Cache the result
      if (this.config.cacheEnabled && result) {
        this.setCache(cacheKey, result, this.config.cacheTTL * 2); // Longer cache for images
      }

      // Log usage
      if (this.config.enableLogging) {
        this.logUsage(userId, 'vision', request);
      }

      return result;
    } catch (error) {
      this.handleError(error, 'vision');
      throw error;
    }
  }

  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    operation: string
  ): Promise<T> {
    if (!this.config.enableRetry) {
      return fn();
    }

    return defaultRetryHandler.execute(
      fn,
      (attempt, error) => {
        this.log(`Retry attempt ${attempt} for ${operation}: ${error.message}`);
      }
    );
  }

  private estimateTokens(messages: ChatMessage[]): number {
    const text = messages.map(m => m.content).join(' ');
    return this.openAI.getTokenEstimate(text);
  }

  private getCacheKey(type: string, ...args: any[]): string {
    return `${type}:${JSON.stringify(args)}`;
  }

  private getFromCache<T>(key: string): T | null {
    if (!this.config.cacheEnabled) return null;

    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl * 1000) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  private setCache<T>(key: string, data: T, ttl: number): void {
    if (!this.config.cacheEnabled) return;

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  private cleanCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl * 1000) {
        this.cache.delete(key);
      }
    }
  }

  private log(message: string, data?: any): void {
    if (!this.config.enableLogging) return;
    console.log(`[AI Service] ${message}`, data || '');
  }

  private logUsage(userId: string, operation: string, data: any): void {
    if (!this.config.enableLogging) return;
    
    const usage = {
      userId,
      operation,
      timestamp: new Date().toISOString(),
      dataSize: JSON.stringify(data).length,
    };
    
    console.log('[AI Usage]', usage);
    // TODO: Store in database for analytics
  }

  private handleError(error: any, operation: string): void {
    const aiError = error instanceof AIError ? error : handleOpenAIError(error);
    
    this.log(`Error in ${operation}:`, {
      code: aiError.code,
      message: aiError.message,
      retryable: aiError.retryable,
    });

    // TODO: Send to error tracking service
  }

  // Admin methods
  resetUserLimit(userId: string): void {
    chatRateLimiter.reset(userId);
    visionRateLimiter.reset(userId);
  }

  clearCache(): void {
    this.cache.clear();
  }

  getStats(): {
    cacheSize: number;
    cacheEntries: number;
  } {
    return {
      cacheSize: JSON.stringify([...this.cache.entries()]).length,
      cacheEntries: this.cache.size,
    };
  }
}

// Singleton instance
let aiService: AIService | null = null;

export function getAIService(): AIService {
  if (!aiService) {
    aiService = new AIService();
  }
  return aiService;
}

export { AIService, type AIServiceConfig };