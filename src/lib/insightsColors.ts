/**
 * Categorical palette for the Insights trend chart.
 *
 * Validated as a 6-slot categorical set against the white card surface:
 * worst adjacent CVD ΔE 9.1, worst adjacent normal-vision ΔE 19.6. Three slots
 * sit below 3:1 contrast on white, so the chart ships a legend and a table view
 * as the relief channel — never colour alone.
 *
 * Slot order is the colourblind-safety mechanism, not decoration. Do not reorder.
 */
export const SERIES_COLORS = [
  '#2a78d6', // blue
  '#eb6834', // orange
  '#1baf7a', // aqua
  '#eda100', // yellow
  '#e87ba4', // magenta
  '#008300', // green
] as const

/** Unattributed work — a real bucket, but not an identity, so it stays neutral. */
export const NO_GOAL_COLOR = '#52514e'

/** The folded tail beyond the palette's ceiling. */
export const OTHER_COLOR = '#898781'

/** Chart chrome, one step off the white card surface. */
export const GRIDLINE_COLOR = '#e1e0d9'
export const AXIS_COLOR = '#c3c2b7'

/** Goals past this many rows at a drill level fold into "Other". */
export const MAX_SERIES = SERIES_COLORS.length

/**
 * Colour follows the goal, never its current rank, so changing the period can
 * never repaint the goals that survive the change. `order_index` is the goal's
 * stable position at its drill level, assigned by the backend.
 */
export function seriesColor(orderIndex: number, isNoGoal: boolean): string {
  if (isNoGoal) return NO_GOAL_COLOR
  if (orderIndex >= MAX_SERIES) return OTHER_COLOR
  return SERIES_COLORS[orderIndex]
}
