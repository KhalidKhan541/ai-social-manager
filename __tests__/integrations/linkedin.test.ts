import { LinkedInIntegration, LINKEDIN_CAPABILITIES, LINKEDIN_RATE_LIMIT, type LinkedInConfig, type LinkedInPost, type LinkedInAnalytics } from '@/lib/integrations/linkedin'

const mockLinkedInConfig: LinkedInConfig = {
  clientId: 'test-linkedin-client-id',
  clientSecret: 'test-linkedin-client-secret',
  redirectUri: 'http://localhost:3000/callback/linkedin',
  scopes: ['w_member_social', 'r_liteprofile', 'r_emailaddress'],
  authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
  tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
  apiBaseUrl: 'https://api.linkedin.com/v2',
  organizationId: 'org-123',
}

const mockProfile = {
  id: 'user-123',
  firstName: { localized: { en_US: 'John' } },
  lastName: { localized: { en_US: 'Doe' } },
  vanityName: 'johndoe',
}

const mockPost: LinkedInPost = {
  id: 'urn:li:share:789',
  author: 'urn:li:person:user-123',
  lifecycleState: 'PUBLISHED',
  specificContent: {
    'com.linkedin.ugc.ShareContent': {
      shareCommentary: { text: 'Test post' },
      shareMediaCategory: 'NONE',
    },
  },
  visibility: {
    'com.linkedin.ugc.MemberNetworkVisibility': 'public',
  },
  createdAt: Date.now(),
  lastModifiedAt: Date.now(),
}

