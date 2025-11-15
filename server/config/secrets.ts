import { InfisicalSDK } from '@infisical/sdk';

export interface AppSecrets {
  database: {
    url: string;
  };
  server: {
    port: number;
  };
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
  };
  openai: {
    apiKey: string;
    orgId?: string;
  };
  ai: {
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
  };
}

class SecretsManager {
  private static instance: SecretsManager;
  private secrets: AppSecrets | null = null;
  private client: InfisicalSDK | null = null;
  private useInfisical: boolean;

  private constructor() {
    // Check if Infisical is configured
    this.useInfisical = !!(
      process.env.INFISICAL_CLIENT_ID &&
      process.env.INFISICAL_CLIENT_SECRET
    );

    if (this.useInfisical) {
      console.log('[Secrets] Initializing Infisical client...');
    } else {
      console.log('[Secrets] Infisical not configured, using environment variables');
    }
  }

  public static getInstance(): SecretsManager {
    if (!SecretsManager.instance) {
      SecretsManager.instance = new SecretsManager();
    }
    return SecretsManager.instance;
  }

  private async initializeInfisicalClient(): Promise<void> {
    if (this.client) return;

    try {
      const sdk = new InfisicalSDK();

      // Authenticate using universal auth (client credentials)
      this.client = await sdk.auth().universalAuth.login({
        clientId: process.env.INFISICAL_CLIENT_ID!,
        clientSecret: process.env.INFISICAL_CLIENT_SECRET!,
      });

      console.log('[Secrets] Infisical client initialized successfully');
    } catch (error) {
      console.error('[Secrets] Failed to initialize Infisical client:', error);
      throw error;
    }
  }

  private async fetchFromInfisical(): Promise<AppSecrets> {
    await this.initializeInfisicalClient();

    if (!this.client) {
      throw new Error('Infisical client not initialized');
    }

    const projectId = process.env.INFISICAL_PROJECT_ID!;
    const environment = process.env.INFISICAL_ENVIRONMENT || 'dev';
    const secretPath = process.env.INFISICAL_SECRETS_PATH || '/';

    console.log(`[Secrets] Fetching secrets from Infisical (project: ${projectId}, env: ${environment}, path: ${secretPath})`);

    try {
      // Fetch all secrets from Infisical
      const secretsResponse = await this.client.secrets().listSecrets({
        projectId,
        environment,
        secretPath,
        attachToProcessEnv: true, // Automatically attach to process.env
      });

      // Convert array to object for easier access
      const secretsMap = secretsResponse.secrets.reduce((acc: Record<string, string>, secret: { secretKey: string; secretValue: string }) => {
        acc[secret.secretKey] = secret.secretValue;
        return acc;
      }, {});

      console.log('[Secrets] Secrets loaded and attached to process.env');

      // Map Infisical secrets to AppSecrets structure
      return this.mapSecretsToConfig(secretsMap);
    } catch (error) {
      console.error('[Secrets] Failed to fetch secrets from Infisical:', error);
      throw error;
    }
  }

  private fetchFromEnvironment(): AppSecrets {
    console.log('[Secrets] Loading secrets from environment variables');

    return this.mapSecretsToConfig({
      DATABASE_URL: process.env.DATABASE_URL || '',
      PORT: process.env.PORT || '3001',
      FIREBASE_API_KEY: process.env.FIREBASE_API_KEY || '',
      FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN || '',
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || '',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
      OPENAI_ORG_ID: process.env.OPENAI_ORG_ID || '',
      AI_MODEL_CHAT: process.env.AI_MODEL_CHAT || 'gpt-4-turbo-preview',
      AI_MODEL_VISION: process.env.AI_MODEL_VISION || 'gpt-4-vision-preview',
      AI_MODEL_EMBEDDING: process.env.AI_MODEL_EMBEDDING || 'text-embedding-3-small',
      AI_CHAT_RATE_LIMIT: process.env.AI_CHAT_RATE_LIMIT || '100',
      AI_VISION_RATE_LIMIT: process.env.AI_VISION_RATE_LIMIT || '50',
      AI_CHAT_TOKEN_LIMIT: process.env.AI_CHAT_TOKEN_LIMIT || '50000',
      AI_VISION_TOKEN_LIMIT: process.env.AI_VISION_TOKEN_LIMIT || '100000',
      AI_FEATURES_ENABLED: process.env.AI_FEATURES_ENABLED || 'true',
      AI_CACHE_ENABLED: process.env.AI_CACHE_ENABLED || 'true',
      AI_CACHE_TTL: process.env.AI_CACHE_TTL || '300',
      AI_RETRY_ENABLED: process.env.AI_RETRY_ENABLED || 'true',
      AI_LOGGING_ENABLED: process.env.AI_LOGGING_ENABLED || 'true',
    });
  }

