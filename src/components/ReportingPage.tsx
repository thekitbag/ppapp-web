import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { BarChart3, Target, RefreshCw } from 'lucide-react'
import { qk } from '../lib/queryKeys'
import { getReportSummary } from '../api/reports'
import type { GoalGroup } from '../types'

type Preset = 'this_week' | 'last_week' | 'last_30_days'

const PRESETS: { key: Preset; label: string }[] = [
  { key: 'this_week', label: 'This Week' },
  { key: 'last_week', label: 'Last Week' },
  { key: 'last_30_days', label: 'Last 30 Days' },
]

function getDateRange(preset: Preset): { start_date: string; end_date: string } {
  const now = new Date()
  const utcDay = now.getUTCDay() // 0 = Sun, 1 = Mon … 6 = Sat
  const daysFromMonday = utcDay === 0 ? 6 : utcDay - 1

  if (preset === 'this_week') {
    const monday = new Date(Date.UTC(
      now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysFromMonday
    ))
    const sunday = new Date(Date.UTC(
      now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysFromMonday + 6,
      23, 59, 59
    ))
    return { start_date: monday.toISOString(), end_date: sunday.toISOString() }
  }

  if (preset === 'last_week') {
    const monday = new Date(Date.UTC(
      now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysFromMonday - 7
    ))
    const sunday = new Date(Date.UTC(
      now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysFromMonday - 1,
      23, 59, 59
    ))
    return { start_date: monday.toISOString(), end_date: sunday.toISOString() }
  }

  // last_30_days
  const start = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29
  ))
  const end = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
    23, 59, 59
  ))
  return { start_date: start.toISOString(), end_date: end.toISOString() }
}

