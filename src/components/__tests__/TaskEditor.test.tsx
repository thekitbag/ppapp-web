import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../../test/utils'
import userEvent from '@testing-library/user-event'
import TaskEditor from '../TaskEditor'

describe('TaskEditor', () => {
  const mockOnClose = vi.fn()
  const mockOnSuccess = vi.fn()

  beforeEach(() => {
    mockOnClose.mockClear()
    mockOnSuccess.mockClear()
  })

  it('renders when open for creating new task', () => {
    render(<TaskEditor isOpen={true} onClose={mockOnClose} />)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Create New Task')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<TaskEditor isOpen={false} onClose={mockOnClose} />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('includes all bucket options including today', () => {
    render(<TaskEditor isOpen={true} onClose={mockOnClose} />)

    const bucketSelect = screen.getByLabelText(/bucket/i)
    expect(bucketSelect).toBeInTheDocument()

    // Check that all bucket options are available
    expect(screen.getByRole('option', { name: 'Backlog' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'This Week' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Today' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Doing' })).toBeInTheDocument()
  })

  it('allows selecting today bucket', async () => {
    const user = userEvent.setup()
    render(<TaskEditor isOpen={true} onClose={mockOnClose} defaultStatus="today" />)

    const bucketSelect = screen.getByLabelText(/bucket/i)
    expect(bucketSelect).toHaveValue('today')
  })

  it('uses GoalPicker for goal selection', async () => {
    render(<TaskEditor isOpen={true} onClose={mockOnClose} />)

    await waitFor(() => {
      expect(screen.getByText('Select a goal...')).toBeInTheDocument()
    })
  })

  it('disables save button when title is empty', async () => {
    const user = userEvent.setup()
    render(<TaskEditor isOpen={true} onClose={mockOnClose} />)

    // Check that save button is disabled when title is empty
    const saveButton = screen.getByRole('button', { name: /create/i })
    expect(saveButton).toBeDisabled()

    // Add a title and check that the button becomes enabled
    const titleInput = screen.getByLabelText(/title/i)
    await user.type(titleInput, 'Test task')

    await waitFor(() => {
      expect(saveButton).toBeEnabled()
    })
  })

  it('creates task with today status when selected', async () => {
    const user = userEvent.setup()
    render(<TaskEditor isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} defaultStatus="today" />)

    const titleInput = screen.getByLabelText(/title/i)
    await user.type(titleInput, 'Test task for today')

    const saveButton = screen.getByRole('button', { name: /create/i })
    await user.click(saveButton)

    // The task should be created successfully
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled()
    })
  })

  it('closes when close button is clicked', async () => {
    const user = userEvent.setup()
    render(<TaskEditor isOpen={true} onClose={mockOnClose} />)

    const closeButton = screen.getByRole('button', { name: /close dialog/i })
    await user.click(closeButton)

    expect(mockOnClose).toHaveBeenCalledOnce()
  })

  it('closes when cancel button is clicked', async () => {
    const user = userEvent.setup()
    render(<TaskEditor isOpen={true} onClose={mockOnClose} />)

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)

    expect(mockOnClose).toHaveBeenCalledOnce()
  })
})