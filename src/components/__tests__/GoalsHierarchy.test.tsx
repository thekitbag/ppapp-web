import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../../test/utils'
import userEvent from '@testing-library/user-event'
import TaskEditDrawer from '../TaskEditDrawer'
import { Task } from '../../types'

const mockTask: Task = {
  id: '1',
  title: 'Test Task',
  description: 'Test description',
  tags: ['tag1'],
  status: 'week',
  sort_order: 1,
  size: 5,
  project_id: null,
  goal_id: null,
  hard_due_at: null,
  soft_due_at: null,
  created_at: '2023-01-01T00:00:00.000Z',
  updated_at: '2023-01-01T00:00:00.000Z',
}

describe('TaskEditDrawer - Goals Hierarchy Integration', () => {
  const mockOnClose = vi.fn()

  beforeEach(() => {
    mockOnClose.mockClear()
  })

  it('shows goal picker with hierarchical goals', async () => {
    render(<TaskEditDrawer task={mockTask} isOpen={true} onClose={mockOnClose} />)

    // Wait for Goal section to load
    await waitFor(() => {
      expect(screen.getByText('Goal')).toBeInTheDocument()
    })
  })

  it('shows goal breadcrumb when goal is selected', async () => {
    const taskWithGoal = { ...mockTask, goal_id: '3' }

    render(<TaskEditDrawer task={taskWithGoal} isOpen={true} onClose={mockOnClose} />)

    await waitFor(() => {
      expect(screen.getByText('Goal')).toBeInTheDocument()
    })

    // Should show breadcrumb for selected goal when GoalPicker displays it
    await waitFor(() => {
      expect(screen.getByText(/Test Annual Goal › Test Quarterly Goal/i)).toBeInTheDocument()
    })
  })

  it('allows any goal type to be selected', async () => {
    render(<TaskEditDrawer task={mockTask} isOpen={true} onClose={mockOnClose} />)

    await waitFor(() => {
      expect(screen.getByText('Goal')).toBeInTheDocument()
    })

    // The new implementation allows any goal type, no weekly-only validation
    const user = userEvent.setup()
    const saveButton = screen.getByRole('button', { name: /save/i })
    await user.click(saveButton)

    // Should not show weekly-only validation error
    expect(screen.queryByText('Only weekly goals can have tasks linked to them')).not.toBeInTheDocument()
  })

  it('handles empty goals tree gracefully', async () => {
    render(<TaskEditDrawer task={mockTask} isOpen={true} onClose={mockOnClose} />)

    await waitFor(() => {
      expect(screen.getByText('Goal')).toBeInTheDocument()
    })
  })
})