import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { CalendarView } from '@/components/calendar/calendar-view'
import { createCalendarEntry } from '@/lib/ai/content-calendar'
import type { ContentCalendarEntry } from '@/types'
import { addDays, format } from 'date-fns'

const createMockEntries = (): ContentCalendarEntry[] => [
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
]

describe('CalendarView', () => {
  const defaultProps = {
    entries: createMockEntries(),
    onDateClick: jest.fn(),
    onEntryClick: jest.fn(),
    onEntryDrop: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render the calendar', () => {
    render(<CalendarView {...defaultProps} />)
    expect(screen.getByTestId('calendar-view')).toBeInTheDocument()
  })

  it('should display current month and year', () => {
    render(<CalendarView {...defaultProps} />)
    const now = new Date()
    const monthYear = format(now, 'MMMM yyyy')
    expect(screen.getByText(monthYear)).toBeInTheDocument()
  })

  it('should display day headers', () => {
    render(<CalendarView {...defaultProps} />)
    expect(screen.getByText('Mon')).toBeInTheDocument()
    expect(screen.getByText('Tue')).toBeInTheDocument()
    expect(screen.getByText('Wed')).toBeInTheDocument()
    expect(screen.getByText('Thu')).toBeInTheDocument()
    expect(screen.getByText('Fri')).toBeInTheDocument()
    expect(screen.getByText('Sat')).toBeInTheDocument()
    expect(screen.getByText('Sun')).toBeInTheDocument()
  })

  it('should display entries on calendar', () => {
    render(<CalendarView {...defaultProps} />)
    expect(screen.getByText('Today tweet')).toBeInTheDocument()
  })

  it('should call onDateClick when day is clicked', () => {
    render(<CalendarView {...defaultProps} />)
    const today = format(new Date(), 'yyyy-MM-dd')
    const dayElement = screen.getByTestId(`calendar-day-${today}`)
    fireEvent.click(dayElement)
    expect(defaultProps.onDateClick).toHaveBeenCalled()
  })

  it('should call onEntryClick when entry is clicked', () => {
    render(<CalendarView {...defaultProps} />)
    const entry = screen.getByText('Today tweet')
    fireEvent.click(entry)
    expect(defaultProps.onEntryClick).toHaveBeenCalled()
  })

  it('should navigate to previous month', () => {
    render(<CalendarView {...defaultProps} />)
    const prevButton = screen.getByLabelText('Previous')
    fireEvent.click(prevButton)
    expect(screen.getByText(format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'MMMM yyyy'))).toBeInTheDocument()
  })

  it('should navigate to next month', () => {
    render(<CalendarView {...defaultProps} />)
    const nextButton = screen.getByLabelText('Next')
    fireEvent.click(nextButton)
    expect(screen.getByText(format(new Date(new Date().setMonth(new Date().getMonth() + 1)), 'MMMM yyyy'))).toBeInTheDocument()
  })

  it('should return to today when Today button clicked', () => {
    render(<CalendarView {...defaultProps} />)
    const prevButton = screen.getByLabelText('Previous')
    fireEvent.click(prevButton)
    fireEvent.click(prevButton)

    const todayButton = screen.getByText('Today')
    fireEvent.click(todayButton)

    const now = new Date()
    expect(screen.getByText(format(now, 'MMMM yyyy'))).toBeInTheDocument()
  })

  it('should toggle between month and week view', () => {
    render(<CalendarView {...defaultProps} />)
    const weekButton = screen.getByText('Week')
    fireEvent.click(weekButton)
    expect(weekButton).toHaveClass('bg-blue-600')

    const monthButton = screen.getByText('Month')
    fireEvent.click(monthButton)
    expect(monthButton).toHaveClass('bg-blue-600')
  })

  it('should show platform legend', () => {
    render(<CalendarView {...defaultProps} />)
    expect(screen.getByText('TWITTER')).toBeInTheDocument()
    expect(screen.getByText('LINKEDIN')).toBeInTheDocument()
    expect(screen.getByText('INSTAGRAM')).toBeInTheDocument()
    expect(screen.getByText('FACEBOOK')).toBeInTheDocument()
  })

  it('should filter entries by platform', () => {
    render(<CalendarView {...defaultProps} filterPlatform="TWITTER" />)
    expect(screen.getByText('Today tweet')).toBeInTheDocument()
    expect(screen.queryByText('Tomorrow post')).not.toBeInTheDocument()
  })

  it('should show loading state', () => {
    render(<CalendarView {...defaultProps} isLoading={true} />)
    expect(screen.getByTestId('calendar-loading')).toBeInTheDocument()
    expect(screen.queryByTestId('calendar-view')).not.toBeInTheDocument()
  })

  it('should display entry count when more than 3 entries on a day', () => {
    const manyEntries = Array.from({ length: 5 }, (_, i) =>
      createCalendarEntry({
        userId: 'user-1',
        scheduledDate: new Date(),
        platform: 'TWITTER',
        title: `Entry ${i + 1}`,
      })
    )

    render(<CalendarView {...defaultProps} entries={manyEntries} />)
    expect(screen.getByText('+2 more')).toBeInTheDocument()
  })

  it('should handle drag start on entry', () => {
    render(<CalendarView {...defaultProps} />)
    const entry = screen.getByText('Today tweet')

    const dataTransfer = { setData: jest.fn() }
    fireEvent.dragStart(entry, { dataTransfer })
    expect(dataTransfer.setData).toHaveBeenCalledWith('entryId', expect.any(String))
  })

  it('should handle drop on day', () => {
    render(<CalendarView {...defaultProps} />)
    const today = format(new Date(), 'yyyy-MM-dd')
    const dayElement = screen.getByTestId(`calendar-day-${today}`)

    const dataTransfer = { getData: jest.fn().mockReturnValue('entry-id') }
    fireEvent.drop(dayElement, { dataTransfer })
    expect(defaultProps.onEntryDrop).toHaveBeenCalled()
  })
})
