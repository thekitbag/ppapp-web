import { useState, Fragment } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { BarChart3, Target, RefreshCw, ChevronRight } from 'lucide-react'
import { qk } from '../lib/queryKeys'
import { getReportSummary, getReportBreakdown, getReportTrends } from '../api/reports'
import type { BreakdownEntry, TrendGranularity } from '../types'
import {
  GRANULARITY_LABELS,
  PRESETS,
  allowedGranularities,
  getDateRange,
  rangeDays,
  resolveGranularity,
  type Preset,
} from '../lib/insightsPeriods'
import { seriesColor } from '../lib/insightsColors'
import TrendChart from './insights/TrendChart'
import StatTiles from './insights/StatTiles'

interface DrillCrumb {
  id: string
  title: string
}

function BreakdownRow({
  entry,
  scopeTotal,
  colorIndex,
  onDrillDown,
}: {
  entry: BreakdownEntry
  scopeTotal: number
  colorIndex: number
  onDrillDown?: (entry: BreakdownEntry) => void
}) {
  const isNoGoal = entry.goal_id === null
  const drillable = entry.has_children && !isNoGoal
  // Same colour the goal wears in the trend chart, so the two views read as one.
  const swatch = seriesColor(colorIndex, isNoGoal)

  const content = (
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
            style={{ background: swatch }}
          >
            <Target size={14} style={{ color: 'white' }} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="font-semibold truncate"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
            >
              {isNoGoal ? 'No Goal' : entry.goal_title}
            </span>
            {drillable && (
              <ChevronRight
                size={16}
                style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}
                aria-hidden="true"
              />
            )}
          </div>
          {/* Share meter — the bar restates the percentage pill as length */}
          <div
            className="mt-1.5 rounded-full overflow-hidden"
            style={{ height: 6, background: 'var(--color-border-light)', maxWidth: 320 }}
            aria-hidden="true"
          >
            <div
              style={{
                width: `${Math.min(entry.percentage, 100)}%`,
                height: '100%',
                background: swatch,
              }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="text-center">
          <div
            className="text-xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
          >
            {entry.points}/{scopeTotal}
          </div>
          <div className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
            pts
          </div>
        </div>

        <div
          className="px-3 py-1 rounded-md border-2 border-black text-sm font-bold"
          style={{
            background: entry.percentage >= 100 ? '#4ADE80' : entry.percentage >= 50 ? 'var(--color-secondary)' : 'var(--color-background)',
            color: 'var(--color-text)',
            fontFamily: 'var(--font-display)',
          }}
        >
          {entry.percentage}%
        </div>
      </div>
    </div>
  )

  if (drillable) {
    return (
      <button
        className="w-full rounded-xl border-3 border-black p-4 text-left transition-all"
        style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-subtle)' }}
        onClick={() => onDrillDown?.(entry)}
        aria-label={`Drill into ${entry.goal_title}`}
      >
        {content}
      </button>
    )
  }

  return (
    <div
      className="rounded-xl border-3 border-black p-4"
      style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-subtle)' }}
    >
      {content}
    </div>
  )
}

