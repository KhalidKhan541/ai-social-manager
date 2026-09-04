'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import type { Platform, PostStatus, SocialAccount } from '@/types'

export interface PostComposerProps {
  accounts: SocialAccount[]
  onSubmit: (data: PostData) => Promise<void>
  onSaveDraft?: (data: PostData) => Promise<void>
  initialContent?: string
  initialPlatform?: Platform
  maxLength?: number
  isLoading?: boolean
  scheduledAt?: Date | null
  onScheduleChange?: (date: Date | null) => void
}

export interface PostData {
  content: string
  accountId: string
  platform: Platform
  scheduledAt: Date | null
  mediaUrls: string[]
  hashtags: string[]
}

const PLATFORM_MAX_LENGTHS: Record<Platform, number> = {
  TWITTER: 280,
  LINKEDIN: 3000,
  INSTAGRAM: 2200,
  FACEBOOK: 63206,
}

export function PostComposer({
  accounts,
  onSubmit,
  onSaveDraft,
  initialContent = '',
  initialPlatform,
  maxLength,
  isLoading = false,
  scheduledAt = null,
  onScheduleChange,
}: PostComposerProps) {
  const [content, setContent] = useState(initialContent)
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    accounts[0]?.id || ''
  )
  const [hashtags, setHashtags] = useState<string[]>([])
  const [mediaUrls, setMediaUrls] = useState<string[]>([])
  const [isExpanded, setIsExpanded] = useState(false)
  const [showScheduler, setShowScheduler] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId)
  const platform = selectedAccount?.platform || initialPlatform || 'TWITTER'
  const maxLen = maxLength || PLATFORM_MAX_LENGTHS[platform]
  const charCount = content.length
  const isOverLimit = charCount > maxLen
  const remainingChars = maxLen - charCount

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [content])

  const handleSubmit = useCallback(async () => {
    if (!content.trim()) {
      setError('Content cannot be empty')
      return
    }
    if (isOverLimit) {
      setError(`Content exceeds ${maxLen} character limit`)
      return
    }
    if (!selectedAccountId) {
      setError('Please select an account')
      return
    }

    setError(null)
    try {
      await onSubmit({
        content: content.trim(),
        accountId: selectedAccountId,
        platform,
        scheduledAt,
        mediaUrls,
        hashtags,
      })
    } catch {
      setError('Failed to post. Please try again.')
    }
  }, [content, selectedAccountId, platform, scheduledAt, mediaUrls, hashtags, maxLen, isOverLimit, onSubmit])

  const handleSaveDraft = useCallback(async () => {
    if (!onSaveDraft) return
    try {
      await onSaveDraft({
        content: content.trim(),
        accountId: selectedAccountId,
        platform,
        scheduledAt,
        mediaUrls,
        hashtags,
      })
    } catch {
      setError('Failed to save draft')
    }
  }, [content, selectedAccountId, platform, scheduledAt, mediaUrls, hashtags, onSaveDraft])

  const addHashtag = (tag: string) => {
    const cleaned = tag.startsWith('#') ? tag : `#${tag}`
    if (!hashtags.includes(cleaned)) {
      setHashtags([...hashtags, cleaned])
    }
  }

  const removeHashtag = (tag: string) => {
    setHashtags(hashtags.filter((t) => t !== tag))
  }

  const addMediaUrl = (url: string) => {
    if (url.trim() && !mediaUrls.includes(url)) {
      setMediaUrls([...mediaUrls, url.trim()])
    }
  }

  const removeMediaUrl = (url: string) => {
    setMediaUrls(mediaUrls.filter((u) => u !== url))
  }

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm" data-testid="post-composer">
      <div className="mb-4">
        <label htmlFor="account-select" className="block text-sm font-medium text-gray-700 mb-1">
          Account
        </label>
        <select
          id="account-select"
          value={selectedAccountId}
          onChange={(e) => setSelectedAccountId(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          disabled={isLoading}
        >
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.displayName} ({account.platform})
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`What's on your mind? (${platform})`}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm resize-none min-h-[120px]"
          maxLength={maxLen + 100}
          disabled={isLoading}
          aria-label="Post content"
          onFocus={() => setIsExpanded(true)}
        />
        <div className="mt-1 flex justify-between text-xs text-gray-500">
          <span>{platform}</span>
          <span className={isOverLimit ? 'text-red-500 font-medium' : ''}>
            {remainingChars} characters remaining
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="mb-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hashtags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {hashtags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800"
                >
                  {tag}
                  <button
                    onClick={() => removeHashtag(tag)}
                    className="text-blue-600 hover:text-blue-800"
                    aria-label={`Remove ${tag}`}
                  >
                    x
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              placeholder="Add hashtag"
              className="w-full rounded-md border border-gray-300 px-3 py-1 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  addHashtag((e.target as HTMLInputElement).value)
                  ;(e.target as HTMLInputElement).value = ''
                }
              }}
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Media URLs</label>
            <div className="space-y-1 mb-2">
              {mediaUrls.map((url) => (
                <div key={url} className="flex items-center gap-2 text-xs">
                  <span className="truncate flex-1">{url}</span>
                  <button
                    onClick={() => removeMediaUrl(url)}
                    className="text-red-500 hover:text-red-700"
                    aria-label={`Remove ${url}`}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="Add media URL"
                className="flex-1 rounded-md border border-gray-300 px-3 py-1 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    addMediaUrl((e.target as HTMLInputElement).value)
                    ;(e.target as HTMLInputElement).value = ''
                  }
                }}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowScheduler(!showScheduler)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showScheduler ? 'Hide Scheduler' : 'Schedule Post'}
            </button>
            {showScheduler && (
              <input
                type="datetime-local"
                value={scheduledAt ? new Date(scheduledAt).toISOString().slice(0, 16) : ''}
                onChange={(e) => {
                  const date = e.target.value ? new Date(e.target.value) : null
                  onScheduleChange?.(date)
                }}
                className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                disabled={isLoading}
              />
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={isLoading || !content.trim() || isOverLimit || !selectedAccountId}
          className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Posting...' : scheduledAt ? 'Schedule' : 'Post Now'}
        </button>
        {onSaveDraft && (
          <button
            onClick={handleSaveDraft}
            disabled={isLoading || !content.trim()}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Save Draft
          </button>
        )}
      </div>
    </div>
  )
}