  private mapSecretsToConfig(secretsMap: Record<string, string>): AppSecrets {
    const parseBoolean = (value: string | undefined, defaultValue: boolean): boolean => {
      if (!value) return defaultValue;
      return value.toLowerCase() === 'true';
    };

    const parseNumber = (value: string | undefined, defaultValue: number): number => {
      if (!value) return defaultValue;
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? defaultValue : parsed;
    };

    return {
      database: {
        url: secretsMap.DATABASE_URL || '',
      },
      server: {
        port: parseNumber(secretsMap.PORT, 3001),
      },
      firebase: {
        apiKey: secretsMap.FIREBASE_API_KEY || '',
        authDomain: secretsMap.FIREBASE_AUTH_DOMAIN || '',
        projectId: secretsMap.FIREBASE_PROJECT_ID || '',
      },
      openai: {
        apiKey: secretsMap.OPENAI_API_KEY || '',
        orgId: secretsMap.OPENAI_ORG_ID,
      },
      ai: {
        models: {
          chat: secretsMap.AI_MODEL_CHAT || 'gpt-4-turbo-preview',
          vision: secretsMap.AI_MODEL_VISION || 'gpt-4-vision-preview',
          embedding: secretsMap.AI_MODEL_EMBEDDING || 'text-embedding-3-small',
        },
        rateLimits: {
          chat: {
            maxRequests: parseNumber(secretsMap.AI_CHAT_RATE_LIMIT, 100),
            maxTokens: parseNumber(secretsMap.AI_CHAT_TOKEN_LIMIT, 50000),
          },
          vision: {
            maxRequests: parseNumber(secretsMap.AI_VISION_RATE_LIMIT, 50),
            maxTokens: parseNumber(secretsMap.AI_VISION_TOKEN_LIMIT, 100000),
          },
        },
        features: {
          enabled: parseBoolean(secretsMap.AI_FEATURES_ENABLED, true),
          cacheEnabled: parseBoolean(secretsMap.AI_CACHE_ENABLED, true),
          cacheTTL: parseNumber(secretsMap.AI_CACHE_TTL, 300),
          retryEnabled: parseBoolean(secretsMap.AI_RETRY_ENABLED, true),
          loggingEnabled: parseBoolean(secretsMap.AI_LOGGING_ENABLED, true),
        },
      },
    };
  }

  public async loadSecrets(): Promise<AppSecrets> {
    if (this.secrets) {
      return this.secrets;
    }

    try {
      if (this.useInfisical) {
        this.secrets = await this.fetchFromInfisical();
      } else {
        this.secrets = this.fetchFromEnvironment();
      }

      // Validate required secrets
      this.validateSecrets(this.secrets);

      console.log('[Secrets] Secrets loaded successfully');
      return this.secrets;
    } catch (error) {
      console.error('[Secrets] Failed to load secrets:', error);

      // Fallback to environment variables if Infisical fails
      if (this.useInfisical) {
        console.warn('[Secrets] Falling back to environment variables');
        this.secrets = this.fetchFromEnvironment();
        this.validateSecrets(this.secrets);
        return this.secrets;
      }

      throw error;
    }
  }

  private validateSecrets(secrets: AppSecrets): void {
    const errors: string[] = [];

    if (!secrets.database.url) {
      errors.push('DATABASE_URL is required');
    }

    if (secrets.ai.features.enabled && !secrets.openai.apiKey) {
      console.warn('[Secrets] Warning: AI features enabled but OPENAI_API_KEY is not set');
    }

    if (errors.length > 0) {
      throw new Error(`Missing required secrets: ${errors.join(', ')}`);
    }
  }

  public getSecrets(): AppSecrets {
    if (!this.secrets) {
      throw new Error('Secrets not loaded. Call loadSecrets() first.');
    }
    return this.secrets;
  }

  public async refreshSecrets(): Promise<AppSecrets> {
    this.secrets = null;
    return this.loadSecrets();
  }
}

// Export singleton instance
export const secretsManager = SecretsManager.getInstance();

// Convenience function to get secrets
export async function getSecrets(): Promise<AppSecrets> {
  return secretsManager.loadSecrets();
}

// Convenience function to refresh secrets
export async function refreshSecrets(): Promise<AppSecrets> {
  return secretsManager.refreshSecrets();
}
