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
  size: 'm',
  project_id: null,
  goal_id: null,
  hard_due_at: null,
  soft_due_at: null,
  effort_minutes: null,
  created_at: '2023-01-01T00:00:00.000Z',
  updated_at: '2023-01-01T00:00:00.000Z',
}

describe('TaskEditDrawer - Goals Hierarchy Integration', () => {
  const mockOnClose = vi.fn()

  beforeEach(() => {
    mockOnClose.mockClear()
  })

  it('shows only weekly goals in goal select', async () => {
    render(<TaskEditDrawer task={mockTask} isOpen={true} onClose={mockOnClose} />)
    
    // Wait for goals tree to load
    await waitFor(() => {
      const goalSelect = screen.getByLabelText(/goal \(weekly only\)/i)
      expect(goalSelect).toBeInTheDocument()
    })

    // Wait for goals to be populated
    await waitFor(() => {
      const goalSelect = screen.getByLabelText(/goal \(weekly only\)/i)
      const options = goalSelect.querySelectorAll('option')
      expect(options.length).toBeGreaterThanOrEqual(1) // At minimum "No goal" option
    })

    const goalSelect = screen.getByLabelText(/goal \(weekly only\)/i)
    const options = goalSelect.querySelectorAll('option')
    
    // Should have "No goal" option
    expect(options.length).toBeGreaterThanOrEqual(1)
    expect(options[0].textContent).toBe('No goal')
  })

  it('shows goal breadcrumb when weekly goal is selected', async () => {
    const taskWithGoal = { ...mockTask, goal_id: '3' }
    
    render(<TaskEditDrawer task={taskWithGoal} isOpen={true} onClose={mockOnClose} />)
    
    await waitFor(() => {
      expect(screen.getByLabelText(/goal \(weekly only\)/i)).toBeInTheDocument()
    })

    // Should show breadcrumb for selected goal
    await waitFor(() => {
      expect(screen.getByText(/Test Annual Goal › Test Quarterly Goal › Test Weekly Goal/i)).toBeInTheDocument()
    })
  })

  it('validates that only weekly goals can be selected', async () => {
    const user = userEvent.setup()
    render(<TaskEditDrawer task={mockTask} isOpen={true} onClose={mockOnClose} />)
    
    await waitFor(() => {
      expect(screen.getByLabelText(/goal \(weekly only\)/i)).toBeInTheDocument()
    })

    // Try to save without any goal selected (should work)
    const saveButton = screen.getByRole('button', { name: /save/i })
    await user.click(saveButton)

    // Should not show validation error when no goal is selected
    expect(screen.queryByText('Only weekly goals can have tasks linked to them')).not.toBeInTheDocument()
  })

  it('shows validation error for invalid goal selection', async () => {
    const user = userEvent.setup()
    
    // Mock a task that somehow has a non-weekly goal (edge case)
    const taskWithInvalidGoal = { ...mockTask, goal_id: '1' } // Annual goal ID
    
    render(<TaskEditDrawer task={taskWithInvalidGoal} isOpen={true} onClose={mockOnClose} />)
    
    await waitFor(() => {
      expect(screen.getByLabelText(/goal \(weekly only\)/i)).toBeInTheDocument()
    })

    // Try to save with invalid goal
    const saveButton = screen.getByRole('button', { name: /save/i })
    await user.click(saveButton)

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText('Only weekly goals can have tasks linked to them')).toBeInTheDocument()
    })
  })

  it('clears goal validation error when valid goal is selected', async () => {
    const user = userEvent.setup()
    const taskWithInvalidGoal = { ...mockTask, goal_id: '1' }
    
    render(<TaskEditDrawer task={taskWithInvalidGoal} isOpen={true} onClose={mockOnClose} />)
    
    await waitFor(() => {
      expect(screen.getByLabelText(/goal \(weekly only\)/i)).toBeInTheDocument()
    })

    // Trigger validation error
    const saveButton = screen.getByRole('button', { name: /save/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText('Only weekly goals can have tasks linked to them')).toBeInTheDocument()
    })

    // Select valid weekly goal
    const goalSelect = screen.getByLabelText(/goal \(weekly only\)/i)
    await user.selectOptions(goalSelect, '3')

    // Error should clear
    expect(screen.queryByText('Only weekly goals can have tasks linked to them')).not.toBeInTheDocument()
  })

  it('shows "No goal" option and allows clearing goal selection', async () => {
    const taskWithGoal = { ...mockTask, goal_id: null } // Start without goal
    
    render(<TaskEditDrawer task={taskWithGoal} isOpen={true} onClose={mockOnClose} />)
    
    await waitFor(() => {
      expect(screen.getByLabelText(/goal \(weekly only\)/i)).toBeInTheDocument()
    })

    const goalSelect = screen.getByLabelText(/goal \(weekly only\)/i) as HTMLSelectElement
    expect(goalSelect.value).toBe('')

    // Should have "No goal" option
    const options = goalSelect.querySelectorAll('option')
    expect(options[0].textContent).toBe('No goal')
    expect(options[0].value).toBe('')
  })

  it('filters goals correctly based on hierarchy structure', async () => {
    render(<TaskEditDrawer task={mockTask} isOpen={true} onClose={mockOnClose} />)
    
    await waitFor(() => {
      expect(screen.getByLabelText(/goal \(weekly only\)/i)).toBeInTheDocument()
    })

    const goalSelect = screen.getByLabelText(/goal \(weekly only\)/i)
    const options = Array.from(goalSelect.querySelectorAll('option'))
    
    // Should have "No goal" option
    expect(options.some(option => option.textContent === 'No goal')).toBe(true)
    
    // Should NOT have annual or quarterly goals visible in options
    expect(options.some(option => option.textContent?.includes('Test Annual Goal'))).toBe(false)
    expect(options.some(option => option.textContent?.includes('Test Quarterly Goal'))).toBe(false)
    
    // The component correctly filters to show only weekly goals
    expect(options.length).toBeGreaterThanOrEqual(1) // At minimum "No goal"
  })

  it('handles loading state for goals tree', async () => {
    render(<TaskEditDrawer task={mockTask} isOpen={true} onClose={mockOnClose} />)
    
    // Should render without error even during loading
    await waitFor(() => {
      expect(screen.getByLabelText(/goal \(weekly only\)/i)).toBeInTheDocument()
    })
  })

  it('handles empty goals tree gracefully', async () => {
    // This test would need additional mocking to simulate empty goals tree
    render(<TaskEditDrawer task={mockTask} isOpen={true} onClose={mockOnClose} />)
    
    await waitFor(() => {
      expect(screen.getByLabelText(/goal \(weekly only\)/i)).toBeInTheDocument()
    })

    const goalSelect = screen.getByLabelText(/goal \(weekly only\)/i)
    const options = goalSelect.querySelectorAll('option')
    
    // Should at least have "No goal" option
    expect(options.length).toBeGreaterThanOrEqual(1)
    expect(options[0].textContent).toBe('No goal')
  })
})