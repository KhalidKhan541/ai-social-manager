import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { PostCard } from '@/components/posts/post-card'
import type { Post } from '@/types'

const createMockPost = (overrides: Partial<Post> = {}): Post => ({
  id: 'post-123',
  userId: 'user-1',
  accountId: 'acc-1',
  content: 'This is a test post with some content.',
  mediaUrls: [],
  scheduledAt: null,
  publishedAt: new Date('2024-01-15T10:30:00Z'),
  status: 'PUBLISHED',
  platform: 'TWITTER',
  platformPostId: 'tw-123456',
  likes: 50,
  comments: 10,
  shares: 5,
  impressions: 1000,
  reach: 500,
  sentiment: null,
  hashtags: ['#tech', '#innovation'],
  mentions: ['@user1'],
  createdAt: new Date('2024-01-15T10:30:00Z'),
  updatedAt: new Date('2024-01-15T10:30:00Z'),
  ...overrides,
})

describe('PostCard', () => {
  const defaultProps = {
    post: createMockPost(),
    onEdit: jest.fn(),
    onDelete: jest.fn(),
    onRepublish: jest.fn(),
    onViewAnalytics: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render the post card', () => {
    render(<PostCard {...defaultProps} />)
    expect(screen.getByTestId('post-card-post-123')).toBeInTheDocument()
  })

  it('should display post content', () => {
    render(<PostCard {...defaultProps} />)
    expect(screen.getByText('This is a test post with some content.')).toBeInTheDocument()
  })

  it('should display status badge', () => {
    render(<PostCard {...defaultProps} />)
    expect(screen.getByText('Published')).toBeInTheDocument()
  })

  it('should display platform icon', () => {
    render(<PostCard {...defaultProps} />)
    expect(screen.getByText('X')).toBeInTheDocument()
  })

  it('should display engagement metrics', () => {
    render(<PostCard {...defaultProps} />)
    expect(screen.getByText('50')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('1,000 impressions')).toBeInTheDocument()
  })

  it('should calculate engagement rate', () => {
    render(<PostCard {...defaultProps} />)
    expect(screen.getByText('6.5% engagement')).toBeInTheDocument()
  })

  it('should display hashtags', () => {
    render(<PostCard {...defaultProps} />)
    expect(screen.getByText('#tech')).toBeInTheDocument()
    expect(screen.getByText('#innovation')).toBeInTheDocument()
  })

  it('should truncate hashtags when more than 5', () => {
    const post = createMockPost({
      hashtags: ['#tag1', '#tag2', '#tag3', '#tag4', '#tag5', '#tag6'],
    })
    render(<PostCard {...defaultProps} post={post} />)
    expect(screen.getByText('+1')).toBeInTheDocument()
  })

  it('should show actions menu when clicked', () => {
    render(<PostCard {...defaultProps} />)
    const actionsButton = screen.getByLabelText('Post actions')
    fireEvent.click(actionsButton)

    expect(screen.getByText('Edit')).toBeInTheDocument()
    expect(screen.getByText('View Analytics')).toBeInTheDocument()
  })

  it('should call onEdit when Edit clicked', () => {
    render(<PostCard {...defaultProps} />)
    const actionsButton = screen.getByLabelText('Post actions')
    fireEvent.click(actionsButton)

    const editButton = screen.getByText('Edit')
    fireEvent.click(editButton)

    expect(defaultProps.onEdit).toHaveBeenCalledWith(defaultProps.post)
  })

  it('should call onViewAnalytics when View Analytics clicked', () => {
    render(<PostCard {...defaultProps} />)
    const actionsButton = screen.getByLabelText('Post actions')
    fireEvent.click(actionsButton)

    const analyticsButton = screen.getByText('View Analytics')
    fireEvent.click(analyticsButton)

    expect(defaultProps.onViewAnalytics).toHaveBeenCalledWith('post-123')
  })

  it('should show Republish option for published posts', () => {
    render(<PostCard {...defaultProps} />)
    const actionsButton = screen.getByLabelText('Post actions')
    fireEvent.click(actionsButton)

    expect(screen.getByText('Republish')).toBeInTheDocument()
  })

  it('should call onRepublish when Republish clicked', () => {
    render(<PostCard {...defaultProps} />)
    const actionsButton = screen.getByLabelText('Post actions')
    fireEvent.click(actionsButton)

    const republishButton = screen.getByText('Republish')
    fireEvent.click(republishButton)

    expect(defaultProps.onRepublish).toHaveBeenCalledWith('post-123')
  })

  it('should show delete confirmation', () => {
    render(<PostCard {...defaultProps} />)
    const actionsButton = screen.getByLabelText('Post actions')
    fireEvent.click(actionsButton)

    const deleteButton = screen.getByText('Delete')
    fireEvent.click(deleteButton)

    expect(screen.getByText('Confirm Delete')).toBeInTheDocument()
  })

  it('should call onDelete on second click', () => {
    render(<PostCard {...defaultProps} />)
    const actionsButton = screen.getByLabelText('Post actions')
    fireEvent.click(actionsButton)

    const deleteButton = screen.getByText('Delete')
    fireEvent.click(deleteButton)
    fireEvent.click(screen.getByText('Confirm Delete'))

    expect(defaultProps.onDelete).toHaveBeenCalledWith('post-123')
  })

  it('should not show edit for deleted posts', () => {
    const post = createMockPost({ status: 'DELETED' })
    render(<PostCard {...defaultProps} post={post} />)
    const actionsButton = screen.getByLabelText('Post actions')
    fireEvent.click(actionsButton)

    expect(screen.queryByText('Edit')).not.toBeInTheDocument()
  })

  it('should not show analytics for non-published posts', () => {
    const post = createMockPost({ status: 'DRAFT' })
    render(<PostCard {...defaultProps} post={post} />)
    const actionsButton = screen.getByLabelText('Post actions')
    fireEvent.click(actionsButton)

    expect(screen.queryByText('View Analytics')).not.toBeInTheDocument()
  })

  it('should display scheduled date when present', () => {
    const post = createMockPost({
      status: 'SCHEDULED',
      scheduledAt: new Date('2024-01-20T14:00:00Z'),
    })
    render(<PostCard {...defaultProps} post={post} />)
    expect(screen.getByText(/Scheduled/)).toBeInTheDocument()
  })

  it('should show loading state', () => {
    render(<PostCard {...defaultProps} isLoading={true} />)
    expect(screen.getByTestId('post-card-post-123')).toHaveClass('opacity-50')
  })

  it('should display media placeholders', () => {
    const post = createMockPost({ mediaUrls: ['url1', 'url2'] })
    render(<PostCard {...defaultProps} post={post} />)
    expect(screen.getByText('Media 1')).toBeInTheDocument()
    expect(screen.getByText('Media 2')).toBeInTheDocument()
  })

  it('should show different status colors', () => {
    const { rerender } = render(<PostCard {...defaultProps} />)
    expect(screen.getByText('Published')).toHaveClass('text-green-600')

    rerender(<PostCard {...defaultProps} post={createMockPost({ status: 'FAILED' })} />)
    expect(screen.getByText('Failed')).toHaveClass('text-red-600')

    rerender(<PostCard {...defaultProps} post={createMockPost({ status: 'DRAFT' })} />)
    expect(screen.getByText('Draft')).toHaveClass('text-gray-600')
  })
})