function GoalGroupRow({ group }: { group: GoalGroup }) {
  const completionPct = group.task_count > 0
    ? Math.round((group.completed_task_count / group.task_count) * 100)
    : 0
  const isNoGoal = group.goal_id === null

  return (
    <div
      className="rounded-xl border-3 border-black p-4"
      style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-subtle)' }}
    >
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {isNoGoal ? (
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center border-2 border-black flex-shrink-0 text-lg"
              style={{ background: 'var(--color-background)' }}
              aria-hidden="true"
            >
              —
            </div>
          ) : (
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center border-2 border-black flex-shrink-0"
              style={{ background: 'var(--color-accent)' }}
            >
              <Target size={14} style={{ color: 'white' }} />
            </div>
          )}
          <span
            className="font-semibold truncate"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
          >
            {isNoGoal ? 'No Goal' : group.goal_title}
          </span>
        </div>

        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="text-center">
            <div
              className="text-xl font-bold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
            >
              {group.total_size}
            </div>
            <div className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
              pts
            </div>
          </div>

          <div className="text-center">
            <div
              className="text-sm font-bold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
            >
              {group.completed_task_count}/{group.task_count}
            </div>
            <div className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
              tasks
            </div>
          </div>

          <div
            className="px-3 py-1 rounded-md border-2 border-black text-sm font-bold"
            style={{
              background: completionPct >= 100 ? '#4ADE80' : completionPct >= 50 ? 'var(--color-secondary)' : 'var(--color-background)',
              color: 'var(--color-text)',
              fontFamily: 'var(--font-display)',
            }}
          >
            {completionPct}%
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ReportingPage() {
  const [preset, setPreset] = useState<Preset>('this_week')
  const dateRange = getDateRange(preset)

  const reportQ = useQuery({
    queryKey: qk.reports.summary(dateRange),
    queryFn: () => getReportSummary(dateRange),
    placeholderData: keepPreviousData,
  })

  const isFetching = reportQ.isFetching
  const isLoading = reportQ.isLoading

  const data = reportQ.data
  const isEmpty = data && data.impact_score === 0 && data.groups.length === 0

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center border-3 border-black"
            style={{ background: '#7C3AED' }}
          >
            <BarChart3 size={24} style={{ color: 'white' }} />
          </div>
          <h1
            className="text-4xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
          >
            Insights
          </h1>
          {isFetching && !isLoading && (
            <RefreshCw
              size={18}
              className="animate-spin"
              style={{ color: 'var(--color-text-muted)' }}
              aria-label="Refreshing"
            />
          )}
        </div>
        <div className="w-24 h-1 rounded-full ml-16" style={{ background: '#7C3AED' }}></div>
      </div>

      {/* Period selector */}
      <div className="flex items-center gap-2 mb-8 flex-wrap" role="group" aria-label="Report period">
        {PRESETS.map(({ key, label }) => {
          const isActive = preset === key
          return (
            <button
              key={key}
              onClick={() => setPreset(key)}
              aria-pressed={isActive}
              className="px-5 py-2.5 rounded-lg font-bold border-3 border-black transition-all"
              style={{
                fontFamily: 'var(--font-display)',
                background: isActive ? '#7C3AED' : 'var(--color-surface)',
                color: isActive ? 'white' : 'var(--color-text)',
                boxShadow: isActive ? 'var(--shadow-brutal)' : 'var(--shadow-subtle)',
                transform: isActive ? 'translate(-2px, -2px)' : undefined,
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div
          className="card-brutal rounded-xl p-12 text-center"
          role="status"
          aria-label="Loading report"
        >
          <div
            className="w-12 h-12 border-4 border-black rounded-full animate-spin mx-auto mb-4"
            style={{ borderTopColor: '#7C3AED' }}
            aria-hidden="true"
          />
          <p
            className="text-lg font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
          >
            Loading insights...
          </p>
        </div>
      )}

      {/* Error state */}
      {reportQ.isError && !isLoading && (
        <div className="card-brutal rounded-xl p-12 text-center" role="alert">
          <div className="text-5xl mb-4" aria-hidden="true">⚠️</div>
          <p
            className="text-xl font-bold mb-2"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
          >
            Failed to load report
          </p>
          <p className="mb-6" style={{ color: 'var(--color-text-muted)' }}>
            {reportQ.error instanceof Error ? reportQ.error.message : 'Something went wrong'}
          </p>
          <button
            onClick={() => reportQ.refetch()}
            className="btn-brutal px-6 py-3 rounded-lg font-bold text-white"
            style={{ background: '#7C3AED', fontFamily: 'var(--font-display)' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !reportQ.isError && isEmpty && (
        <div className="card-brutal rounded-xl p-12 text-center">
          <BarChart3 size={64} className="mx-auto mb-6" style={{ color: 'var(--color-text-muted)' }} />
          <p
            className="text-xl font-bold mb-2"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
          >
            No completed work in this period
          </p>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Complete some tasks and they'll show up here.
          </p>
        </div>
      )}

      {/* Content */}
      {!isLoading && !reportQ.isError && data && !isEmpty && (
        <div className="space-y-6">
          {/* Total Impact hero */}
          <div
            className="rounded-xl border-3 border-black p-8"
            style={{
              background: '#7C3AED',
              boxShadow: 'var(--shadow-brutal)',
              color: 'white',
            }}
          >
            <p
              className="text-sm font-bold uppercase tracking-widest mb-1 opacity-80"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Total Impact
            </p>
            <div
              className="text-7xl font-bold leading-none"
              style={{ fontFamily: 'var(--font-display)' }}
              aria-label={`Total impact score: ${data.impact_score}`}
            >
              {data.impact_score}
            </div>
            <p className="text-sm mt-2 opacity-70" style={{ fontFamily: 'var(--font-body)' }}>
              story points completed
            </p>
          </div>

          {/* Goal breakdown */}
          {data.groups.length > 0 && (
            <div>
              <h2
                className="text-xl font-bold mb-4"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
              >
                By Goal
              </h2>
              <div className="space-y-3">
                {data.groups.map((group, i) => (
                  <GoalGroupRow
                    key={group.goal_id ?? `no-goal-${i}`}
                    group={group}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
