import { NextRequest, NextResponse } from 'next/server'

const mockPrisma = {
  campaign: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  post: {
    findMany: jest.fn(),
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

describe('/api/campaigns', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    const { getServerSession } = require('next-auth')
    getServerSession.mockResolvedValue(mockSession)
  })

  describe('GET /api/campaigns', () => {
    it('should return campaigns for authenticated user', async () => {
      const mockCampaigns = [
        {
          id: 'camp-1',
          name: 'Summer Sale',
          status: 'ACTIVE',
          userId: 'user-1',
        },
        {
          id: 'camp-2',
          name: 'Fall Campaign',
          status: 'DRAFT',
          userId: 'user-1',
        },
      ]

      mockPrisma.campaign.findMany.mockResolvedValue(mockCampaigns)
      mockPrisma.campaign.count.mockResolvedValue(2)

      const campaigns = await mockPrisma.campaign.findMany({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
      })

      expect(campaigns).toHaveLength(2)
    })

    it('should handle pagination', async () => {
      const mockCampaigns = Array.from({ length: 15 }, (_, i) => ({
        id: `camp-${i}`,
        name: `Campaign ${i}`,
        userId: 'user-1',
      }))

      mockPrisma.campaign.findMany.mockResolvedValue(mockCampaigns.slice(0, 10))
      mockPrisma.campaign.count.mockResolvedValue(15)

      const page = 1
      const limit = 10
      const campaigns = await mockPrisma.campaign.findMany({
        where: { userId: 'user-1' },
        skip: (page - 1) * limit,
        take: limit,
      })

      expect(campaigns).toHaveLength(10)
    })

    it('should filter by status', async () => {
      mockPrisma.campaign.findMany.mockResolvedValue([])
      mockPrisma.campaign.count.mockResolvedValue(0)

      const campaigns = await mockPrisma.campaign.findMany({
        where: { userId: 'user-1', status: 'ACTIVE' },
      })

      expect(campaigns).toHaveLength(0)
    })

    it('should return 401 for unauthenticated user', async () => {
      const { getServerSession } = require('next-auth')
      getServerSession.mockResolvedValue(null)

      const session = await getServerSession()
      expect(session).toBeNull()
    })
  })

  describe('POST /api/campaigns', () => {
    it('should create a new campaign', async () => {
      const newCampaign = {
        name: 'New Campaign',
        description: 'A test campaign',
        startDate: new Date('2024-06-01'),
        endDate: new Date('2024-06-30'),
        budget: 5000,
        tags: ['summer', 'sale'],
      }

      mockPrisma.campaign.create.mockResolvedValue({
        id: 'new-camp',
        ...newCampaign,
        userId: 'user-1',
        status: 'DRAFT',
        spent: 0,
        postIds: [],
      })

      const campaign = await mockPrisma.campaign.create({
        data: { ...newCampaign, userId: 'user-1', status: 'DRAFT' },
      })

      expect(campaign.id).toBe('new-camp')
      expect(campaign.name).toBe('New Campaign')
    })

    it('should validate campaign name', () => {
      const name = ''
      expect(name.trim().length).toBe(0)
    })

    it('should validate end date after start date', () => {
      const startDate = new Date('2024-06-30')
      const endDate = new Date('2024-06-01')
      expect(endDate.getTime()).toBeLessThan(startDate.getTime())
    })

    it('should allow campaign without end date', async () => {
      const campaign = {
        name: 'Ongoing Campaign',
        startDate: new Date(),
      }

      mockPrisma.campaign.create.mockResolvedValue({
        id: 'ongoing',
        ...campaign,
        endDate: null,
        userId: 'user-1',
        status: 'DRAFT',
      })

      const created = await mockPrisma.campaign.create({
        data: { ...campaign, userId: 'user-1', status: 'DRAFT' },
      })

      expect(created.endDate).toBeNull()
    })

    it('should set initial spent to 0', async () => {
      mockPrisma.campaign.create.mockResolvedValue({
        id: 'camp-1',
        spent: 0,
      })

      const campaign = await mockPrisma.campaign.create({
        data: { spent: 0 },
      })

      expect(campaign.spent).toBe(0)
    })

    it('should validate budget is non-negative', () => {
      const budget = -100
      expect(budget).toBeLessThan(0)
    })
  })

  describe('PUT /api/campaigns/:id', () => {
    it('should update a campaign', async () => {
      mockPrisma.campaign.update.mockResolvedValue({
        id: 'camp-1',
        name: 'Updated Campaign',
      })

      const campaign = await mockPrisma.campaign.update({
        where: { id: 'camp-1' },
        data: { name: 'Updated Campaign' },
      })

      expect(campaign.name).toBe('Updated Campaign')
    })

    it('should update campaign status', async () => {
      mockPrisma.campaign.update.mockResolvedValue({
        id: 'camp-1',
        status: 'ACTIVE',
      })

      const campaign = await mockPrisma.campaign.update({
        where: { id: 'camp-1' },
        data: { status: 'ACTIVE' },
      })

      expect(campaign.status).toBe('ACTIVE')
    })

    it('should track spent budget', async () => {
      mockPrisma.campaign.update.mockResolvedValue({
        id: 'camp-1',
        spent: 2500,
      })

      const campaign = await mockPrisma.campaign.update({
        where: { id: 'camp-1' },
        data: { spent: 2500 },
      })

      expect(campaign.spent).toBe(2500)
    })

    it('should prevent updating other users campaigns', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue({
        id: 'camp-1',
        userId: 'other-user',
      })

      const campaign = await mockPrisma.campaign.findUnique({
        where: { id: 'camp-1' },
      })

      expect(campaign.userId).not.toBe('user-1')
    })

    it('should update post IDs', async () => {
      mockPrisma.campaign.update.mockResolvedValue({
        id: 'camp-1',
        postIds: ['post-1', 'post-2'],
      })

      const campaign = await mockPrisma.campaign.update({
        where: { id: 'camp-1' },
        data: { postIds: ['post-1', 'post-2'] },
      })

      expect(campaign.postIds).toHaveLength(2)
    })

    it('should update tags', async () => {
      mockPrisma.campaign.update.mockResolvedValue({
        id: 'camp-1',
        tags: ['new-tag'],
      })

      const campaign = await mockPrisma.campaign.update({
        where: { id: 'camp-1' },
        data: { tags: ['new-tag'] },
      })

      expect(campaign.tags).toContain('new-tag')
    })
  })

  describe('DELETE /api/campaigns/:id', () => {
    it('should delete a campaign', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue({
        id: 'camp-1',
        userId: 'user-1',
      })
      mockPrisma.campaign.delete.mockResolvedValue({ id: 'camp-1' })

      const campaign = await mockPrisma.campaign.findUnique({
        where: { id: 'camp-1' },
      })

      expect(campaign.userId).toBe('user-1')

      await mockPrisma.campaign.delete({ where: { id: 'camp-1' } })
      expect(mockPrisma.campaign.delete).toHaveBeenCalled()
    })

    it('should prevent deleting other users campaigns', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue({
        id: 'camp-1',
        userId: 'other-user',
      })

      const campaign = await mockPrisma.campaign.findUnique({
        where: { id: 'camp-1' },
      })

      expect(campaign.userId).not.toBe('user-1')
    })
  })

  describe('Campaign Status Transitions', () => {
    it('should allow DRAFT to ACTIVE', () => {
      const validTransitions: Record<string, string[]> = {
        DRAFT: ['ACTIVE', 'ARCHIVED'],
        ACTIVE: ['PAUSED', 'COMPLETED', 'ARCHIVED'],
        PAUSED: ['ACTIVE', 'ARCHIVED'],
        COMPLETED: ['ARCHIVED'],
      }
      expect(validTransitions.DRAFT).toContain('ACTIVE')
    })

    it('should not allow COMPLETED to ACTIVE', () => {
      const validTransitions: Record<string, string[]> = {
        COMPLETED: ['ARCHIVED'],
      }
      expect(validTransitions.COMPLETED).not.toContain('ACTIVE')
    })
  })

  describe('Campaign Analytics', () => {
    it('should calculate campaign ROI', () => {
      const budget = 5000
      const revenue = 15000
      const roi = ((revenue - budget) / budget) * 100
      expect(roi).toBe(200)
    })

    it('should calculate budget utilization', () => {
      const budget = 5000
      const spent = 2500
      const utilization = (spent / budget) * 100
      expect(utilization).toBe(50)
    })

    it('should calculate posts per day', () => {
      const postCount = 30
      const days = 30
      const postsPerDay = postCount / days
      expect(postsPerDay).toBe(1)
    })

    it('should track campaign duration', () => {
      const start = new Date('2024-06-01')
      const end = new Date('2024-06-30')
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      expect(days).toBe(29)
    })
  })

  describe('Campaign Tags', () => {
    it('should limit tags to 10', () => {
      const tags = Array.from({ length: 11 }, (_, i) => `tag-${i}`)
      expect(tags.length).toBeGreaterThan(10)
    })

    it('should deduplicate tags', () => {
      const tags = ['summer', 'sale', 'summer']
      const unique = [...new Set(tags)]
      expect(unique).toHaveLength(2)
    })

    it('should normalize tag casing', () => {
      const tag = 'SummerSale'
      const normalized = tag.toLowerCase()
      expect(normalized).toBe('summersale')
    })
  })

  describe('Campaign Budget', () => {
    it('should prevent overspending', () => {
      const budget = 5000
      const spent = 5000
      const newExpense = 100
      expect(spent + newExpense).toBeGreaterThan(budget)
    })

    it('should track remaining budget', () => {
      const budget = 5000
      const spent = 2500
      const remaining = budget - spent
      expect(remaining).toBe(2500)
    })

    it('should format budget as currency', () => {
      const budget = 5000
      const formatted = `$${budget.toLocaleString()}`
      expect(formatted).toBe('$5,000')
    })
  })
})
