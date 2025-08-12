export enum AIErrorCode {
  RATE_LIMIT = 'RATE_LIMIT',
  INVALID_API_KEY = 'INVALID_API_KEY',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  INVALID_REQUEST = 'INVALID_REQUEST',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN',
}

export class AIError extends Error {
  code: AIErrorCode;
  statusCode: number;
  retryable: boolean;
  retryAfter?: number;

  constructor(
    message: string,
    code: AIErrorCode,
    statusCode: number = 500,
    retryable: boolean = false,
    retryAfter?: number
  ) {
    super(message);
    this.name = 'AIError';
    this.code = code;
    this.statusCode = statusCode;
    this.retryable = retryable;
    this.retryAfter = retryAfter;
  }
}

export function handleOpenAIError(error: any): AIError {
  // Handle OpenAI specific errors
  if (error?.status) {
    switch (error.status) {
      case 401:
        return new AIError(
          'Invalid API key',
          AIErrorCode.INVALID_API_KEY,
          401,
          false
        );
      case 429:
        const retryAfter = error.headers?.['retry-after'] 
          ? parseInt(error.headers['retry-after']) * 1000 
          : 60000;
        return new AIError(
          'Rate limit exceeded',
          AIErrorCode.RATE_LIMIT,
          429,
          true,
          retryAfter
        );
      case 402:
        return new AIError(
          'Quota exceeded',
          AIErrorCode.QUOTA_EXCEEDED,
          402,
          false
        );
      case 400:
        return new AIError(
          'Invalid request',
          AIErrorCode.INVALID_REQUEST,
          400,
          false
        );
      case 503:
        return new AIError(
          'Service temporarily unavailable',
          AIErrorCode.SERVICE_UNAVAILABLE,
          503,
          true,
          5000
        );
      default:
        return new AIError(
          error.message || 'Unknown error',
          AIErrorCode.UNKNOWN,
          error.status,
          error.status >= 500
        );
    }
  }

  // Handle timeout errors
  if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
    return new AIError(
      'Request timeout',
      AIErrorCode.TIMEOUT,
      408,
      true,
      5000
    );
  }

  // Default error
  return new AIError(
    error.message || 'Unknown error',
    AIErrorCode.UNKNOWN,
    500,
    false
  );
}

interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export class RetryHandler {
  private config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      ...config,
    };
  }

  async execute<T>(
    fn: () => Promise<T>,
    onRetry?: (attempt: number, error: AIError) => void
  ): Promise<T> {
    let lastError: AIError | null = null;
    let delay = this.config.initialDelay;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof AIError 
          ? error 
          : handleOpenAIError(error);

        if (!lastError.retryable || attempt === this.config.maxRetries) {
          throw lastError;
        }

        // Use retry-after header if available
        const retryDelay = lastError.retryAfter || delay;
        
        if (onRetry) {
          onRetry(attempt + 1, lastError);
        }

        await this.sleep(Math.min(retryDelay, this.config.maxDelay));
        
        // Exponential backoff for next attempt
        delay = Math.min(delay * this.config.backoffMultiplier, this.config.maxDelay);
      }
    }

    throw lastError || new AIError('Max retries exceeded', AIErrorCode.UNKNOWN, 500, false);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const defaultRetryHandler = new RetryHandler();