'use client'

import React, { useState } from 'react'
import type { Notification, NotificationType } from '@/types'
import { format, formatDistanceToNow } from 'date-fns'

export interface InboxItemProps {
  notification: Notification
  onMarkAsRead?: (id: string) => void
  onDelete?: (id: string) => void
  onAction?: (id: string, actionUrl: string) => void
  isLoading?: boolean
}

const NOTIFICATION_CONFIG: Record<NotificationType, { icon: string; color: string }> = {
  POST_PUBLISHED: { icon: '\u2713', color: 'bg-green-100 text-green-600' },
  POST_FAILED: { icon: '\u2717', color: 'bg-red-100 text-red-600' },
  COMMENT_RECEIVED: { icon: '\u270E', color: 'bg-blue-100 text-blue-600' },
  CAMPAIGN_UPDATE: { icon: '\u2605', color: 'bg-yellow-100 text-yellow-600' },
  SYSTEM: { icon: '\u2139', color: 'bg-gray-100 text-gray-600' },
  BILLING: { icon: '\u2696', color: 'bg-purple-100 text-purple-600' },
}

export function InboxItem({
  notification,
  onMarkAsRead,
  onDelete,
  onAction,
  isLoading = false,
}: InboxItemProps) {
  const [showActions, setShowActions] = useState(false)
  const config = NOTIFICATION_CONFIG[notification.type]
  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })

  const handleClick = () => {
    if (!notification.read && onMarkAsRead) {
      onMarkAsRead(notification.id)
    }
    if (notification.actionUrl && onAction) {
      onAction(notification.id, notification.actionUrl)
    }
  }

  return (
    <div
      className={`flex items-start gap-3 p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors ${
        !notification.read ? 'bg-blue-50' : ''
      } ${isLoading ? 'opacity-50' : ''}`}
      onClick={handleClick}
      data-testid={`inbox-item-${notification.id}`}
    >
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm ${config.color}`}>
        {config.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-medium truncate ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
            {notification.title}
          </p>
          {!notification.read && (
            <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-600" />
          )}
        </div>
        <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{notification.message}</p>
        <p className="text-xs text-gray-400 mt-1">{timeAgo}</p>
      </div>

      <div className="flex-shrink-0 relative">
        <button
          onClick={(e) => { e.stopPropagation(); setShowActions(!showActions) }}
          className="p-1 hover:bg-gray-200 rounded"
          aria-label="Notification actions"
        >
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
          </svg>
        </button>
        {showActions && (
          <div className="absolute right-0 mt-1 w-40 bg-white rounded-md shadow-lg border z-10">
            {!notification.read && onMarkAsRead && (
              <button
                onClick={(e) => { e.stopPropagation(); onMarkAsRead(notification.id); setShowActions(false) }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
              >
                Mark as Read
              </button>
            )}
            {notification.read && onMarkAsRead && (
              <button
                onClick={(e) => { e.stopPropagation(); onMarkAsRead(notification.id); setShowActions(false) }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
              >
                Mark as Unread
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(notification.id); setShowActions(false) }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export interface InboxListProps {
  notifications: Notification[]
  onMarkAsRead?: (id: string) => void
  onMarkAllAsRead?: () => void
  onDelete?: (id: string) => void
  onAction?: (id: string, actionUrl: string) => void
  isLoading?: boolean
  emptyMessage?: string
}

export function InboxList({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onAction,
  isLoading = false,
  emptyMessage = 'No notifications',
}: InboxListProps) {
  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="rounded-lg border bg-white shadow-sm" data-testid="inbox-list">
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className="font-semibold text-gray-900">Inbox</h3>
          {unreadCount > 0 && (
            <p className="text-xs text-gray-500">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && onMarkAllAsRead && (
          <button
            onClick={onMarkAllAsRead}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Mark all as read
          </button>
        )}
      </div>

      {isLoading && notifications.length === 0 ? (
        <div className="p-8 text-center">
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-1">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : notifications.length === 0 ? (
        <div className="p-8 text-center text-gray-500 text-sm">
          {emptyMessage}
        </div>
      ) : (
        <div className="max-h-[600px] overflow-y-auto">
          {notifications.map((notification) => (
            <InboxItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={onMarkAsRead}
              onDelete={onDelete}
              onAction={onAction}
              isLoading={isLoading}
            />
          ))}
        </div>
      )}
    </div>
  )
}
