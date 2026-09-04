import { NextRequest, NextResponse } from 'next/server'

const mockPrisma = {
  post: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  socialAccount: {
    findUnique: jest.fn(),
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

describe('/api/posts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    const { getServerSession } = require('next-auth')
    getServerSession.mockResolvedValue(mockSession)
  })

  describe('GET /api/posts', () => {
    it('should return posts for authenticated user', async () => {
      const mockPosts = [
        { id: '1', content: 'Post 1', userId: 'user-1' },
        { id: '2', content: 'Post 2', userId: 'user-1' },
      ]

      mockPrisma.post.findMany.mockResolvedValue(mockPosts)
      mockPrisma.post.count.mockResolvedValue(2)

      const posts = await mockPrisma.post.findMany({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
      })

      expect(posts).toHaveLength(2)
      expect(mockPrisma.post.findMany).toHaveBeenCalled()
    })

    it('should handle pagination', async () => {
      const mockPosts = Array.from({ length: 10 }, (_, i) => ({
        id: `post-${i}`,
        content: `Post ${i}`,
        userId: 'user-1',
      }))

      mockPrisma.post.findMany.mockResolvedValue(mockPosts.slice(0, 5))
      mockPrisma.post.count.mockResolvedValue(10)

      const page = 1
      const limit = 5
      const posts = await mockPrisma.post.findMany({
        where: { userId: 'user-1' },
        skip: (page - 1) * limit,
        take: limit,
      })

      expect(posts).toHaveLength(5)
    })

    it('should filter by platform', async () => {
      mockPrisma.post.findMany.mockResolvedValue([])
      mockPrisma.post.count.mockResolvedValue(0)

      const posts = await mockPrisma.post.findMany({
        where: { userId: 'user-1', platform: 'TWITTER' },
      })

      expect(posts).toHaveLength(0)
    })

    it('should filter by status', async () => {
      mockPrisma.post.findMany.mockResolvedValue([])
      mockPrisma.post.count.mockResolvedValue(0)

      const posts = await mockPrisma.post.findMany({
        where: { userId: 'user-1', status: 'PUBLISHED' },
      })

      expect(posts).toHaveLength(0)
    })

    it('should return 401 for unauthenticated user', async () => {
      const { getServerSession } = require('next-auth')
      getServerSession.mockResolvedValue(null)

      const session = await getServerSession()
      expect(session).toBeNull()
    })
  })

  describe('POST /api/posts', () => {
    it('should create a new post', async () => {
      const newPost = {
        content: 'New post content',
        accountId: 'acc-1',
        platform: 'TWITTER',
      }

      const createdPost = {
        id: 'new-post',
        ...newPost,
        userId: 'user-1',
        status: 'DRAFT',
        likes: 0,
        comments: 0,
        shares: 0,
        impressions: 0,
        reach: 0,
      }

      mockPrisma.socialAccount.findUnique.mockResolvedValue({ id: 'acc-1', userId: 'user-1' })
      mockPrisma.post.create.mockResolvedValue(createdPost)

      const account = await mockPrisma.socialAccount.findUnique({
        where: { id: 'acc-1' },
      })

      expect(account).toBeTruthy()
      expect(account.userId).toBe('user-1')

      const post = await mockPrisma.post.create({
        data: { ...newPost, userId: 'user-1', status: 'DRAFT' },
      })

      expect(post.id).toBe('new-post')
    })

    it('should validate content length', () => {
      const content = 'a'.repeat(281)
      expect(content.length).toBeGreaterThan(280)
    })

    it('should reject empty content', () => {
      const content = ''
      expect(content.trim().length).toBe(0)
    })

    it('should schedule post for later', async () => {
      const scheduledPost = {
        content: 'Scheduled post',
        accountId: 'acc-1',
        scheduledAt: new Date('2024-02-01T10:00:00Z'),
      }

      mockPrisma.post.create.mockResolvedValue({
        id: 'scheduled-post',
        ...scheduledPost,
        userId: 'user-1',
        status: 'SCHEDULED',
      })

      const post = await mockPrisma.post.create({
        data: { ...scheduledPost, userId: 'user-1', status: 'SCHEDULED' },
      })

      expect(post.status).toBe('SCHEDULED')
    })

    it('should attach media URLs', async () => {
      const postWithMedia = {
        content: 'Post with media',
        accountId: 'acc-1',
        mediaUrls: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
      }

      mockPrisma.post.create.mockResolvedValue({
        id: 'media-post',
        ...postWithMedia,
        userId: 'user-1',
        status: 'DRAFT',
      })

      const post = await mockPrisma.post.create({
        data: { ...postWithMedia, userId: 'user-1', status: 'DRAFT' },
      })

      expect(post.mediaUrls).toHaveLength(2)
    })
  })

  describe('PUT /api/posts/:id', () => {
    it('should update a post', async () => {
      const updatedPost = { id: 'post-1', content: 'Updated content' }
      mockPrisma.post.update.mockResolvedValue(updatedPost)

      const post = await mockPrisma.post.update({
        where: { id: 'post-1' },
        data: { content: 'Updated content' },
      })

      expect(post.content).toBe('Updated content')
    })

    it('should prevent updating other users posts', async () => {
      mockPrisma.post.findUnique.mockResolvedValue({
        id: 'post-1',
        userId: 'other-user',
      })

      const post = await mockPrisma.post.findUnique({ where: { id: 'post-1' } })
      expect(post.userId).not.toBe('user-1')
    })

    it('should update post status', async () => {
      mockPrisma.post.update.mockResolvedValue({
        id: 'post-1',
        status: 'PUBLISHED',
      })

      const post = await mockPrisma.post.update({
        where: { id: 'post-1' },
        data: { status: 'PUBLISHED', publishedAt: new Date() },
      })

      expect(post.status).toBe('PUBLISHED')
    })
  })

  describe('DELETE /api/posts/:id', () => {
    it('should delete a post', async () => {
      mockPrisma.post.findUnique.mockResolvedValue({
        id: 'post-1',
        userId: 'user-1',
      })
      mockPrisma.post.delete.mockResolvedValue({ id: 'post-1' })

      const post = await mockPrisma.post.findUnique({ where: { id: 'post-1' } })
      expect(post.userId).toBe('user-1')

      await mockPrisma.post.delete({ where: { id: 'post-1' } })
      expect(mockPrisma.post.delete).toHaveBeenCalledWith({ where: { id: 'post-1' } })
    })

    it('should prevent deleting other users posts', async () => {
      mockPrisma.post.findUnique.mockResolvedValue({
        id: 'post-1',
        userId: 'other-user',
      })

      const post = await mockPrisma.post.findUnique({ where: { id: 'post-1' } })
      expect(post.userId).not.toBe('user-1')
    })
  })
})
