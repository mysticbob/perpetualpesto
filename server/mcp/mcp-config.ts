/**
 * MCP Server Configuration
 * 
 * Central configuration management for all MCP servers in the
 * No Chicken Left Behind application.
 */

import { z } from 'zod'
import { secureConfig } from './security-config'

// Environment validation schema
const EnvironmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  MCP_API_KEY: z.string().optional(),
  RATE_LIMIT_WINDOW: z.coerce.number().default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  ENCRYPTION_KEY: z.string().optional(),
  
  // Server-specific ports (for development)
  MCP_PANTRY_PORT: z.coerce.number().default(3010),
  MCP_RECIPE_PORT: z.coerce.number().default(3011),
  MCP_GROCERY_PORT: z.coerce.number().default(3012),
  MCP_MEALS_PORT: z.coerce.number().default(3013),
  MCP_INSTACART_PORT: z.coerce.number().default(3014),
  
  // Transport configuration
  MCP_TRANSPORT_MODE: z.enum(['stdio', 'http', 'websocket']).default('stdio'),
  MCP_HTTP_HOST: z.string().default('localhost'),
  MCP_ENABLE_CORS: z.coerce.boolean().default(true),
  MCP_CORS_ORIGINS: z.string().optional(),
  
  // Feature flags
  MCP_ENABLE_REAL_TIME: z.coerce.boolean().default(false),
  MCP_ENABLE_WEBSOCKETS: z.coerce.boolean().default(false),
  MCP_ENABLE_COMPRESSION: z.coerce.boolean().default(true),
  MCP_ENABLE_METRICS: z.coerce.boolean().default(true),
  
  // External integrations
  INSTACART_CLIENT_ID: z.string().optional(),
  INSTACART_CLIENT_SECRET: z.string().optional(),
  INSTACART_REDIRECT_URI: z.string().url().optional(),
  
  // OpenAI integration
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4'),
  
  // Monitoring and logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  ENABLE_AUDIT_LOGGING: z.coerce.boolean().default(true),
  METRICS_ENDPOINT: z.string().optional(),
})

// Parse and validate environment
export const env = EnvironmentSchema.parse(process.env)

// MCP Server definitions
export interface McpServerDefinition {
  name: string
  version: string
  description: string
  port?: number
  enabled: boolean
  capabilities: {
    resources: boolean
    tools: boolean
    prompts: boolean
    notifications?: boolean
  }
  permissions: string[]
  rateLimits: {
    requests: number
    windowMs: number
  }
  transports: ('stdio' | 'http' | 'websocket')[]
}

export const MCP_SERVERS: Record<string, McpServerDefinition> = {
  pantry: {
    name: 'pantry-server',
    version: '1.0.0',
    description: 'Pantry inventory and expiration tracking',
    port: env.MCP_PANTRY_PORT,
    enabled: true,
    capabilities: {
      resources: true,
      tools: true,
      prompts: true,
      notifications: env.MCP_ENABLE_REAL_TIME
    },
    permissions: [
      'pantry.read',
      'pantry.write',
      'pantry.manage',
      'pantry.share'
    ],
    rateLimits: {
      requests: env.RATE_LIMIT_MAX_REQUESTS,
      windowMs: env.RATE_LIMIT_WINDOW
    },
    transports: ['stdio', 'http']
  },
  
  recipe: {
    name: 'recipe-server',
    version: '1.0.0',
    description: 'Recipe database and cooking instructions',
    port: env.MCP_RECIPE_PORT,
    enabled: true,
    capabilities: {
      resources: true,
      tools: true,
      prompts: true,
      notifications: false
    },
    permissions: [
      'recipe.read',
      'recipe.write',
      'recipe.rate',
      'recipe.share'
    ],
    rateLimits: {
      requests: env.RATE_LIMIT_MAX_REQUESTS,
      windowMs: env.RATE_LIMIT_WINDOW
    },
    transports: ['stdio', 'http']
  },
  
  grocery: {
    name: 'grocery-server',
    version: '1.0.0',
    description: 'Shopping list and store management',
    port: env.MCP_GROCERY_PORT,
    enabled: true,
    capabilities: {
      resources: true,
      tools: true,
      prompts: true,
      notifications: env.MCP_ENABLE_REAL_TIME
    },
    permissions: [
      'grocery.read',
      'grocery.write',
      'grocery.manage'
    ],
    rateLimits: {
      requests: env.RATE_LIMIT_MAX_REQUESTS,
      windowMs: env.RATE_LIMIT_WINDOW
    },
    transports: ['stdio', 'http']
  },
  
  meals: {
    name: 'meal-planning-server',
    version: '1.0.0',
    description: 'Meal planning and nutritional tracking',
    port: env.MCP_MEALS_PORT,
    enabled: true,
    capabilities: {
      resources: true,
      tools: true,
      prompts: true,
      notifications: false
    },
    permissions: [
      'meals.read',
      'meals.write',
      'meals.plan'
    ],
    rateLimits: {
      requests: env.RATE_LIMIT_MAX_REQUESTS,
      windowMs: env.RATE_LIMIT_WINDOW
    },
    transports: ['stdio', 'http']
  },
  
  instacart: {
    name: 'instacart-server',
    version: '1.0.0',
    description: 'Instacart integration and order management',
    port: env.MCP_INSTACART_PORT,
    enabled: Boolean(env.INSTACART_CLIENT_ID && env.INSTACART_CLIENT_SECRET),
    capabilities: {
      resources: true,
      tools: true,
      prompts: true,
      notifications: true
    },
    permissions: [
      'instacart.read',
      'instacart.write',
      'instacart.order'
    ],
    rateLimits: {
      requests: Math.floor(env.RATE_LIMIT_MAX_REQUESTS / 2), // Lower limit for external API
      windowMs: env.RATE_LIMIT_WINDOW
    },
    transports: ['stdio', 'http']
  }
}

