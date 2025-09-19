import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../../test/utils'
import userEvent from '@testing-library/user-event'
import OptimisticTaskCard from '../OptimisticTaskCard'
import { Task } from '../../types'

// Mock the TaskEditor component
vi.mock('../TaskEditor', () => ({
  default: ({ isOpen, onSuccess, onClose }: any) => {
    if (!isOpen) return null
    return (
      <div role="dialog" aria-labelledby="task-editor-title">
        <h2 id="task-editor-title">Edit Task</h2>
        <label htmlFor="title">Title *</label>
        <input
          id="title"
          type="text"
          defaultValue="Test Optimistic Task"
          required
        />
        <button type="button" onClick={onClose}>Cancel</button>
        <button
          type="button"
          onClick={() => onSuccess({ id: 'new-task-id', title: 'Updated Task Title' })}
        >
          Update
        </button>
      </div>
    )
  }
}))

const createOptimisticTask = (state: 'syncing' | 'error' | 'ok' = 'syncing'): Task => ({
  id: 'temp_123',
  title: 'Test Optimistic Task',
  description: null,
  tags: [],
  status: 'week',
  sort_order: 1000,
  size: null,
  project_id: null,
  goal_id: null,
  hard_due_at: null,
  soft_due_at: null,
  effort_minutes: null,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  __optimistic: true,
  __state: state,
  __tempId: 'temp_123',
  __clientRequestId: 'client_123'
})

