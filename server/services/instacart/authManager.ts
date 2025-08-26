import { prisma as db } from '../../lib/db'
import crypto from 'crypto'

interface InstacartAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  apiBaseUrl: string
}

export class InstacartAuthManager {
  private config: InstacartAuthConfig

  constructor() {
    this.config = {
      clientId: process.env.INSTACART_CLIENT_ID || '',
      clientSecret: process.env.INSTACART_CLIENT_SECRET || '',
      redirectUri: process.env.INSTACART_REDIRECT_URI || 'http://localhost:3003/api/instacart/callback',
      apiBaseUrl: process.env.INSTACART_API_BASE_URL || 'https://api.instacart.com'
    }
  }

  /**
   * Generate OAuth authorization URL for user to connect their Instacart account
   */
  getAuthorizationUrl(userId: string, state?: string): string {
    const stateParam = state || this.generateState(userId)
    
    // For Phase 1: Return a mock URL that will open Instacart's website
    // In Phase 2: This will be replaced with actual OAuth URL
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      state: stateParam,
      scope: 'orders:write carts:write profile:read'
    })

    // Mock URL for now - will be replaced with actual OAuth endpoint
    return `https://www.instacart.com/store?connect=true&${params.toString()}`
  }

  /**
   * Generate secure state parameter for OAuth flow
   */
  private generateState(userId: string): string {
    const randomBytes = crypto.randomBytes(16).toString('hex')
    return Buffer.from(JSON.stringify({ userId, nonce: randomBytes })).toString('base64')
  }

  /**
   * Validate state parameter from OAuth callback
   */
  validateState(state: string): { userId: string; nonce: string } | null {
    try {
      const decoded = Buffer.from(state, 'base64').toString('utf-8')
      return JSON.parse(decoded)
    } catch {
      return null
    }
  }

  /**
   * Exchange authorization code for access token
   * Phase 2 implementation - currently returns mock data
   */
  async exchangeCodeForToken(code: string, userId: string): Promise<{
    accessToken: string
    refreshToken: string
    expiresIn: number
  }> {
    // Phase 1: Mock implementation
    // Phase 2: Will make actual API call to exchange code for tokens
    
    const mockToken = {
      accessToken: `mock_access_${crypto.randomBytes(16).toString('hex')}`,
      refreshToken: `mock_refresh_${crypto.randomBytes(16).toString('hex')}`,
      expiresIn: 3600 // 1 hour
    }

    // Save auth details to database
    await this.saveAuthCredentials(userId, mockToken)
    
    return mockToken
  }

  /**
   * Save or update Instacart auth credentials for a user
   */
  async saveAuthCredentials(
    userId: string,
    tokens: {
      accessToken: string
      refreshToken: string
      expiresIn: number
    },
    email?: string
  ): Promise<void> {
    const tokenExpiry = new Date(Date.now() + tokens.expiresIn * 1000)

    await db.instacartAuth.upsert({
      where: { userId },
      update: {
        accessToken: this.encryptToken(tokens.accessToken),
        refreshToken: this.encryptToken(tokens.refreshToken),
        tokenExpiry,
        accountStatus: 'connected',
        lastSyncedAt: new Date(),
        email
      },
      create: {
        userId,
        accessToken: this.encryptToken(tokens.accessToken),
        refreshToken: this.encryptToken(tokens.refreshToken),
        tokenExpiry,
        accountStatus: 'connected',
        email
      }
    })
  }

  /**
   * Get auth status for a user
   */
  async getAuthStatus(userId: string): Promise<{
    isConnected: boolean
    email?: string
    lastSyncedAt?: Date
    needsReauth: boolean
  }> {
    const auth = await db.instacartAuth.findUnique({
      where: { userId }
    })

    if (!auth) {
      return { isConnected: false, needsReauth: false }
    }

    const needsReauth = auth.tokenExpiry ? auth.tokenExpiry < new Date() : false

    return {
      isConnected: auth.accountStatus === 'connected',
      email: auth.email || undefined,
      lastSyncedAt: auth.lastSyncedAt || undefined,
      needsReauth
    }
  }

  /**
   * Refresh access token using refresh token
   * Phase 2 implementation
   */
  async refreshAccessToken(userId: string): Promise<boolean> {
    const auth = await db.instacartAuth.findUnique({
      where: { userId }
    })

    if (!auth || !auth.refreshToken) {
      return false
    }

    try {
      // Phase 1: Mock refresh
      // Phase 2: Actual API call to refresh token
      const newTokens = {
        accessToken: `refreshed_${crypto.randomBytes(16).toString('hex')}`,
        refreshToken: auth.refreshToken,
        expiresIn: 3600
      }

      await this.saveAuthCredentials(userId, newTokens, auth.email || undefined)
      return true
    } catch {
      await this.disconnectAccount(userId)
      return false
    }
  }

  /**
   * Disconnect user's Instacart account
   */
  async disconnectAccount(userId: string): Promise<void> {
    await db.instacartAuth.update({
      where: { userId },
      data: {
        accountStatus: 'disconnected',
        accessToken: null,
        refreshToken: null,
        tokenExpiry: null
      }
    })
  }

  /**
   * Get valid access token for API calls
   */
  async getAccessToken(userId: string): Promise<string | null> {
    const auth = await db.instacartAuth.findUnique({
      where: { userId }
    })

    if (!auth || !auth.accessToken) {
      return null
    }

    // Check if token is expired
    if (auth.tokenExpiry && auth.tokenExpiry < new Date()) {
      // Try to refresh the token
      const refreshed = await this.refreshAccessToken(userId)
      if (!refreshed) {
        return null
      }

      // Get the new token
      const updatedAuth = await db.instacartAuth.findUnique({
        where: { userId }
      })
      return updatedAuth?.accessToken ? this.decryptToken(updatedAuth.accessToken) : null
    }

    return this.decryptToken(auth.accessToken)
  }

  /**
   * Simple encryption for tokens (in production, use proper encryption)
   */
  private encryptToken(token: string): string {
    // Phase 1: Simple base64 encoding
    // Production: Use proper encryption with key management
    return Buffer.from(token).toString('base64')
  }

  /**
   * Simple decryption for tokens
   */
  private decryptToken(encryptedToken: string): string {
    // Phase 1: Simple base64 decoding
    // Production: Use proper decryption
    return Buffer.from(encryptedToken, 'base64').toString('utf-8')
  }
}

export const instacartAuth = new InstacartAuthManager()