// Transport configurations
export const TRANSPORT_CONFIG = {
  stdio: {
    encoding: 'utf8' as const,
    highWaterMark: 1024 * 1024 // 1MB buffer
  },
  
  http: {
    host: env.MCP_HTTP_HOST,
    cors: {
      enabled: env.MCP_ENABLE_CORS,
      origins: env.MCP_CORS_ORIGINS ? env.MCP_CORS_ORIGINS.split(',') : ['http://localhost:3000'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
      credentials: true
    },
    compression: env.MCP_ENABLE_COMPRESSION,
    bodyLimit: '10mb',
    timeout: 30000 // 30 seconds
  },
  
  websocket: {
    enabled: env.MCP_ENABLE_WEBSOCKETS,
    pingInterval: 30000, // 30 seconds
    pingTimeout: 60000, // 1 minute
    maxConnections: 1000,
    compression: env.MCP_ENABLE_COMPRESSION
  }
}

// Logging configuration
export const LOGGING_CONFIG = {
  level: env.LOG_LEVEL,
  format: env.NODE_ENV === 'production' ? 'json' : 'pretty',
  auditEnabled: env.ENABLE_AUDIT_LOGGING,
  destinations: {
    console: true,
    file: env.NODE_ENV === 'production',
    metrics: env.MCP_ENABLE_METRICS && Boolean(env.METRICS_ENDPOINT)
  }
}

// Security configuration
export const SECURITY_CONFIG = {
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: '24h',
    algorithm: 'HS256' as const
  },
  
  apiKeys: {
    enabled: Boolean(env.MCP_API_KEY),
    key: env.MCP_API_KEY
  },
  
  encryption: {
    enabled: Boolean(env.ENCRYPTION_KEY),
    key: env.ENCRYPTION_KEY,
    algorithm: 'aes-256-gcm' as const
  },
  
  rateLimiting: {
    enabled: true,
    windowMs: env.RATE_LIMIT_WINDOW,
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },
  
  cors: {
    enabled: env.MCP_ENABLE_CORS,
    origins: env.MCP_CORS_ORIGINS ? env.MCP_CORS_ORIGINS.split(',') : ['http://localhost:3000']
  }
}

// Integration configurations
export const INTEGRATION_CONFIG = {
  instacart: {
    enabled: Boolean(env.INSTACART_CLIENT_ID && env.INSTACART_CLIENT_SECRET),
    clientId: env.INSTACART_CLIENT_ID,
    clientSecret: env.INSTACART_CLIENT_SECRET,
    redirectUri: env.INSTACART_REDIRECT_URI,
    scopes: ['cart:write', 'order:read', 'product:read'],
    apiBaseUrl: 'https://api.instacart.com'
  },
  
  openai: {
    enabled: Boolean(env.OPENAI_API_KEY),
    apiKey: env.OPENAI_API_KEY,
    model: env.OPENAI_MODEL,
    maxTokens: 2000,
    temperature: 0.7
  }
}

