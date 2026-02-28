import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '../../test/utils'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import TaskSuggestionModal from '../TaskSuggestionModal'
import { server } from '../../test/mocks/server'

const mockItems = [
  {
    task: {
      id: '1',
      title: 'Write unit tests',
      status: 'backlog',
      sort_order: 1000,
      tags: [],
      project_id: null,
      goal_id: null,
      hard_due_at: null,
      soft_due_at: null,
      effort_minutes: 30,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    },
    score: 0.9,
    factors: { urgency: 0.8 },
    why: 'Low effort and high urgency',
  },
  {
    task: {
      id: '2',
      title: 'Review PR',
      status: 'backlog',
      sort_order: 2000,
      tags: [],
      project_id: null,
      goal_id: null,
      hard_due_at: null,
      soft_due_at: null,
      effort_minutes: 15,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    },
    score: 0.8,
    factors: { effort: 0.9 },
    why: 'Quick review needed',
  },
]

describe('TaskSuggestionModal', () => {
  beforeEach(() => {
    server.resetHandlers()
    server.use(
      http.get('/api/v1/recommendations/next', () => HttpResponse.json({ items: mockItems }))
    )
  })

  it('does not render when closed', () => {
    render(<TaskSuggestionModal open={false} onClose={() => {}} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders step 1 energy options when opened', () => {
    render(<TaskSuggestionModal open={true} onClose={() => {}} />)
    expect(screen.getByRole('dialog', { name: 'Suggest Task' })).toBeInTheDocument()
    expect(screen.getByText('How are you feeling?')).toBeInTheDocument()
    expect(screen.getByText('Low')).toBeInTheDocument()
    expect(screen.getByText('Medium')).toBeInTheDocument()
    expect(screen.getByText('High')).toBeInTheDocument()
  })

  it('advances to step 2 after selecting energy level', async () => {
    const user = userEvent.setup()
    render(<TaskSuggestionModal open={true} onClose={() => {}} />)

    await user.click(screen.getByText('Low'))

    expect(screen.getByText('How big is your time window?')).toBeInTheDocument()
    expect(screen.getByText('15m')).toBeInTheDocument()
    expect(screen.getByText('30m')).toBeInTheDocument()
    expect(screen.getByText('1h')).toBeInTheDocument()
    expect(screen.getByText('2h')).toBeInTheDocument()
    expect(screen.getByText('4h+')).toBeInTheDocument()
  })

  it('shows energy label in step 2 summary', async () => {
    const user = userEvent.setup()
    render(<TaskSuggestionModal open={true} onClose={() => {}} />)

    await user.click(screen.getByText('High'))

    // Energy label displayed as context in step 2
    expect(screen.getAllByText('High').length).toBeGreaterThanOrEqual(1)
  })

  it('submits expected params and shows results after step 2', async () => {
    const user = userEvent.setup()
    let capturedParams: Record<string, string> = {}

    server.use(
      http.get('/api/v1/recommendations/next', ({ request }) => {
        const url = new URL(request.url)
        capturedParams = {
          energy: url.searchParams.get('energy') ?? '',
          time_window: url.searchParams.get('time_window') ?? '',
        }
        return HttpResponse.json({ items: mockItems })
      })
    )

    render(<TaskSuggestionModal open={true} onClose={() => {}} />)

    await user.click(screen.getByText('Medium'))
    await user.click(screen.getByText('30m'))

    await waitFor(() => {
      expect(capturedParams.energy).toBe('medium')
      expect(capturedParams.time_window).toBe('30')
    })
  })

  it('renders recommendation titles and why lines', async () => {
    const user = userEvent.setup()

    render(<TaskSuggestionModal open={true} onClose={() => {}} />)

    await user.click(screen.getByText('High'))
    await user.click(screen.getByText('1h'))

    await waitFor(() => {
      expect(screen.getByText('Write unit tests')).toBeInTheDocument()
      expect(screen.getByText('Low effort and high urgency')).toBeInTheDocument()
      expect(screen.getByText('Review PR')).toBeInTheDocument()
      expect(screen.getByText('Quick review needed')).toBeInTheDocument()
    })
  })

  it('renders loading state while fetching', async () => {
    const user = userEvent.setup()

    server.use(
      http.get('/api/v1/recommendations/next', async () => {
        // Never resolves during this test
        await new Promise(() => {})
        return HttpResponse.json({ items: [] })
      })
    )

    render(<TaskSuggestionModal open={true} onClose={() => {}} />)

    await user.click(screen.getByText('Low'))
    await user.click(screen.getByText('15m'))

    expect(screen.getByRole('status', { name: 'Loading suggestions' })).toBeInTheDocument()
    expect(screen.getByText('Finding your best tasks...')).toBeInTheDocument()
  })

  it('renders empty state when no suggestions returned', async () => {
    const user = userEvent.setup()

    server.use(
      http.get('/api/v1/recommendations/next', () =>
        HttpResponse.json({ items: [] })
      )
    )

    render(<TaskSuggestionModal open={true} onClose={() => {}} />)

    await user.click(screen.getByText('Medium'))
    await user.click(screen.getByText('2h'))

    await waitFor(() => {
      expect(screen.getByText('No suggestions right now')).toBeInTheDocument()
    })
  })

  it('renders error state when API fails', async () => {
    const user = userEvent.setup()

    server.use(
      http.get('/api/v1/recommendations/next', () =>
        HttpResponse.json({ detail: 'Error' }, { status: 500 })
      )
    )

    render(<TaskSuggestionModal open={true} onClose={() => {}} />)

    await user.click(screen.getByText('Low'))
    await user.click(screen.getByText('4h+'))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText('Failed to load suggestions')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    })
  })

  it('back button returns to energy step from time step', async () => {
    const user = userEvent.setup()
    render(<TaskSuggestionModal open={true} onClose={() => {}} />)

    await user.click(screen.getByText('Low'))
    expect(screen.getByText('How big is your time window?')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByText('How are you feeling?')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<TaskSuggestionModal open={true} onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('resets to step 1 when reopened', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<TaskSuggestionModal open={true} onClose={() => {}} />)

    await user.click(screen.getByText('High'))
    expect(screen.getByText('How big is your time window?')).toBeInTheDocument()

    rerender(<TaskSuggestionModal open={false} onClose={() => {}} />)
    rerender(<TaskSuggestionModal open={true} onClose={() => {}} />)

    expect(screen.getByText('How are you feeling?')).toBeInTheDocument()
  })
})
