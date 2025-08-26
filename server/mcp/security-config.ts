/**
 * MCP Security Configuration and Strategies
 * 
 * Comprehensive security implementation for all MCP servers
 * including authentication, authorization, rate limiting, and data validation.
 */

import { z } from 'zod'
import jwt from 'jsonwebtoken'
import { createHash, randomBytes } from 'crypto'

// Environment configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
const MCP_API_KEY = process.env.MCP_API_KEY
const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW || '900000') // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100')

// Authentication schemas
export const AuthTokenSchema = z.object({
  userId: z.string().cuid(),
  email: z.string().email(),
  name: z.string().optional(),
  permissions: z.array(z.string()),
  iat: z.number(),
  exp: z.number()
})

export const ApiKeySchema = z.object({
  keyId: z.string(),
  userId: z.string().cuid(),
  permissions: z.array(z.string()),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional()
})

// Rate limiting store (in production, use Redis or similar)
interface RateLimitEntry {
  requests: number
  resetTime: number
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>()
  
  constructor(
    private maxRequests: number = RATE_LIMIT_MAX_REQUESTS,
    private windowMs: number = RATE_LIMIT_WINDOW
  ) {}
  
  isAllowed(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now()
    const entry = this.store.get(identifier)
    
    if (!entry || now > entry.resetTime) {
      // New window or expired entry
      const resetTime = now + this.windowMs
      this.store.set(identifier, { requests: 1, resetTime })
      return { allowed: true, remaining: this.maxRequests - 1, resetTime }
    }
    
    if (entry.requests >= this.maxRequests) {
      return { allowed: false, remaining: 0, resetTime: entry.resetTime }
    }
    
    entry.requests++
    return { 
      allowed: true, 
      remaining: this.maxRequests - entry.requests, 
      resetTime: entry.resetTime 
    }
  }
  
  cleanup() {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key)
      }
    }
  }
}

// Global rate limiter instance
export const rateLimiter = new RateLimiter()

// Cleanup rate limiter every 5 minutes
setInterval(() => rateLimiter.cleanup(), 5 * 60 * 1000)

// Authentication utilities
export class AuthenticationError extends Error {
  constructor(message: string, public code: string = 'AUTH_ERROR') {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends Error {
  constructor(message: string, public code: string = 'AUTHZ_ERROR') {
    super(message)
    this.name = 'AuthorizationError'
  }
}

export class RateLimitError extends Error {
  constructor(message: string, public resetTime: number) {
    super(message)
    this.name = 'RateLimitError'
  }
}

// JWT token validation
export function validateJwtToken(token: string): z.infer<typeof AuthTokenSchema> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    return AuthTokenSchema.parse(decoded)
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthenticationError('Invalid token', 'INVALID_TOKEN')
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthenticationError('Token expired', 'TOKEN_EXPIRED')
    }
    throw new AuthenticationError('Token validation failed', 'TOKEN_VALIDATION_FAILED')
  }
}

// API key validation
export function validateApiKey(apiKey: string): z.infer<typeof ApiKeySchema> {
  if (!MCP_API_KEY) {
    throw new AuthenticationError('API key authentication not configured', 'API_KEY_NOT_CONFIGURED')
  }
  
  // In production, validate against database
  // For now, simple comparison with environment variable
  if (apiKey !== MCP_API_KEY) {
    throw new AuthenticationError('Invalid API key', 'INVALID_API_KEY')
  }
  
  // Return mock API key data (in production, fetch from database)
  return {
    keyId: createHash('sha256').update(apiKey).digest('hex').substring(0, 16),
    userId: 'system', // System user for API key access
    permissions: ['*'], // Full permissions for system API key
    createdAt: new Date().toISOString(),
    expiresAt: undefined
  }
}

// Permission checking
export function checkPermission(
  userPermissions: string[], 
  requiredPermission: string
): boolean {
  // Check for wildcard permission
  if (userPermissions.includes('*')) {
    return true
  }
  
  // Check for exact permission match
  if (userPermissions.includes(requiredPermission)) {
    return true
  }
  
  // Check for wildcard in permission categories (e.g., "pantry.*" matches "pantry.read")
  const permissionParts = requiredPermission.split('.')
  for (let i = permissionParts.length - 1; i >= 0; i--) {
    const wildcardPermission = permissionParts.slice(0, i).join('.') + '.*'
    if (userPermissions.includes(wildcardPermission)) {
      return true
    }
  }
  
  return false
}

// MCP Server authentication middleware
export interface McpAuthContext {
  userId: string
  permissions: string[]
  isApiKey: boolean
  rateLimitIdentifier: string
}