export default function ReportingPage() {
  const [preset, setPreset] = useState<Preset>('this_week')
  const [granularityOverride, setGranularityOverride] = useState<TrendGranularity | null>(null)
  const [drillPath, setDrillPath] = useState<DrillCrumb[]>([])

  const dateRange = getDateRange(preset)
  const spanDays = rangeDays(dateRange)
  const granularity = resolveGranularity(spanDays, granularityOverride)
  const granularityOptions = allowedGranularities(spanDays)
  const currentParentId = drillPath.length > 0 ? drillPath[drillPath.length - 1].id : undefined

  const reportQ = useQuery({
    queryKey: qk.reports.summary(dateRange),
    queryFn: () => getReportSummary(dateRange),
    placeholderData: keepPreviousData,
  })

  const breakdownQ = useQuery({
    queryKey: qk.reports.breakdown(dateRange, currentParentId),
    queryFn: () => getReportBreakdown({ ...dateRange, parent_goal_id: currentParentId }),
    placeholderData: keepPreviousData,
  })

  const trendsQ = useQuery({
    queryKey: qk.reports.trends({ ...dateRange, granularity }, currentParentId),
    queryFn: () => getReportTrends({ ...dateRange, granularity, parent_goal_id: currentParentId }),
    placeholderData: keepPreviousData,
  })

  function handlePresetChange(newPreset: Preset) {
    setPreset(newPreset)
    setDrillPath([])
  }

  function handleDrillDown(entry: BreakdownEntry) {
    if (!entry.has_children || entry.goal_id === null) return
    setDrillPath(prev => [...prev, { id: entry.goal_id!, title: entry.goal_title! }])
  }

  function handleNavigateTo(index: number) {
    setDrillPath(prev => prev.slice(0, index + 1))
  }

  const isBreakdownLoading = breakdownQ.isLoading
  const breakdownData = breakdownQ.data
  const summaryData = reportQ.data
  const trendsData = trendsQ.data
  const isEmpty = breakdownData && breakdownData.breakdown.length === 0 && breakdownData.total_impact === 0
  const isAnyFetching =
    (reportQ.isFetching && !reportQ.isLoading) ||
    (breakdownQ.isFetching && !isBreakdownLoading) ||
    (trendsQ.isFetching && !trendsQ.isLoading)

  // Goal rows take their colour from the trend series' stable order_index, so a
  // goal is the same colour in the chart, the legend and the breakdown list.
  const orderIndexByGoal = new Map<string, number>()
  trendsData?.series.forEach(s => {
    if (s.goal_id) orderIndexByGoal.set(s.goal_id, s.order_index)
  })

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
          {isAnyFetching && (
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

      {/* Filter row — scopes everything below it */}
      <div className="flex items-center gap-x-6 gap-y-3 mb-8 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Report period">
          {PRESETS.map(({ key, label }) => {
            const isActive = preset === key
            return (
              <button
                key={key}
                onClick={() => handlePresetChange(key)}
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

        {granularityOptions.length > 1 && (
          <div className="flex items-center gap-2" role="group" aria-label="Bucket size">
            <span
              className="text-xs font-bold uppercase tracking-wider"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-muted)' }}
            >
              By
            </span>
            {granularityOptions.map(option => {
              const isActive = granularity === option
              return (
                <button
                  key={option}
                  onClick={() => setGranularityOverride(option)}
                  aria-pressed={isActive}
                  className="px-3 py-1.5 rounded-lg font-bold border-2 border-black text-sm"
                  style={{
                    fontFamily: 'var(--font-display)',
                    background: isActive ? 'var(--color-secondary)' : 'var(--color-surface)',
                    color: 'var(--color-text)',
                  }}
                >
                  {GRANULARITY_LABELS[option]}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Breadcrumbs */}
      {drillPath.length > 0 && (
        <nav
          aria-label="Drill-down breadcrumbs"
          className="flex items-center gap-2 mb-6 flex-wrap"
        >
          <button
            onClick={() => setDrillPath([])}
            className="font-bold px-3 py-1 rounded-lg border-2 border-black text-sm"
            style={{
              fontFamily: 'var(--font-display)',
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
            }}
          >
            Insights
          </button>
          {drillPath.map((crumb, i) => (
            <Fragment key={crumb.id}>
              <span aria-hidden="true" style={{ color: 'var(--color-text-muted)' }}>›</span>
              <button
                onClick={() => i < drillPath.length - 1 ? handleNavigateTo(i) : undefined}
                className="font-bold px-3 py-1 rounded-lg border-2 border-black text-sm"
                style={{
                  fontFamily: 'var(--font-display)',
                  background: i === drillPath.length - 1 ? '#7C3AED' : 'var(--color-surface)',
                  color: i === drillPath.length - 1 ? 'white' : 'var(--color-text)',
                }}
                aria-current={i === drillPath.length - 1 ? 'page' : undefined}
              >
                {crumb.title}
              </button>
            </Fragment>
          ))}
        </nav>
      )}

      {/* Loading state */}
      {isBreakdownLoading && (
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
      {breakdownQ.isError && !isBreakdownLoading && (
        <div className="card-brutal rounded-xl p-12 text-center" role="alert">
          <div className="text-5xl mb-4" aria-hidden="true">⚠️</div>
          <p
            className="text-xl font-bold mb-2"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
          >
            Failed to load report
          </p>
          <p className="mb-6" style={{ color: 'var(--color-text-muted)' }}>
            {breakdownQ.error instanceof Error ? breakdownQ.error.message : 'Something went wrong'}
          </p>
          <button
            onClick={() => { breakdownQ.refetch(); trendsQ.refetch() }}
            className="btn-brutal px-6 py-3 rounded-lg font-bold text-white"
            style={{ background: '#7C3AED', fontFamily: 'var(--font-display)' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!isBreakdownLoading && !breakdownQ.isError && isEmpty && (
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
      {!isBreakdownLoading && !breakdownQ.isError && breakdownData && !isEmpty && (
        <div className="space-y-6">
          {/* Total Impact hero — always shows period-wide total from summary */}
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
              aria-label={`Total impact score: ${summaryData?.impact_score ?? breakdownData.total_impact}`}
            >
              {summaryData?.impact_score ?? breakdownData.total_impact}
            </div>
            <p className="text-sm mt-2 opacity-70" style={{ fontFamily: 'var(--font-body)' }}>
              story points completed
            </p>
          </div>

          {/* Period averages */}
          {trendsData && (
            <StatTiles
              stats={trendsData.stats}
              dimmed={trendsQ.isFetching && !trendsQ.isLoading}
            />
          )}

          {/* Trend over time, split by goal */}
          {trendsData && trendsData.buckets.length > 0 && (
            <TrendChart
              data={trendsData}
              dimmed={trendsQ.isFetching && !trendsQ.isLoading}
            />
          )}

          {trendsQ.isError && (
            <div
              className="rounded-xl border-3 border-black p-6 text-center"
              style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-subtle)' }}
              role="alert"
            >
              <p className="font-bold mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
                Couldn't load the trend
              </p>
              <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
                The totals below are still accurate.
              </p>
              <button
                onClick={() => trendsQ.refetch()}
                className="px-4 py-2 rounded-lg font-bold border-2 border-black text-sm"
                style={{ fontFamily: 'var(--font-display)', background: 'var(--color-secondary)', color: 'var(--color-text)' }}
              >
                Retry trend
              </button>
            </div>
          )}

          {/* Goal breakdown */}
          {breakdownData.breakdown.length > 0 && (
            <div>
              <h2
                className="text-xl font-bold mb-4"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
              >
                By Goal
              </h2>
              <div className="space-y-3">
                {breakdownData.breakdown.map((entry, i) => (
                  <BreakdownRow
                    key={entry.goal_id ?? `no-goal-${i}`}
                    entry={entry}
                    scopeTotal={breakdownData.total_impact}
                    colorIndex={entry.goal_id ? orderIndexByGoal.get(entry.goal_id) ?? i : i}
                    onDrillDown={handleDrillDown}
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