describe('OptimisticTaskCard', () => {
  const mockOnRetry = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    mockOnRetry.mockClear()
    mockOnCancel.mockClear()
  })

  it('renders nothing for non-optimistic tasks', () => {
    const regularTask: Task = {
      id: 'regular_123',
      title: 'Regular Task',
      description: null,
      tags: [],
      status: 'week',
      sort_order: 1000,
      size: null,
      project_id: null,
      goal_id: null,
      hard_due_at: null,
      soft_due_at: null,
      effort_minutes: null,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    }

    const { container } = render(
      <OptimisticTaskCard
        task={regularTask}
        onRetry={mockOnRetry}
        onCancel={mockOnCancel}
      />
    )

    expect(container.firstChild).toBeNull()
  })

  it('renders syncing state with loading indicator', () => {
    const syncingTask = createOptimisticTask('syncing')

    render(
      <OptimisticTaskCard
        task={syncingTask}
        onRetry={mockOnRetry}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText('Test Optimistic Task')).toBeInTheDocument()
    expect(screen.getByLabelText('Syncing task')).toBeInTheDocument()
    expect(screen.getByText('Syncing...')).toBeInTheDocument()

    // Should have blue styling for syncing state - check the outermost container
    const container = screen.getByText('Test Optimistic Task').closest('[class*="bg-white"]')
    expect(container).toHaveClass('border-blue-400', 'bg-blue-50/30')
  })

  it('renders error state with retry actions', () => {
    const errorTask = createOptimisticTask('error')

    render(
      <OptimisticTaskCard
        task={errorTask}
        onRetry={mockOnRetry}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText('Test Optimistic Task')).toBeInTheDocument()
    expect(screen.getByLabelText('Failed to sync task')).toBeInTheDocument()
    expect(screen.getByText('Failed to sync')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit & retry' })).toBeInTheDocument()

    // Should have red styling for error state - check the outermost container
    const container = screen.getByText('Test Optimistic Task').closest('[class*="bg-white"]')
    expect(container).toHaveClass('border-red-400', 'bg-red-50/30')

    // Title should have error text color
    const title = screen.getByText('Test Optimistic Task')
    expect(title).toHaveClass('text-red-800')
  })

  it('calls onRetry when retry button is clicked', async () => {
    const user = userEvent.setup()
    const errorTask = createOptimisticTask('error')

    render(
      <OptimisticTaskCard
        task={errorTask}
        onRetry={mockOnRetry}
        onCancel={mockOnCancel}
      />
    )

    const retryButton = screen.getByRole('button', { name: 'Retry' })
    await user.click(retryButton)

    expect(mockOnRetry).toHaveBeenCalledWith('temp_123')
  })

  it('opens TaskEditor when "Edit & retry" is clicked', async () => {
    const user = userEvent.setup()
    const errorTask = createOptimisticTask('error')

    render(
      <OptimisticTaskCard
        task={errorTask}
        onRetry={mockOnRetry}
        onCancel={mockOnCancel}
      />
    )

    const editRetryButton = screen.getByRole('button', { name: 'Edit & retry' })
    await user.click(editRetryButton)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Edit Task')).toBeInTheDocument()
    })
  })

  it('calls onCancel when TaskEditor succeeds after "Edit & retry"', async () => {
    const user = userEvent.setup()
    const errorTask = createOptimisticTask('error')

    render(
      <OptimisticTaskCard
        task={errorTask}
        onRetry={mockOnRetry}
        onCancel={mockOnCancel}
      />
    )

    const editRetryButton = screen.getByRole('button', { name: 'Edit & retry' })
    await user.click(editRetryButton)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // Click save (our mock handles the success automatically)
    const saveButton = screen.getByRole('button', { name: 'Update' })
    await user.click(saveButton)

    // Should call onCancel with tempId
    await waitFor(() => {
      expect(mockOnCancel).toHaveBeenCalledWith('temp_123')
    })
  })

  it('handles compact density correctly', () => {
    const syncingTask = createOptimisticTask('syncing')

    render(
      <OptimisticTaskCard
        task={syncingTask}
        onRetry={mockOnRetry}
        onCancel={mockOnCancel}
        density="compact"
      />
    )

    const container = screen.getByText('Test Optimistic Task').closest('[class*="bg-white"]')
    expect(container).toHaveClass('p-3', 'gap-2')
  })

  it('handles comfortable density correctly', () => {
    const syncingTask = createOptimisticTask('syncing')

    render(
      <OptimisticTaskCard
        task={syncingTask}
        onRetry={mockOnRetry}
        onCancel={mockOnCancel}
        density="comfortable"
      />
    )

    const container = screen.getByText('Test Optimistic Task').closest('[class*="bg-white"]')
    expect(container).toHaveClass('p-4', 'gap-3')
  })

  it('truncates long titles correctly', () => {
    const longTitle = 'This is a very long task title that should be truncated when displayed in the card component'
    const taskWithLongTitle = {
      ...createOptimisticTask('syncing'),
      title: longTitle
    }

    render(
      <OptimisticTaskCard
        task={taskWithLongTitle}
        onRetry={mockOnRetry}
        onCancel={mockOnCancel}
        density="compact"
      />
    )

    const titleElement = screen.getByText(longTitle)
    const computedStyle = window.getComputedStyle(titleElement)
    expect(computedStyle.display).toBe('-webkit-box')
    expect(computedStyle.webkitLineClamp).toBe('2') // compact density
  })

  it('provides proper accessibility labels', () => {
    const syncingTask = createOptimisticTask('syncing')

    render(
      <OptimisticTaskCard
        task={syncingTask}
        onRetry={mockOnRetry}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByLabelText('Syncing task')).toBeInTheDocument()

    // Test error state accessibility
    const errorTask = createOptimisticTask('error')
    const { rerender } = render(
      <OptimisticTaskCard
        task={errorTask}
        onRetry={mockOnRetry}
        onCancel={mockOnCancel}
      />
    )

    rerender(
      <OptimisticTaskCard
        task={errorTask}
        onRetry={mockOnRetry}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByLabelText('Failed to sync task')).toBeInTheDocument()
  })

  it('handles task without tempId gracefully', async () => {
    const user = userEvent.setup()
    const taskWithoutTempId = {
      ...createOptimisticTask('error'),
      __tempId: undefined
    }

    render(
      <OptimisticTaskCard
        task={taskWithoutTempId}
        onRetry={mockOnRetry}
        onCancel={mockOnCancel}
      />
    )

    const retryButton = screen.getByRole('button', { name: 'Retry' })
    await user.click(retryButton)

    // Should not call onRetry when tempId is undefined (looking at the component code)
    expect(mockOnRetry).not.toHaveBeenCalled()
  })
})