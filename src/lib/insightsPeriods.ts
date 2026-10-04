import type { TrendGranularity } from '../types'

export type Preset =
  | 'this_week'
  | 'last_week'
  | 'last_30_days'
  | 'last_3_months'
  | 'last_6_months'
  | 'year_to_date'

export interface DateRange {
  start_date: string
  end_date: string
}

export const PRESETS: { key: Preset; label: string }[] = [
  { key: 'this_week', label: 'This Week' },
  { key: 'last_week', label: 'Last Week' },
  { key: 'last_30_days', label: 'Last 30 Days' },
  { key: 'last_3_months', label: 'Last 3 Months' },
  { key: 'last_6_months', label: 'Last 6 Months' },
  { key: 'year_to_date', label: 'Year to Date' },
]

export const GRANULARITY_LABELS: Record<TrendGranularity, string> = {
  day: 'Day',
  week: 'Week',
  month: 'Month',
}

/** Periods are UTC throughout, matching how the backend buckets completed_at. */
function utcMidnight(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day))
}

function utcEndOfDay(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day, 23, 59, 59))
}

/** Days back from today, inclusive of today. */
function trailingRange(now: Date, days: number): DateRange {
  const start = utcMidnight(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (days - 1))
  const end = utcEndOfDay(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return { start_date: start.toISOString(), end_date: end.toISOString() }
}

export function getDateRange(preset: Preset, now: Date = new Date()): DateRange {
  const utcDay = now.getUTCDay() // 0 = Sun, 1 = Mon … 6 = Sat
  const daysFromMonday = utcDay === 0 ? 6 : utcDay - 1

  if (preset === 'this_week') {
    const monday = utcMidnight(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysFromMonday)
    const sunday = utcEndOfDay(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysFromMonday + 6)
    return { start_date: monday.toISOString(), end_date: sunday.toISOString() }
  }

  if (preset === 'last_week') {
    const monday = utcMidnight(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysFromMonday - 7)
    const sunday = utcEndOfDay(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysFromMonday - 1)
    return { start_date: monday.toISOString(), end_date: sunday.toISOString() }
  }

  if (preset === 'last_3_months') return trailingRange(now, 90)
  if (preset === 'last_6_months') return trailingRange(now, 180)

  if (preset === 'year_to_date') {
    const start = utcMidnight(now.getUTCFullYear(), 0, 1)
    const end = utcEndOfDay(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    return { start_date: start.toISOString(), end_date: end.toISOString() }
  }

  // last_30_days
  return trailingRange(now, 30)
}

/** Whole days covered by a range, inclusive of both ends. */
export function rangeDays(range: DateRange): number {
  const start = Date.parse(range.start_date)
  const end = Date.parse(range.end_date)
  if (Number.isNaN(start) || Number.isNaN(end)) return 1
  return Math.max(Math.floor((end - start) / 86_400_000) + 1, 1)
}

/**
 * Which bucket sizes make a readable chart for a span. A single-bar chart is no
 * chart, and 180 daily bars is a smear, so each option has a span window.
 */
export function allowedGranularities(days: number): TrendGranularity[] {
  const out: TrendGranularity[] = []
  if (days <= 120) out.push('day')
  if (days >= 14) out.push('week')
  if (days >= 60) out.push('month')
  return out.length > 0 ? out : ['day']
}

/**
 * The bucket size a span gets by default — chosen to keep the bar count in a
 * readable range (roughly 7–30 bars) rather than at a fixed calendar cutoff.
 */
export function autoGranularity(days: number): TrendGranularity {
  if (days <= 31) return 'day'
  if (days <= 210) return 'week'
  return 'month'
}

/** Honour a user's bucket-size choice while it still fits the span. */
export function resolveGranularity(
  days: number,
  override: TrendGranularity | null,
): TrendGranularity {
  if (override && allowedGranularities(days).includes(override)) return override
  return autoGranularity(days)
}
