import { describe, it, expect } from 'vitest'
import {
  PRESETS,
  allowedGranularities,
  autoGranularity,
  getDateRange,
  rangeDays,
  resolveGranularity,
} from '../insightsPeriods'

// Wednesday 2024-02-28 12:00:00 UTC
const NOW = new Date('2024-02-28T12:00:00.000Z')

describe('getDateRange', () => {
  it('this_week spans Monday to Sunday in UTC', () => {
    expect(getDateRange('this_week', NOW)).toEqual({
      start_date: '2024-02-26T00:00:00.000Z',
      end_date: '2024-03-03T23:59:59.000Z',
    })
  })

  it('last_week spans the previous Monday to Sunday', () => {
    expect(getDateRange('last_week', NOW)).toEqual({
      start_date: '2024-02-19T00:00:00.000Z',
      end_date: '2024-02-25T23:59:59.000Z',
    })
  })

  it('last_30_days is a 30-day trailing window ending today', () => {
    expect(getDateRange('last_30_days', NOW)).toEqual({
      start_date: '2024-01-30T00:00:00.000Z',
      end_date: '2024-02-28T23:59:59.000Z',
    })
  })

  it('last_3_months is a 90-day trailing window', () => {
    expect(getDateRange('last_3_months', NOW)).toEqual({
      start_date: '2023-12-01T00:00:00.000Z',
      end_date: '2024-02-28T23:59:59.000Z',
    })
    expect(rangeDays(getDateRange('last_3_months', NOW))).toBe(90)
  })

  it('last_6_months is a 180-day trailing window', () => {
    expect(getDateRange('last_6_months', NOW).start_date).toBe('2023-09-02T00:00:00.000Z')
    expect(rangeDays(getDateRange('last_6_months', NOW))).toBe(180)
  })

  it('year_to_date starts on 1 January UTC', () => {
    expect(getDateRange('year_to_date', NOW)).toEqual({
      start_date: '2024-01-01T00:00:00.000Z',
      end_date: '2024-02-28T23:59:59.000Z',
    })
  })

  it('treats Sunday as the last day of the current week', () => {
    const sunday = new Date('2024-03-03T12:00:00.000Z')
    expect(getDateRange('this_week', sunday).start_date).toBe('2024-02-26T00:00:00.000Z')
  })

  it('exposes six presets with stable keys', () => {
    expect(PRESETS.map(p => p.key)).toEqual([
      'this_week', 'last_week', 'last_30_days',
      'last_3_months', 'last_6_months', 'year_to_date',
    ])
  })
})

describe('rangeDays', () => {
  it('counts both end days', () => {
    expect(rangeDays({ start_date: '2024-02-26T00:00:00.000Z', end_date: '2024-03-03T23:59:59.000Z' })).toBe(7)
  })

  it('returns 1 for a single day', () => {
    expect(rangeDays({ start_date: '2024-02-26T00:00:00.000Z', end_date: '2024-02-26T23:59:59.000Z' })).toBe(1)
  })

  it('falls back to 1 on an unparseable range', () => {
    expect(rangeDays({ start_date: 'nope', end_date: 'nope' })).toBe(1)
  })
})

describe('granularity selection', () => {
  it('offers only day buckets for a week', () => {
    expect(allowedGranularities(7)).toEqual(['day'])
  })

  it('offers day and week for a month', () => {
    expect(allowedGranularities(30)).toEqual(['day', 'week'])
  })

  it('offers all three for a quarter', () => {
    expect(allowedGranularities(90)).toEqual(['day', 'week', 'month'])
  })

  it('drops day buckets once the range would smear the chart', () => {
    expect(allowedGranularities(180)).toEqual(['week', 'month'])
  })

  it('auto-picks day, week, then month as the span grows', () => {
    expect(autoGranularity(7)).toBe('day')
    expect(autoGranularity(31)).toBe('day')
    expect(autoGranularity(32)).toBe('week')
    expect(autoGranularity(180)).toBe('week')
    expect(autoGranularity(210)).toBe('week')
    expect(autoGranularity(211)).toBe('month')
  })

  it('honours an override that fits the span', () => {
    expect(resolveGranularity(90, 'month')).toBe('month')
  })

  it('ignores an override that no longer fits and falls back to auto', () => {
    expect(resolveGranularity(180, 'day')).toBe('week')
    expect(resolveGranularity(7, 'month')).toBe('day')
  })

  it('falls back to auto when there is no override', () => {
    expect(resolveGranularity(90, null)).toBe('week')
    expect(resolveGranularity(365, null)).toBe('month')
  })
})
