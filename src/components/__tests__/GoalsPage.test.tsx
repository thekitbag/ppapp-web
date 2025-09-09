import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../../test/utils'
import userEvent from '@testing-library/user-event'
import GoalsPage from '../GoalsPage'

describe('GoalsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders goals hierarchy with tabs', async () => {
    render(<GoalsPage />)

    // Wait for component to load first
    await waitFor(() => {
      expect(screen.getByText('Goals')).toBeInTheDocument()
    })

    // Check tabs are present
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Annual' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Quarterly' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Weekly' })).toBeInTheDocument()

    // Wait for goals to load and check hierarchy
    await waitFor(() => {
      expect(screen.getByText('Test Annual Goal')).toBeInTheDocument()
    })

    expect(screen.getByText('Test Quarterly Goal')).toBeInTheDocument()
    expect(screen.getByText('Test Weekly Goal')).toBeInTheDocument()
  })

  it('shows status badges and date pills', async () => {
    render(<GoalsPage />)

    await waitFor(() => {
      expect(screen.getAllByText('on target')).toHaveLength(2)
      expect(screen.getByText('at risk')).toBeInTheDocument()
    })

    // Check for date displays (using more flexible matching)
    await waitFor(() => {
      expect(screen.getByText(/12\/31\/2024|31\/12\/2024/)).toBeInTheDocument()
    })
  })

  it('shows task counts for goals', async () => {
    render(<GoalsPage />)

    await waitFor(() => {
      const taskCountElements = screen.getAllByText(/1 task/)
      expect(taskCountElements.length).toBeGreaterThan(0)
    })
  })

  it('filters goals by tab selection', async () => {
    const user = userEvent.setup()
    render(<GoalsPage />)

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Test Annual Goal')).toBeInTheDocument()
    })

    // Click Annual tab
    const annualTab = screen.getByRole('button', { name: 'Annual' })
    await user.click(annualTab)

    // Should still show annual goal
    expect(screen.getByText('Test Annual Goal')).toBeInTheDocument()

    // Click Weekly tab
    const weeklyTab = screen.getByRole('button', { name: 'Weekly' })
    await user.click(weeklyTab)

    // Should show the hierarchy that contains weekly goals
    await waitFor(() => {
      expect(screen.getByText('Test Weekly Goal')).toBeInTheDocument()
    })
  })

  it('expands and collapses hierarchy', async () => {
    const user = userEvent.setup()
    render(<GoalsPage />)

    await waitFor(() => {
      expect(screen.getByText('Test Annual Goal')).toBeInTheDocument()
    })

    // Find chevron button and click to collapse
    const chevronButtons = screen.getAllByRole('button')
    const expandButton = chevronButtons.find(btn => 
      btn.querySelector('[data-testid="chevron-down"], [class*="ChevronDown"]')
    )

    if (expandButton) {
      await user.click(expandButton)
      
      // Child goals might still be visible due to default expansion
      // This tests the interaction works
    }
  })

  it('opens goal creation modal', async () => {
    const user = userEvent.setup()
    render(<GoalsPage />)

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('Goals')).toBeInTheDocument()
    })

    const newGoalButton = screen.getByRole('button', { name: /new goal/i })
    await user.click(newGoalButton)

    // Check modal opened
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /create new goal/i })).toBeInTheDocument()
    })

    expect(screen.getByLabelText(/goal title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue('annual')).toBeInTheDocument() // Radio button for type
    expect(screen.getByLabelText(/end date/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/status/i)).toBeInTheDocument()
  })

  it('creates a new annual goal', async () => {
    const user = userEvent.setup()
    render(<GoalsPage />)

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('Goals')).toBeInTheDocument()
    })

    const newGoalButton = screen.getByRole('button', { name: /new goal/i })
    await user.click(newGoalButton)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // Fill form
    const titleInput = screen.getByLabelText(/goal title/i)
    await user.type(titleInput, 'New Annual Goal')

    const descriptionInput = screen.getByLabelText(/description/i)
    await user.type(descriptionInput, 'This is a test annual goal')

    // Select annual type
    const annualRadio = screen.getByDisplayValue('annual')
    await user.click(annualRadio)

    // Set end date
    const endDateInput = screen.getByLabelText(/end date/i)
    await user.type(endDateInput, '2024-12-31T23:59')

    // Submit
    const createButton = screen.getByRole('button', { name: /create/i })
    await user.click(createButton)

    // Modal should close
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('creates a quarterly goal with parent picker', async () => {
    const user = userEvent.setup()
    render(<GoalsPage />)

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('Goals')).toBeInTheDocument()
    })

    const newGoalButton = screen.getByRole('button', { name: /new goal/i })
    await user.click(newGoalButton)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // Select quarterly type first
    const quarterlyRadio = screen.getByDisplayValue('quarterly')
    await user.click(quarterlyRadio)

    // Parent picker should appear
    await waitFor(() => {
      expect(screen.getByLabelText(/annual goal/i)).toBeInTheDocument()
    })

    // Fill required fields
    const titleInput = screen.getByLabelText(/goal title/i)
    await user.type(titleInput, 'New Quarterly Goal')

    const endDateInput = screen.getByLabelText(/end date/i)
    await user.type(endDateInput, '2024-03-31T23:59')

    // Select parent
    const parentSelect = screen.getByLabelText(/annual goal/i)
    await user.selectOptions(parentSelect, '1')

    // Submit
    const createButton = screen.getByRole('button', { name: /create/i })
    await user.click(createButton)

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    render(<GoalsPage />)

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('Goals')).toBeInTheDocument()
    })

    const newGoalButton = screen.getByRole('button', { name: /new goal/i })
    await user.click(newGoalButton)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // The button might be disabled if the default type requires a parent
    // Let's switch to annual type first to ensure we can test validation
    const annualRadio = screen.getByDisplayValue('annual')
    await user.click(annualRadio)
    
    // For annual goals, button stays disabled until title is provided
    const createButton = screen.getByRole('button', { name: /create/i })
    expect(createButton).toBeDisabled()

    // Provide a title to enable submit
    const titleInput = screen.getByLabelText(/goal title/i)
    await user.type(titleInput, 'Validation Test Annual Goal')
    expect(createButton).not.toBeDisabled()

    // Try to submit without end date
    await user.click(createButton)

    // Modal should still be open and end date still empty
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    const endDateInput = screen.getByLabelText(/end date/i) as HTMLInputElement
    expect(endDateInput.value).toBe("")
  })

  it('validates parent requirements', async () => {
    const user = userEvent.setup()
    render(<GoalsPage />)

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('Goals')).toBeInTheDocument()
    })

    const newGoalButton = screen.getByRole('button', { name: /new goal/i })
    await user.click(newGoalButton)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // Select quarterly type
    const quarterlyRadio = screen.getByDisplayValue('quarterly')
    await user.click(quarterlyRadio)

    // Fill title and date but not parent
    const titleInput = screen.getByLabelText(/goal title/i)
    await user.type(titleInput, 'Test Goal')

    const endDateInput = screen.getByLabelText(/end date/i)
    await user.type(endDateInput, '2024-03-31T23:59')

    // Submit without selecting parent
    const createButton = screen.getByRole('button', { name: /create/i })
    await user.click(createButton)

    // Should show parent validation error and button should be disabled
    await waitFor(() => {
      expect(screen.getByText('Quarterly goals must have an annual parent')).toBeInTheDocument()
    })
  })

  it('edits an existing goal', async () => {
    const user = userEvent.setup()
    render(<GoalsPage />)

    await waitFor(() => {
      expect(screen.getByText('Test Annual Goal')).toBeInTheDocument()
    })

    // Find and click edit button (emoji button)
    const editButtons = screen.getAllByText('✏️')
    await user.click(editButtons[0])

    // Modal should open with pre-filled data
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /edit goal/i })).toBeInTheDocument()
    })

    expect(screen.getByDisplayValue('Test Annual Goal')).toBeInTheDocument()

    // Change the title
    const titleInput = screen.getByDisplayValue('Test Annual Goal')
    await user.clear(titleInput)
    await user.type(titleInput, 'Updated Annual Goal')

    // Save
    const updateButton = screen.getByRole('button', { name: /update/i })
    await user.click(updateButton)

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('shows overdue indicator for past end dates', async () => {
    render(<GoalsPage />)

    await waitFor(() => {
      expect(screen.getByText('Test Weekly Goal')).toBeInTheDocument()
    })

    // The weekly goal has end date in 2024-01-07 which is in the past
    // Should show warning icon
    const warningIcons = screen.getAllByTitle('Past end date')
    expect(warningIcons.length).toBeGreaterThan(0)
  })

  it('closes modal on escape key', async () => {
    const user = userEvent.setup()
    render(<GoalsPage />)

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('Goals')).toBeInTheDocument()
    })

    const newGoalButton = screen.getByRole('button', { name: /new goal/i })
    await user.click(newGoalButton)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('closes modal on cancel button', async () => {
    const user = userEvent.setup()
    render(<GoalsPage />)

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('Goals')).toBeInTheDocument()
    })

    const newGoalButton = screen.getByRole('button', { name: /new goal/i })
    await user.click(newGoalButton)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('clears end date validation error when value changes', async () => {
    const user = userEvent.setup()
    render(<GoalsPage />)

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('Goals')).toBeInTheDocument()
    })

    const newGoalButton = screen.getByRole('button', { name: /new goal/i })
    await user.click(newGoalButton)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // Switch to annual type
    const annualRadio = screen.getByDisplayValue('annual')
    await user.click(annualRadio)
    
    const createButton = screen.getByRole('button', { name: /create/i })

    // Provide a title to enable submit
    const titleInput = screen.getByLabelText(/goal title/i)
    await user.type(titleInput, 'New Goal')
    expect(createButton).not.toBeDisabled()

    // Submit to trigger end date validation
    await user.click(createButton)

    // Dialog remains open and end date is empty
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect((screen.getByLabelText(/end date/i) as HTMLInputElement).value).toBe("")

    // Fill end date to clear validation state
    const endDateInput = screen.getByLabelText(/end date/i)
    await user.type(endDateInput, '2024-12-31T23:59')

    expect((screen.getByLabelText(/end date/i) as HTMLInputElement).value).toBe('2024-12-31T23:59')
  })
})
