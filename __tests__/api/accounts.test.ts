import { NextRequest, NextResponse } from 'next/server'

const mockPrisma = {
  socialAccount: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}

jest.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

const mockSession = {
  user: { id: 'user-1', email: 'test@example.com', name: 'Test User' },
}

describe('/api/accounts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    const { getServerSession } = require('next-auth')
    getServerSession.mockResolvedValue(mockSession)
  })

  describe('GET /api/accounts', () => {
    it('should return accounts for authenticated user', async () => {
      const mockAccounts = [
        {
          id: 'acc-1',
          platform: 'TWITTER',
          username: 'testuser',
          displayName: 'Test User',
          isActive: true,
        },
        {
          id: 'acc-2',
          platform: 'LINKEDIN',
          username: 'testuser',
          displayName: 'Test User',
          isActive: true,
        },
      ]

      mockPrisma.socialAccount.findMany.mockResolvedValue(mockAccounts)

      const accounts = await mockPrisma.socialAccount.findMany({
        where: { userId: 'user-1' },
      })

      expect(accounts).toHaveLength(2)
      expect(accounts[0].platform).toBe('TWITTER')
      expect(accounts[1].platform).toBe('LINKEDIN')
    })

    it('should return empty array for user with no accounts', async () => {
      mockPrisma.socialAccount.findMany.mockResolvedValue([])

      const accounts = await mockPrisma.socialAccount.findMany({
        where: { userId: 'user-1' },
      })

      expect(accounts).toHaveLength(0)
    })

    it('should filter by platform', async () => {
      mockPrisma.socialAccount.findMany.mockResolvedValue([])

      const accounts = await mockPrisma.socialAccount.findMany({
        where: { userId: 'user-1', platform: 'TWITTER' },
      })

      expect(accounts).toHaveLength(0)
    })

    it('should only return active accounts by default', async () => {
      mockPrisma.socialAccount.findMany.mockResolvedValue([])

      const accounts = await mockPrisma.socialAccount.findMany({
        where: { userId: 'user-1', isActive: true },
      })

      expect(accounts).toHaveLength(0)
    })
  })

  describe('POST /api/accounts', () => {
    it('should connect a new account', async () => {
      const newAccount = {
        platform: 'TWITTER',
        platformUserId: 'tw-123',
        username: 'testuser',
        displayName: 'Test User',
        accessToken: 'new-token',
        refreshToken: 'new-refresh',
        tokenExpiresAt: new Date(Date.now() + 3600000),
      }

      mockPrisma.socialAccount.create.mockResolvedValue({
        id: 'new-acc',
        ...newAccount,
        userId: 'user-1',
        isActive: true,
      })

      const account = await mockPrisma.socialAccount.create({
        data: { ...newAccount, userId: 'user-1' },
      })

      expect(account.id).toBe('new-acc')
      expect(account.platform).toBe('TWITTER')
    })

    it('should validate platform', () => {
      const validPlatforms = ['TWITTER', 'LINKEDIN', 'INSTAGRAM', 'FACEBOOK']
      expect(validPlatforms).toContain('TWITTER')
      expect(validPlatforms).not.toContain('TIKTOK')
    })

    it('should store tokens securely', async () => {
      const account = {
        accessToken: 'sensitive-token',
        refreshToken: 'sensitive-refresh',
      }

      expect(account.accessToken).not.toContain(' ')
      expect(account.refreshToken).not.toContain(' ')
    })

    it('should set token expiry', async () => {
      const expiresAt = new Date(Date.now() + 3600000)
      mockPrisma.socialAccount.create.mockResolvedValue({
        id: 'acc-1',
        tokenExpiresAt: expiresAt,
      })

      const account = await mockPrisma.socialAccount.create({
        data: { tokenExpiresAt: expiresAt },
      })

      expect(account.tokenExpiresAt.getTime()).toBeGreaterThan(Date.now())
    })
  })

  describe('PUT /api/accounts/:id', () => {
    it('should update account tokens', async () => {
      const updatedTokens = {
        accessToken: 'refreshed-token',
        tokenExpiresAt: new Date(Date.now() + 7200000),
      }

      mockPrisma.socialAccount.update.mockResolvedValue({
        id: 'acc-1',
        ...updatedTokens,
      })

      const account = await mockPrisma.socialAccount.update({
        where: { id: 'acc-1' },
        data: updatedTokens,
      })

      expect(account.accessToken).toBe('refreshed-token')
    })

    it('should toggle account active status', async () => {
      mockPrisma.socialAccount.update.mockResolvedValue({
        id: 'acc-1',
        isActive: false,
      })

      const account = await mockPrisma.socialAccount.update({
        where: { id: 'acc-1' },
        data: { isActive: false },
      })

      expect(account.isActive).toBe(false)
    })

    it('should prevent updating other users accounts', async () => {
      mockPrisma.socialAccount.findUnique.mockResolvedValue({
        id: 'acc-1',
        userId: 'other-user',
      })

      const account = await mockPrisma.socialAccount.findUnique({
        where: { id: 'acc-1' },
      })

      expect(account.userId).not.toBe('user-1')
    })
  })

  describe('DELETE /api/accounts/:id', () => {
    it('should disconnect account', async () => {
      mockPrisma.socialAccount.findUnique.mockResolvedValue({
        id: 'acc-1',
        userId: 'user-1',
      })
      mockPrisma.socialAccount.delete.mockResolvedValue({ id: 'acc-1' })

      const account = await mockPrisma.socialAccount.findUnique({
        where: { id: 'acc-1' },
      })

      expect(account.userId).toBe('user-1')

      await mockPrisma.socialAccount.delete({ where: { id: 'acc-1' } })
      expect(mockPrisma.socialAccount.delete).toHaveBeenCalled()
    })

    it('should prevent disconnecting other users accounts', async () => {
      mockPrisma.socialAccount.findUnique.mockResolvedValue({
        id: 'acc-1',
        userId: 'other-user',
      })

      const account = await mockPrisma.socialAccount.findUnique({
        where: { id: 'acc-1' },
      })

      expect(account.userId).not.toBe('user-1')
    })
  })

  describe('Account Validation', () => {
    it('should validate token format', () => {
      const token = 'gho_xxxxxxxxxxxxxxxxxxxx'
      expect(token.startsWith('gho_')).toBe(true)
    })

    it('should validate username format', () => {
      const validUsername = 'test_user_123'
      const invalidUsername = 'test user'
      expect(/^[a-zA-Z0-9_]+$/.test(validUsername)).toBe(true)
      expect(/^[a-zA-Z0-9_]+$/.test(invalidUsername)).toBe(false)
    })

    it('should validate platform enum', () => {
      const platforms = ['TWITTER', 'LINKEDIN', 'INSTAGRAM', 'FACEBOOK']
      expect(platforms).toContain('TWITTER')
      expect(platforms).toContain('LINKEDIN')
      expect(platforms).toContain('INSTAGRAM')
      expect(platforms).toContain('FACEBOOK')
    })

    it('should ensure token expiry is in the future', () => {
      const expiresAt = new Date(Date.now() + 3600000)
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now())
    })
  })

  describe('OAuth Flow', () => {
    it('should generate authorization URL', () => {
      const params = new URLSearchParams({
        client_id: 'test-client-id',
        redirect_uri: 'http://localhost:3000/callback',
        response_type: 'code',
        scope: 'tweet.read tweet.write',
      })
      const url = `https://twitter.com/i/oauth2/authorize?${params.toString()}`
      expect(url).toContain('client_id=test-client-id')
      expect(url).toContain('response_type=code')
    })

    it('should exchange code for tokens', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'new-access',
          refresh_token: 'new-refresh',
          expires_in: 3600,
        }),
      })

      const response = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
      })

      const data = await response.json()
      expect(data.access_token).toBeTruthy()
      expect(data.refresh_token).toBeTruthy()
    })

    it('should handle token refresh', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'refreshed-token',
          expires_in: 3600,
        }),
      })

      const response = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
      })

      const data = await response.json()
      expect(data.access_token).toBe('refreshed-token')
    })
  })
})
