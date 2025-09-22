import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../../../test/utils'
import userEvent from '@testing-library/user-event'
import GoalCard from '../GoalCard'
import type { Goal } from '../../../types'

const mockGoal: Goal = {
  id: '1',
  title: 'Test Goal',
  description: 'Test Description',
  type: 'annual',
  status: 'on_target',
  end_date: '2024-12-31T23:59:59Z',
  created_at: '2024-01-01T00:00:00Z'
}

describe('GoalCard', () => {
  const mockOnStatusChange = vi.fn()
  const mockOnEndDateChange = vi.fn()
  const mockOnClick = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders goal information correctly', () => {
    render(
      <GoalCard
        goal={mockGoal}
        onStatusChange={mockOnStatusChange}
        onEndDateChange={mockOnEndDateChange}
      />
    )

    expect(screen.getByText('Test Goal')).toBeInTheDocument()
    expect(screen.getByText('On Target')).toBeInTheDocument()
    expect(screen.getByText('Dec 31, 2024')).toBeInTheDocument()
    expect(screen.getByLabelText('Goal actions')).toBeInTheDocument()
  })

  it('shows selected state styling', () => {
    const { rerender } = render(
      <GoalCard
        goal={mockGoal}
        isSelected={false}
        onStatusChange={mockOnStatusChange}
        onEndDateChange={mockOnEndDateChange}
      />
    )

    const card = screen.getByText('Test Goal').closest('div')
    expect(card).not.toHaveClass('ring-2')

    rerender(
      <GoalCard
        goal={mockGoal}
        isSelected={true}
        onStatusChange={mockOnStatusChange}
        onEndDateChange={mockOnEndDateChange}
      />
    )

    expect(card).toHaveClass('ring-2', 'ring-blue-500')
  })

  it('calls onClick when card is clicked', async () => {
    const user = userEvent.setup()
    render(
      <GoalCard
        goal={mockGoal}
        onClick={mockOnClick}
        onStatusChange={mockOnStatusChange}
        onEndDateChange={mockOnEndDateChange}
      />
    )

    const card = screen.getByText('Test Goal').closest('div')
    await user.click(card!)

    expect(mockOnClick).toHaveBeenCalled()
  })

  it('handles status change correctly', async () => {
    const user = userEvent.setup()
    render(
      <GoalCard
        goal={mockGoal}
        onStatusChange={mockOnStatusChange}
        onEndDateChange={mockOnEndDateChange}
      />
    )

    const statusPill = screen.getByText('On Target')
    await user.click(statusPill)

    // Should show dropdown options
    await user.click(screen.getByText('At Risk'))

    expect(mockOnStatusChange).toHaveBeenCalledWith('1', 'at_risk')
  })
})