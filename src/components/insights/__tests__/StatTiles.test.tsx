import { describe, it, expect } from 'vitest'
import { render, screen } from '../../../test/utils'
import type { TrendStats } from '../../../types'
import StatTiles from '../StatTiles'

const stats: TrendStats = {
  total_points: 42,
  task_count: 5,
  days_in_period: 30,
  active_days: 12,
  avg_points_per_day: 1.4,
  avg_points_per_active_day: 3.5,
  avg_points_per_week: 9.8,
  best_day: '2024-02-26T00:00:00',
  best_day_points: 13,
}

describe('StatTiles', () => {
  it('shows the per-day and per-week averages', () => {
    render(<StatTiles stats={stats} />)
    expect(screen.getByText('Avg / day')).toBeInTheDocument()
    expect(screen.getByText('1.4')).toBeInTheDocument()
    expect(screen.getByText('across 30 days')).toBeInTheDocument()
    expect(screen.getByText('Avg / week')).toBeInTheDocument()
    expect(screen.getByText('9.8')).toBeInTheDocument()
  })

  it('shows active days as a ratio of the period', () => {
    render(<StatTiles stats={stats} />)
    expect(screen.getByText('12/30')).toBeInTheDocument()
    expect(screen.getByText('3.5 pts on days you shipped')).toBeInTheDocument()
  })

  it('formats the best day in UTC, not the browser timezone', () => {
    render(<StatTiles stats={stats} />)
    expect(screen.getByText('Feb 26')).toBeInTheDocument()
    expect(screen.getByText('13 points')).toBeInTheDocument()
  })

  it('drops trailing zeros from whole-number averages', () => {
    render(<StatTiles stats={{ ...stats, avg_points_per_day: 2, avg_points_per_week: 14 }} />)
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('14')).toBeInTheDocument()
  })

  it('uses singular wording for a one-day period', () => {
    render(<StatTiles stats={{ ...stats, days_in_period: 1, active_days: 1 }} />)
    expect(screen.getByText('across 1 day')).toBeInTheDocument()
  })

  it('handles an empty period without showing a bogus best day', () => {
    render(<StatTiles stats={{
      ...stats,
      total_points: 0, task_count: 0, active_days: 0,
      avg_points_per_day: 0, avg_points_per_active_day: 0, avg_points_per_week: 0,
      best_day: null, best_day_points: 0,
    }} />)

    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.getAllByText('no completed work yet')).toHaveLength(2)
    expect(screen.getByText('0/30')).toBeInTheDocument()
  })

  it('survives an unparseable best_day', () => {
    render(<StatTiles stats={{ ...stats, best_day: 'not-a-date' }} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})