export function authenticateMcpRequest(
  headers: Record<string, string | string[]>
): McpAuthContext {
  const authHeader = headers['authorization'] as string
  const apiKeyHeader = headers['x-api-key'] as string
  
  let authContext: McpAuthContext
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // JWT token authentication
    const token = authHeader.substring(7)
    const decoded = validateJwtToken(token)
    
    authContext = {
      userId: decoded.userId,
      permissions: decoded.permissions,
      isApiKey: false,
      rateLimitIdentifier: `user:${decoded.userId}`
    }
  } else if (apiKeyHeader) {
    // API key authentication
    const apiKeyData = validateApiKey(apiKeyHeader)
    
    authContext = {
      userId: apiKeyData.userId,
      permissions: apiKeyData.permissions,
      isApiKey: true,
      rateLimitIdentifier: `apikey:${apiKeyData.keyId}`
    }
  } else {
    throw new AuthenticationError('No authentication provided', 'NO_AUTH')
  }
  
  // Check rate limit
  const rateLimit = rateLimiter.isAllowed(authContext.rateLimitIdentifier)
  if (!rateLimit.allowed) {
    throw new RateLimitError(
      `Rate limit exceeded. Try again in ${Math.ceil((rateLimit.resetTime - Date.now()) / 1000)} seconds`,
      rateLimit.resetTime
    )
  }
  
  return authContext
}

// Permission definitions for each MCP server
export const PERMISSIONS = {
  // Pantry permissions
  PANTRY_READ: 'pantry.read',
  PANTRY_WRITE: 'pantry.write',
  PANTRY_MANAGE: 'pantry.manage',
  PANTRY_SHARE: 'pantry.share',
  
  // Recipe permissions
  RECIPE_READ: 'recipe.read',
  RECIPE_WRITE: 'recipe.write',
  RECIPE_RATE: 'recipe.rate',
  RECIPE_SHARE: 'recipe.share',
  
  // Grocery permissions
  GROCERY_READ: 'grocery.read',
  GROCERY_WRITE: 'grocery.write',
  GROCERY_MANAGE: 'grocery.manage',
  
  // Meal planning permissions
  MEALS_READ: 'meals.read',
  MEALS_WRITE: 'meals.write',
  MEALS_PLAN: 'meals.plan',
  
  // Instacart permissions
  INSTACART_READ: 'instacart.read',
  INSTACART_WRITE: 'instacart.write',
  INSTACART_ORDER: 'instacart.order',
  
  // Admin permissions
  ADMIN_ALL: '*',
  ADMIN_USERS: 'admin.users',
  ADMIN_SYSTEM: 'admin.system'
} as const

// Data sanitization utilities
export function sanitizeString(input: string, maxLength: number = 255): string {
  return input
    .trim()
    .substring(0, maxLength)
    .replace(/[<>'"&]/g, '') // Remove potentially dangerous characters
}

export function sanitizeHtml(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/&/g, '&amp;')
}

// Input validation helpers
export const CommonSchemas = {
  UserId: z.string().cuid(),
  Email: z.string().email(),
  Name: z.string().min(1).max(100).refine(
    (val) => sanitizeString(val) === val,
    'Name contains invalid characters'
  ),
  Description: z.string().max(2000).optional().refine(
    (val) => !val || sanitizeString(val, 2000) === val,
    'Description contains invalid characters'
  ),
  Url: z.string().url().max(500),
  Amount: z.string().min(1).max(20).refine(
    (val) => /^[\d\s\/.-]+$/.test(val),
    'Amount must contain only numbers, spaces, slashes, dots, and hyphens'
  ),
  Unit: z.string().min(1).max(50).refine(
    (val) => /^[a-zA-Z\s.-]+$/.test(val),
    'Unit must contain only letters, spaces, dots, and hyphens'
  ),
  Category: z.string().min(1).max(50).refine(
    (val) => /^[a-zA-Z\s&-]+$/.test(val),
    'Category must contain only letters, spaces, ampersands, and hyphens'
  )
}

// Secure configuration manager
export class SecureConfig {
  private static instance: SecureConfig
  private config: Map<string, string>
  
  private constructor() {
    this.config = new Map()
    this.loadConfig()
  }
  
  static getInstance(): SecureConfig {
    if (!SecureConfig.instance) {
      SecureConfig.instance = new SecureConfig()
    }
    return SecureConfig.instance
  }
  
  private loadConfig() {
    // Load configuration from environment variables
    const requiredVars = [
      'DATABASE_URL',
      'JWT_SECRET'
    ]
    
    const optionalVars = [
      'MCP_API_KEY',
      'RATE_LIMIT_WINDOW',
      'RATE_LIMIT_MAX_REQUESTS',
      'ENCRYPTION_KEY',
      'INSTACART_CLIENT_ID',
      'INSTACART_CLIENT_SECRET'
    ]
    
    // Check required variables
    for (const varName of requiredVars) {
      const value = process.env[varName]
      if (!value) {
        throw new Error(`Required environment variable ${varName} is not set`)
      }
      this.config.set(varName, value)
    }
    
    // Load optional variables
    for (const varName of optionalVars) {
      const value = process.env[varName]
      if (value) {
        this.config.set(varName, value)
      }
    }
  }
  
  get(key: string): string | undefined {
    return this.config.get(key)
  }
  
  getRequired(key: string): string {
    const value = this.config.get(key)
    if (!value) {
      throw new Error(`Required configuration ${key} is not available`)
    }
    return value
  }
  
  // Generate secure random tokens
  generateSecureToken(length: number = 32): string {
    return randomBytes(length).toString('hex')
  }
  
  // Hash sensitive data
  hashValue(value: string, salt?: string): string {
    const actualSalt = salt || randomBytes(16).toString('hex')
    return createHash('sha256').update(value + actualSalt).digest('hex')
  }
}

// Audit logging
export interface AuditLogEntry {
  timestamp: string
  userId: string
  action: string
  resource: string
  resourceId?: string
  details?: any
  ipAddress?: string
  userAgent?: string
}

export class AuditLogger {
  private static instance: AuditLogger
  
  private constructor() {}
  
  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger()
    }
    return AuditLogger.instance
  }
  
  log(entry: Omit<AuditLogEntry, 'timestamp'>): void {
    const logEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date().toISOString()
    }
    
    // In production, send to logging service (e.g., CloudWatch, Elasticsearch)
    console.log('AUDIT:', JSON.stringify(logEntry))
    
    // Store in database for compliance
    this.storeAuditLog(logEntry)
  }
  
  private async storeAuditLog(entry: AuditLogEntry): Promise<void> {
    // In production, implement database storage
    // This is a placeholder for the actual implementation
  }
}

