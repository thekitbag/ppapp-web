import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../../test/utils'
import userEvent from '@testing-library/user-event'
import SuggestWeekModal from '../SuggestWeekModal'
import type { Task } from '../../types'

const mockTasks: Task[] = [
  {
    id: '1',
    title: 'High Priority Task',
    status: 'backlog',
    sort_order: 1000,
    tags: ['urgent', 'frontend'],
    project_id: null,
    goal_id: null,
    hard_due_at: '2023-12-31T23:59:59Z',
    soft_due_at: null,
    effort_minutes: 30,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
  {
    id: '2',
    title: 'Quick Task',
    status: 'backlog',
    sort_order: 2000,
    tags: [],
    project_id: '1',
    goal_id: null,
    hard_due_at: null,
    soft_due_at: '2023-12-25T23:59:59Z',
    effort_minutes: 15,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
  {
    id: '3',
    title: 'No Deadline Task',
    status: 'backlog',
    sort_order: 3000,
    tags: ['backend'],
    project_id: null,
    goal_id: '1',
    hard_due_at: null,
    soft_due_at: null,
    effort_minutes: null,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
]

describe('SuggestWeekModal', () => {
  const mockOnClose = vi.fn()
  const mockOnConfirm = vi.fn()

  beforeEach(() => {
    mockOnClose.mockClear()
    mockOnConfirm.mockClear()
  })

  it('does not render when open is false', () => {
    render(
      <SuggestWeekModal
        open={false}
        tasks={mockTasks}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders modal when open is true', () => {
    render(
      <SuggestWeekModal
        open={true}
        tasks={mockTasks}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Suggest Tasks for Week')).toBeInTheDocument()
  })

  it('displays loading state', () => {
    render(
      <SuggestWeekModal
        open={true}
        tasks={[]}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        isLoading={true}
      />
    )

    expect(screen.getByText('Finding your best tasks for this week...')).toBeInTheDocument()
  })

  it('displays empty state when no tasks provided', () => {
    render(
      <SuggestWeekModal
        open={true}
        tasks={[]}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        isLoading={false}
      />
    )

    expect(screen.getByText('No recommended tasks found')).toBeInTheDocument()
  })

  it('renders all tasks with correct information', () => {
    render(
      <SuggestWeekModal
        open={true}
        tasks={mockTasks}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    )

    expect(screen.getByText('High Priority Task')).toBeInTheDocument()
    expect(screen.getByText('Quick Task')).toBeInTheDocument()
    expect(screen.getByText('No Deadline Task')).toBeInTheDocument()

    // Check effort minutes display
    expect(screen.getByText(/30min/)).toBeInTheDocument()
    expect(screen.getByText(/15min/)).toBeInTheDocument()

    // Check tags display
    expect(screen.getByText('urgent')).toBeInTheDocument()
    expect(screen.getByText('frontend')).toBeInTheDocument()
    expect(screen.getByText('backend')).toBeInTheDocument()

    // Check deadline display
    expect(screen.getByText(/31 Dec/)).toBeInTheDocument() // hard deadline
    expect(screen.getByText(/25 Dec/)).toBeInTheDocument() // soft deadline
    expect(screen.getByText(/\(hard\)/)).toBeInTheDocument()
    expect(screen.getByText(/\(soft\)/)).toBeInTheDocument()
  })

  it('handles task selection correctly', async () => {
    const user = userEvent.setup()
    render(
      <SuggestWeekModal
        open={true}
        tasks={mockTasks}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    )

    const checkbox1 = screen.getByLabelText('Select High Priority Task')
    const checkbox2 = screen.getByLabelText('Select Quick Task')

    expect(checkbox1).not.toBeChecked()
    expect(checkbox2).not.toBeChecked()

    await user.click(checkbox1)
    expect(checkbox1).toBeChecked()
    expect(screen.getByText('1 task selected')).toBeInTheDocument()

    await user.click(checkbox2)
    expect(checkbox2).toBeChecked()
    expect(screen.getByText('2 tasks selected')).toBeInTheDocument()

    await user.click(checkbox1)
    expect(checkbox1).not.toBeChecked()
    expect(screen.getByText('1 task selected')).toBeInTheDocument()
  })

  it('updates confirm button text with selection count', async () => {
    const user = userEvent.setup()
    render(
      <SuggestWeekModal
        open={true}
        tasks={mockTasks}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    )

    const confirmButton = screen.getByText(/Move to Week/)
    const checkbox = screen.getByLabelText('Select High Priority Task')

    expect(confirmButton).toHaveTextContent('Move to Week (0)')
    expect(confirmButton).toBeDisabled()

    await user.click(checkbox)
    expect(confirmButton).toHaveTextContent('Move to Week (1)')
    expect(confirmButton).not.toBeDisabled()
  })

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <SuggestWeekModal
        open={true}
        tasks={mockTasks}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    )

    const closeButton = screen.getByLabelText('Close')
    await user.click(closeButton)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when cancel button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <SuggestWeekModal
        open={true}
        tasks={mockTasks}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    )

    const cancelButton = screen.getByText('Cancel')
    await user.click(cancelButton)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('calls onConfirm with selected task IDs', async () => {
    const user = userEvent.setup()
    render(
      <SuggestWeekModal
        open={true}
        tasks={mockTasks}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    )

    const checkbox1 = screen.getByLabelText('Select High Priority Task')
    const checkbox3 = screen.getByLabelText('Select No Deadline Task')
    const confirmButton = screen.getByText(/Move to Week/)

    await user.click(checkbox1)
    await user.click(checkbox3)
    await user.click(confirmButton)

    expect(mockOnConfirm).toHaveBeenCalledWith(['1', '3'])
  })

  it('resets selections when modal reopens', async () => {
    const { rerender } = render(
      <SuggestWeekModal
        open={false}
        tasks={mockTasks}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    )

    // Open modal and select a task
    rerender(
      <SuggestWeekModal
        open={true}
        tasks={mockTasks}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    )

    const checkbox = screen.getByLabelText('Select High Priority Task')
    const user = userEvent.setup()
    await user.click(checkbox)
    expect(checkbox).toBeChecked()

    // Close and reopen modal
    rerender(
      <SuggestWeekModal
        open={false}
        tasks={mockTasks}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    )
    rerender(
      <SuggestWeekModal
        open={true}
        tasks={mockTasks}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    )

    const newCheckbox = screen.getByLabelText('Select High Priority Task')
    expect(newCheckbox).not.toBeChecked()
  })

  it('handles tasks without effort minutes, deadlines, or tags gracefully', () => {
    const minimalTask: Task = {
      id: '4',
      title: 'Minimal Task',
      status: 'backlog',
      sort_order: 4000,
      tags: [],
      project_id: null,
      goal_id: null,
      hard_due_at: null,
      soft_due_at: null,
      effort_minutes: null,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    }

    render(
      <SuggestWeekModal
        open={true}
        tasks={[minimalTask]}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    )

    expect(screen.getByText('Minimal Task')).toBeInTheDocument()
    expect(screen.queryByText(/min/)).not.toBeInTheDocument()
    expect(screen.queryByText(/(hard|soft)/)).not.toBeInTheDocument()
  })

  it('formats dates correctly', () => {
    const taskWithDate: Task = {
      id: '5',
      title: 'Task with specific date',
      status: 'backlog',
      sort_order: 5000,
      tags: [],
      project_id: null,
      goal_id: null,
      hard_due_at: '2023-06-15T10:30:00Z',
      soft_due_at: '2023-03-22T14:45:00Z',
      effort_minutes: null,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    }

    render(
      <SuggestWeekModal
        open={true}
        tasks={[taskWithDate]}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    )

    expect(screen.getByText(/15 Jun/)).toBeInTheDocument()
    expect(screen.getByText(/22 Mar/)).toBeInTheDocument()
  })
})