describe('LinkedInIntegration', () => {
  let integration: LinkedInIntegration

  beforeEach(() => {
    integration = new LinkedInIntegration(mockLinkedInConfig)
    jest.clearAllMocks()
  })

  describe('generateAuthUrl', () => {
    it('should generate a valid LinkedIn OAuth URL', () => {
      const url = integration.generateAuthUrl('test-state')
      expect(url).toContain('https://www.linkedin.com/oauth/v2/authorization')
      expect(url).toContain('client_id=test-linkedin-client-id')
      expect(url).toContain('response_type=code')
      expect(url).toContain('state=test-state')
    })

    it('should include all required scopes', () => {
      const url = integration.generateAuthUrl()
      expect(url).toContain('scope=w_member_social')
      expect(url).toContain('scope=r_liteprofile')
    })

    it('should include redirect URI', () => {
      const url = integration.generateAuthUrl()
      expect(url).toContain('redirect_uri=')
    })
  })

  describe('exchangeCode', () => {
    it('should exchange authorization code for tokens', async () => {
      const mockResponse = {
        access_token: 'linkedin-access-token',
        refresh_token: 'linkedin-refresh-token',
        expires_in: 5184000,
        token_type: 'Bearer',
        scope: 'w_member_social',
      }

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const tokens = await integration.exchangeCode('auth-code')
      expect(tokens.accessToken).toBe('linkedin-access-token')
      expect(tokens.refreshToken).toBe('linkedin-refresh-token')
      expect(tokens.tokenType).toBe('Bearer')
    })

    it('should handle exchange failure', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'invalid_grant' }),
      })

      await expect(integration.exchangeCode('bad-code')).rejects.toThrow('Failed to exchange code')
    })
  })

  describe('refreshToken', () => {
    it('should refresh tokens', async () => {
      integration['tokens'] = {
        accessToken: 'old',
        refreshToken: 'refresh',
        expiresAt: Date.now() - 1000,
        tokenType: 'Bearer',
      }

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'refreshed',
          expires_in: 5184000,
          token_type: 'Bearer',
        }),
      })

      const tokens = await integration.refreshToken()
      expect(tokens.accessToken).toBe('refreshed')
    })

    it('should throw when no refresh token', async () => {
      integration['tokens'] = null
      await expect(integration.refreshToken()).rejects.toThrow('No refresh token available')
    })
  })

  describe('getValidToken', () => {
    it('should return valid token', async () => {
      integration['tokens'] = {
        accessToken: 'valid',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer',
      }

      const token = await integration.getValidToken()
      expect(token).toBe('valid')
    })

    it('should throw when not authenticated', async () => {
      await expect(integration.getValidToken()).rejects.toThrow('Not authenticated')
    })
  })

  describe('createPost', () => {
    beforeEach(() => {
      integration['tokens'] = {
        accessToken: 'valid-token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer',
      }
    })

    it('should create a post', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockProfile),
          headers: new Map(),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
          headers: new Map([['x-restli-id', 'urn:li:share:789']]),
        })

      const post = await integration.createPost('Hello LinkedIn!')
      expect(post.specificContent['com.linkedin.ugc.ShareContent'].shareCommentary.text).toBe('Hello LinkedIn!')
    })

    it('should create post with connections visibility', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockProfile),
          headers: new Map(),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
          headers: new Map([['x-restli-id', 'urn:li:share:789']]),
        })

      await integration.createPost('Connection only', 'CONNECTIONS')
      const callBody = JSON.parse(global.fetch.mock.calls[1][1].body)
      expect(callBody.visibility['com.linkedin.ugc.MemberNetworkVisibility']).toBe('connections')
    })

    it('should throw on failure', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProfile),
        headers: new Map(),
      }).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ message: 'Forbidden' }),
        headers: new Map(),
      })

      await expect(integration.createPost('test')).rejects.toThrow()
    })
  })

  describe('deletePost', () => {
    it('should delete a post', async () => {
      integration['tokens'] = {
        accessToken: 'valid-token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer',
      }

      global.fetch = jest.fn().mockResolvedValueOnce({ ok: true })

      const result = await integration.deletePost('urn:li:share:789')
      expect(result).toBe(true)
    })

    it('should return false on failure', async () => {
      integration['tokens'] = {
        accessToken: 'valid-token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer',
      }

      global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 404 })

      const result = await integration.deletePost('nonexistent')
      expect(result).toBe(false)
    })
  })

  describe('getProfile', () => {
    it('should fetch user profile', async () => {
      integration['tokens'] = {
        accessToken: 'valid-token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer',
      }

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockProfile),
      })

      const profile = await integration.getProfile()
      expect(profile.id).toBe('user-123')
    })

    it('should throw on failure', async () => {
      integration['tokens'] = {
        accessToken: 'valid-token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer',
      }

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({}),
      })

      await expect(integration.getProfile()).rejects.toThrow()
    })
  })

  describe('getAnalytics', () => {
    it('should fetch analytics', async () => {
      integration['tokens'] = {
        accessToken: 'valid-token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000,
        tokenType: 'Bearer',
      }

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          elements: [{
            totalShareStatistics: {
              impressionCount: 5000,
              clickCount: 100,
              likeCount: 200,
              commentCount: 50,
              shareCount: 30,
              engagementRate: 0.056,
            },
          }],
        }),
      })

      const analytics = await integration.getAnalytics('urn:li:share:789')
      expect(analytics.impressions).toBe(5000)
      expect(analytics.likes).toBe(200)
    })
  })

  describe('capabilities', () => {
    it('should have correct LinkedIn capabilities', () => {
      expect(LINKEDIN_CAPABILITIES.maxPostLength).toBe(3000)
      expect(LINKEDIN_CAPABILITIES.supportsArticles).toBe(true)
      expect(LINKEDIN_CAPABILITIES.supportsPolls).toBe(true)
      expect(LINKEDIN_CAPABILITIES.supportsReels).toBe(false)
    })

    it('should return capabilities from instance', () => {
      const caps = integration.getCapabilities()
      expect(caps.canPost).toBe(true)
      expect(caps.canUploadMedia).toBe(true)
    })
  })

  describe('isAuthenticated', () => {
    it('should return false initially', () => {
      expect(integration.isAuthenticated()).toBe(false)
    })

    it('should return true after setting tokens', () => {
      integration['tokens'] = { accessToken: 'token', refreshToken: 'refresh', expiresAt: Date.now() + 3600000, tokenType: 'Bearer' }
      expect(integration.isAuthenticated()).toBe(true)
    })
  })

  describe('disconnect', () => {
    it('should clear tokens', () => {
      integration['tokens'] = { accessToken: 'token', refreshToken: 'refresh', expiresAt: Date.now() + 3600000, tokenType: 'Bearer' }
      integration.disconnect()
      expect(integration.isAuthenticated()).toBe(false)
    })
  })

  describe('verifyWebhook', () => {
    it('should verify webhook signature', async () => {
      const body = '{"event":"test"}'
      const crypto = await import('crypto')
      const expectedSig = crypto.createHmac('sha256', mockLinkedInConfig.clientSecret).update(body).digest('hex')

      const result = await integration.verifyWebhook(expectedSig, body)
      expect(result).toBe(true)
    })

    it('should reject invalid signature', async () => {
      const result = await integration.verifyWebhook('invalid', 'body')
      expect(result).toBe(false)
    })
  })

  describe('rate limits', () => {
    it('should have correct rate limit config', () => {
      expect(LINKEDIN_RATE_LIMIT.maxRequests).toBe(100)
      expect(LINKEDIN_RATE_LIMIT.windowMs).toBe(60 * 60 * 1000)
    })
  })
})
