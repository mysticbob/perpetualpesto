export interface AIConfig {
  openai: {
    apiKey: string;
    organization?: string;
  };
  models: {
    chat: string;
    vision: string;
    embedding: string;
  };
  rateLimits: {
    chat: {
      maxRequests: number;
      maxTokens: number;
    };
    vision: {
      maxRequests: number;
      maxTokens: number;
    };
  };
  features: {
    enabled: boolean;
    cacheEnabled: boolean;
    cacheTTL: number;
    retryEnabled: boolean;
    loggingEnabled: boolean;
  };
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
}

function parseNumber(value: string | undefined, defaultValue: number): number {
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

export function loadAIConfig(): AIConfig {
  const config: AIConfig = {
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      organization: process.env.OPENAI_ORG_ID,
    },
    models: {
      chat: process.env.AI_MODEL_CHAT || 'gpt-4-turbo-preview',
      vision: process.env.AI_MODEL_VISION || 'gpt-4-vision-preview',
      embedding: process.env.AI_MODEL_EMBEDDING || 'text-embedding-3-small',
    },
    rateLimits: {
      chat: {
        maxRequests: parseNumber(process.env.AI_CHAT_RATE_LIMIT, 100),
        maxTokens: parseNumber(process.env.AI_CHAT_TOKEN_LIMIT, 50000),
      },
      vision: {
        maxRequests: parseNumber(process.env.AI_VISION_RATE_LIMIT, 50),
        maxTokens: parseNumber(process.env.AI_VISION_TOKEN_LIMIT, 100000),
      },
    },
    features: {
      enabled: parseBoolean(process.env.AI_FEATURES_ENABLED, true),
      cacheEnabled: parseBoolean(process.env.AI_CACHE_ENABLED, true),
      cacheTTL: parseNumber(process.env.AI_CACHE_TTL, 300),
      retryEnabled: parseBoolean(process.env.AI_RETRY_ENABLED, true),
      loggingEnabled: parseBoolean(process.env.AI_LOGGING_ENABLED, true),
    },
  };

  // Validate configuration
  if (config.features.enabled && !config.openai.apiKey) {
    console.warn('[AI Config] Warning: AI features enabled but OPENAI_API_KEY is not set');
  }

  return config;
}

export function validateConfig(config: AIConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (config.features.enabled) {
    if (!config.openai.apiKey) {
      errors.push('OpenAI API key is required when AI features are enabled');
    }

    if (config.rateLimits.chat.maxRequests <= 0) {
      errors.push('Chat rate limit must be positive');
    }

    if (config.rateLimits.vision.maxRequests <= 0) {
      errors.push('Vision rate limit must be positive');
    }

    if (config.features.cacheTTL < 0) {
      errors.push('Cache TTL must be non-negative');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Export singleton config
let cachedConfig: AIConfig | null = null;

export function getAIConfig(): AIConfig {
  if (!cachedConfig) {
    cachedConfig = loadAIConfig();
    const validation = validateConfig(cachedConfig);
    
    if (!validation.valid) {
      console.error('[AI Config] Configuration errors:', validation.errors);
    }
  }
  return cachedConfig;
}

// Allow config refresh (useful for testing or runtime updates)
export function refreshAIConfig(): AIConfig {
  cachedConfig = null;
  return getAIConfig();
}