import {
  BaseIntegration,
  type OAuthConfig,
  type OAuthTokens,
  type PlatformCapabilities,
  type RateLimitConfig,
  type IntegrationError,
} from '@/lib/integrations/base'

class MockIntegration extends BaseIntegration {
  protected readonly platform = 'twitter' as const
  protected readonly capabilities: PlatformCapabilities = {
    canPost: true,
    canComment: true,
    canReact: true,
    canUploadMedia: true,
    canSchedule: false,
    canDelete: true,
    canSearch: true,
    canGetAnalytics: true,
    maxPostLength: 280,
    maxMediaSize: 5 * 1024 * 1024,
    supportedMediaTypes: ['image/jpeg', 'image/png'],
    supportsThreads: true,
    supportsPolls: true,
    supportsStories: false,
    supportsReels: false,
    supportsArticles: false,
    supportsEvents: false,
  }

  protected async refreshAccessToken(): Promise<OAuthTokens> {
    return {
      accessToken: 'refreshed-token',
      refreshToken: 'new-refresh',
      expiresAt: Date.now() + 3600000,
      tokenType: 'bearer',
    }
  }

  protected validateTokenResponse(data: unknown): data is OAuthTokens {
    const t = data as OAuthTokens
    return !!(t?.accessToken && t?.expiresAt)
  }

  protected getAuthHeaders(): Record<string, string> {
    return { Authorization: `Bearer ${this.tokens?.accessToken || ''}` }
  }

  protected verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.webhookSecret) return false
    return this.generateSignature(payload) === signature
  }

  async disconnect(): Promise<void> {
    this.tokens = null
  }

  async isAuthenticated(): Promise<boolean> {
    return this.tokens !== null
  }

  getPlatformInfo() {
    return {
      name: 'Twitter',
      version: '2.0',
      capabilities: this.capabilities,
    }
  }

  public async testRequest<T>(method: string, path: string, options?: Parameters<BaseIntegration['request']>[2]): Promise<T> {
    return this.request<T>(method, path, options)
  }
}

const mockConfig: OAuthConfig = {
  clientId: 'client-id',
  clientSecret: 'client-secret',
  redirectUri: 'http://localhost:3000/callback',
  scopes: ['read', 'write'],
  authUrl: 'https://auth.example.com/authorize',
  tokenUrl: 'https://auth.example.com/token',
  apiBaseUrl: 'https://api.example.com',
}

const mockRateLimit: RateLimitConfig = {
  maxRequests: 100,
  windowMs: 60000,
}

