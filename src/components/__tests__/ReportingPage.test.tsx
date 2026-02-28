import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '../../test/utils'
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
      task_count: 8,
      completed_task_count: 7,
    },
    {
      goal_id: null,
      goal_title: null,
      total_size: 8,
      task_count: 3,
      completed_task_count: 1,
    },
  ],
}

describe('ReportingPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(FIXED_NOW)
    server.resetHandlers()
    server.use(
      http.get('/api/v1/reports/summary', () => HttpResponse.json(mockSummary))
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
      expect(screen.getByText('Launch Product')).toBeInTheDocument()
      expect(screen.getByText('No Goal')).toBeInTheDocument()
    })
  })

  it('renders loading state while fetching', async () => {
    server.use(
      http.get('/api/v1/reports/summary', async () => {
        // Never resolves during this test
        await new Promise(() => {})
        return HttpResponse.json(mockSummary)
      })
    )

    render(<ReportingPage />)

    expect(screen.getByRole('status', { name: 'Loading report' })).toBeInTheDocument()
    expect(screen.getByText('Loading insights...')).toBeInTheDocument()
  })

  it('renders empty state when impact is zero and groups are empty', async () => {
    server.use(
      http.get('/api/v1/reports/summary', () =>
        HttpResponse.json({
          impact_score: 0,
          start_date: THIS_WEEK.start_date,
          end_date: THIS_WEEK.end_date,
          groups: [],
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
      http.get('/api/v1/reports/summary', () =>
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

  it('retriggers fetch when Retry is clicked after error', async () => {
    const user = userEvent.setup()
    let callCount = 0

    server.use(
      http.get('/api/v1/reports/summary', () => {
        callCount++
        if (callCount === 1) {
          return HttpResponse.json({ detail: 'Server error' }, { status: 500 })
        }
        return HttpResponse.json(mockSummary)
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
})
