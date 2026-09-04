import React from 'react'
import { render, screen } from '@testing-library/react'
import { StatsCard, StatsGrid, MiniStat, ProgressStats } from '@/components/analytics/stats-card'

describe('StatsCard', () => {
  it('should render stats card', () => {
    render(<StatsCard title="Impressions" value={1500} />)
    expect(screen.getByTestId('stats-card')).toBeInTheDocument()
  })

  it('should display title and value', () => {
    render(<StatsCard title="Impressions" value={1500} />)
    expect(screen.getByText('Impressions')).toBeInTheDocument()
    expect(screen.getByText('1,500')).toBeInTheDocument()
  })

  it('should format large numbers with K', () => {
    render(<StatsCard title="Followers" value={15000} />)
    expect(screen.getByText('15.0K')).toBeInTheDocument()
  })

  it('should format large numbers with M', () => {
    render(<StatsCard title="Views" value={1500000} />)
    expect(screen.getByText('1.5M')).toBeInTheDocument()
  })

  it('should display string values', () => {
    render(<StatsCard title="Rate" value="5.2%" />)
    expect(screen.getByText('5.2%')).toBeInTheDocument()
  })

  it('should display positive change', () => {
    render(<StatsCard title="Growth" value={100} change={15} />)
    expect(screen.getByText('15%')).toBeInTheDocument()
    expect(screen.getByText('\u2191')).toBeInTheDocument()
  })

  it('should display negative change', () => {
    render(<StatsCard title="Decline" value={100} change={-10} />)
    expect(screen.getByText('-10%')).toBeInTheDocument()
    expect(screen.getByText('\u2193')).toBeInTheDocument()
  })

  it('should display neutral change', () => {
    render(<StatsCard title="Stable" value={100} change={0} />)
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('should display subtitle', () => {
    render(<StatsCard title="Revenue" value="$1,234" subtitle="Last 30 days" />)
    expect(screen.getByText('Last 30 days')).toBeInTheDocument()
  })

  it('should display icon', () => {
    render(<StatsCard title="Posts" value={42} icon={<span>Icon</span>} />)
    expect(screen.getByText('Icon')).toBeInTheDocument()
  })

  it('should show loading state', () => {
    render(<StatsCard title="Loading" value={0} isLoading={true} />)
    expect(screen.getByTestId('stats-card-loading')).toBeInTheDocument()
    expect(screen.queryByTestId('stats-card')).not.toBeInTheDocument()
  })

  it('should use custom change label', () => {
    render(<StatsCard title="Metric" value={100} change={10} changeLabel="vs last month" />)
    expect(screen.getByText('vs last month')).toBeInTheDocument()
  })
})

describe('StatsGrid', () => {
  const stats = [
    { title: 'Stat 1', value: 100 },
    { title: 'Stat 2', value: 200 },
    { title: 'Stat 3', value: 300 },
    { title: 'Stat 4', value: 400 },
  ]

  it('should render stats grid', () => {
    render(<StatsGrid stats={stats} />)
    expect(screen.getByTestId('stats-grid')).toBeInTheDocument()
  })

  it('should render all stats cards', () => {
    render(<StatsGrid stats={stats} />)
    expect(screen.getByText('Stat 1')).toBeInTheDocument()
    expect(screen.getByText('Stat 2')).toBeInTheDocument()
    expect(screen.getByText('Stat 3')).toBeInTheDocument()
    expect(screen.getByText('Stat 4')).toBeInTheDocument()
  })

  it('should apply correct grid classes for 2 columns', () => {
    render(<StatsGrid stats={stats.slice(0, 2)} columns={2} />)
    const grid = screen.getByTestId('stats-grid')
    expect(grid.className).toContain('sm:grid-cols-2')
  })

  it('should apply correct grid classes for 4 columns', () => {
    render(<StatsGrid stats={stats} columns={4} />)
    const grid = screen.getByTestId('stats-grid')
    expect(grid.className).toContain('lg:grid-cols-4')
  })

  it('should show loading state for all cards', () => {
    render(<StatsGrid stats={stats} isLoading={true} />)
    const loadingCards = screen.getAllByTestId('stats-card-loading')
    expect(loadingCards).toHaveLength(4)
  })
})

describe('MiniStat', () => {
  it('should render mini stat', () => {
    render(<MiniStat label="Likes" value={50} />)
    expect(screen.getByTestId('mini-stat')).toBeInTheDocument()
  })

  it('should display label and value', () => {
    render(<MiniStat label="Likes" value={50} />)
    expect(screen.getByText('Likes')).toBeInTheDocument()
    expect(screen.getByText('50')).toBeInTheDocument()
  })

  it('should show up trend', () => {
    render(<MiniStat label="Growth" value={10} trend="up" />)
    expect(screen.getByText('\u2191')).toBeInTheDocument()
  })

  it('should show down trend', () => {
    render(<MiniStat label="Decline" value={-5} trend="down" />)
    expect(screen.getByText('\u2193')).toBeInTheDocument()
  })

  it('should show neutral trend', () => {
    render(<MiniStat label="Stable" value={0} trend="neutral" />)
    expect(screen.getByText('\u2192')).toBeInTheDocument()
  })

  it('should display string value', () => {
    render(<MiniStat label="Rate" value="5.2%" />)
    expect(screen.getByText('5.2%')).toBeInTheDocument()
  })
})

describe('ProgressStats', () => {
  it('should render progress stats', () => {
    render(<ProgressStats label="Storage" current={50} total={100} />)
    expect(screen.getByTestId('progress-stats')).toBeInTheDocument()
  })

  it('should display label and values', () => {
    render(<ProgressStats label="Storage" current={50} total={100} />)
    expect(screen.getByText('Storage')).toBeInTheDocument()
    expect(screen.getByText('50 / 100 (50%)')).toBeInTheDocument()
  })

  it('should hide percentage when disabled', () => {
    render(<ProgressStats label="Storage" current={50} total={100} showPercentage={false} />)
    expect(screen.getByText('50 / 100')).toBeInTheDocument()
    expect(screen.queryByText('50%')).not.toBeInTheDocument()
  })

  it('should handle zero total', () => {
    render(<ProgressStats label="Empty" current={0} total={0} />)
    expect(screen.getByText('0 / 0 (0%)')).toBeInTheDocument()
  })

  it('should cap progress at 100%', () => {
    render(<ProgressStats label="Over" current={150} total={100} />)
    expect(screen.getByText('150 / 100 (150%)')).toBeInTheDocument()
    const progressBar = screen.getByTestId('progress-stats').querySelector('.bg-blue-600')
    expect(progressBar).toHaveStyle({ width: '100%' })
  })

  it('should format large numbers', () => {
    render(<ProgressStats label="Views" current={1500000} total={2000000} />)
    expect(screen.getByText('1,500,000 / 2,000,000 (75%)')).toBeInTheDocument()
  })
})
