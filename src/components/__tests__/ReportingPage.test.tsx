import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, within } from '../../test/utils'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import ReportingPage from '../ReportingPage'
import { server } from '../../test/mocks/server'

// Fixed reference date: Wednesday 2024-02-28 12:00:00 UTC
const FIXED_NOW = new Date('2024-02-28T12:00:00.000Z')

// Expected date ranges for the fixed date
// Mon 2024-02-26 → Sun 2024-03-03 (this week)
const THIS_WEEK = {
  start_date: '2024-02-26T00:00:00.000Z',
  end_date: '2024-03-03T23:59:59.000Z',
}
// Mon 2024-02-19 → Sun 2024-02-25 (last week)
const LAST_WEEK = {
  start_date: '2024-02-19T00:00:00.000Z',
  end_date: '2024-02-25T23:59:59.000Z',
}
// 2024-01-30 → 2024-02-28 (last 30 days)
const LAST_30 = {
  start_date: '2024-01-30T00:00:00.000Z',
  end_date: '2024-02-28T23:59:59.000Z',
}

const mockSummary = {
  impact_score: 42,
  start_date: THIS_WEEK.start_date,
  end_date: THIS_WEEK.end_date,
  groups: [
    {
      goal_id: '1',
      goal_title: 'Launch Product',
      total_size: 34,
    },
    {
      goal_id: null,
      goal_title: null,
      total_size: 8,
    },
  ],
}

const mockBreakdown = {
  parent_id: null,
  total_impact: 42,
  breakdown: [
    { goal_id: '1', goal_title: 'Launch Product', goal_type: 'annual', points: 34, percentage: 81, has_children: true },
    { goal_id: null, goal_title: null, points: 8, percentage: 19, has_children: false },
  ],
}

function trendsFor(parentId: string | null) {
  if (parentId === '1') {
    return {
      start_date: THIS_WEEK.start_date,
      end_date: THIS_WEEK.end_date,
      granularity: 'day',
      parent_id: '1',
      total_points: 34,
      buckets: [
        { bucket_start: '2024-02-26T00:00:00', bucket_end: '2024-02-26T23:59:59', label: 'Feb 26', points: 20, task_count: 2 },
        { bucket_start: '2024-02-27T00:00:00', bucket_end: '2024-02-27T23:59:59', label: 'Feb 27', points: 14, task_count: 1 },
      ],
      series: [
        { goal_id: '2', goal_title: 'Q1 Goals', is_no_goal: false, order_index: 0, points: 20, values: [20, 0] },
        { goal_id: '3', goal_title: 'Q2 Goals', is_no_goal: false, order_index: 1, points: 14, values: [0, 14] },
      ],
      stats: {
        total_points: 34, task_count: 3, days_in_period: 7, active_days: 2,
        avg_points_per_day: 4.86, avg_points_per_active_day: 17, avg_points_per_week: 34,
        best_day: '2024-02-26T00:00:00', best_day_points: 20,
      },
    }
  }
  return {
    start_date: THIS_WEEK.start_date,
    end_date: THIS_WEEK.end_date,
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
      total_points: 42, task_count: 5, days_in_period: 7, active_days: 2,
      avg_points_per_day: 6, avg_points_per_active_day: 21, avg_points_per_week: 42,
      best_day: '2024-02-26T00:00:00', best_day_points: 30,
    },
  }
}

const mockChildBreakdown = {
  parent_id: '1',
  total_impact: 34,
  breakdown: [
    { goal_id: '2', goal_title: 'Q1 Goals', goal_type: 'quarterly', points: 20, percentage: 59, has_children: false },
    { goal_id: '3', goal_title: 'Q2 Goals', goal_type: 'quarterly', points: 14, percentage: 41, has_children: false },
  ],
}

