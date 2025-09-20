import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../../../test/utils'
import userEvent from '@testing-library/user-event'
import GoalActionsMenu from '../GoalActionsMenu'
import type { GoalNode } from '../../../types'

const mockGoal: GoalNode = {
  id: '1',
  title: 'Test Goal',
  description: 'Test Description',
  type: 'quarterly',
  status: 'on_target',
  end_date: '2024-12-31T23:59:59Z',
  created_at: '2024-01-01T00:00:00Z',
  children: []
}

const mockClosedGoal: GoalNode = {
  ...mockGoal,
  is_closed: true,
  closed_at: '2024-06-01T00:00:00Z'
}

describe('GoalActionsMenu', () => {
  const mockOnEdit = vi.fn()
  const mockOnClose = vi.fn()
  const mockOnReopen = vi.fn()
  const mockOnDelete = vi.fn()

  beforeEach(() => {
    mockOnEdit.mockClear()
    mockOnClose.mockClear()
    mockOnReopen.mockClear()
    mockOnDelete.mockClear()
  })

  it('renders menu button', () => {
    render(
      <GoalActionsMenu
        goal={mockGoal}
        onEdit={mockOnEdit}
        onClose={mockOnClose}
      />
    )

    expect(screen.getByLabelText('Goal actions')).toBeInTheDocument()
  })

  it('shows menu options when clicked', async () => {
    const user = userEvent.setup()
    render(
      <GoalActionsMenu
        goal={mockGoal}
        onEdit={mockOnEdit}
        onClose={mockOnClose}
      />
    )

    await user.click(screen.getByLabelText('Goal actions'))

    expect(screen.getByText('Edit')).toBeInTheDocument()
    expect(screen.getByText('Close Goal')).toBeInTheDocument()
  })

  it('calls onEdit when Edit is clicked', async () => {
    const user = userEvent.setup()
    render(
      <GoalActionsMenu
        goal={mockGoal}
        onEdit={mockOnEdit}
        onClose={mockOnClose}
      />
    )

    await user.click(screen.getByLabelText('Goal actions'))
    await user.click(screen.getByText('Edit'))

    expect(mockOnEdit).toHaveBeenCalled()
  })

  it('calls onClose when Close Goal is clicked', async () => {
    const user = userEvent.setup()
    render(
      <GoalActionsMenu
        goal={mockGoal}
        onEdit={mockOnEdit}
        onClose={mockOnClose}
      />
    )

    await user.click(screen.getByLabelText('Goal actions'))
    await user.click(screen.getByText('Close Goal'))

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('shows different options for closed goals', async () => {
    const user = userEvent.setup()
    render(
      <GoalActionsMenu
        goal={mockClosedGoal}
        onEdit={mockOnEdit}
        onClose={mockOnClose}
        onReopen={mockOnReopen}
      />
    )

    await user.click(screen.getByLabelText('Goal actions'))

    expect(screen.getByText('Reopen')).toBeInTheDocument()
    expect(screen.queryByText('Edit')).not.toBeInTheDocument()
    expect(screen.queryByText('Close Goal')).not.toBeInTheDocument()
  })

  it('calls onReopen when Reopen is clicked', async () => {
    const user = userEvent.setup()
    render(
      <GoalActionsMenu
        goal={mockClosedGoal}
        onEdit={mockOnEdit}
        onClose={mockOnClose}
        onReopen={mockOnReopen}
      />
    )

    await user.click(screen.getByLabelText('Goal actions'))
    await user.click(screen.getByText('Reopen'))

    expect(mockOnReopen).toHaveBeenCalled()
  })

  it('shows delete option when provided', async () => {
    const user = userEvent.setup()
    render(
      <GoalActionsMenu
        goal={mockGoal}
        onEdit={mockOnEdit}
        onClose={mockOnClose}
        onDelete={mockOnDelete}
      />
    )

    await user.click(screen.getByLabelText('Goal actions'))

    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('calls onDelete when Delete is clicked', async () => {
    const user = userEvent.setup()
    render(
      <GoalActionsMenu
        goal={mockGoal}
        onEdit={mockOnEdit}
        onClose={mockOnClose}
        onDelete={mockOnDelete}
      />
    )

    await user.click(screen.getByLabelText('Goal actions'))
    await user.click(screen.getByText('Delete'))

    expect(mockOnDelete).toHaveBeenCalled()
  })

  it('handles disabled state', () => {
    render(
      <GoalActionsMenu
        goal={mockGoal}
        onEdit={mockOnEdit}
        onClose={mockOnClose}
        disabled
      />
    )

    const button = screen.getByLabelText('Goal actions')
    expect(button).toBeDisabled()
    expect(button).toHaveClass('opacity-50', 'cursor-not-allowed')
  })

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup()
    render(
      <GoalActionsMenu
        goal={mockGoal}
        onEdit={mockOnEdit}
        onClose={mockOnClose}
      />
    )

    const button = screen.getByLabelText('Goal actions')
    button.focus()

    await user.keyboard('{Enter}')
    expect(screen.getByText('Edit')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByText('Edit')).not.toBeInTheDocument()
  })
})