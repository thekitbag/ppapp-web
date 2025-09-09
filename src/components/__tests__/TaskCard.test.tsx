import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../../test/utils'
import userEvent from '@testing-library/user-event'

// Mock the TaskEditDrawer component to avoid complex dialog testing
vi.mock('../TaskEditDrawer', () => ({
  default: ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => 
    isOpen ? (
      <div data-testid="task-edit-drawer">
        <button onClick={onClose}>Close Drawer</button>
      </div>
    ) : null
}))

// Import TaskBoard to get access to the TaskCard component
import TaskBoard from '../TaskBoard'

describe('TaskCard Quick Edit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders task title as clickable for editing', async () => {
    render(<TaskBoard />)
    
    // Wait for tasks to load
    await waitFor(() => {
      const taskTitle = screen.getByText('Test Task 1')
      expect(taskTitle).toBeInTheDocument()
      expect(taskTitle).toHaveAttribute('title', 'Click to edit title')
    })
  })

  it('shows edit and archive buttons on task cards', async () => {
    render(<TaskBoard />)
    
    await waitFor(() => {
      const editButtons = screen.getAllByTitle('Edit task')
      const archiveButtons = screen.getAllByTitle('Archive task')
      
      expect(editButtons.length).toBeGreaterThan(0)
      expect(archiveButtons.length).toBeGreaterThan(0)
    })
  })

  it('opens edit drawer when edit button is clicked', async () => {
    const user = userEvent.setup()
    render(<TaskBoard />)
    
    await waitFor(() => {
      expect(screen.getAllByTitle('Edit task').length).toBeGreaterThan(0)
    })
    
    const editButtons = screen.getAllByTitle('Edit task')
    await user.click(editButtons[0])
    
    expect(screen.getByTestId('task-edit-drawer')).toBeInTheDocument()
  })

  it('enters quick edit mode when title is clicked', async () => {
    const user = userEvent.setup()
    render(<TaskBoard />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Task 1')).toBeInTheDocument()
    })
    
    const taskTitle = screen.getByText('Test Task 1')
    await user.click(taskTitle)
    
    // Should show input field and save/cancel buttons
    expect(screen.getByDisplayValue('Test Task 1')).toBeInTheDocument()
    expect(screen.getByTitle('Save changes')).toBeInTheDocument()
    expect(screen.getByTitle('Cancel editing')).toBeInTheDocument()
  })

  it('saves quick edit changes when Enter is pressed', async () => {
    const user = userEvent.setup()
    render(<TaskBoard />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Task 1')).toBeInTheDocument()
    })
    
    const taskTitle = screen.getByText('Test Task 1')
    await user.click(taskTitle)
    
    const titleInput = screen.getByDisplayValue('Test Task 1')
    await user.clear(titleInput)
    await user.type(titleInput, 'Updated Task Title')
    await user.keyboard('{Enter}')
    
    // Input should disappear and go back to display mode
    await waitFor(() => {
      expect(screen.queryByDisplayValue('Updated Task Title')).not.toBeInTheDocument()
    })
  })

  it('cancels quick edit when Escape is pressed', async () => {
    const user = userEvent.setup()
    render(<TaskBoard />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Task 1')).toBeInTheDocument()
    })
    
    const taskTitle = screen.getByText('Test Task 1')
    await user.click(taskTitle)
    
    const titleInput = screen.getByDisplayValue('Test Task 1')
    await user.clear(titleInput)
    await user.type(titleInput, 'Temporary Change')
    await user.keyboard('{Escape}')
    
    // Should revert to original title
    await waitFor(() => {
      expect(screen.getByText('Test Task 1')).toBeInTheDocument()
    })
  })

  it('shows date editing in quick edit mode', async () => {
    const user = userEvent.setup()
    render(<TaskBoard />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Task 1')).toBeInTheDocument()
    })
    
    const taskTitle = screen.getByText('Test Task 1')
    await user.click(taskTitle)
    
    // Should show datetime input
    expect(screen.getByPlaceholderText('Set due date')).toBeInTheDocument()
  })

  it('shows hard deadline checkbox when date is set', async () => {
    const user = userEvent.setup()
    render(<TaskBoard />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Task 1')).toBeInTheDocument()
    })
    
    const taskTitle = screen.getByText('Test Task 1')
    await user.click(taskTitle)
    
    // Set a date first
    const dateInput = screen.getByPlaceholderText('Set due date')
    await user.type(dateInput, '2023-12-31T23:59')
    
    // Now checkbox should appear
    await waitFor(() => {
      const hardDeadlineCheckbox = screen.getByLabelText(/hard deadline/i)
      expect(hardDeadlineCheckbox).toBeInTheDocument()
      expect(hardDeadlineCheckbox).not.toBeChecked()
    })
  })

  it('saves changes when save button is clicked', async () => {
    const user = userEvent.setup()
    render(<TaskBoard />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Task 1')).toBeInTheDocument()
    })
    
    const taskTitle = screen.getByText('Test Task 1')
    await user.click(taskTitle)
    
    const titleInput = screen.getByDisplayValue('Test Task 1')
    await user.clear(titleInput)
    await user.type(titleInput, 'Updated Title')
    
    const saveButton = screen.getByTitle('Save changes')
    await user.click(saveButton)
    
    // Should exit edit mode
    await waitFor(() => {
      expect(screen.queryByDisplayValue('Updated Title')).not.toBeInTheDocument()
    })
  })
})