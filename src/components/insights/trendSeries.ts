import type { TrendSeries } from '../../types'
import { MAX_SERIES, OTHER_COLOR, seriesColor } from '../../lib/insightsColors'

export interface PlotSeries {
  key: string
  title: string
  color: string
  points: number
  values: number[]
}

/**
 * Turn the API's goal series into renderable stacks.
 *
 * Goals keep their palette slot from `order_index`, so a goal's colour never
 * moves when the period changes. Anything past the palette's ceiling folds into
 * a single neutral "Other" stack rather than inventing a 7th hue.
 */
export function buildPlotSeries(series: TrendSeries[], bucketCount: number): PlotSeries[] {
  const named: { orderIndex: number; plot: PlotSeries }[] = []
  const tail: TrendSeries[] = []
  let noGoal: PlotSeries | null = null

  for (const s of series) {
    if (s.is_no_goal) {
      noGoal = {
        key: 'no-goal',
        title: 'No Goal',
        color: seriesColor(s.order_index, true),
        points: s.points,
        values: s.values,
      }
    } else if (s.order_index >= MAX_SERIES) {
      tail.push(s)
    } else {
      named.push({
        orderIndex: s.order_index,
        plot: {
          key: s.goal_id ?? `goal-${s.order_index}`,
          title: s.goal_title,
          color: seriesColor(s.order_index, false),
          points: s.points,
          values: s.values,
        },
      })
    }
  }

  // Legend and stack order follow the palette order, which is the stable
  // per-goal order — not the current period's ranking.
  const out = named
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map(n => n.plot)

  if (tail.length > 0) {
    const values = new Array(bucketCount).fill(0)
    let points = 0
    for (const s of tail) {
      points += s.points
      s.values.forEach((v, i) => { values[i] += v })
    }
    out.push({
      key: 'other',
      title: `Other (${tail.length} goal${tail.length === 1 ? '' : 's'})`,
      color: OTHER_COLOR,
      points,
      values,
    })
  }

  if (noGoal) out.push(noGoal)
  return out
}

/**
 * Round an axis maximum up to the next readable step. The ladder is finer than
 * a plain 1/2/5 so a peak of 28 tops the axis at 30 rather than 50, which would
 * leave the bars using half the plot.
 */
const AXIS_STEPS = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]

export function niceMax(value: number): number {
  if (value <= 0) return 1
  const pow = Math.pow(10, Math.floor(Math.log10(value)))
  const normalised = value / pow
  const step = AXIS_STEPS.find(s => normalised <= s) ?? 10
  return step * pow
}

/** Axis tick text: integers plain, halves with one decimal. */
export function formatTick(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

/**
 * Indices whose x-axis label should render. Labels are thinned to avoid
 * collisions; the first and last bucket always keep theirs.
 */
export function labelIndices(count: number, maxLabels = 10): number[] {
  if (count <= 0) return []
  if (count <= maxLabels) return Array.from({ length: count }, (_, i) => i)
  const step = Math.ceil(count / maxLabels)
  const out: number[] = []
  for (let i = 0; i < count; i += step) out.push(i)
  const last = count - 1
  if (out[out.length - 1] !== last) {
    // Drop the penultimate tick if the final one would crowd it
    if (last - out[out.length - 1] < step / 2) out.pop()
    out.push(last)
  }
  return out
}
