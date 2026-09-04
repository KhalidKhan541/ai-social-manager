import { ContentCalendar, createCalendarEntry } from '@/lib/ai/content-calendar'
import type { ContentCalendarEntry, Platform } from '@/types'
import { addDays, subDays } from 'date-fns'

describe('ContentCalendar', () => {
  let calendar: ContentCalendar
  let mockEntries: ContentCalendarEntry[]

  beforeEach(() => {
    mockEntries = [
      createCalendarEntry({
        userId: 'user-1',
        scheduledDate: new Date(),
        platform: 'TWITTER',
        title: 'Today tweet',
        status: 'SCHEDULED',
      }),
      createCalendarEntry({
        userId: 'user-1',
        scheduledDate: addDays(new Date(), 1),
        platform: 'LINKEDIN',
        title: 'Tomorrow post',
        status: 'PLANNED',
      }),
      createCalendarEntry({
        userId: 'user-1',
        scheduledDate: addDays(new Date(), 3),
        platform: 'INSTAGRAM',
        title: 'Future post',
        status: 'PUBLISHED',
      }),
      createCalendarEntry({
        userId: 'user-2',
        scheduledDate: subDays(new Date(), 1),
        platform: 'TWITTER',
        title: 'Past tweet',
        status: 'PUBLISHED',
      }),
    ]
    calendar = new ContentCalendar(mockEntries)
    jest.clearAllMocks()
  })

  describe('addEntry', () => {
    it('should add an entry', () => {
      const entry = createCalendarEntry({
        userId: 'user-1',
        scheduledDate: new Date(),
        platform: 'TWITTER',
        title: 'New entry',
      })
      calendar.addEntry(entry)
      expect(calendar.getEntry(entry.id)).toBeDefined()
    })
  })

  describe('removeEntry', () => {
    it('should remove an entry', () => {
      const result = calendar.removeEntry(mockEntries[0].id)
      expect(result).toBe(true)
      expect(calendar.getEntry(mockEntries[0].id)).toBeUndefined()
    })

    it('should return false for nonexistent entry', () => {
      const result = calendar.removeEntry('nonexistent-id')
      expect(result).toBe(false)
    })
  })

  describe('updateEntry', () => {
    it('should update an entry', () => {
      const updated = calendar.updateEntry(mockEntries[0].id, { title: 'Updated title' })
      expect(updated?.title).toBe('Updated title')
    })

    it('should return null for nonexistent entry', () => {
      const updated = calendar.updateEntry('nonexistent-id', { title: 'test' })
      expect(updated).toBeNull()
    })
  })

  describe('getEntry', () => {
    it('should return entry by id', () => {
      const entry = calendar.getEntry(mockEntries[0].id)
      expect(entry).toBeDefined()
      expect(entry?.title).toBe('Today tweet')
    })

    it('should return undefined for nonexistent id', () => {
      const entry = calendar.getEntry('nonexistent')
      expect(entry).toBeUndefined()
    })
  })

  describe('filterEntries', () => {
    it('should filter by platform', () => {
      const twitterEntries = calendar.filterEntries({ platform: 'TWITTER' })
      expect(twitterEntries.every((e) => e.platform === 'TWITTER')).toBe(true)
    })

    it('should filter by status', () => {
      const scheduledEntries = calendar.filterEntries({ status: 'SCHEDULED' })
      expect(scheduledEntries.every((e) => e.status === 'SCHEDULED')).toBe(true)
    })

    it('should filter by userId', () => {
      const user1Entries = calendar.filterEntries({ userId: 'user-1' })
      expect(user1Entries.every((e) => e.userId === 'user-1')).toBe(true)
    })

    it('should filter by date range', () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = addDays(today, 1)
      tomorrow.setHours(23, 59, 59, 999)

      const todayEntries = calendar.filterEntries({ startDate: today, endDate: tomorrow })
      expect(todayEntries.length).toBeGreaterThan(0)
    })

    it('should combine multiple filters', () => {
      const results = calendar.filterEntries({ platform: 'TWITTER', userId: 'user-1' })
      expect(results.every((e) => e.platform === 'TWITTER' && e.userId === 'user-1')).toBe(true)
    })
  })

  describe('getWeekEntries', () => {
    it('should return entries for current week', () => {
      const weekEntries = calendar.getWeekEntries(new Date())
      expect(weekEntries).toBeInstanceOf(Array)
      expect(weekEntries.length).toBeGreaterThan(0)
    })
  })

  describe('getDayEntries', () => {
    it('should return entries for specific day', () => {
      const todayEntries = calendar.getDayEntries(new Date())
      expect(todayEntries.length).toBe(1)
      expect(todayEntries[0].title).toBe('Today tweet')
    })

    it('should return empty for day with no entries', () => {
      const futureDate = addDays(new Date(), 30)
      const entries = calendar.getDayEntries(futureDate)
      expect(entries).toHaveLength(0)
    })
  })

  describe('getMonthView', () => {
    it('should return month view map', () => {
      const now = new Date()
      const monthView = calendar.getMonthView(now.getFullYear(), now.getMonth())
      expect(monthView).toBeInstanceOf(Map)
      expect(monthView.size).toBeGreaterThan(0)
    })
  })

  describe('getUpcoming', () => {
    it('should return upcoming entries', () => {
      const upcoming = calendar.getUpcoming(7)
      expect(upcoming).toBeInstanceOf(Array)
      expect(upcoming.every((e) => new Date(e.scheduledDate) >= new Date())).toBe(true)
    })

    it('should sort by scheduled date', () => {
      const upcoming = calendar.getUpcoming(7)
      for (let i = 1; i < upcoming.length; i++) {
        expect(new Date(upcoming[i].scheduledDate).getTime()).toBeGreaterThanOrEqual(
          new Date(upcoming[i - 1].scheduledDate).getTime()
        )
      }
    })
  })

  describe('getOverdue', () => {
    it('should return overdue entries', () => {
      const overdue = calendar.getOverdue()
      expect(overdue).toBeInstanceOf(Array)
      expect(overdue.every((e) => new Date(e.scheduledDate) < new Date())).toBe(true)
    })
  })

  describe('getStats', () => {
    it('should return correct statistics', () => {
      const stats = calendar.getStats()
      expect(stats.total).toBe(4)
      expect(stats.published).toBe(2)
      expect(stats.scheduled).toBe(1)
      expect(stats.draft).toBe(1)
      expect(stats.byPlatform.TWITTER).toBe(2)
      expect(stats.byPlatform.LINKEDIN).toBe(1)
      expect(stats.byPlatform.INSTAGRAM).toBe(1)
    })
  })

  describe('detectConflicts', () => {
    it('should detect scheduling conflicts', () => {
      const conflictDate = new Date()
      conflictDate.setHours(10, 0, 0, 0)

      calendar.addEntry(createCalendarEntry({
        userId: 'user-1',
        scheduledDate: conflictDate,
        scheduledTime: '10:00',
        platform: 'TWITTER',
        title: 'Conflict 1',
      }))

      calendar.addEntry(createCalendarEntry({
        userId: 'user-2',
        scheduledDate: conflictDate,
        scheduledTime: '10:00',
        platform: 'TWITTER',
        title: 'Conflict 2',
      }))

      const conflicts = calendar.detectConflicts(conflictDate, '10:00', 'TWITTER')
      expect(conflicts.length).toBe(2)
    })

    it('should not detect conflicts on different times', () => {
      const date = new Date()
      date.setHours(10, 0, 0, 0)

      calendar.addEntry(createCalendarEntry({
        userId: 'user-1',
        scheduledDate: date,
        scheduledTime: '10:00',
        platform: 'TWITTER',
        title: 'Morning post',
      }))

      const conflicts = calendar.detectConflicts(date, '14:00', 'TWITTER')
      expect(conflicts).toHaveLength(0)
    })
  })

  describe('bulkUpdateStatus', () => {
    it('should update multiple entries', () => {
      const ids = [mockEntries[0].id, mockEntries[1].id]
      const updated = calendar.bulkUpdateStatus(ids, 'PUBLISHED')
      expect(updated).toBe(2)
      expect(calendar.getEntry(mockEntries[0].id)?.status).toBe('PUBLISHED')
      expect(calendar.getEntry(mockEntries[1].id)?.status).toBe('PUBLISHED')
    })

    it('should return count of updated entries', () => {
      const updated = calendar.bulkUpdateStatus(['nonexistent'], 'PUBLISHED')
      expect(updated).toBe(0)
    })
  })

  describe('getWeeklyContentMix', () => {
    it('should return platform distribution for the week', () => {
      const mix = calendar.getWeeklyContentMix()
      expect(mix.TWITTER).toBeGreaterThanOrEqual(0)
      expect(mix.LINKEDIN).toBeGreaterThanOrEqual(0)
      expect(mix.INSTAGRAM).toBeGreaterThanOrEqual(0)
      expect(mix.FACEBOOK).toBeGreaterThanOrEqual(0)
    })
  })
})

describe('createCalendarEntry', () => {
  it('should create entry with defaults', () => {
    const entry = createCalendarEntry({
      userId: 'user-1',
      scheduledDate: new Date(),
      platform: 'TWITTER',
    })
    expect(entry.id).toBeTruthy()
    expect(entry.title).toBe('Untitled')
    expect(entry.status).toBe('PLANNED')
    expect(entry.createdAt).toBeInstanceOf(Date)
  })

  it('should override defaults', () => {
    const entry = createCalendarEntry({
      userId: 'user-1',
      scheduledDate: new Date(),
      platform: 'LINKEDIN',
      title: 'Custom title',
      status: 'PUBLISHED',
    })
    expect(entry.title).toBe('Custom title')
    expect(entry.status).toBe('PUBLISHED')
    expect(entry.platform).toBe('LINKEDIN')
  })
})
