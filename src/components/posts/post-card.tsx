'use client'

import React, { useState } from 'react'
import type { Post, PostStatus, Platform } from '@/types'
import { format } from 'date-fns'

export interface PostCardProps {
  post: Post
  onEdit?: (post: Post) => void
  onDelete?: (postId: string) => void
  onRepublish?: (postId: string) => void
  onViewAnalytics?: (postId: string) => void
  isLoading?: boolean
}

const STATUS_CONFIG: Record<PostStatus, { label: string; color: string; bgColor: string }> = {
  DRAFT: { label: 'Draft', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  SCHEDULED: { label: 'Scheduled', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  PUBLISHING: { label: 'Publishing', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  PUBLISHED: { label: 'Published', color: 'text-green-600', bgColor: 'bg-green-100' },
  FAILED: { label: 'Failed', color: 'text-red-600', bgColor: 'bg-red-100' },
  DELETED: { label: 'Deleted', color: 'text-gray-400', bgColor: 'bg-gray-50' },
}

const PLATFORM_ICONS: Record<Platform, string> = {
  TWITTER: 'X',
  LINKEDIN: 'in',
  INSTAGRAM: 'IG',
  FACEBOOK: 'f',
}

export function PostCard({
  post,
  onEdit,
  onDelete,
  onRepublish,
  onViewAnalytics,
  isLoading = false,
}: PostCardProps) {
  const [showActions, setShowActions] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)

  const statusConfig = STATUS_CONFIG[post.status]
  const engagement = post.likes + post.comments + post.shares
  const engagementRate = post.impressions > 0
    ? ((engagement / post.impressions) * 100).toFixed(2)
    : '0.00'

  const handleDelete = () => {
    if (isConfirmingDelete) {
      onDelete?.(post.id)
      setIsConfirmingDelete(false)
    } else {
      setIsConfirmingDelete(true)
      setTimeout(() => setIsConfirmingDelete(false), 3000)
    }
  }

  return (
    <div
      className={`rounded-lg border bg-white p-4 shadow-sm hover:shadow-md transition-shadow ${isLoading ? 'opacity-50' : ''}`}
      data-testid={`post-card-${post.id}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-sm font-bold text-gray-700"
            title={post.platform}
          >
            {PLATFORM_ICONS[post.platform]}
          </span>
          <div>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.color} ${statusConfig.bgColor}`}>
              {statusConfig.label}
            </span>
            {post.scheduledAt && (
              <p className="text-xs text-gray-500 mt-0.5">
                Scheduled: {format(new Date(post.scheduledAt), 'MMM d, yyyy h:mm a')}
              </p>
            )}
          </div>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowActions(!showActions)}
            className="p-1 hover:bg-gray-100 rounded"
            aria-label="Post actions"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
            </svg>
          </button>
          {showActions && (
            <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border z-10">
              {onEdit && post.status !== 'DELETED' && (
                <button
                  onClick={() => { onEdit(post); setShowActions(false) }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                >
                  Edit
                </button>
              )}
              {onViewAnalytics && post.status === 'PUBLISHED' && (
                <button
                  onClick={() => { onViewAnalytics(post.id); setShowActions(false) }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                >
                  View Analytics
                </button>
              )}
              {onRepublish && post.status === 'PUBLISHED' && (
                <button
                  onClick={() => { onRepublish(post.id); setShowActions(false) }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                >
                  Republish
                </button>
              )}
              {onDelete && post.status !== 'DELETED' && (
                <button
                  onClick={handleDelete}
                  className={`w-full text-left px-4 py-2 text-sm ${isConfirmingDelete ? 'bg-red-50 text-red-600' : 'hover:bg-gray-50 text-red-600'}`}
                >
                  {isConfirmingDelete ? 'Confirm Delete' : 'Delete'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-800 whitespace-pre-wrap mb-3">{post.content}</p>

      {post.mediaUrls.length > 0 && (
        <div className="flex gap-2 mb-3 overflow-x-auto">
          {post.mediaUrls.map((url, idx) => (
            <div key={idx} className="flex-shrink-0 w-20 h-20 rounded bg-gray-100 flex items-center justify-center">
              <span className="text-xs text-gray-500">Media {idx + 1}</span>
            </div>
          ))}
        </div>
      )}

      {post.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {post.hashtags.slice(0, 5).map((tag) => (
            <span key={tag} className="text-xs text-blue-600 hover:underline cursor-pointer">
              {tag}
            </span>
          ))}
          {post.hashtags.length > 5 && (
            <span className="text-xs text-gray-500">+{post.hashtags.length - 5}</span>
          )}
        </div>
      )}

      <div className="flex items-center gap-4 pt-3 border-t text-xs text-gray-500">
        <div className="flex items-center gap-1" title="Likes">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <span>{post.likes.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1" title="Comments">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span>{post.comments.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1" title="Shares">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          <span>{post.shares.toLocaleString()}</span>
        </div>
        <div className="ml-auto" title="Impressions">
          <span>{post.impressions.toLocaleString()} impressions</span>
        </div>
        <div title="Engagement Rate">
          <span className="font-medium">{engagementRate}%</span> engagement
        </div>
      </div>
    </div>
  )
}
