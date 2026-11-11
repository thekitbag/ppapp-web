import { useMemo, useRef, useState } from 'react'
import { Table2 } from 'lucide-react'
import type { ReportTrends, TrendGranularity } from '../../types'
import { AXIS_COLOR, GRIDLINE_COLOR } from '../../lib/insightsColors'
import { buildPlotSeries, formatTick, labelIndices, niceMax } from './trendSeries'

const PLOT_HEIGHT = 220
const Y_GUTTER = 44
/** Half of the first/last label hangs past its band — reserve room so it can't clip. */
const X_LABEL_OVERHANG = 16
const SEGMENT_GAP = 2
const MAX_BAR_WIDTH = 24
/** Nonzero points always leave a visible mark, even at 1pt against a 100pt peak. */
const MIN_SEGMENT_HEIGHT = 3

const BUCKET_NOUN: Record<TrendGranularity, string> = {
  day: 'day',
  week: 'week',
  month: 'month',
}

export default function TrendChart({
  data,
  dimmed = false,
}: {
  data: ReportTrends
  dimmed?: boolean
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [showTable, setShowTable] = useState(false)
  const plotRef = useRef<HTMLDivElement>(null)

  const { buckets, series: rawSeries, granularity } = data
  const series = useMemo(
    () => buildPlotSeries(rawSeries, buckets.length),
    [rawSeries, buckets.length],
  )

  const axisMax = useMemo(
    () => niceMax(Math.max(...buckets.map(b => b.points), 0)),
    [buckets],
  )
  const ticks = useMemo(
    () => labelIndices(buckets.length),
    [buckets.length],
  )
  const tickSet = useMemo(() => new Set(ticks), [ticks])
  const noun = BUCKET_NOUN[granularity]

  function segmentHeight(value: number): number {
    if (value <= 0) return 0
    return Math.max(Math.round((value / axisMax) * PLOT_HEIGHT), MIN_SEGMENT_HEIGHT)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (buckets.length === 0) return
    const current = activeIndex ?? -1
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      setActiveIndex(Math.min(current + 1, buckets.length - 1))
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      setActiveIndex(current <= 0 ? 0 : current - 1)
    } else if (e.key === 'Home') {
      e.preventDefault()
      setActiveIndex(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setActiveIndex(buckets.length - 1)
    } else if (e.key === 'Escape') {
      setActiveIndex(null)
    }
  }

  const active = activeIndex !== null ? buckets[activeIndex] : null
  const activeParts = active
    ? series
        .map(s => ({ title: s.title, color: s.color, value: s.values[activeIndex!] ?? 0 }))
        .filter(p => p.value > 0)
    : []

  // Park the tooltip in the plot corner opposite the active bar: it never covers
  // the mark being read, and it can never overflow the card.
  const tooltipOnRight = activeIndex !== null && activeIndex < buckets.length / 2

  return (
    <div
      className="rounded-xl border-3 border-black p-5"
      style={{
        background: 'var(--color-surface)',
        boxShadow: 'var(--shadow-subtle)',
        opacity: dimmed ? 0.6 : 1,
        transition: 'opacity 120ms linear',
      }}
    >
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h2
            className="text-xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
          >
            Points per {noun}
          </h2>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {series.length > 1 ? 'Stacked by goal · UTC' : 'UTC'}
          </p>
        </div>
        <button
          onClick={() => setShowTable(v => !v)}
          aria-pressed={showTable}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 border-black text-sm font-bold"
          style={{
            fontFamily: 'var(--font-display)',
            background: showTable ? 'var(--color-secondary)' : 'var(--color-surface)',
            color: 'var(--color-text)',
          }}
        >
          <Table2 size={14} aria-hidden="true" />
          {showTable ? 'Hide table' : 'Show table'}
        </button>
      </div>

      {/* Plot */}
      <div className="relative" style={{ paddingLeft: Y_GUTTER, paddingRight: X_LABEL_OVERHANG }}>
        {/* Y axis ticks + gridlines */}
        {[axisMax, axisMax / 2, 0].map((tickValue, i) => (
          <div
            key={tickValue + '-' + i}
            className="absolute flex items-center"
            style={{
              top: (PLOT_HEIGHT * i) / 2 - 6,
              left: 0,
              right: 0,
              height: 12,
              pointerEvents: 'none',
            }}
          >
            <span
              className="text-xs font-medium text-right"
              style={{
                width: Y_GUTTER - 8,
                color: 'var(--color-text-muted)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatTick(tickValue)}
            </span>
            <div
              style={{
                flex: 1,
                height: 1,
                marginLeft: 8,
                background: i === 2 ? AXIS_COLOR : GRIDLINE_COLOR,
              }}
            />
          </div>
        ))}

        <div
          ref={plotRef}
          tabIndex={0}
          role="group"
          aria-label={`Points per ${noun} from ${buckets[0]?.label ?? ''} to ${buckets[buckets.length - 1]?.label ?? ''}. Use arrow keys to step through each ${noun}.`}
          onKeyDown={handleKeyDown}
          onBlur={() => setActiveIndex(null)}
          onPointerLeave={() => setActiveIndex(null)}
          className="relative flex items-end rounded-sm"
          style={{ height: PLOT_HEIGHT, outlineOffset: 4 }}
        >
          {buckets.map((bucket, i) => {
            const isActive = i === activeIndex
            return (
              <div
                key={bucket.bucket_start}
                onPointerEnter={() => setActiveIndex(i)}
                className="relative flex flex-col justify-end items-center"
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: PLOT_HEIGHT,
                  // 1px either side gives adjacent bars a 2px surface gap
                  padding: '0 1px',
                  background: isActive ? 'rgba(0,0,0,0.04)' : 'transparent',
                  cursor: 'default',
                }}
              >
                <div
                  className="flex flex-col justify-end"
                  style={{
                    width: '100%',
                    maxWidth: MAX_BAR_WIDTH,
                    gap: SEGMENT_GAP,
                  }}
                >
                  {/* Topmost segment is the last series, so render the stack reversed */}
                  {series
                    .map((s, si) => ({ s, si, h: segmentHeight(s.values[i] ?? 0) }))
                    .filter(({ h }) => h > 0)
                    .reverse()
                    .map(({ s, h }, idx) => (
                      <div
                        key={s.key}
                        style={{
                          height: h,
                          background: s.color,
                          // 4px rounded data-end, square at the baseline
                          borderTopLeftRadius: idx === 0 ? 4 : 0,
                          borderTopRightRadius: idx === 0 ? 4 : 0,
                          filter: isActive ? 'brightness(1.12)' : undefined,
                        }}
                      />
                    ))}
                </div>
              </div>
            )
          })}

          {active && (
            <div
              role="tooltip"
              className="absolute rounded-lg border-3 border-black p-3 pointer-events-none"
              style={{
                background: 'var(--color-surface)',
                boxShadow: 'var(--shadow-brutal)',
                top: 0,
                left: tooltipOnRight ? undefined : 0,
                right: tooltipOnRight ? 0 : undefined,
                minWidth: 150,
                maxWidth: 240,
                zIndex: 10,
              }}
            >
              <div className="flex items-baseline gap-2 mb-1">
                <span
                  className="text-xl font-bold"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
                >
                  {active.points}
                </span>
                <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                  pts · {active.task_count} {active.task_count === 1 ? 'task' : 'tasks'}
                </span>
              </div>
              <div
                className="text-xs font-bold mb-2"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-muted)' }}
              >
                {active.label}
              </div>
              {activeParts.map(part => (
                <div key={part.title} className="flex items-center gap-2 text-xs">
                  <span
                    aria-hidden="true"
                    style={{ width: 10, height: 2, background: part.color, flexShrink: 0 }}
                  />
                  <span
                    className="font-bold"
                    style={{ color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}
                  >
                    {part.value}
                  </span>
                  <span className="truncate" style={{ color: 'var(--color-text-muted)' }}>
                    {part.title}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* X axis labels — thinned so they never collide */}
        <div className="flex mt-2">
          {buckets.map((bucket, i) => (
            <div
              key={bucket.bucket_start}
              className="text-xs text-center"
              style={{
                flex: 1,
                minWidth: 0,
                color: 'var(--color-text-muted)',
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
                overflow: 'visible',
              }}
            >
              {tickSet.has(i) ? bucket.label : ' '}
            </div>
          ))}
        </div>
      </div>

      {/* Live region mirrors the tooltip for keyboard and screen-reader users */}
      <div
        aria-live="polite"
        style={{
          position: 'absolute', width: 1, height: 1, overflow: 'hidden',
          clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap',
        }}
      >
        {active
          ? `${active.label}: ${active.points} points from ${active.task_count} tasks. ` +
            activeParts.map(p => `${p.title} ${p.value}`).join(', ')
          : ''}
      </div>

      {/* Legend — the dependable identity channel; always present for 2+ series */}
      {series.length > 1 && (
        <ul className="flex flex-wrap gap-x-5 gap-y-2 mt-5 list-none p-0">
          {series.map(s => (
            <li key={s.key} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="rounded-sm"
                style={{ width: 12, height: 12, background: s.color, flexShrink: 0 }}
              />
              <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                {s.title}
              </span>
              <span
                className="text-sm font-bold"
                style={{ color: 'var(--color-text-muted)', fontVariantNumeric: 'tabular-nums' }}
              >
                {s.points}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Table view — every value readable without hover, and the relief channel
          for the palette slots that sit below 3:1 against this surface */}
      {showTable && (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <caption className="text-left text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
              Points per {noun}, by goal
            </caption>
            <thead>
              <tr>
                <th
                  scope="col"
                  className="text-left font-bold py-2 pr-4"
                  style={{ fontFamily: 'var(--font-display)', borderBottom: '2px solid var(--color-border)' }}
                >
                  {noun === 'day' ? 'Day' : noun === 'week' ? 'Week' : 'Month'}
                </th>
                {series.map(s => (
                  <th
                    scope="col"
                    key={s.key}
                    className="text-right font-bold py-2 px-2 whitespace-nowrap"
                    style={{ fontFamily: 'var(--font-display)', borderBottom: '2px solid var(--color-border)' }}
                  >
                    {s.title}
                  </th>
                ))}
                <th
                  scope="col"
                  className="text-right font-bold py-2 pl-2"
                  style={{ fontFamily: 'var(--font-display)', borderBottom: '2px solid var(--color-border)' }}
                >
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {buckets.map((bucket, i) => (
                <tr key={bucket.bucket_start}>
                  <th
                    scope="row"
                    className="text-left font-medium py-1.5 pr-4 whitespace-nowrap"
                    style={{ borderBottom: `1px solid ${GRIDLINE_COLOR}`, color: 'var(--color-text)' }}
                  >
                    {bucket.label}
                  </th>
                  {series.map(s => (
                    <td
                      key={s.key}
                      className="text-right py-1.5 px-2"
                      style={{
                        borderBottom: `1px solid ${GRIDLINE_COLOR}`,
                        color: 'var(--color-text-muted)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {s.values[i] ?? 0}
                    </td>
                  ))}
                  <td
                    className="text-right font-bold py-1.5 pl-2"
                    style={{
                      borderBottom: `1px solid ${GRIDLINE_COLOR}`,
                      color: 'var(--color-text)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {bucket.points}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