// Export utilities
export const auditLogger = AuditLogger.getInstance()
export const secureConfig = SecureConfig.getInstance()

// MCP server security wrapper
export function withSecurity<T extends any[], R>(
  fn: (context: McpAuthContext, ...args: T) => Promise<R>,
  requiredPermission?: string
) {
  return async (headers: Record<string, string | string[]>, ...args: T): Promise<R> => {
    try {
      const authContext = authenticateMcpRequest(headers)
      
      if (requiredPermission && !checkPermission(authContext.permissions, requiredPermission)) {
        throw new AuthorizationError(
          `Permission denied. Required: ${requiredPermission}`,
          'PERMISSION_DENIED'
        )
      }
      
      return await fn(authContext, ...args)
    } catch (error) {
      // Log security events
      if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
        auditLogger.log({
          userId: 'unknown',
          action: 'security_violation',
          resource: 'mcp_server',
          details: {
            error: error.message,
            code: (error as any).code
          }
        })
      }
      
      throw error
    }
  }
}

// Data encryption utilities (for sensitive data like tokens)
export class DataEncryption {
  private static readonly ALGORITHM = 'aes-256-gcm'
  private static readonly IV_LENGTH = 16
  private static readonly SALT_LENGTH = 32
  private static readonly KEY_LENGTH = 32
  
  private static deriveKey(password: string, salt: Buffer): Buffer {
    const crypto = require('crypto')
    return crypto.pbkdf2Sync(password, salt, 100000, DataEncryption.KEY_LENGTH, 'sha512')
  }
  
  static encrypt(text: string, password: string): string {
    const crypto = require('crypto')
    
    const salt = randomBytes(DataEncryption.SALT_LENGTH)
    const key = DataEncryption.deriveKey(password, salt)
    const iv = randomBytes(DataEncryption.IV_LENGTH)
    
    const cipher = crypto.createCipher(DataEncryption.ALGORITHM, key)
    cipher.setAAD(salt)
    
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const authTag = cipher.getAuthTag()
    
    return salt.toString('hex') + iv.toString('hex') + authTag.toString('hex') + encrypted
  }
  
  static decrypt(encryptedData: string, password: string): string {
    const crypto = require('crypto')
    
    const salt = Buffer.from(encryptedData.substring(0, DataEncryption.SALT_LENGTH * 2), 'hex')
    const iv = Buffer.from(encryptedData.substring(DataEncryption.SALT_LENGTH * 2, (DataEncryption.SALT_LENGTH + DataEncryption.IV_LENGTH) * 2), 'hex')
    const authTag = Buffer.from(encryptedData.substring((DataEncryption.SALT_LENGTH + DataEncryption.IV_LENGTH) * 2, (DataEncryption.SALT_LENGTH + DataEncryption.IV_LENGTH + 16) * 2), 'hex')
    const encrypted = encryptedData.substring((DataEncryption.SALT_LENGTH + DataEncryption.IV_LENGTH + 16) * 2)
    
    const key = DataEncryption.deriveKey(password, salt)
    
    const decipher = crypto.createDecipher(DataEncryption.ALGORITHM, key)
    decipher.setAAD(salt)
    decipher.setAuthTag(authTag)
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  }
}