// Performance configuration
export const PERFORMANCE_CONFIG = {
  cache: {
    enabled: true,
    ttl: 300000, // 5 minutes
    maxSize: 1000,
    checkPeriod: 60000 // 1 minute
  },
  
  database: {
    connectionPoolSize: 10,
    queryTimeout: 30000, // 30 seconds
    idleTimeoutMs: 300000, // 5 minutes
    connectionTimeoutMs: 10000 // 10 seconds
  },
  
  compression: {
    enabled: env.MCP_ENABLE_COMPRESSION,
    level: 6,
    threshold: 1024, // 1KB
    memLevel: 8
  }
}

// Feature flags
export const FEATURE_FLAGS = {
  realTimeUpdates: env.MCP_ENABLE_REAL_TIME,
  websocketSupport: env.MCP_ENABLE_WEBSOCKETS,
  compressionEnabled: env.MCP_ENABLE_COMPRESSION,
  metricsCollection: env.MCP_ENABLE_METRICS,
  auditLogging: env.ENABLE_AUDIT_LOGGING,
  
  // Experimental features
  aiSuggestions: Boolean(env.OPENAI_API_KEY),
  voiceCommands: false,
  imageRecognition: false,
  socialSharing: false,
  multiTenant: false
}

// Validation functions
export function validateServerConfig(serverName: string): McpServerDefinition {
  const server = MCP_SERVERS[serverName]
  if (!server) {
    throw new Error(`Unknown MCP server: ${serverName}`)
  }
  
  if (!server.enabled) {
    throw new Error(`MCP server ${serverName} is disabled`)
  }
  
  return server
}

export function getEnabledServers(): McpServerDefinition[] {
  return Object.values(MCP_SERVERS).filter(server => server.enabled)
}

export function getServerByPort(port: number): McpServerDefinition | undefined {
  return Object.values(MCP_SERVERS).find(server => server.port === port)
}

// Configuration helper functions
export function isDevelopment(): boolean {
  return env.NODE_ENV === 'development'
}

export function isProduction(): boolean {
  return env.NODE_ENV === 'production'
}

export function isFeatureEnabled(feature: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[feature]
}

// Export environment for convenience
export { env as environment }

// Health check configuration
export const HEALTH_CHECK_CONFIG = {
  enabled: true,
  endpoint: '/health',
  interval: 30000, // 30 seconds
  checks: {
    database: true,
    redis: false,
    externalServices: true,
    memoryUsage: true,
    diskSpace: false
  },
  thresholds: {
    responseTime: 1000, // 1 second
    memoryUsage: 0.9, // 90%
    errorRate: 0.05 // 5%
  }
}

// Metrics configuration
export const METRICS_CONFIG = {
  enabled: env.MCP_ENABLE_METRICS,
  endpoint: env.METRICS_ENDPOINT,
  interval: 60000, // 1 minute
  prefix: 'mcp_server_',
  metrics: {
    requestCount: true,
    requestDuration: true,
    errorCount: true,
    activeConnections: true,
    memoryUsage: true,
    cpuUsage: true
  }
}

// Default configuration object
export const DEFAULT_CONFIG = {
  servers: MCP_SERVERS,
  transport: TRANSPORT_CONFIG,
  logging: LOGGING_CONFIG,
  security: SECURITY_CONFIG,
  integrations: INTEGRATION_CONFIG,
  performance: PERFORMANCE_CONFIG,
  features: FEATURE_FLAGS,
  healthCheck: HEALTH_CHECK_CONFIG,
  metrics: METRICS_CONFIG
}

// Configuration validation on module load
try {
  // Validate required environment variables
  EnvironmentSchema.parse(process.env)
  
  // Validate that at least one server is enabled
  const enabledServers = getEnabledServers()
  if (enabledServers.length === 0) {
    throw new Error('No MCP servers are enabled')
  }
  
  console.log(`MCP Configuration loaded successfully:`)
  console.log(`- Environment: ${env.NODE_ENV}`)
  console.log(`- Enabled servers: ${enabledServers.map(s => s.name).join(', ')}`)
  console.log(`- Transport mode: ${env.MCP_TRANSPORT_MODE}`)
  console.log(`- Features: ${Object.entries(FEATURE_FLAGS).filter(([,enabled]) => enabled).map(([name]) => name).join(', ')}`)
  
} catch (error) {
  console.error('MCP Configuration validation failed:', error)
  process.exit(1)
}

export default DEFAULT_CONFIG