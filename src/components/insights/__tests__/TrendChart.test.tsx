import { describe, it, expect } from 'vitest'
import { render, screen, within } from '../../../test/utils'
import userEvent from '@testing-library/user-event'
import type { ReportTrends } from '../../../types'
import TrendChart from '../TrendChart'

const data: ReportTrends = {
  start_date: '2024-02-26T00:00:00',
  end_date: '2024-02-28T23:59:59',
  granularity: 'day',
  parent_id: null,
  total_points: 42,
  buckets: [
    { bucket_start: '2024-02-26T00:00:00', bucket_end: '2024-02-26T23:59:59', label: 'Feb 26', points: 30, task_count: 3 },
    { bucket_start: '2024-02-27T00:00:00', bucket_end: '2024-02-27T23:59:59', label: 'Feb 27', points: 0, task_count: 0 },
    { bucket_start: '2024-02-28T00:00:00', bucket_end: '2024-02-28T23:59:59', label: 'Feb 28', points: 12, task_count: 2 },
  ],
  series: [
    { goal_id: '1', goal_title: 'Launch Product', is_no_goal: false, order_index: 0, points: 34, values: [30, 0, 4] },
    { goal_id: null, goal_title: 'No Goal', is_no_goal: true, order_index: 1, points: 8, values: [0, 0, 8] },
  ],
  stats: {
    total_points: 42, task_count: 5, days_in_period: 3, active_days: 2,
    avg_points_per_day: 14, avg_points_per_active_day: 21, avg_points_per_week: 98,
    best_day: '2024-02-26T00:00:00', best_day_points: 30,
  },
}

function weekly(): ReportTrends {
  return {
    ...data,
    granularity: 'week',
    buckets: data.buckets.map(b => ({ ...b, label: 'Feb 26–Mar 3' })),
  }
}

describe('TrendChart', () => {
  it('names the bucket size in the heading', () => {
    render(<TrendChart data={data} />)
    expect(screen.getByRole('heading', { name: 'Points per day' })).toBeInTheDocument()
  })

  it('follows the granularity in the heading', () => {
    render(<TrendChart data={weekly()} />)
    expect(screen.getByRole('heading', { name: 'Points per week' })).toBeInTheDocument()
  })

  it('renders a legend for every series, with its total', () => {
    render(<TrendChart data={data} />)
    const legend = screen.getByRole('list')
    expect(within(legend).getByText('Launch Product')).toBeInTheDocument()
    expect(within(legend).getByText('34')).toBeInTheDocument()
    expect(within(legend).getByText('No Goal')).toBeInTheDocument()
    expect(within(legend).getByText('8')).toBeInTheDocument()
  })

  it('omits the legend for a single series, since the heading already names it', () => {
    render(<TrendChart data={{ ...data, series: [data.series[0]] }} />)
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('labels the plot with the span and how to navigate it', () => {
    render(<TrendChart data={data} />)
    const plot = screen.getByRole('group', { name: /Points per day from Feb 26 to Feb 28/ })
    expect(plot).toHaveAttribute('tabindex', '0')
  })

  it('renders axis ticks for the rounded maximum, its midpoint and zero', () => {
    render(<TrendChart data={data} />)
    // Peak bucket is 30 points, which is already a clean step
    expect(screen.getByText('30')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('shows a half-step midpoint tick with one decimal', () => {
    const peaked = {
      ...data,
      buckets: data.buckets.map((b, i) => (i === 0 ? { ...b, points: 13 } : { ...b, points: 0 })),
    }
    render(<TrendChart data={peaked} />)
    // 13 rounds up to 15, whose midpoint is 7.5
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByText('7.5')).toBeInTheDocument()
  })

  it('shows bucket detail on hover', async () => {
    const user = userEvent.setup()
    render(<TrendChart data={data} />)

    const plot = screen.getByRole('group', { name: /Points per day/ })
    await user.hover(plot.children[0] as HTMLElement)

    const tip = screen.getByRole('tooltip')
    expect(within(tip).getByText('Feb 26')).toBeInTheDocument()
    // 30 appears twice: the bucket total and this goal's share of it
    expect(within(tip).getAllByText('30')).toHaveLength(2)
    expect(within(tip).getByText('pts · 3 tasks')).toBeInTheDocument()
    expect(within(tip).getByText('Launch Product')).toBeInTheDocument()
  })

  it('shows the same detail on keyboard navigation', async () => {
    const user = userEvent.setup()
    render(<TrendChart data={data} />)

    const plot = screen.getByRole('group', { name: /Points per day/ })
    plot.focus()
    await user.keyboard('{ArrowRight}')

    const tip = screen.getByRole('tooltip')
    expect(within(tip).getByText('Feb 26')).toBeInTheDocument()

    await user.keyboard('{End}')
    expect(within(screen.getByRole('tooltip')).getByText('Feb 28')).toBeInTheDocument()

    await user.keyboard('{Home}')
    expect(within(screen.getByRole('tooltip')).getByText('Feb 26')).toBeInTheDocument()
  })

  it('reports an idle bucket as zero rather than hiding it', async () => {
    const user = userEvent.setup()
    render(<TrendChart data={data} />)

    const plot = screen.getByRole('group', { name: /Points per day/ })
    plot.focus()
    await user.keyboard('{ArrowRight}{ArrowRight}')

    const tip = screen.getByRole('tooltip')
    expect(within(tip).getByText('Feb 27')).toBeInTheDocument()
    expect(within(tip).getByText('pts · 0 tasks')).toBeInTheDocument()
  })

  it('dismisses the readout on Escape', async () => {
    const user = userEvent.setup()
    render(<TrendChart data={data} />)

    const plot = screen.getByRole('group', { name: /Points per day/ })
    plot.focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tooltip')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('exposes every value through a table view', async () => {
    const user = userEvent.setup()
    render(<TrendChart data={data} />)

    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Show table/ }))

    const table = screen.getByRole('table')
    expect(within(table).getByRole('columnheader', { name: 'Day' })).toBeInTheDocument()
    expect(within(table).getByRole('columnheader', { name: 'Launch Product' })).toBeInTheDocument()
    expect(within(table).getByRole('columnheader', { name: 'Total' })).toBeInTheDocument()

    const idleRow = within(table).getByRole('rowheader', { name: 'Feb 27' }).closest('tr')!
    expect(within(idleRow).getAllByRole('cell').map(c => c.textContent)).toEqual(['0', '0', '0'])

    await user.click(screen.getByRole('button', { name: /Hide table/ }))
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('renders without crashing when the period has no points', () => {
    render(<TrendChart data={{
      ...data,
      total_points: 0,
      buckets: data.buckets.map(b => ({ ...b, points: 0, task_count: 0 })),
      series: [],
    }} />)
    expect(screen.getByRole('heading', { name: 'Points per day' })).toBeInTheDocument()
  })

  it('holds the frame at reduced opacity while refetching', () => {
    const { container } = render(<TrendChart data={data} dimmed />)
    expect((container.firstChild as HTMLElement).style.opacity).toBe('0.6')
  })
})
