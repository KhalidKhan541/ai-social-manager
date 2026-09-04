import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PostComposer } from '@/components/compose/post-composer'
import type { SocialAccount } from '@/types'

const mockAccounts: SocialAccount[] = [
  {
    id: 'acc-1',
    userId: 'user-1',
    platform: 'TWITTER',
    platformUserId: 'tw-123',
    username: 'testuser',
    displayName: 'Test User',
    avatar: null,
    accessToken: 'token',
    refreshToken: 'refresh',
    tokenExpiresAt: new Date(Date.now() + 3600000),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'acc-2',
    userId: 'user-1',
    platform: 'LINKEDIN',
    platformUserId: 'li-456',
    username: 'testuser',
    displayName: 'Test User LinkedIn',
    avatar: null,
    accessToken: 'token',
    refreshToken: 'refresh',
    tokenExpiresAt: new Date(Date.now() + 3600000),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

describe('PostComposer', () => {
  const defaultProps = {
    accounts: mockAccounts,
    onSubmit: jest.fn().mockResolvedValue(undefined),
    onSaveDraft: jest.fn().mockResolvedValue(undefined),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render the composer', () => {
    render(<PostComposer {...defaultProps} />)
    expect(screen.getByTestId('post-composer')).toBeInTheDocument()
  })

  it('should display account selector', () => {
    render(<PostComposer {...defaultProps} />)
    expect(screen.getByLabelText('Account')).toBeInTheDocument()
    expect(screen.getByText('Test User (TWITTER)')).toBeInTheDocument()
    expect(screen.getByText('Test User LinkedIn (LINKEDIN)')).toBeInTheDocument()
  })

  it('should display textarea', () => {
    render(<PostComposer {...defaultProps} />)
    expect(screen.getByLabelText('Post content')).toBeInTheDocument()
  })

  it('should show character count', () => {
    render(<PostComposer {...defaultProps} />)
    expect(screen.getByText('280 characters remaining')).toBeInTheDocument()
  })

  it('should update character count when typing', async () => {
    const user = userEvent.setup()
    render(<PostComposer {...defaultProps} />)

    const textarea = screen.getByLabelText('Post content')
    await user.type(textarea, 'Hello world!')

    expect(screen.getByText('268 characters remaining')).toBeInTheDocument()
  })

  it('should show over limit warning', async () => {
    const user = userEvent.setup()
    render(<PostComposer {...defaultProps} />)

    const textarea = screen.getByLabelText('Post content')
    await user.type(textarea, 'a'.repeat(281))

    expect(screen.getByText('-1 characters remaining')).toBeInTheDocument()
    expect(screen.getByText('-1 characters remaining')).toHaveClass('text-red-500')
  })

  it('should disable submit when empty', () => {
    render(<PostComposer {...defaultProps} />)
    const submitButton = screen.getByText('Post Now')
    expect(submitButton).toBeDisabled()
  })

  it('should enable submit when content is present', async () => {
    const user = userEvent.setup()
    render(<PostComposer {...defaultProps} />)

    const textarea = screen.getByLabelText('Post content')
    await user.type(textarea, 'Hello world!')

    const submitButton = screen.getByText('Post Now')
    expect(submitButton).not.toBeDisabled()
  })

  it('should call onSubmit when submit clicked', async () => {
    const user = userEvent.setup()
    render(<PostComposer {...defaultProps} />)

    const textarea = screen.getByLabelText('Post content')
    await user.type(textarea, 'Test post content')

    const submitButton = screen.getByText('Post Now')
    await user.click(submitButton)

    expect(defaultProps.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'Test post content',
        accountId: 'acc-1',
        platform: 'TWITTER',
      })
    )
  })

  it('should show error for empty content', async () => {
    const user = userEvent.setup()
    render(<PostComposer {...defaultProps} />)

    const submitButton = screen.getByText('Post Now')
    await user.click(submitButton)

    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('should show loading state', () => {
    render(<PostComposer {...defaultProps} isLoading={true} />)
    expect(screen.getByText('Posting...')).toBeInTheDocument()
    expect(screen.getByLabelText('Post content')).toBeDisabled()
  })

  it('should show Schedule button when scheduledAt is set', () => {
    render(<PostComposer {...defaultProps} scheduledAt={new Date()} />)
    expect(screen.getByText('Schedule')).toBeInTheDocument()
  })

  it('should save draft when save draft clicked', async () => {
    const user = userEvent.setup()
    render(<PostComposer {...defaultProps} />)

    const textarea = screen.getByLabelText('Post content')
    await user.type(textarea, 'Draft content')

    const draftButton = screen.getByText('Save Draft')
    await user.click(draftButton)

    expect(defaultProps.onSaveDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'Draft content',
      })
    )
  })

  it('should not show save draft button when onSaveDraft not provided', () => {
    const { onSaveDraft, ...props } = defaultProps
    render(<PostComposer {...props} />)
    expect(screen.queryByText('Save Draft')).not.toBeInTheDocument()
  })

  it('should expand on focus and show hashtag input', async () => {
    const user = userEvent.setup()
    render(<PostComposer {...defaultProps} />)

    const textarea = screen.getByLabelText('Post content')
    await user.click(textarea)

    expect(screen.getByPlaceholderText('Add hashtag')).toBeInTheDocument()
  })

  it('should add hashtag on Enter', async () => {
    const user = userEvent.setup()
    render(<PostComposer {...defaultProps} />)

    const textarea = screen.getByLabelText('Post content')
    await user.click(textarea)

    const hashtagInput = screen.getByPlaceholderText('Add hashtag')
    await user.type(hashtagInput, 'test{enter}')

    expect(screen.getByText('#test')).toBeInTheDocument()
  })

  it('should remove hashtag', async () => {
    const user = userEvent.setup()
    render(<PostComposer {...defaultProps} />)

    const textarea = screen.getByLabelText('Post content')
    await user.click(textarea)

    const hashtagInput = screen.getByPlaceholderText('Add hashtag')
    await user.type(hashtagInput, 'test{enter}')

    const removeButton = screen.getByLabelText('Remove #test')
    await user.click(removeButton)

    expect(screen.queryByText('#test')).not.toBeInTheDocument()
  })

  it('should handle submit error', async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error('Failed'))
    const user = userEvent.setup()
    render(<PostComposer {...defaultProps} onSubmit={onSubmit} />)

    const textarea = screen.getByLabelText('Post content')
    await user.type(textarea, 'Test post')

    const submitButton = screen.getByText('Post Now')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Failed to post. Please try again.')).toBeInTheDocument()
    })
  })

  it('should change account and update platform', async () => {
    const user = userEvent.setup()
    render(<PostComposer {...defaultProps} />)

    const select = screen.getByLabelText('Account')
    await user.selectOptions(select, 'acc-2')

    expect(screen.getByText('3000 characters remaining')).toBeInTheDocument()
  })
})
