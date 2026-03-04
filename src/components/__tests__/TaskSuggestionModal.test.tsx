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

  describe('SUGGEST-004: compatibility hardening', () => {
    it('renders a single-item result and Start action works', async () => {
      const user = userEvent.setup()
      const onSelectTask = vi.fn()

      server.use(
        http.get('/api/v1/recommendations/next', () =>
          HttpResponse.json({ items: [mockItems[0]] })
        )
      )

      render(<TaskSuggestionModal open={true} onClose={() => {}} onSelectTask={onSelectTask} />)

      await user.click(screen.getByText('High'))
      await user.click(screen.getByText('1h'))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Start Write unit tests' })).toBeInTheDocument()
        expect(screen.getAllByRole('button', { name: /^Start / })).toHaveLength(1)
      })

      await user.click(screen.getByRole('button', { name: 'Start Write unit tests' }))
      expect(onSelectTask).toHaveBeenCalledWith('1')
    })

    it('renders long narrative why text without truncation', async () => {
      const user = userEvent.setup()
      const longWhy =
        'This is a very long explanation that exceeds 250 characters. It describes in detail why this task is important for the user, taking into account their current energy level, available time, and the strategic importance of the linked goals. Completing this task will have a meaningful impact on the overall project trajectory and should be prioritized accordingly over other pending items.'

      server.use(
        http.get('/api/v1/recommendations/next', () =>
          HttpResponse.json({
            items: [{ ...mockItems[0], why: longWhy }],
          })
        )
      )

      render(<TaskSuggestionModal open={true} onClose={() => {}} onSelectTask={() => {}} />)

      await user.click(screen.getByText('Medium'))
      await user.click(screen.getByText('30m'))

      await waitFor(() => {
        const whyEl = screen.getByText(longWhy)
        expect(whyEl).toBeInTheDocument()
        expect(whyEl).not.toHaveClass('truncate')
        expect(whyEl.closest('[class*="truncate"]')).toBeNull()
        expect(whyEl.closest('[class*="line-clamp"]')).toBeNull()
      })
    })

    it('renders fallback-style algorithmic why payload without conditional branching', async () => {
      const user = userEvent.setup()

      server.use(
        http.get('/api/v1/recommendations/next', () =>
          HttpResponse.json({
            items: [
              {
                task: {
                  id: '10',
                  title: 'Update docs',
                  status: 'backlog',
                  sort_order: 100,
                  tags: [],
                  project_id: null,
                  goal_id: null,
                  hard_due_at: null,
                  soft_due_at: null,
                  effort_minutes: 20,
                  created_at: '2023-01-01T00:00:00Z',
                  updated_at: '2023-01-01T00:00:00Z',
                },
                score: 72.0,
                factors: { goal_status_off_target: 1 },
                why: 'High priority. Due soon.',
              },
            ],
          })
        )
      )

      render(<TaskSuggestionModal open={true} onClose={() => {}} onSelectTask={() => {}} />)

      await user.click(screen.getByText('Low'))
      await user.click(screen.getByText('15m'))

      await waitFor(() => {
        expect(screen.getByText('Update docs')).toBeInTheDocument()
        expect(screen.getByText('High priority. Due soon.')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Start Update docs' })).toBeInTheDocument()
      })
    })

    it('retry calls same API params and successful results render', async () => {
      const user = userEvent.setup()
      let callCount = 0
      const capturedParams: { energy: string; time_window: string }[] = []

      server.use(
        http.get('/api/v1/recommendations/next', ({ request }) => {
          const url = new URL(request.url)
          callCount++
          capturedParams.push({
            energy: url.searchParams.get('energy') ?? '',
            time_window: url.searchParams.get('time_window') ?? '',
          })
          if (callCount === 1) {
            return HttpResponse.json({ detail: 'Error' }, { status: 500 })
          }
          return HttpResponse.json({ items: mockItems })
        })
      )

      render(<TaskSuggestionModal open={true} onClose={() => {}} onSelectTask={() => {}} />)

      await user.click(screen.getByText('Medium'))
      await user.click(screen.getByText('30m'))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Retry' }))

      await waitFor(() => {
        expect(callCount).toBe(2)
        expect(capturedParams[1].energy).toBe('medium')
        expect(capturedParams[1].time_window).toBe('30')
        expect(screen.getByText('Write unit tests')).toBeInTheDocument()
      })
    })

    it('shows Thinking strategically... text while loading recommendations', async () => {
      const user = userEvent.setup()

      server.use(
        http.get('/api/v1/recommendations/next', async () => {
          await new Promise(() => {})
          return HttpResponse.json({ items: mockItems })
        })
      )

      render(<TaskSuggestionModal open={true} onClose={() => {}} onSelectTask={() => {}} />)

      await user.click(screen.getByText('Low'))
      await user.click(screen.getByText('15m'))

      const status = screen.getByRole('status', { name: 'Loading suggestions' })
      expect(status).toBeInTheDocument()
      expect(screen.getByText('Thinking strategically...')).toBeInTheDocument()
    })

    it('Thinking strategically... text disappears once results render', async () => {
      const user = userEvent.setup()

      render(<TaskSuggestionModal open={true} onClose={() => {}} onSelectTask={() => {}} />)

      await user.click(screen.getByText('High'))
      await user.click(screen.getByText('1h'))

      await waitFor(() => {
        expect(screen.getByText('Write unit tests')).toBeInTheDocument()
        expect(screen.queryByText('Thinking strategically...')).not.toBeInTheDocument()
      })
    })

    it('energy → time → results step flow works with unchanged API params', async () => {
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

      expect(screen.getByText('How are you feeling?')).toBeInTheDocument()
      await user.click(screen.getByText('High'))

      expect(screen.getByText('How big is your time window?')).toBeInTheDocument()
      await user.click(screen.getByText('2h'))

      await waitFor(() => {
        expect(capturedParams.energy).toBe('high')
        expect(capturedParams.time_window).toBe('120')
        expect(screen.getByText('Write unit tests')).toBeInTheDocument()
      })
    })
  })
})
