import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../../../test/utils'
import userEvent from '@testing-library/user-event'
import ClosedGoalsList from '../ClosedGoalsList'
import type { Goal } from '../../../types'

const mockClosedGoals: Goal[] = [
  {
    id: '1',
    title: 'Closed Annual Goal',
    description: 'Description for closed goal',
    type: 'annual',
    status: 'off_target',
    end_date: '2024-12-31T23:59:59Z',
    is_closed: true,
    closed_at: '2024-06-01T12:00:00Z',
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    title: 'Another Closed Goal',
    description: null,
    type: 'quarterly',
    status: 'at_risk',
    end_date: '2024-09-30T23:59:59Z',
    is_closed: true,
    closed_at: '2024-05-15T14:30:00Z',
    created_at: '2024-04-01T00:00:00Z'
  }
]

describe('ClosedGoalsList', () => {
  const mockOnReopen = vi.fn()
  const mockOnEdit = vi.fn()
  const mockOnDelete = vi.fn()

  beforeEach(() => {
    mockOnReopen.mockClear()
    mockOnEdit.mockClear()
    mockOnDelete.mockClear()
  })

  it('renders empty state when no goals', () => {
    render(
      <ClosedGoalsList
        goals={[]}
        onReopen={mockOnReopen}
      />
    )

    expect(screen.getByText('No closed goals yet')).toBeInTheDocument()
    expect(screen.getByText('Closed goals will appear here when you archive them.')).toBeInTheDocument()
  })

  it('renders loading state', () => {
    render(
      <ClosedGoalsList
        goals={[]}
        onReopen={mockOnReopen}
        isLoading={true}
      />
    )

    expect(screen.getByText('Loading closed goals...')).toBeInTheDocument()
  })

  it('renders list of closed goals', () => {
    render(
      <ClosedGoalsList
        goals={mockClosedGoals}
        onReopen={mockOnReopen}
      />
    )

    expect(screen.getByText('Closed Annual Goal')).toBeInTheDocument()
    expect(screen.getByText('Another Closed Goal')).toBeInTheDocument()
  })

  it('displays goal metadata correctly', () => {
    render(
      <ClosedGoalsList
        goals={mockClosedGoals}
        onReopen={mockOnReopen}
      />
    )

    // Check type badges
    expect(screen.getByText('annual')).toBeInTheDocument()
    expect(screen.getByText('quarterly')).toBeInTheDocument()

    // Check status pills (they display as proper case in the component)
    expect(screen.getByText('Off Target')).toBeInTheDocument()
    expect(screen.getByText('At Risk')).toBeInTheDocument()

    // Check closed dates (showing formatted dates, not necessarily "ago")
    expect(screen.getByText('Jun 1, 2024')).toBeInTheDocument()
    expect(screen.getByText('May 15, 2024')).toBeInTheDocument()
  })

  it('shows reopen buttons for all goals', () => {
    render(
      <ClosedGoalsList
        goals={mockClosedGoals}
        onReopen={mockOnReopen}
      />
    )

    const reopenButtons = screen.getAllByText('Reopen')
    expect(reopenButtons).toHaveLength(2)
  })

  it('calls onReopen when reopen button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <ClosedGoalsList
        goals={mockClosedGoals}
        onReopen={mockOnReopen}
      />
    )

    const reopenButtons = screen.getAllByText('Reopen')
    await user.click(reopenButtons[0])

    expect(mockOnReopen).toHaveBeenCalledWith(mockClosedGoals[0])
  })

  it('shows action menu when edit/delete handlers provided', () => {
    render(
      <ClosedGoalsList
        goals={mockClosedGoals}
        onReopen={mockOnReopen}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    )

    const actionMenus = screen.getAllByLabelText('Goal actions')
    expect(actionMenus).toHaveLength(2)
  })

  it('formats relative dates correctly', () => {
    const recentGoal: Goal = {
      ...mockClosedGoals[0],
      closed_at: new Date().toISOString() // Today
    }

    render(
      <ClosedGoalsList
        goals={[recentGoal]}
        onReopen={mockOnReopen}
      />
    )

    expect(screen.getByText('Today')).toBeInTheDocument()
  })

  it('handles goals with descriptions', () => {
    render(
      <ClosedGoalsList
        goals={mockClosedGoals}
        onReopen={mockOnReopen}
      />
    )

    expect(screen.getByText('Description for closed goal')).toBeInTheDocument()
  })
})