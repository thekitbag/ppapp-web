import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '../../test/utils'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import TaskSuggestionModal from '../TaskSuggestionModal'
import { server } from '../../test/mocks/server'

// Rich why strings simulating upgraded backend scoring explanations (SUGGEST-002)
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
    factors: { urgency: 0.8, goal_health: 0.7, energy_fit: 0.9 },
    why: 'Fits your medium energy level well. Estimated 30 min — within your 1h window. Linked goal "Launch Product" is at risk; completing this task would meaningfully improve its health score.',
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
    factors: { effort: 0.9, time_fit: 0.95 },
    why: 'Quick win at 15 min — well under your available window. Low cognitive load makes it a great match for your current energy.',
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
    render(<TaskSuggestionModal open={false} onClose={() => {}} onSelectTask={() => {}} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders step 1 energy options when opened', () => {
    render(<TaskSuggestionModal open={true} onClose={() => {}} onSelectTask={() => {}} />)
    expect(screen.getByRole('dialog', { name: 'Suggest Task' })).toBeInTheDocument()
    expect(screen.getByText('How are you feeling?')).toBeInTheDocument()
    expect(screen.getByText('Low')).toBeInTheDocument()
    expect(screen.getByText('Medium')).toBeInTheDocument()
    expect(screen.getByText('High')).toBeInTheDocument()
  })

  it('advances to step 2 after selecting energy level', async () => {
    const user = userEvent.setup()
    render(<TaskSuggestionModal open={true} onClose={() => {}} onSelectTask={() => {}} />)

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
    render(<TaskSuggestionModal open={true} onClose={() => {}} onSelectTask={() => {}} />)

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

    render(<TaskSuggestionModal open={true} onClose={() => {}} onSelectTask={() => {}} />)

    await user.click(screen.getByText('Medium'))
    await user.click(screen.getByText('30m'))

    await waitFor(() => {
      expect(capturedParams.energy).toBe('medium')
      expect(capturedParams.time_window).toBe('30')
    })
  })

  it('renders recommendation titles and why lines', async () => {
    const user = userEvent.setup()

    render(<TaskSuggestionModal open={true} onClose={() => {}} onSelectTask={() => {}} />)

    await user.click(screen.getByText('High'))
    await user.click(screen.getByText('1h'))

    await waitFor(() => {
      expect(screen.getByText('Write unit tests')).toBeInTheDocument()
      expect(screen.getByText(/Fits your medium energy level well/)).toBeInTheDocument()
      expect(screen.getByText('Review PR')).toBeInTheDocument()
      expect(screen.getByText(/Quick win at 15 min/)).toBeInTheDocument()
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

    render(<TaskSuggestionModal open={true} onClose={() => {}} onSelectTask={() => {}} />)

    await user.click(screen.getByText('Low'))
    await user.click(screen.getByText('15m'))

    const status = screen.getByRole('status', { name: 'Loading suggestions' })
    expect(status).toBeInTheDocument()
    // sr-only text is in the DOM and accessible to assistive tech
    expect(screen.getByText('Finding your best tasks...')).toBeInTheDocument()
    // three skeleton placeholder cards are rendered (aria-hidden decorative shimmer)
    expect(status.querySelectorAll('[aria-hidden="true"]').length).toBe(3)
  })

  it('renders empty state when no suggestions returned', async () => {
    const user = userEvent.setup()

    server.use(
      http.get('/api/v1/recommendations/next', () =>
        HttpResponse.json({ items: [] })
      )
    )

    render(<TaskSuggestionModal open={true} onClose={() => {}} onSelectTask={() => {}} />)

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

    render(<TaskSuggestionModal open={true} onClose={() => {}} onSelectTask={() => {}} />)

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
    render(<TaskSuggestionModal open={true} onClose={() => {}} onSelectTask={() => {}} />)

    await user.click(screen.getByText('Low'))
    expect(screen.getByText('How big is your time window?')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByText('How are you feeling?')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<TaskSuggestionModal open={true} onClose={onClose} onSelectTask={() => {}} />)

    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('resets to step 1 when reopened', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<TaskSuggestionModal open={true} onClose={() => {}} onSelectTask={() => {}} />)

    await user.click(screen.getByText('High'))
    expect(screen.getByText('How big is your time window?')).toBeInTheDocument()

    rerender(<TaskSuggestionModal open={false} onClose={() => {}} onSelectTask={() => {}} />)
    rerender(<TaskSuggestionModal open={true} onClose={() => {}} onSelectTask={() => {}} />)

    expect(screen.getByText('How are you feeling?')).toBeInTheDocument()
  })

  describe('task selection', () => {
    it('renders a Start button for each recommendation', async () => {
      const user = userEvent.setup()
      render(<TaskSuggestionModal open={true} onClose={() => {}} onSelectTask={() => {}} />)

      await user.click(screen.getByText('Medium'))
      await user.click(screen.getByText('1h'))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Start Write unit tests' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Start Review PR' })).toBeInTheDocument()
      })
    })

    it('calls onSelectTask with the task id when Start is clicked', async () => {
      const user = userEvent.setup()
      const onSelectTask = vi.fn()
      render(<TaskSuggestionModal open={true} onClose={() => {}} onSelectTask={onSelectTask} />)

      await user.click(screen.getByText('High'))
      await user.click(screen.getByText('30m'))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Start Write unit tests' })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Start Write unit tests' }))

      expect(onSelectTask).toHaveBeenCalledOnce()
      expect(onSelectTask).toHaveBeenCalledWith('1')
    })

    it('calls onClose after selecting a task', async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      render(<TaskSuggestionModal open={true} onClose={onClose} onSelectTask={() => {}} />)

      await user.click(screen.getByText('Low'))
      await user.click(screen.getByText('15m'))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Start Write unit tests' })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Start Write unit tests' }))

      expect(onClose).toHaveBeenCalledOnce()
    })
  })

  describe('SUGGEST-002: richer why explanations and factor tolerance', () => {
    it('renders multi-sentence why strings in full without truncation', async () => {
      const user = userEvent.setup()

      render(<TaskSuggestionModal open={true} onClose={() => {}} onSelectTask={() => {}} />)

      await user.click(screen.getByText('Medium'))
      await user.click(screen.getByText('1h'))

      await waitFor(() => {
        expect(screen.getByText(
          'Fits your medium energy level well. Estimated 30 min — within your 1h window. Linked goal "Launch Product" is at risk; completing this task would meaningfully improve its health score.'
        )).toBeInTheDocument()
        expect(screen.getByText(
          'Quick win at 15 min — well under your available window. Low cognitive load makes it a great match for your current energy.'
        )).toBeInTheDocument()
      })
    })

    it('renders correctly when backend returns unrecognised factor keys', async () => {
      const user = userEvent.setup()

      server.use(
        http.get('/api/v1/recommendations/next', () =>
          HttpResponse.json({
            items: [
              {
                task: {
                  id: '99',
                  title: 'Future-proof task',
                  status: 'backlog',
                  sort_order: 1000,
                  tags: [],
                  project_id: null,
                  goal_id: null,
                  hard_due_at: null,
                  soft_due_at: null,
                  effort_minutes: 20,
                  created_at: '2023-01-01T00:00:00Z',
                  updated_at: '2023-01-01T00:00:00Z',
                },
                score: 0.85,
                factors: {
                  new_scoring_v2: 0.9,
                  goal_trajectory: 0.7,
                  unknown_future_field: 0.5,
                },
                why: 'Scored highly by the upgraded engine based on goal trajectory and energy alignment.',
              },
            ],
          })
        )
      )

      render(<TaskSuggestionModal open={true} onClose={() => {}} onSelectTask={() => {}} />)

      await user.click(screen.getByText('High'))
      await user.click(screen.getByText('30m'))

      await waitFor(() => {
        expect(screen.getByText('Future-proof task')).toBeInTheDocument()
        expect(screen.getByText(
          'Scored highly by the upgraded engine based on goal trajectory and energy alignment.'
        )).toBeInTheDocument()
      })
    })
  })
})
