'use client'

import React from 'react'

export interface StatsCardProps {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon?: React.ReactNode
  isLoading?: boolean
  trend?: 'up' | 'down' | 'neutral'
  subtitle?: string
}

export function StatsCard({
  title,
  value,
  change,
  changeLabel = 'vs last period',
  icon,
  isLoading = false,
  trend,
  subtitle,
}: StatsCardProps) {
  const getTrendColor = (trendValue?: number): string => {
    if (trendValue === undefined) return 'text-gray-500'
    if (trendValue > 0) return 'text-green-600'
    if (trendValue < 0) return 'text-red-600'
    return 'text-gray-500'
  }

  const getTrendIcon = (trendValue?: number, override?: string): string => {
    if (override === 'up' || (trendValue !== undefined && trendValue > 0)) return '\u2191'
    if (override === 'down' || (trendValue !== undefined && trendValue < 0)) return '\u2193'
    return '\u2192'
  }

  const formatValue = (val: string | number): string => {
    if (typeof val === 'number') {
      if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`
      if (val >= 1000) return `${(val / 1000).toFixed(1)}K`
      return val.toLocaleString()
    }
    return val
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-white p-4 shadow-sm animate-pulse" data-testid="stats-card-loading">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-20" />
            <div className="h-8 bg-gray-200 rounded w-24" />
          </div>
          <div className="w-10 h-10 bg-gray-200 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm hover:shadow-md transition-shadow" data-testid="stats-card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatValue(value)}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
          {change !== undefined && (
            <div className={`flex items-center mt-2 text-xs ${getTrendColor(change)}`}>
              <span className="mr-1">{getTrendIcon(change, trend)}</span>
              <span className="font-medium">{Math.abs(change)}%</span>
              <span className="text-gray-500 ml-1">{changeLabel}</span>
            </div>
          )}
        </div>
        {icon && (
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}

export interface StatsGridProps {
  stats: StatsCardProps[]
  columns?: 2 | 3 | 4
  isLoading?: boolean
}

export function StatsGrid({ stats, columns = 4, isLoading = false }: StatsGridProps) {
  const gridClass = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  }[columns]

  return (
    <div className={`grid ${gridClass} gap-4`} data-testid="stats-grid">
      {stats.map((stat, index) => (
        <StatsCard key={index} {...stat} isLoading={isLoading} />
      ))}
    </div>
  )
}

export interface MiniStatProps {
  label: string
  value: string | number
  trend?: 'up' | 'down' | 'neutral'
}

export function MiniStat({ label, value, trend }: MiniStatProps) {
  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-500',
  }

  const trendIcons = {
    up: '\u2191',
    down: '\u2193',
    neutral: '\u2192',
  }

  return (
    <div className="flex items-center justify-between py-2" data-testid="mini-stat">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-900">{value}</span>
        {trend && (
          <span className={`text-xs ${trendColors[trend]}`}>
            {trendIcons[trend]}
          </span>
        )}
      </div>
    </div>
  )
}

export interface ProgressStatsProps {
  label: string
  current: number
  total: number
  showPercentage?: boolean
}

export function ProgressStats({ label, current, total, showPercentage = true }: ProgressStatsProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0

  return (
    <div className="space-y-2" data-testid="progress-stats">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">{label}</span>
        <span className="text-sm font-medium text-gray-900">
          {current.toLocaleString()} / {total.toLocaleString()}
          {showPercentage && ` (${percentage}%)`}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all"
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
    </div>
  )
}