describe('ReportingPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(FIXED_NOW)
    server.resetHandlers()
    server.use(
      http.get('/api/v1/reports/summary', () => HttpResponse.json(mockSummary)),
      http.get('/api/v1/reports/breakdown', () => HttpResponse.json(mockBreakdown)),
      http.get('/api/v1/reports/trends', ({ request }) =>
        HttpResponse.json(trendsFor(new URL(request.url).searchParams.get('parent_goal_id'))),
      ),
    )
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders page heading', async () => {
    render(<ReportingPage />)
    expect(screen.getByText('Insights')).toBeInTheDocument()
  })

  it('default preset is This Week', async () => {
    render(<ReportingPage />)
    const thisWeekBtn = screen.getByRole('button', { name: 'This Week' })
    expect(thisWeekBtn).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Last Week' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Last 30 Days' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls API with This Week date params by default', async () => {
    let capturedParams: Record<string, string> = {}
    server.use(
      http.get('/api/v1/reports/summary', ({ request }) => {
        const url = new URL(request.url)
        capturedParams = {
          start_date: url.searchParams.get('start_date') ?? '',
          end_date: url.searchParams.get('end_date') ?? '',
        }
        return HttpResponse.json(mockSummary)
      })
    )

    render(<ReportingPage />)

    await waitFor(() => {
      expect(capturedParams.start_date).toBe(THIS_WEEK.start_date)
      expect(capturedParams.end_date).toBe(THIS_WEEK.end_date)
    })
  })

  it('calls API with Last Week date params when preset is switched', async () => {
    const user = userEvent.setup()
    let capturedParams: Record<string, string> = {}
    server.use(
      http.get('/api/v1/reports/summary', ({ request }) => {
        const url = new URL(request.url)
        capturedParams = {
          start_date: url.searchParams.get('start_date') ?? '',
          end_date: url.searchParams.get('end_date') ?? '',
        }
        return HttpResponse.json(mockSummary)
      })
    )

    render(<ReportingPage />)

    await user.click(screen.getByRole('button', { name: 'Last Week' }))

    await waitFor(() => {
      expect(capturedParams.start_date).toBe(LAST_WEEK.start_date)
      expect(capturedParams.end_date).toBe(LAST_WEEK.end_date)
    })
  })

  it('calls API with Last 30 Days date params when preset is switched', async () => {
    const user = userEvent.setup()
    let capturedParams: Record<string, string> = {}
    server.use(
      http.get('/api/v1/reports/summary', ({ request }) => {
        const url = new URL(request.url)
        capturedParams = {
          start_date: url.searchParams.get('start_date') ?? '',
          end_date: url.searchParams.get('end_date') ?? '',
        }
        return HttpResponse.json(mockSummary)
      })
    )

    render(<ReportingPage />)

    await user.click(screen.getByRole('button', { name: 'Last 30 Days' }))

    await waitFor(() => {
      expect(capturedParams.start_date).toBe(LAST_30.start_date)
      expect(capturedParams.end_date).toBe(LAST_30.end_date)
    })
  })

  it('renders total impact score', async () => {
    render(<ReportingPage />)

    await waitFor(() => {
      expect(screen.getByLabelText('Total impact score: 42')).toBeInTheDocument()
    })
  })

  it('renders goal group rows', async () => {
    render(<ReportingPage />)

    await waitFor(() => {
      expect(screen.getAllByText('Launch Product').length).toBeGreaterThan(0)
      expect(screen.getAllByText('No Goal').length).toBeGreaterThan(0)
    })
  })

  it('renders loading state while fetching', async () => {
    server.use(
      http.get('/api/v1/reports/breakdown', async () => {
        // Never resolves during this test
        await new Promise(() => {})
        return HttpResponse.json(mockBreakdown)
      })
    )

    render(<ReportingPage />)

    expect(screen.getByRole('status', { name: 'Loading report' })).toBeInTheDocument()
    expect(screen.getByText('Loading insights...')).toBeInTheDocument()
  })

  it('renders empty state when impact is zero and groups are empty', async () => {
    server.use(
      http.get('/api/v1/reports/breakdown', () =>
        HttpResponse.json({
          parent_id: null,
          total_impact: 0,
          breakdown: [],
        })
      )
    )

    render(<ReportingPage />)

    await waitFor(() => {
      expect(screen.getByText('No completed work in this period')).toBeInTheDocument()
    })
  })

  it('renders error state when API fails', async () => {
    server.use(
      http.get('/api/v1/reports/breakdown', () =>
        HttpResponse.json({ detail: 'Server error' }, { status: 500 })
      )
    )

    render(<ReportingPage />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText('Failed to load report')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    })
  })

  it('renders points share ratio and percentage in goal breakdown row', async () => {
    server.use(
      http.get('/api/v1/reports/breakdown', () =>
        HttpResponse.json({
          parent_id: null,
          total_impact: 30,
          breakdown: [
            { goal_id: '1', goal_title: 'Alpha', goal_type: 'annual', points: 2, percentage: 7, has_children: false },
          ],
        })
      )
    )

    render(<ReportingPage />)

    await waitFor(() => {
      expect(screen.getByText('2/30')).toBeInTheDocument()
      expect(screen.getByText('7%')).toBeInTheDocument()
    })
  })

  it('shows 0% for all groups when impact_score is zero', async () => {
    server.use(
      http.get('/api/v1/reports/breakdown', () =>
        HttpResponse.json({
          parent_id: null,
          total_impact: 0,
          breakdown: [
            { goal_id: '1', goal_title: 'Beta', goal_type: 'annual', points: 5, percentage: 0, has_children: false },
          ],
        })
      )
    )

    render(<ReportingPage />)

    await waitFor(() => {
      expect(screen.getByText('Beta')).toBeInTheDocument()
      expect(screen.getByText('0%')).toBeInTheDocument()
    })
  })

  it('retriggers fetch when Retry is clicked after error', async () => {
    const user = userEvent.setup()
    let callCount = 0

    server.use(
      http.get('/api/v1/reports/breakdown', () => {
        callCount++
        if (callCount === 1) {
          return HttpResponse.json({ detail: 'Server error' }, { status: 500 })
        }
        return HttpResponse.json(mockBreakdown)
      })
    )

    render(<ReportingPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Retry' }))

    await waitFor(() => {
      expect(callCount).toBeGreaterThanOrEqual(2)
    })
  })

  describe('drill-down', () => {
    it('renders drill button for rows with has_children=true', async () => {
      render(<ReportingPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Drill into Launch Product' })).toBeInTheDocument()
      })
    })

    it('clicking drillable row fetches child breakdown with parent_goal_id', async () => {
      const user = userEvent.setup()
      let capturedParentId: string | null = null

      server.use(
        http.get('/api/v1/reports/breakdown', ({ request }) => {
          const url = new URL(request.url)
          capturedParentId = url.searchParams.get('parent_goal_id')
          if (capturedParentId === '1') {
            return HttpResponse.json(mockChildBreakdown)
          }
          return HttpResponse.json(mockBreakdown)
        })
      )

      render(<ReportingPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Drill into Launch Product' })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Drill into Launch Product' }))

      await waitFor(() => {
        expect(capturedParentId).toBe('1')
      })
    })

    it('shows child rows after drilling down', async () => {
      const user = userEvent.setup()

      server.use(
        http.get('/api/v1/reports/breakdown', ({ request }) => {
          const parentId = new URL(request.url).searchParams.get('parent_goal_id')
          if (parentId === '1') {
            return HttpResponse.json(mockChildBreakdown)
          }
          return HttpResponse.json(mockBreakdown)
        })
      )

      render(<ReportingPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Drill into Launch Product' })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Drill into Launch Product' }))

      await waitFor(() => {
        expect(screen.getAllByText('Q1 Goals').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Q2 Goals').length).toBeGreaterThan(0)
      })
    })

    it('shows breadcrumb navigation after drilling down', async () => {
      const user = userEvent.setup()

      server.use(
        http.get('/api/v1/reports/breakdown', ({ request }) => {
          const parentId = new URL(request.url).searchParams.get('parent_goal_id')
          if (parentId === '1') {
            return HttpResponse.json(mockChildBreakdown)
          }
          return HttpResponse.json(mockBreakdown)
        })
      )

      render(<ReportingPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Drill into Launch Product' })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Drill into Launch Product' }))

      await waitFor(() => {
        expect(screen.getByRole('navigation', { name: 'Drill-down breadcrumbs' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Insights' })).toBeInTheDocument()
        expect(screen.getAllByText('Launch Product').length).toBeGreaterThan(0)
      })
    })

    it('clicking Insights breadcrumb navigates back to root', async () => {
      const user = userEvent.setup()

      server.use(
        http.get('/api/v1/reports/breakdown', ({ request }) => {
          const parentId = new URL(request.url).searchParams.get('parent_goal_id')
          if (parentId === '1') {
            return HttpResponse.json(mockChildBreakdown)
          }
          return HttpResponse.json(mockBreakdown)
        })
      )

      render(<ReportingPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Drill into Launch Product' })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Drill into Launch Product' }))

      await waitFor(() => {
        expect(screen.getAllByText('Q1 Goals').length).toBeGreaterThan(0)
      })

      await user.click(screen.getByRole('button', { name: 'Insights' }))

      await waitFor(() => {
        expect(screen.queryByRole('navigation', { name: 'Drill-down breadcrumbs' })).not.toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Drill into Launch Product' })).toBeInTheDocument()
      })
    })
  })

  describe('trends', () => {
    it('offers the longer presets', async () => {
      render(<ReportingPage />)
      expect(screen.getByRole('button', { name: 'Last 3 Months' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Last 6 Months' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Year to Date' })).toBeInTheDocument()
    })

    it('requests Last 3 Months as a 90-day window', async () => {
      const user = userEvent.setup()
      let captured: Record<string, string> = {}
      server.use(
        http.get('/api/v1/reports/trends', ({ request }) => {
          const url = new URL(request.url)
          captured = {
            start_date: url.searchParams.get('start_date') ?? '',
            end_date: url.searchParams.get('end_date') ?? '',
          }
          return HttpResponse.json(trendsFor(null))
        }),
      )

      render(<ReportingPage />)
      await user.click(screen.getByRole('button', { name: 'Last 3 Months' }))

      await waitFor(() => {
        expect(captured.start_date).toBe('2023-12-01T00:00:00.000Z')
        expect(captured.end_date).toBe('2024-02-28T23:59:59.000Z')
      })
    })

    it('asks for day buckets on a weekly period', async () => {
      let captured = ''
      server.use(
        http.get('/api/v1/reports/trends', ({ request }) => {
          captured = new URL(request.url).searchParams.get('granularity') ?? ''
          return HttpResponse.json(trendsFor(null))
        }),
      )

      render(<ReportingPage />)
      await waitFor(() => expect(captured).toBe('day'))
    })

    it('rolls up to week buckets on a 3-month period', async () => {
      const user = userEvent.setup()
      const seen: string[] = []
      server.use(
        http.get('/api/v1/reports/trends', ({ request }) => {
          seen.push(new URL(request.url).searchParams.get('granularity') ?? '')
          return HttpResponse.json(trendsFor(null))
        }),
      )

      render(<ReportingPage />)
      await user.click(screen.getByRole('button', { name: 'Last 3 Months' }))

      await waitFor(() => expect(seen).toContain('week'))
    })

    it('hides the bucket-size control when only one size fits the period', async () => {
      render(<ReportingPage />)
      // This Week is 7 days — day buckets are the only readable option
      expect(screen.queryByRole('group', { name: 'Bucket size' })).not.toBeInTheDocument()
    })

    it('offers bucket sizes once the period is long enough', async () => {
      const user = userEvent.setup()
      render(<ReportingPage />)

      await user.click(screen.getByRole('button', { name: 'Last 30 Days' }))

      const group = screen.getByRole('group', { name: 'Bucket size' })
      expect(within(group).getByRole('button', { name: 'Day' })).toHaveAttribute('aria-pressed', 'true')
      expect(within(group).getByRole('button', { name: 'Week' })).toHaveAttribute('aria-pressed', 'false')
      expect(within(group).queryByRole('button', { name: 'Month' })).not.toBeInTheDocument()
    })

    it('refetches with the chosen bucket size', async () => {
      const user = userEvent.setup()
      const seen: string[] = []
      server.use(
        http.get('/api/v1/reports/trends', ({ request }) => {
          seen.push(new URL(request.url).searchParams.get('granularity') ?? '')
          return HttpResponse.json(trendsFor(null))
        }),
      )

      render(<ReportingPage />)
      await user.click(screen.getByRole('button', { name: 'Last 30 Days' }))
      await user.click(within(screen.getByRole('group', { name: 'Bucket size' })).getByRole('button', { name: 'Week' }))

      await waitFor(() => expect(seen).toContain('week'))
    })

    it('renders the period averages', async () => {
      render(<ReportingPage />)

      await waitFor(() => {
        expect(screen.getByText('Avg / day')).toBeInTheDocument()
        expect(screen.getByText('Avg / week')).toBeInTheDocument()
        expect(screen.getByText('Active days')).toBeInTheDocument()
        expect(screen.getByText('Best day')).toBeInTheDocument()
      })
      expect(screen.getByText('2/7')).toBeInTheDocument()
    })

    it('renders the trend chart', async () => {
      render(<ReportingPage />)
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Points per day' })).toBeInTheDocument()
      })
    })

    it('scopes the trend to the drilled goal', async () => {
      const user = userEvent.setup()
      let captured: string | null = null
      server.use(
        http.get('/api/v1/reports/breakdown', ({ request }) => {
          const parentId = new URL(request.url).searchParams.get('parent_goal_id')
          return HttpResponse.json(parentId === '1' ? mockChildBreakdown : mockBreakdown)
        }),
        http.get('/api/v1/reports/trends', ({ request }) => {
          const parentId = new URL(request.url).searchParams.get('parent_goal_id')
          if (parentId) captured = parentId
          return HttpResponse.json(trendsFor(parentId))
        }),
      )

      render(<ReportingPage />)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Drill into Launch Product' })).toBeInTheDocument()
      })
      await user.click(screen.getByRole('button', { name: 'Drill into Launch Product' }))

      await waitFor(() => expect(captured).toBe('1'))
    })

    it('keeps the breakdown usable when only the trend fails', async () => {
      server.use(
        http.get('/api/v1/reports/trends', () =>
          HttpResponse.json({ detail: 'Server error' }, { status: 500 }),
        ),
      )

      render(<ReportingPage />)

      await waitFor(() => {
        expect(screen.getByText("Couldn't load the trend")).toBeInTheDocument()
      })
      // Totals and the goal breakdown still render
      expect(screen.getByLabelText('Total impact score: 42')).toBeInTheDocument()
      expect(screen.getByText('Launch Product')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Retry trend' })).toBeInTheDocument()
    })

    it('does not show the trend chart in the empty state', async () => {
      server.use(
        http.get('/api/v1/reports/breakdown', () =>
          HttpResponse.json({ parent_id: null, total_impact: 0, breakdown: [] }),
        ),
      )

      render(<ReportingPage />)

      await waitFor(() => {
        expect(screen.getByText('No completed work in this period')).toBeInTheDocument()
      })
      expect(screen.queryByRole('heading', { name: /Points per/ })).not.toBeInTheDocument()
    })
  })
})
