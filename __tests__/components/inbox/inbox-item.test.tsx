import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { InboxItem, InboxList } from '@/components/inbox/inbox-item'
import type { Notification } from '@/types'

const createMockNotification = (overrides: Partial<Notification> = {}): Notification => ({
  id: 'notif-1',
  userId: 'user-1',
  type: 'POST_PUBLISHED',
  title: 'Post Published',
  message: 'Your post has been published successfully.',
  read: false,
  actionUrl: '/posts/123',
  metadata: {},
  createdAt: new Date('2024-01-15T10:30:00Z'),
  ...overrides,
})

describe('InboxItem', () => {
  const defaultProps = {
    notification: createMockNotification(),
    onMarkAsRead: jest.fn(),
    onDelete: jest.fn(),
    onAction: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render inbox item', () => {
    render(<InboxItem {...defaultProps} />)
    expect(screen.getByTestId('inbox-item-notif-1')).toBeInTheDocument()
  })

  it('should display notification title', () => {
    render(<InboxItem {...defaultProps} />)
    expect(screen.getByText('Post Published')).toBeInTheDocument()
  })

  it('should display notification message', () => {
    render(<InboxItem {...defaultProps} />)
    expect(screen.getByText('Your post has been published successfully.')).toBeInTheDocument()
  })

  it('should display unread indicator', () => {
    render(<InboxItem {...defaultProps} />)
    expect(screen.getByText('Post Published')).toBeInTheDocument()
    const unreadDot = screen.getByTestId('inbox-item-notif-1').querySelector('.bg-blue-600')
    expect(unreadDot).toBeInTheDocument()
  })

  it('should not show unread indicator when read', () => {
    const notification = createMockNotification({ read: true })
    render(<InboxItem {...defaultProps} notification={notification} />)
    const unreadDot = screen.getByTestId('inbox-item-notif-1').querySelector('.bg-blue-600')
    expect(unreadDot).not.toBeInTheDocument()
  })

  it('should highlight unread notification', () => {
    render(<InboxItem {...defaultProps} />)
    expect(screen.getByTestId('inbox-item-notif-1')).toHaveClass('bg-blue-50')
  })

  it('should call onMarkAsRead when clicked', () => {
    render(<InboxItem {...defaultProps} />)
    fireEvent.click(screen.getByTestId('inbox-item-notif-1'))
    expect(defaultProps.onMarkAsRead).toHaveBeenCalledWith('notif-1')
  })

  it('should call onAction when clicked with actionUrl', () => {
    render(<InboxItem {...defaultProps} />)
    fireEvent.click(screen.getByTestId('inbox-item-notif-1'))
    expect(defaultProps.onAction).toHaveBeenCalledWith('notif-1', '/posts/123')
  })

  it('should show actions menu', () => {
    render(<InboxItem {...defaultProps} />)
    const actionsButton = screen.getByLabelText('Notification actions')
    fireEvent.click(actionsButton)

    expect(screen.getByText('Mark as Read')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('should call onDelete when delete clicked', () => {
    render(<InboxItem {...defaultProps} />)
    const actionsButton = screen.getByLabelText('Notification actions')
    fireEvent.click(actionsButton)

    fireEvent.click(screen.getByText('Delete'))
    expect(defaultProps.onDelete).toHaveBeenCalledWith('notif-1')
  })

  it('should show Mark as Unread when notification is read', () => {
    const notification = createMockNotification({ read: true })
    render(<InboxItem {...defaultProps} notification={notification} />)
    const actionsButton = screen.getByLabelText('Notification actions')
    fireEvent.click(actionsButton)

    expect(screen.getByText('Mark as Unread')).toBeInTheDocument()
  })

  it('should display correct icon for notification type', () => {
    render(<InboxItem {...defaultProps} />)
    expect(screen.getByText('\u2713')).toBeInTheDocument()
  })

  it('should display icon for different notification types', () => {
    const failedNotif = createMockNotification({ type: 'POST_FAILED' })
    render(<InboxItem {...defaultProps} notification={failedNotif} />)
    expect(screen.getByText('\u2717')).toBeInTheDocument()
  })

  it('should show loading state', () => {
    render(<InboxItem {...defaultProps} isLoading={true} />)
    expect(screen.getByTestId('inbox-item-notif-1')).toHaveClass('opacity-50')
  })
})

describe('InboxList', () => {
  const notifications = [
    createMockNotification({ id: '1', title: 'Notification 1', read: false }),
    createMockNotification({ id: '2', title: 'Notification 2', read: true }),
    createMockNotification({ id: '3', title: 'Notification 3', read: false }),
  ]

  const defaultProps = {
    notifications,
    onMarkAsRead: jest.fn(),
    onMarkAllAsRead: jest.fn(),
    onDelete: jest.fn(),
    onAction: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render inbox list', () => {
    render(<InboxList {...defaultProps} />)
    expect(screen.getByTestId('inbox-list')).toBeInTheDocument()
  })

  it('should display inbox title', () => {
    render(<InboxList {...defaultProps} />)
    expect(screen.getByText('Inbox')).toBeInTheDocument()
  })

  it('should display unread count', () => {
    render(<InboxList {...defaultProps} />)
    expect(screen.getByText('2 unread')).toBeInTheDocument()
  })

  it('should render all notifications', () => {
    render(<InboxList {...defaultProps} />)
    expect(screen.getByText('Notification 1')).toBeInTheDocument()
    expect(screen.getByText('Notification 2')).toBeInTheDocument()
    expect(screen.getByText('Notification 3')).toBeInTheDocument()
  })

  it('should show Mark all as read button when unread exist', () => {
    render(<InboxList {...defaultProps} />)
    expect(screen.getByText('Mark all as read')).toBeInTheDocument()
  })

  it('should call onMarkAllAsRead when clicked', () => {
    render(<InboxList {...defaultProps} />)
    fireEvent.click(screen.getByText('Mark all as read'))
    expect(defaultProps.onMarkAllAsRead).toHaveBeenCalled()
  })

  it('should show empty message when no notifications', () => {
    render(<InboxList {...defaultProps} notifications={[]} />)
    expect(screen.getByText('No notifications')).toBeInTheDocument()
  })

  it('should show custom empty message', () => {
    render(
      <InboxList
        {...defaultProps}
        notifications={[]}
        emptyMessage="All caught up!"
      />
    )
    expect(screen.getByText('All caught up!')).toBeInTheDocument()
  })

  it('should show loading skeleton', () => {
    render(<InboxList {...defaultProps} notifications={[]} isLoading={true} />)
    expect(screen.getByTestId('inbox-list')).toBeInTheDocument()
  })

  it('should not show Mark all as read when no unread', () => {
    const allRead = notifications.map((n) => ({ ...n, read: true }))
    render(<InboxList {...defaultProps} notifications={allRead} />)
    expect(screen.queryByText('Mark all as read')).not.toBeInTheDocument()
  })

  it('should call onMarkAsRead when notification clicked', () => {
    render(<InboxList {...defaultProps} />)
    fireEvent.click(screen.getByTestId('inbox-item-1'))
    expect(defaultProps.onMarkAsRead).toHaveBeenCalledWith('1')
  })
})
