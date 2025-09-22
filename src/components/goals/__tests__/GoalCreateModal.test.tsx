import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../../../test/utils'
import userEvent from '@testing-library/user-event'
import GoalCreateModal from '../GoalCreateModal'

describe('GoalCreateModal', () => {
  const mockOnClose = vi.fn()
  const mockOnSubmit = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders when open', () => {
    render(
      <GoalCreateModal
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        defaultType="annual"
      />
    )

    expect(screen.getByText('Create Annual Goal')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /title/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /description/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/end date/i)).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /status/i })).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(
      <GoalCreateModal
        open={false}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        defaultType="annual"
      />
    )

    expect(screen.queryByText('Create Annual Goal')).not.toBeInTheDocument()
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    render(
      <GoalCreateModal
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        defaultType="quarterly"
      />
    )

    // Submit button should be disabled when title is empty
    const submitButton = screen.getByRole('button', { name: /create goal/i })
    expect(submitButton).toBeDisabled()

    // Fill in title but leave end date empty
    await user.type(screen.getByRole('textbox', { name: /title/i }), 'Test Goal')

    // Submit button should now be enabled
    expect(submitButton).not.toBeDisabled()

    // Try to submit without end date
    await user.click(submitButton)

    // Should show end date validation error
    expect(screen.getByText('End date is required')).toBeInTheDocument()

    // Should not call onSubmit
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('submits valid form data', async () => {
    const user = userEvent.setup()
    render(
      <GoalCreateModal
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        defaultType="weekly"
        parentId="parent-123"
      />
    )

    // Fill out the form
    await user.type(screen.getByRole('textbox', { name: /title/i }), 'Test Goal')
    await user.type(screen.getByRole('textbox', { name: /description/i }), 'Test Description')
    await user.type(screen.getByLabelText(/end date/i), '2024-12-31T23:59')

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /create goal/i })
    await user.click(submitButton)

    // Should call onSubmit with correct data
    expect(mockOnSubmit).toHaveBeenCalledWith({
      title: 'Test Goal',
      description: 'Test Description',
      type: 'weekly',
      parent_goal_id: 'parent-123',
      end_date: expect.stringContaining('2024-12-31'),
      status: 'on_target'
    })
  })

  it('closes when cancel button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <GoalCreateModal
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        defaultType="annual"
      />
    )

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('closes when X button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <GoalCreateModal
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        defaultType="annual"
      />
    )

    // Click the X button (close button)
    const closeButton = screen.getByRole('button', { name: '' }) // X icon has no text
    await user.click(closeButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('populates form fields when editing an existing goal', () => {
    const editGoal = {
      id: 'goal-1',
      title: 'Edit Me',
      description: 'Original description',
      type: 'quarterly' as const,
      status: 'at_risk' as const,
      end_date: '2024-06-15T10:30:00Z',
      created_at: '2024-01-01T00:00:00Z'
    }

    render(
      <GoalCreateModal
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        editGoal={editGoal}
      />
    )

    // Should show "Edit" in title
    expect(screen.getByText('Edit Quarterly Goal')).toBeInTheDocument()

    // Should populate form fields
    expect(screen.getByDisplayValue('Edit Me')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Original description')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2024-06-15T10:30')).toBeInTheDocument()

    // Check the select value
    const statusSelect = screen.getByRole('combobox', { name: /status/i })
    expect(statusSelect).toHaveValue('at_risk')

    // Button should say "Save Changes"
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
  })
})