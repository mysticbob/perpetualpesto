import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { InstacartAuthManager } from './authManager'
import crypto from 'crypto'

// Mock dependencies
vi.mock('../../lib/db', () => ({
  prisma: {
    instacartAuth: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      create: vi.fn()
    }
  }
}))

vi.mock('crypto', () => ({
  randomBytes: vi.fn()
}))

const mockPrisma = await import('../../lib/db')
const mockedCrypto = vi.mocked(crypto)

describe('InstacartAuthManager', () => {
  let authManager: InstacartAuthManager
  const mockUserId = 'user123'

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Set up environment variables
    process.env.INSTACART_CLIENT_ID = 'test_client_id'
    process.env.INSTACART_CLIENT_SECRET = 'test_client_secret'
    process.env.INSTACART_REDIRECT_URI = 'http://localhost:3003/api/instacart/callback'
    process.env.INSTACART_API_BASE_URL = 'https://api.instacart.com'

    authManager = new InstacartAuthManager()

    // Mock crypto.randomBytes to return consistent values for testing
    mockedCrypto.randomBytes.mockReturnValue(Buffer.from('mockedrandomhex123', 'hex'))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getAuthorizationUrl', () => {
    it('should generate a proper OAuth authorization URL', () => {
      const url = authManager.getAuthorizationUrl(mockUserId)
      
      expect(url).toContain('https://www.instacart.com/store')
      expect(url).toContain('response_type=code')
      expect(url).toContain('client_id=test_client_id')
      expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3003%2Fapi%2Finstacart%2Fcallback')
      expect(url).toContain('scope=orders%3Awrite%20carts%3Awrite%20profile%3Aread')
      expect(url).toContain('state=')
    })

    it('should use custom state when provided', () => {
      const customState = 'custom_state_123'
      const url = authManager.getAuthorizationUrl(mockUserId, customState)
      
      expect(url).toContain(`state=${customState}`)
    })

    it('should generate different state parameters for different users', () => {
      const url1 = authManager.getAuthorizationUrl('user1')
      const url2 = authManager.getAuthorizationUrl('user2')
      
      const state1 = new URL(url1).searchParams.get('state')
      const state2 = new URL(url2).searchParams.get('state')
      
      expect(state1).not.toBe(state2)
    })
  })

  describe('validateState', () => {
    it('should validate and decode a valid state parameter', () => {
      const stateData = { userId: mockUserId, nonce: 'test_nonce' }
      const encodedState = Buffer.from(JSON.stringify(stateData)).toString('base64')
      
      const result = authManager.validateState(encodedState)
      
      expect(result).toEqual(stateData)
    })

    it('should return null for invalid state parameter', () => {
      const invalidState = 'invalid_base64!'
      
      const result = authManager.validateState(invalidState)
      
      expect(result).toBeNull()
    })

    it('should return null for malformed JSON in state', () => {
      const invalidJson = Buffer.from('{ invalid json }').toString('base64')
      
      const result = authManager.validateState(invalidJson)
      
      expect(result).toBeNull()
    })
  })

  describe('exchangeCodeForToken', () => {
    it('should exchange code for tokens and save to database', async () => {
      const mockTokens = {
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
        expiresIn: 3600
      }

      mockPrisma.prisma.instacartAuth.upsert.mockResolvedValue({
        id: '1',
        userId: mockUserId,
        accessToken: 'encrypted_access_token',
        refreshToken: 'encrypted_refresh_token',
        tokenExpiry: new Date(),
        accountStatus: 'connected',
        email: null,
        lastSyncedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      })

      const result = await authManager.exchangeCodeForToken('auth_code', mockUserId)
      
      expect(result).toEqual(mockTokens)
      expect(mockPrisma.prisma.instacartAuth.upsert).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        update: expect.objectContaining({
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
          tokenExpiry: expect.any(Date),
          accountStatus: 'connected',
          lastSyncedAt: expect.any(Date)
        }),
        create: expect.objectContaining({
          userId: mockUserId,
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
          tokenExpiry: expect.any(Date),
          accountStatus: 'connected'
        })
      })
    })

    it('should generate unique tokens each time', async () => {
      mockPrisma.prisma.instacartAuth.upsert.mockResolvedValue({} as any)

      const result1 = await authManager.exchangeCodeForToken('code1', mockUserId)
      const result2 = await authManager.exchangeCodeForToken('code2', mockUserId)
      
      expect(result1.accessToken).not.toBe(result2.accessToken)
      expect(result1.refreshToken).not.toBe(result2.refreshToken)
    })
  })

  describe('getAuthStatus', () => {
    it('should return not connected when no auth record exists', async () => {
      mockPrisma.prisma.instacartAuth.findUnique.mockResolvedValue(null)
      
      const status = await authManager.getAuthStatus(mockUserId)
      
      expect(status).toEqual({
        isConnected: false,
        needsReauth: false
      })
    })

    it('should return connected status for valid auth', async () => {
      const mockAuth = {
        id: '1',
        userId: mockUserId,
        accessToken: 'encrypted_token',
        refreshToken: 'encrypted_refresh',
        tokenExpiry: new Date(Date.now() + 3600000), // 1 hour from now
        accountStatus: 'connected',
        email: 'user@example.com',
        lastSyncedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      mockPrisma.prisma.instacartAuth.findUnique.mockResolvedValue(mockAuth)
      
      const status = await authManager.getAuthStatus(mockUserId)
      
      expect(status).toEqual({
        isConnected: true,
        email: 'user@example.com',
        lastSyncedAt: mockAuth.lastSyncedAt,
        needsReauth: false
      })
    })

    it('should indicate reauth needed when token is expired', async () => {
      const mockAuth = {
        id: '1',
        userId: mockUserId,
        accessToken: 'encrypted_token',
        refreshToken: 'encrypted_refresh',
        tokenExpiry: new Date(Date.now() - 3600000), // 1 hour ago
        accountStatus: 'connected',
        email: null,
        lastSyncedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      mockPrisma.prisma.instacartAuth.findUnique.mockResolvedValue(mockAuth)
      
      const status = await authManager.getAuthStatus(mockUserId)
      
      expect(status).toEqual({
        isConnected: true,
        email: undefined,
        lastSyncedAt: undefined,
        needsReauth: true
      })
    })

    it('should handle disconnected account status', async () => {
      const mockAuth = {
        id: '1',
        userId: mockUserId,
        accessToken: null,
        refreshToken: null,
        tokenExpiry: null,
        accountStatus: 'disconnected',
        email: null,
        lastSyncedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      mockPrisma.prisma.instacartAuth.findUnique.mockResolvedValue(mockAuth)
      
      const status = await authManager.getAuthStatus(mockUserId)
      
      expect(status).toEqual({
        isConnected: false,
        needsReauth: false
      })
    })
  })

  describe('refreshAccessToken', () => {
    it('should refresh token when valid refresh token exists', async () => {
      const mockAuth = {
        id: '1',
        userId: mockUserId,
        accessToken: 'old_encrypted_token',
        refreshToken: 'encrypted_refresh_token',
        tokenExpiry: new Date(),
        accountStatus: 'connected',
        email: 'user@example.com',
        lastSyncedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      mockPrisma.prisma.instacartAuth.findUnique.mockResolvedValue(mockAuth)
      mockPrisma.prisma.instacartAuth.upsert.mockResolvedValue(mockAuth)
      
      const result = await authManager.refreshAccessToken(mockUserId)
      
      expect(result).toBe(true)
      expect(mockPrisma.prisma.instacartAuth.upsert).toHaveBeenCalled()
    })

    it('should return false when no auth record exists', async () => {
      mockPrisma.prisma.instacartAuth.findUnique.mockResolvedValue(null)
      
      const result = await authManager.refreshAccessToken(mockUserId)
      
      expect(result).toBe(false)
    })

    it('should return false when no refresh token exists', async () => {
      const mockAuth = {
        id: '1',
        userId: mockUserId,
        accessToken: 'encrypted_token',
        refreshToken: null,
        tokenExpiry: new Date(),
        accountStatus: 'connected',
        email: null,
        lastSyncedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      mockPrisma.prisma.instacartAuth.findUnique.mockResolvedValue(mockAuth)
      
      const result = await authManager.refreshAccessToken(mockUserId)
      
      expect(result).toBe(false)
    })

    it('should disconnect account on refresh failure', async () => {
      const mockAuth = {
        id: '1',
        userId: mockUserId,
        accessToken: 'encrypted_token',
        refreshToken: 'encrypted_refresh_token',
        tokenExpiry: new Date(),
        accountStatus: 'connected',
        email: 'user@example.com',
        lastSyncedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      mockPrisma.prisma.instacartAuth.findUnique.mockResolvedValue(mockAuth)
      // Simulate refresh failure by making upsert throw
      mockPrisma.prisma.instacartAuth.upsert.mockRejectedValue(new Error('Refresh failed'))
      mockPrisma.prisma.instacartAuth.update.mockResolvedValue(mockAuth)
      
      const result = await authManager.refreshAccessToken(mockUserId)
      
      expect(result).toBe(false)
      expect(mockPrisma.prisma.instacartAuth.update).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        data: {
          accountStatus: 'disconnected',
          accessToken: null,
          refreshToken: null,
          tokenExpiry: null
        }
      })
    })
  })

  describe('disconnectAccount', () => {
    it('should mark account as disconnected and clear tokens', async () => {
      mockPrisma.prisma.instacartAuth.update.mockResolvedValue({} as any)
      
      await authManager.disconnectAccount(mockUserId)
      
      expect(mockPrisma.prisma.instacartAuth.update).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        data: {
          accountStatus: 'disconnected',
          accessToken: null,
          refreshToken: null,
          tokenExpiry: null
        }
      })
    })
  })

  describe('getAccessToken', () => {
    it('should return decrypted token when valid and not expired', async () => {
      const mockAuth = {
        id: '1',
        userId: mockUserId,
        accessToken: Buffer.from('valid_access_token').toString('base64'), // Mock encryption
        refreshToken: 'encrypted_refresh_token',
        tokenExpiry: new Date(Date.now() + 3600000), // 1 hour from now
        accountStatus: 'connected',
        email: null,
        lastSyncedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      mockPrisma.prisma.instacartAuth.findUnique.mockResolvedValue(mockAuth)
      
      const token = await authManager.getAccessToken(mockUserId)
      
      expect(token).toBe('valid_access_token')
    })

    it('should return null when no auth record exists', async () => {
      mockPrisma.prisma.instacartAuth.findUnique.mockResolvedValue(null)
      
      const token = await authManager.getAccessToken(mockUserId)
      
      expect(token).toBeNull()
    })

    it('should return null when no access token exists', async () => {
      const mockAuth = {
        id: '1',
        userId: mockUserId,
        accessToken: null,
        refreshToken: null,
        tokenExpiry: null,
        accountStatus: 'disconnected',
        email: null,
        lastSyncedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      mockPrisma.prisma.instacartAuth.findUnique.mockResolvedValue(mockAuth)
      
      const token = await authManager.getAccessToken(mockUserId)
      
      expect(token).toBeNull()
    })

    it('should attempt refresh when token is expired', async () => {
      const expiredAuth = {
        id: '1',
        userId: mockUserId,
        accessToken: 'old_encrypted_token',
        refreshToken: 'encrypted_refresh_token',
        tokenExpiry: new Date(Date.now() - 3600000), // 1 hour ago
        accountStatus: 'connected',
        email: null,
        lastSyncedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      const refreshedAuth = {
        ...expiredAuth,
        accessToken: Buffer.from('new_access_token').toString('base64'),
        tokenExpiry: new Date(Date.now() + 3600000)
      }
      
      mockPrisma.prisma.instacartAuth.findUnique
        .mockResolvedValueOnce(expiredAuth)  // First call - expired token
        .mockResolvedValueOnce(refreshedAuth) // Second call after refresh
      
      mockPrisma.prisma.instacartAuth.upsert.mockResolvedValue(refreshedAuth)
      
      const token = await authManager.getAccessToken(mockUserId)
      
      expect(token).toBe('new_access_token')
      expect(mockPrisma.prisma.instacartAuth.upsert).toHaveBeenCalled()
    })

    it('should return null when refresh fails', async () => {
      const expiredAuth = {
        id: '1',
        userId: mockUserId,
        accessToken: 'old_encrypted_token',
        refreshToken: 'encrypted_refresh_token',
        tokenExpiry: new Date(Date.now() - 3600000), // 1 hour ago
        accountStatus: 'connected',
        email: null,
        lastSyncedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      mockPrisma.prisma.instacartAuth.findUnique.mockResolvedValue(expiredAuth)
      mockPrisma.prisma.instacartAuth.upsert.mockRejectedValue(new Error('Refresh failed'))
      mockPrisma.prisma.instacartAuth.update.mockResolvedValue(expiredAuth)
      
      const token = await authManager.getAccessToken(mockUserId)
      
      expect(token).toBeNull()
    })
  })

  describe('token encryption/decryption', () => {
    it('should maintain token integrity through encrypt/decrypt cycle', async () => {
      const originalToken = 'test_access_token_123'
      
      const tokens = {
        accessToken: originalToken,
        refreshToken: 'test_refresh_token',
        expiresIn: 3600
      }

      mockPrisma.prisma.instacartAuth.upsert.mockResolvedValue({
        id: '1',
        userId: mockUserId,
        accessToken: Buffer.from(originalToken).toString('base64'),
        refreshToken: Buffer.from('test_refresh_token').toString('base64'),
        tokenExpiry: new Date(),
        accountStatus: 'connected',
        email: null,
        lastSyncedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      })

      // Save the token (this will encrypt it)
      await authManager.saveAuthCredentials(mockUserId, tokens)

      // Now set up the mock to return what we just saved
      mockPrisma.prisma.instacartAuth.findUnique.mockResolvedValue({
        id: '1',
        userId: mockUserId,
        accessToken: Buffer.from(originalToken).toString('base64'),
        refreshToken: Buffer.from('test_refresh_token').toString('base64'),
        tokenExpiry: new Date(Date.now() + 3600000),
        accountStatus: 'connected',
        email: null,
        lastSyncedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      })

      // Retrieve the token (this will decrypt it)
      const retrievedToken = await authManager.getAccessToken(mockUserId)
      
      expect(retrievedToken).toBe(originalToken)
    })
  })

  describe('saveAuthCredentials', () => {
    it('should save credentials with proper expiry calculation', async () => {
      const tokens = {
        accessToken: 'test_access_token',
        refreshToken: 'test_refresh_token',
        expiresIn: 3600 // 1 hour
      }
      
      const currentTime = Date.now()
      const expectedExpiry = new Date(currentTime + 3600000) // 1 hour later

      mockPrisma.prisma.instacartAuth.upsert.mockResolvedValue({} as any)

      await authManager.saveAuthCredentials(mockUserId, tokens, 'user@example.com')

      expect(mockPrisma.prisma.instacartAuth.upsert).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        update: {
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
          tokenExpiry: expect.any(Date),
          accountStatus: 'connected',
          lastSyncedAt: expect.any(Date),
          email: 'user@example.com'
        },
        create: {
          userId: mockUserId,
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
          tokenExpiry: expect.any(Date),
          accountStatus: 'connected',
          email: 'user@example.com'
        }
      })

      // Check that expiry is approximately correct (within 1 second)
      const callArgs = mockPrisma.prisma.instacartAuth.upsert.mock.calls[0][0]
      const actualExpiry = callArgs.create.tokenExpiry
      const timeDiff = Math.abs(actualExpiry.getTime() - expectedExpiry.getTime())
      expect(timeDiff).toBeLessThan(1000) // Within 1 second
    })

    it('should handle missing email parameter', async () => {
      const tokens = {
        accessToken: 'test_access_token',
        refreshToken: 'test_refresh_token',
        expiresIn: 3600
      }

      mockPrisma.prisma.instacartAuth.upsert.mockResolvedValue({} as any)

      await authManager.saveAuthCredentials(mockUserId, tokens)

      expect(mockPrisma.prisma.instacartAuth.upsert).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        update: expect.not.objectContaining({ email: expect.anything() }),
        create: expect.not.objectContaining({ email: expect.anything() })
      })
    })
  })

  describe('State generation and validation flow', () => {
    it('should create state that can be validated', () => {
      // Generate auth URL (which creates state)
      const url = authManager.getAuthorizationUrl(mockUserId)
      const state = new URL(url).searchParams.get('state')
      
      expect(state).toBeTruthy()
      
      // Validate the state
      const validated = authManager.validateState(state!)
      
      expect(validated).toBeTruthy()
      expect(validated!.userId).toBe(mockUserId)
      expect(validated!.nonce).toBeTruthy()
    })

    it('should generate unique nonces for different state generations', () => {
      const url1 = authManager.getAuthorizationUrl(mockUserId)
      const url2 = authManager.getAuthorizationUrl(mockUserId)
      
      const state1 = new URL(url1).searchParams.get('state')
      const state2 = new URL(url2).searchParams.get('state')
      
      const validated1 = authManager.validateState(state1!)
      const validated2 = authManager.validateState(state2!)
      
      expect(validated1!.nonce).not.toBe(validated2!.nonce)
    })
  })

  describe('Environment variable handling', () => {
    it('should use default values when environment variables are not set', () => {
      // Clear environment variables
      delete process.env.INSTACART_CLIENT_ID
      delete process.env.INSTACART_CLIENT_SECRET
      delete process.env.INSTACART_REDIRECT_URI
      delete process.env.INSTACART_API_BASE_URL
      
      const manager = new InstacartAuthManager()
      const url = manager.getAuthorizationUrl(mockUserId)
      
      expect(url).toContain('client_id=')  // Should have empty client ID
      expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3003%2Fapi%2Finstacart%2Fcallback')
    })
  })
})