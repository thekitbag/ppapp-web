import { describe, it, expect } from 'vitest'
import type { TrendSeries } from '../../../types'
import { buildPlotSeries, labelIndices, niceMax } from '../trendSeries'
import { NO_GOAL_COLOR, OTHER_COLOR, SERIES_COLORS } from '../../../lib/insightsColors'

function series(partial: Partial<TrendSeries>): TrendSeries {
  return {
    goal_id: 'g1',
    goal_title: 'Goal',
    is_no_goal: false,
    order_index: 0,
    points: 0,
    values: [0],
    ...partial,
  }
}

describe('buildPlotSeries', () => {
  it('assigns colours from order_index, not from arrival order', () => {
    const out = buildPlotSeries([
      series({ goal_id: 'b', goal_title: 'Beta', order_index: 2, points: 9, values: [9] }),
      series({ goal_id: 'a', goal_title: 'Alpha', order_index: 0, points: 1, values: [1] }),
    ], 1)

    expect(out.map(s => s.title)).toEqual(['Alpha', 'Beta'])
    expect(out[0].color).toBe(SERIES_COLORS[0])
    expect(out[1].color).toBe(SERIES_COLORS[2])
  })

  it('keeps a goal on the same colour when the other goals change', () => {
    const goal = series({ goal_id: 'a', goal_title: 'Alpha', order_index: 3, points: 5, values: [5] })
    const alone = buildPlotSeries([goal], 1)
    const crowded = buildPlotSeries([
      series({ goal_id: 'z', goal_title: 'Zeta', order_index: 0, points: 50, values: [50] }),
      goal,
    ], 1)

    expect(alone[0].color).toBe(SERIES_COLORS[3])
    expect(crowded.find(s => s.title === 'Alpha')!.color).toBe(SERIES_COLORS[3])
  })

  it('folds goals past the palette ceiling into one neutral Other stack', () => {
    const out = buildPlotSeries([
      series({ goal_id: 'a', goal_title: 'Alpha', order_index: 0, points: 10, values: [10, 0] }),
      series({ goal_id: 'g', goal_title: 'Seventh', order_index: 6, points: 4, values: [1, 3] }),
      series({ goal_id: 'h', goal_title: 'Eighth', order_index: 7, points: 2, values: [2, 0] }),
    ], 2)

    const other = out.find(s => s.key === 'other')!
    expect(other.title).toBe('Other (2 goals)')
    expect(other.color).toBe(OTHER_COLOR)
    expect(other.points).toBe(6)
    expect(other.values).toEqual([3, 3])
  })

  it('uses singular wording when only one goal folds', () => {
    const out = buildPlotSeries([
      series({ goal_id: 'g', goal_title: 'Seventh', order_index: 6, points: 4, values: [4] }),
    ], 1)
    expect(out[0].title).toBe('Other (1 goal)')
  })

  it('puts No Goal last and keeps it neutral', () => {
    const out = buildPlotSeries([
      series({ goal_id: null, goal_title: 'No Goal', is_no_goal: true, order_index: 5, points: 3, values: [3] }),
      series({ goal_id: 'a', goal_title: 'Alpha', order_index: 0, points: 7, values: [7] }),
    ], 1)

    expect(out[out.length - 1].title).toBe('No Goal')
    expect(out[out.length - 1].color).toBe(NO_GOAL_COLOR)
  })

  it('returns nothing for an empty series list', () => {
    expect(buildPlotSeries([], 5)).toEqual([])
  })
})

describe('niceMax', () => {
  it('rounds up to the next readable step', () => {
    expect(niceMax(1)).toBe(1)
    expect(niceMax(3)).toBe(3)
    expect(niceMax(7)).toBe(8)
    expect(niceMax(13)).toBe(15)
    expect(niceMax(28)).toBe(30)
    expect(niceMax(42)).toBe(50)
    expect(niceMax(120)).toBe(120)
  })

  it('stays close to the peak so bars are not squashed into half the plot', () => {
    for (const peak of [3, 7, 13, 17, 28, 42, 64, 91, 120, 260]) {
      expect(niceMax(peak) / peak).toBeLessThanOrEqual(1.25)
    }
  })

  it('never returns zero, so a bar height can always be divided', () => {
    expect(niceMax(0)).toBe(1)
    expect(niceMax(-5)).toBe(1)
  })
})

describe('labelIndices', () => {
  it('labels every bucket when there are few', () => {
    expect(labelIndices(5)).toEqual([0, 1, 2, 3, 4])
  })

  it('thins labels and always keeps the first and last', () => {
    const out = labelIndices(30)
    expect(out.length).toBeLessThanOrEqual(11)
    expect(out[0]).toBe(0)
    expect(out[out.length - 1]).toBe(29)
  })

  it('never crowds the final label against its neighbour', () => {
    for (const count of [13, 31, 52, 90, 120]) {
      const out = labelIndices(count)
      const gap = out[out.length - 1] - out[out.length - 2]
      const step = Math.ceil(count / 10)
      expect(gap).toBeGreaterThanOrEqual(step / 2)
    }
  })

  it('handles an empty axis', () => {
    expect(labelIndices(0)).toEqual([])
  })
})
