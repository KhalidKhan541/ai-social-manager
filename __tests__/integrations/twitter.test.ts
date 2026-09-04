import { TwitterIntegration, TWITTER_CAPABILITIES, TWITTER_RATE_LIMIT, type TwitterConfig, type Tweet, type AnalyticsResponse } from '@/lib/integrations/twitter'

const mockTwitterConfig: TwitterConfig = {
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret',
  redirectUri: 'http://localhost:3000/callback',
  scopes: ['tweet.read', 'tweet.write', 'users.read'],
  authUrl: 'https://twitter.com/i/oauth2/authorize',
  tokenUrl: 'https://api.twitter.com/2/oauth2/token',
  apiBaseUrl: 'https://api.twitter.com/2',
  bearerToken: 'test-bearer-token',
}

const mockTweet: Tweet = {
  id: '1234567890',
  text: 'Hello world!',
  createdAt: '2024-01-15T10:30:00Z',
  authorId: '9876543210',
  metrics: {
    retweetCount: 10,
    replyCount: 5,
    likeCount: 50,
    quoteCount: 3,
    bookmarkCount: 8,
    impressionCount: 1000,
  },
}

describe('TwitterIntegration', () => {
  let integration: TwitterIntegration

  beforeEach(() => {
    integration = new TwitterIntegration(mockTwitterConfig)
    jest.clearAllMocks()
  })

  describe('generateAuthUrl', () => {
    it('should generate a valid OAuth URL', () => {
      const url = integration.generateAuthUrl('test-state')
      expect(url).toContain('https://twitter.com/i/oauth2/authorize')
      expect(url).toContain('client_id=test-client-id')
      expect(url).toContain('redirect_uri=')
      expect(url).toContain('response_type=code')
      expect(url).toContain('state=test-state')
    })

    it('should generate random state when none provided', () => {
      const url = integration.generateAuthUrl()
      expect(url).toContain('state=')
    })

    it('should include scopes in URL', () => {
      const url = integration.generateAuthUrl()
      expect(url).toContain('scope=tweet.read')
    })
  })

  describe('exchangeCode', () => {
    it('should exchange code for tokens successfully', async () => {
      const mockResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        token_type: 'bearer',
        scope: 'tweet.read tweet.write',
      }

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const tokens = await integration.exchangeCode('auth-code')
      expect(tokens.accessToken).toBe('new-access-token')
      expect(tokens.refreshToken).toBe('new-refresh-token')
      expect(tokens.expiresAt).toBeGreaterThan(Date.now())
    })

    it('should throw error on failed exchange', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'invalid_grant' }),
      })

      await expect(integration.exchangeCode('bad-code')).rejects.toThrow()
    })
  })

  describe('refreshToken', () => {
    it('should refresh tokens successfully', async () => {
      const tokens = {
        accessToken: 'old-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() - 1000,
        tokenType: 'bearer',
      }
      integration['tokens'] = tokens

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'refreshed-token',
          expires_in: 3600,
          token_type: 'bearer',
        }),
      })

      const refreshed = await integration.refreshToken()
      expect(refreshed.accessToken).toBe('refreshed-token')
    })

    it('should throw when no refresh token available', async () => {
      integration['tokens'] = null
      await expect(integration.refreshToken()).rejects.toThrow('No refresh token available')
    })
  })

  describe('getValidToken', () => {
    it('should return current token when valid', async () => {
      integration['tokens'] = {
        accessToken: 'valid-token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000,
        tokenType: 'bearer',
      }

      const token = await integration.getValidToken()
      expect(token).toBe('valid-token')
    })

    it('should refresh when token is near expiry', async () => {
      integration['tokens'] = {
        accessToken: 'expiring-token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 200000,
        tokenType: 'bearer',
      }

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'new-token',
          expires_in: 3600,
          token_type: 'bearer',
        }),
      })

      const token = await integration.getValidToken()
      expect(token).toBe('new-token')
    })

    it('should throw when no tokens', async () => {
      integration['tokens'] = null
      await expect(integration.getValidToken()).rejects.toThrow('Not authenticated')
    })
  })

  describe('postTweet', () => {
    beforeEach(() => {
      integration['tokens'] = {
        accessToken: 'valid-token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000,
        tokenType: 'bearer',
      }
    })

    it('should post a tweet successfully', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockTweet }),
      })

      const tweet = await integration.postTweet('Hello world!')
      expect(tweet.id).toBe('1234567890')
      expect(tweet.text).toBe('Hello world!')
    })

    it('should include media IDs when provided', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockTweet }),
      })

      await integration.postTweet('With media', ['media-1', 'media-2'])
      const callBody = JSON.parse(global.fetch.mock.calls[0][1].body)
      expect(callBody.media.media_ids).toEqual(['media-1', 'media-2'])
    })

    it('should throw on post failure', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ detail: 'Forbidden' }),
      })

      await expect(integration.postTweet('test')).rejects.toThrow()
    })
  })

  describe('deleteTweet', () => {
    it('should delete a tweet successfully', async () => {
      integration['tokens'] = {
        accessToken: 'valid-token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000,
        tokenType: 'bearer',
      }

      global.fetch = jest.fn().mockResolvedValueOnce({ ok: true })

      const result = await integration.deleteTweet('123456')
      expect(result).toBe(true)
    })

    it('should return false on failure', async () => {
      integration['tokens'] = {
        accessToken: 'valid-token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000,
        tokenType: 'bearer',
      }

      global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 404 })

      const result = await integration.deleteTweet('nonexistent')
      expect(result).toBe(false)
    })
  })

  describe('getTweet', () => {
    it('should fetch a tweet', async () => {
      integration['tokens'] = {
        accessToken: 'valid-token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000,
        tokenType: 'bearer',
      }

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockTweet }),
      })

      const tweet = await integration.getTweet('1234567890')
      expect(tweet.id).toBe('1234567890')
    })
  })

  describe('searchTweets', () => {
    it('should search tweets', async () => {
      integration['tokens'] = {
        accessToken: 'valid-token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000,
        tokenType: 'bearer',
      }

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [mockTweet] }),
      })

      const results = await integration.searchTweets('#test')
      expect(results).toHaveLength(1)
    })

    it('should return empty array when no results', async () => {
      integration['tokens'] = {
        accessToken: 'valid-token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000,
        tokenType: 'bearer',
      }

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })

      const results = await integration.searchTweets('#nonexistent')
      expect(results).toHaveLength(0)
    })
  })

  describe('getAnalytics', () => {
    it('should fetch analytics for tweets', async () => {
      integration['tokens'] = {
        accessToken: 'valid-token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000,
        tokenType: 'bearer',
      }

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [mockTweet] }),
      })

      const analytics = await integration.getAnalytics(['1234567890'])
      expect(analytics[0].impressions).toBe(1000)
      expect(analytics[0].likes).toBe(50)
    })
  })

  describe('getCapabilities', () => {
    it('should return Twitter capabilities', () => {
      const caps = integration.getCapabilities()
      expect(caps.maxPostLength).toBe(280)
      expect(caps.supportsThreads).toBe(true)
      expect(caps.supportsPolls).toBe(true)
      expect(caps.supportsStories).toBe(false)
    })
  })

  describe('isAuthenticated', () => {
    it('should return false when not authenticated', () => {
      expect(integration.isAuthenticated()).toBe(false)
    })

    it('should return true when authenticated', () => {
      integration['tokens'] = { accessToken: 'token', refreshToken: 'refresh', expiresAt: Date.now() + 3600000, tokenType: 'bearer' }
      expect(integration.isAuthenticated()).toBe(true)
    })
  })

  describe('disconnect', () => {
    it('should clear tokens', () => {
      integration['tokens'] = { accessToken: 'token', refreshToken: 'refresh', expiresAt: Date.now() + 3600000, tokenType: 'bearer' }
      integration.disconnect()
      expect(integration.isAuthenticated()).toBe(false)
    })
  })

  describe('verifyWebhook', () => {
    it('should verify webhook signature', async () => {
      const body = '{"event":"test"}'
      const crypto = await import('crypto')
      const expectedSig = crypto.createHmac('sha256', mockTwitterConfig.clientSecret).update(body).digest('hex')

      const result = await integration.verifyWebhook(expectedSig, body)
      expect(result).toBe(true)
    })

    it('should reject invalid signature', async () => {
      const result = await integration.verifyWebhook('invalid-sig', 'body')
      expect(result).toBe(false)
    })
  })

  describe('rate limiting', () => {
    it('should have correct rate limit config', () => {
      expect(TWITTER_RATE_LIMIT.maxRequests).toBe(300)
      expect(TWITTER_RATE_LIMIT.windowMs).toBe(15 * 60 * 1000)
    })
  })
})
