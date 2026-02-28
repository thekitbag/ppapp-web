import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../../test/utils'
import userEvent from '@testing-library/user-event'
import TaskEditDrawer from '../TaskEditDrawer'
import { Task, type GoalNode } from '../../types'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/mocks/server'
import { getGoalsTree } from '../../api/goals'

// vi.mock('../../api/projects') // Removed
vi.mock('../../api/goals')

const mockProjects = [
  { id: '1', name: 'Test Project', color: '#000000' }
]

const mockGoalsTree: GoalNode[] = [
  {
    id: '1',
    title: 'Test Annual Goal',
    type: 'annual',
    status: 'on_target',
    created_at: '2023-01-01T00:00:00.000Z',
    children: []
  }
]

const mockTask: Task = {
  id: '1',
  title: 'Test Task',
  description: 'Test description',
  tags: ['tag1', 'tag2'],
  status: 'week',
  sort_order: 1,
  size: 5,
  project_id: '1',
  goal_id: '1',
  hard_due_at: '2023-12-25T23:59:00.000Z',
  soft_due_at: '2023-12-31T23:59:00.000Z',
  created_at: '2023-01-01T00:00:00.000Z',
  updated_at: '2023-01-01T00:00:00.000Z',
}

describe('TaskEditDrawer', () => {
  const mockOnClose = vi.fn()

  beforeEach(() => {
    mockOnClose.mockClear()
    // vi.mocked(listProjects)... // Removed
    vi.mocked(getGoalsTree).mockResolvedValue(mockGoalsTree)
    
    // Override MSW handler for projects
    server.use(
      http.get('/api/v1/projects', () => {
        return HttpResponse.json(mockProjects)
      })
    )
  })

  it('renders when open', () => {
    render(<TaskEditDrawer task={mockTask} isOpen={true} onClose={mockOnClose} />)
    
    expect(screen.getByRole('dialog', { name: /edit task/i })).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test Task')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<TaskEditDrawer task={mockTask} isOpen={false} onClose={mockOnClose} />)
    
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('populates form with task data', () => {
    render(<TaskEditDrawer task={mockTask} isOpen={true} onClose={mockOnClose} />)
    
    expect(screen.getByDisplayValue('Test Task')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test description')).toBeInTheDocument()
    expect(screen.getByDisplayValue('tag1, tag2')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /size/i })).toHaveValue('5')
  })

  it('shows hard deadline toggle when task has hard deadline', () => {
    render(<TaskEditDrawer task={mockTask} isOpen={true} onClose={mockOnClose} />)
    
    const hardDeadlineToggle = screen.getByRole('checkbox', { name: /make this a hard deadline/i })
    expect(hardDeadlineToggle).toBeChecked()
  })

  it.skip('shows projects and goals are available through GoalPicker', async () => {
    render(<TaskEditDrawer task={mockTask} isOpen={true} onClose={mockOnClose} />)

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument()
    })

    // Goal section should be present
    await waitFor(() => {
      expect(screen.getByText('Goal')).toBeInTheDocument()
    })
  })

  it('closes when close button is clicked', async () => {
    const user = userEvent.setup()
    render(<TaskEditDrawer task={mockTask} isOpen={true} onClose={mockOnClose} />)
    
    const closeButton = screen.getByRole('button', { name: /close dialog/i })
    await user.click(closeButton)
    
    expect(mockOnClose).toHaveBeenCalledOnce()
  })

  it('closes when cancel button is clicked', async () => {
    const user = userEvent.setup()
    render(<TaskEditDrawer task={mockTask} isOpen={true} onClose={mockOnClose} />)
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)
    
    expect(mockOnClose).toHaveBeenCalledOnce()
  })

  it('closes when escape key is pressed', async () => {
    const user = userEvent.setup()
    render(<TaskEditDrawer task={mockTask} isOpen={true} onClose={mockOnClose} />)
    
    await user.keyboard('{Escape}')
    
    expect(mockOnClose).toHaveBeenCalledOnce()
  })

  it('validates required title field', async () => {
    const user = userEvent.setup()
    render(<TaskEditDrawer task={mockTask} isOpen={true} onClose={mockOnClose} />)
    
    const titleInput = screen.getByLabelText(/title/i)
    const saveButton = screen.getByRole('button', { name: /save/i })
    
    await user.clear(titleInput)
    await user.click(saveButton)
    
    expect(screen.getByText('Title is required')).toBeInTheDocument()
    expect(mockOnClose).not.toHaveBeenCalled()
  })

  it('validates hard deadline date requirement', async () => {
    const user = userEvent.setup()
    render(<TaskEditDrawer task={mockTask} isOpen={true} onClose={mockOnClose} />)
    
    const dateInput = screen.getByLabelText(/due date/i)
    const saveButton = screen.getByRole('button', { name: /save/i })
    
    // Clear date but keep hard deadline checked
    await user.clear(dateInput)
    await user.click(saveButton)
    
    expect(screen.getByText('Date is required when marked as hard deadline')).toBeInTheDocument()
  })

  it('validates past hard deadline', async () => {
    const user = userEvent.setup()
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 1)
    const pastDateString = pastDate.toISOString().slice(0, 16)
    
    render(<TaskEditDrawer task={mockTask} isOpen={true} onClose={mockOnClose} />)
    
    const dateInput = screen.getByLabelText(/due date/i)
    const hardDeadlineToggle = screen.getByRole('checkbox', { name: /make this a hard deadline/i })
    const saveButton = screen.getByRole('button', { name: /save/i })
    
    await user.clear(dateInput)
    await user.type(dateInput, pastDateString)
    await user.click(hardDeadlineToggle) // Uncheck and recheck to trigger validation
    await user.click(hardDeadlineToggle)
    await user.click(saveButton)
    
    expect(screen.getByText('Hard deadline cannot be in the past')).toBeInTheDocument()
  })

  it('sets hard deadline when toggle is enabled', async () => {
    const user = userEvent.setup()
    const taskWithoutHard: Task = { ...mockTask, hard_due_at: null }
    
    render(<TaskEditDrawer task={taskWithoutHard} isOpen={true} onClose={mockOnClose} />)
    
    const toggle = screen.getByRole('checkbox', { name: /make this a hard deadline/i })
    expect(toggle).not.toBeChecked()
    
    await user.click(toggle)
    expect(toggle).toBeChecked()
  })

  it('focuses first input when opened', () => {
    render(<TaskEditDrawer task={mockTask} isOpen={true} onClose={mockOnClose} />)
    
    const titleInput = screen.getByLabelText(/title/i)
    expect(titleInput).toHaveFocus()
  })

  it('parses tags correctly from comma-separated string', () => {
    render(<TaskEditDrawer task={mockTask} isOpen={true} onClose={mockOnClose} />)
    
    expect(screen.getByDisplayValue('tag1, tag2')).toBeInTheDocument()
  })

  it('handles task with no tags', () => {
    const taskWithoutTags: Task = { ...mockTask, tags: [] }
    render(<TaskEditDrawer task={taskWithoutTags} isOpen={true} onClose={mockOnClose} />)
    
    const tagsInput = screen.getByLabelText(/tags/i)
    expect(tagsInput).toHaveValue('')
  })

  it('handles task with no description', () => {
    const taskWithoutDescription: Task = { ...mockTask, description: null }
    render(<TaskEditDrawer task={taskWithoutDescription} isOpen={true} onClose={mockOnClose} />)
    
    const descriptionInput = screen.getByLabelText(/description/i)
    expect(descriptionInput).toHaveValue('')
  })

  it('formats dates correctly for datetime-local inputs', () => {
    render(<TaskEditDrawer task={mockTask} isOpen={true} onClose={mockOnClose} />)
    
    const dateInput = screen.getByLabelText(/due date/i)
    // Should format ISO date to datetime-local format (YYYY-MM-DDTHH:mm)
    expect(dateInput).toHaveValue('2023-12-31T23:59')
  })

  it('clears validation errors when form values change', async () => {
    const user = userEvent.setup()
    render(<TaskEditDrawer task={mockTask} isOpen={true} onClose={mockOnClose} />)
    
    const titleInput = screen.getByLabelText(/title/i)
    const saveButton = screen.getByRole('button', { name: /save/i })
    
    // Create validation error
    await user.clear(titleInput)
    await user.click(saveButton)
    expect(screen.getByText('Title is required')).toBeInTheDocument()
    
    // Fix the error
    await user.type(titleInput, 'New title')
    expect(screen.queryByText('Title is required')).not.toBeInTheDocument()
  })
})