describe('BaseIntegration', () => {
  let integration: MockIntegration

  beforeEach(() => {
    integration = new MockIntegration(mockConfig, mockRateLimit, 'webhook-secret')
    jest.clearAllMocks()
  })

  describe('generateAuthorizationUrl', () => {
    it('should generate a valid authorization URL', () => {
      const url = integration.generateAuthorizationUrl('state-123')
      expect(url).toContain('https://auth.example.com/authorize')
      expect(url).toContain('client_id=client-id')
      expect(url).toContain('response_type=code')
      expect(url).toContain('state=state-123')
      expect(url).toContain('scope=read')
    })

    it('should generate random state when none provided', () => {
      const url1 = integration.generateAuthorizationUrl()
      const url2 = integration.generateAuthorizationUrl()
      const state1 = new URL(url1).searchParams.get('state')
      const state2 = new URL(url2).searchParams.get('state')
      expect(state1).toBeTruthy()
      expect(state2).toBeTruthy()
      expect(state1).not.toBe(state2)
    })

    it('should include redirect URI', () => {
      const url = integration.generateAuthorizationUrl()
      expect(url).toContain('redirect_uri=')
    })
  })

  describe('exchangeCodeForTokens', () => {
    it('should exchange code successfully', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'new-access',
          refresh_token: 'new-refresh',
          expires_at: Date.now() + 3600000,
          token_type: 'bearer',
        }),
      })

      const tokens = await integration.exchangeCodeForTokens('auth-code')
      expect(tokens.accessToken).toBe('new-access')
      expect(tokens.refreshToken).toBe('new-refresh')
    })

    it('should throw on failed exchange', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'invalid_grant' }),
      })

      await expect(integration.exchangeCodeForTokens('bad')).rejects.toThrow()
    })

    it('should throw on invalid token response', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ access_token: 'token' }),
      })

      await expect(integration.exchangeCodeForTokens('code')).rejects.toThrow()
    })
  })

  describe('getValidAccessToken', () => {
    it('should return token when valid', async () => {
      integration['tokens'] = {
        accessToken: 'valid',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000,
        tokenType: 'bearer',
      }

      const token = await integration.getValidAccessToken()
      expect(token).toBe('valid')
    })

    it('should refresh when near expiry', async () => {
      integration['tokens'] = {
        accessToken: 'expiring',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 200000,
        tokenType: 'bearer',
      }

      const token = await integration.getValidAccessToken()
      expect(token).toBe('refreshed-token')
    })

    it('should throw when no tokens', async () => {
      await expect(integration.getValidAccessToken()).rejects.toThrow('No tokens available')
    })
  })

  describe('rate limiting', () => {
    it('should track request count', async () => {
      integration['rateLimit'] = { requests: 0, resetAt: Date.now() + 60000 }

      await integration['checkRateLimit']()
      expect(integration['rateLimit'].requests).toBe(1)

      await integration['checkRateLimit']()
      expect(integration['rateLimit'].requests).toBe(2)
    })

    it('should reset window when expired', async () => {
      integration['rateLimit'] = { requests: 100, resetAt: Date.now() - 1000 }

      await integration['checkRateLimit']()
      expect(integration['rateLimit'].requests).toBe(1)
    })

    it('should wait when rate limit exceeded', async () => {
      integration['rateLimit'] = { requests: 100, resetAt: Date.now() + 100 }
      integration['sleep'] = jest.fn().mockResolvedValue(undefined)

      await integration['checkRateLimit']()
      expect(integration['sleep']).toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('should handle 429 as rate limited', () => {
      const response = new Response(null, { status: 429 })
      const error = integration.handleErrorResponse(response, null)
      expect(error.code).toBe('RATE_LIMITED')
      expect(error.retryable).toBe(true)
    })

    it('should handle 401 as unauthorized', () => {
      const response = new Response(null, { status: 401 })
      const error = integration.handleErrorResponse(response, null)
      expect(error.code).toBe('UNAUTHORIZED')
      expect(error.retryable).toBe(false)
    })

    it('should handle 403 as forbidden', () => {
      const response = new Response(null, { status: 403 })
      const error = integration.handleErrorResponse(response, null)
      expect(error.code).toBe('FORBIDDEN')
    })

    it('should handle 404 as not found', () => {
      const response = new Response(null, { status: 404 })
      const error = integration.handleErrorResponse(response, null)
      expect(error.code).toBe('NOT_FOUND')
    })

    it('should handle 500 as retryable server error', () => {
      const response = new Response(null, { status: 500 })
      const error = integration.handleErrorResponse(response, null)
      expect(error.code).toBe('SERVER_ERROR')
      expect(error.retryable).toBe(true)
    })

    it('should extract error message from response data', () => {
      const response = new Response(null, { status: 400 })
      const error = integration.handleErrorResponse(response, { error: 'bad request' })
      expect(error.message).toBe('bad request')
    })

    it('should extract error from errors array', () => {
      const response = new Response(null, { status: 400 })
      const error = integration.handleErrorResponse(response, {
        errors: [{ message: 'Validation failed', code: 'VALIDATION_ERROR' }],
      })
      expect(error.message).toBe('Validation failed')
      expect(error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('createError', () => {
    it('should create error with correct properties', () => {
      const error = integration['createError']('TEST_ERROR', 'Test message', 400)
      expect(error.code).toBe('TEST_ERROR')
      expect(error.message).toBe('Test message')
      expect(error.statusCode).toBe(400)
      expect(error.retryable).toBe(false)
      expect(error.platform).toBe('twitter')
    })
  })

  describe('withRetry', () => {
    it('should retry on retryable errors', async () => {
      let attempts = 0
      const fn = jest.fn().mockImplementation(() => {
        attempts++
        if (attempts < 3) {
          const error: IntegrationError = { code: 'RATE_LIMITED', message: 'rate limited', retryable: true, platform: 'twitter' }
          throw error
        }
        return 'success'
      })

      integration['sleep'] = jest.fn().mockResolvedValue(undefined)
      const result = await integration['withRetry'](fn, 3, 100)
      expect(result).toBe('success')
      expect(attempts).toBe(3)
    })

    it('should not retry on non-retryable errors', async () => {
      const fn = jest.fn().mockImplementation(() => {
        throw { code: 'UNAUTHORIZED', message: 'unauthorized', retryable: false, platform: 'twitter' }
      })

      await expect(integration['withRetry'](fn, 3, 100)).rejects.toThrow()
      expect(fn).toHaveBeenCalledTimes(1)
    })
  })

  describe('webhook verification', () => {
    it('should generate correct signature', () => {
      const sig = integration['generateSignature']('test-payload')
      expect(sig).toBeTruthy()
      expect(typeof sig).toBe('string')
    })

    it('should verify webhook with correct signature', () => {
      const payload = 'test-payload'
      const sig = integration['generateSignature'](payload)
      const result = integration['verifyWebhook'](payload, sig)
      expect(result).toBe(true)
    })

    it('should reject webhook without secret', () => {
      const noSecretIntegration = new MockIntegration(mockConfig, mockRateLimit)
      const result = noSecretIntegration['verifyWebhook']('payload', 'sig')
      expect(result).toBe(false)
    })
  })

  describe('platform info', () => {
    it('should return platform info', () => {
      const info = integration.getPlatformInfo()
      expect(info.name).toBe('Twitter')
      expect(info.version).toBe('2.0')
      expect(info.capabilities.maxPostLength).toBe(280)
    })
  })

  describe('utility methods', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      const formatted = integration['formatDate'](date)
      expect(formatted).toBe('2024-01-15T10:30:00.000Z')
    })

    it('should parse date correctly', () => {
      const date = integration['parseDate']('2024-01-15T10:30:00Z')
      expect(date).toBeInstanceOf(Date)
      expect(date.getFullYear()).toBe(2024)
    })
  })

  describe('token persistence', () => {
    it('should save tokens', async () => {
      const tokens: OAuthTokens = {
        accessToken: 'saved',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000,
        tokenType: 'bearer',
      }

      await integration['saveTokens'](tokens)
      expect(integration['tokens']).toEqual(tokens)
    })

    it('should load tokens', async () => {
      integration['tokens'] = {
        accessToken: 'loaded',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000,
        tokenType: 'bearer',
      }

      const tokens = await integration['loadTokens']()
      expect(tokens?.accessToken).toBe('loaded')
    })
  })
})
