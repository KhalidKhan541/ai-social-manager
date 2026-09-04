'use client'

import React, { useState, useMemo } from 'react'
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
  isToday,
} from 'date-fns'
import type { ContentCalendarEntry, Platform } from '@/types'

export interface CalendarViewProps {
  entries: ContentCalendarEntry[]
  onDateClick?: (date: Date) => void
  onEntryClick?: (entry: ContentCalendarEntry) => void
  onEntryDrop?: (entryId: string, newDate: Date) => void
  filterPlatform?: Platform
  isLoading?: boolean
}

const PLATFORM_COLORS: Record<Platform, string> = {
  TWITTER: '#1DA1F2',
  LINKEDIN: '#0A66C2',
  INSTAGRAM: '#E4405F',
  FACEBOOK: '#1877F2',
}

export function CalendarView({
  entries,
  onDateClick,
  onEntryClick,
  onEntryDrop,
  filterPlatform,
  isLoading = false,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month')

  const filteredEntries = useMemo(() => {
    if (!filterPlatform) return entries
    return entries.filter((e) => e.platform === filterPlatform)
  }, [entries, filterPlatform])

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [currentDate])

  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: weekStart, end: weekEnd })
  }, [currentDate])

  const getEntriesForDate = (date: Date): ContentCalendarEntry[] => {
    return filteredEntries.filter((e) => isSameDay(new Date(e.scheduledDate), date))
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    onDateClick?.(date)
  }

  const handlePrev = () => {
    setCurrentDate(viewMode === 'month' ? subMonths(currentDate, 1) : new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000))
  }

  const handleNext = () => {
    setCurrentDate(viewMode === 'month' ? addMonths(currentDate, 1) : new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000))
  }

  const handleDragStart = (e: React.DragEvent, entryId: string) => {
    e.dataTransfer.setData('entryId', entryId)
  }

  const handleDrop = (e: React.DragEvent, date: Date) => {
    e.preventDefault()
    const entryId = e.dataTransfer.getData('entryId')
    if (entryId && onEntryDrop) {
      onEntryDrop(entryId, date)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-white p-4" data-testid="calendar-loading">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-100 rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-white p-4" data-testid="calendar-view">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border overflow-hidden">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 text-sm ${viewMode === 'month' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 text-sm ${viewMode === 'week' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
            >
              Week
            </button>
          </div>
          <button onClick={handlePrev} className="p-1 hover:bg-gray-100 rounded" aria-label="Previous">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button onClick={handleNext} className="p-1 hover:bg-gray-100 rounded" aria-label="Next">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={() => { setCurrentDate(new Date()); setSelectedDate(new Date()) }}
            className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
          >
            Today
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div key={day} className="bg-gray-50 p-2 text-center text-xs font-medium text-gray-600">
            {day}
          </div>
        ))}

        {(viewMode === 'month' ? calendarDays : weekDays).map((date) => {
          const dayEntries = getEntriesForDate(date)
          const isCurrentMonth = isSameMonth(date, currentDate)
          const isSelected = selectedDate && isSameDay(date, selectedDate)
          const isCurrentDay = isToday(date)

          return (
            <div
              key={date.toISOString()}
              className={`bg-white p-2 min-h-[80px] cursor-pointer hover:bg-gray-50 ${
                !isCurrentMonth ? 'opacity-50' : ''
              } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
              onClick={() => handleDateClick(date)}
              onDrop={(e) => handleDrop(e, date)}
              onDragOver={handleDragOver}
              data-testid={`calendar-day-${format(date, 'yyyy-MM-dd')}`}
            >
              <div className={`text-sm mb-1 ${isCurrentDay ? 'font-bold text-blue-600' : 'text-gray-700'}`}>
                {format(date, 'd')}
              </div>
              <div className="space-y-1">
                {dayEntries.slice(0, 3).map((entry) => (
                  <div
                    key={entry.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, entry.id)}
                    onClick={(e) => { e.stopPropagation(); onEntryClick?.(entry) }}
                    className="rounded px-1 py-0.5 text-xs text-white truncate cursor-pointer"
                    style={{ backgroundColor: PLATFORM_COLORS[entry.platform] }}
                    data-testid={`calendar-entry-${entry.id}`}
                  >
                    {entry.title}
                  </div>
                ))}
                {dayEntries.length > 3 && (
                  <div className="text-xs text-gray-500">+{dayEntries.length - 3} more</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-4">
        {Object.entries(PLATFORM_COLORS).map(([platform, color]) => (
          <div key={platform} className="flex items-center gap-1 text-xs">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
            <span>{platform}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
