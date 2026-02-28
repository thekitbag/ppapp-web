import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '../../test/utils'
import userEvent from '@testing-library/user-event'
import TaskBoard from '../TaskBoard'
import { createTask } from '../../api/tasks'
import { Task } from '../../types'

// Mock the API
vi.mock('../../api/tasks', () => ({
  createTask: vi.fn(),
  listTasks: vi.fn(() => Promise.resolve([])),
  patchTask: vi.fn(),
  promoteTasksToWeek: vi.fn()
}))

vi.mock('../../api/projects', () => ({
  listProjects: vi.fn(() => Promise.resolve([]))
}))

vi.mock('../../api/goals', () => ({
  listGoals: vi.fn(() => Promise.resolve([]))
}))

vi.mock('../../api/recommendations', () => ({
  suggestWeek: vi.fn(() => Promise.resolve([]))
}))

// Mock uuid to get predictable IDs
vi.mock('uuid', () => ({
  v4: () => 'test-uuid-123'
}))

const mockCreateTask = vi.mocked(createTask)

describe.skip('TaskBoard Optimistic Creation Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('creates optimistic task instantly when Quick Add is used', async () => {
    const user = userEvent.setup()
    render(<TaskBoard />)

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('Task Board')).toBeInTheDocument()
    })

    // Find the Week column and Quick Add
    const weekColumn = screen.getByText('This Week').closest('div')
    expect(weekColumn).toBeInTheDocument()

    const addTaskButton = weekColumn?.querySelector('button[title*="Add task"]')
    expect(addTaskButton).toBeInTheDocument()

    // Click Quick Add button in Week column
    if (addTaskButton) {
      await user.click(addTaskButton)
    }

    // Should show input form
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Add task to This Week...')).toBeInTheDocument()
    })

    // Type task title and submit
    const input = screen.getByPlaceholderText('Add task to This Week...')
    await user.type(input, 'New optimistic task')
    await user.keyboard('{Enter}')

    // Task should appear immediately with syncing state
    await waitFor(() => {
      expect(screen.getByText('New optimistic task')).toBeInTheDocument()
      expect(screen.getByLabelText('Syncing task')).toBeInTheDocument()
    })

    // Verify the task appears at the top of the Week column
    const weekTasks = weekColumn?.querySelectorAll('[class*="bg-white"][class*="rounded-xl"]')
    const firstTask = weekTasks?.[0]
    expect(firstTask).toContainElement(screen.getByText('New optimistic task'))
  })

  it('reconciles optimistic task with server response on success', async () => {
    const user = userEvent.setup()

    const serverTask: Task = {
      id: 'server-123',
      title: 'New optimistic task',
      description: null,
      tags: [],
      status: 'week',
      sort_order: 1500,
      size: null,
      project_id: null,
      goal_id: null,
      hard_due_at: null,
      soft_due_at: null,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    }

    mockCreateTask.mockResolvedValueOnce(serverTask)

    render(<TaskBoard />)

    await waitFor(() => {
      expect(screen.getByText('Task Board')).toBeInTheDocument()
    })

    // Create optimistic task
    const weekColumn = screen.getByText('This Week').closest('div')
    const addTaskButton = weekColumn?.querySelector('button[title*="Add task"]')

    if (addTaskButton) {
      await user.click(addTaskButton)
    }

    const input = await screen.findByPlaceholderText('Add task to This Week...')
    await user.type(input, 'New optimistic task')
    await user.keyboard('{Enter}')

    // Should show syncing state initially
    await waitFor(() => {
      expect(screen.getByLabelText('Syncing task')).toBeInTheDocument()
    })

    // Let API call complete
    await vi.runAllTimersAsync()

    // Should reconcile and remove syncing indicator
    await waitFor(() => {
      expect(screen.getByText('New optimistic task')).toBeInTheDocument()
      expect(screen.queryByLabelText('Syncing task')).not.toBeInTheDocument()
    })

    // Verify API was called correctly
    expect(mockCreateTask).toHaveBeenCalledWith({
      title: 'New optimistic task',
      status: 'week',
      description: null,
      tags: [],
      project_id: null,
      goal_id: null,
      size: null,
      soft_due_at: null,
      hard_due_at: null,
      client_request_id: 'test-uuid-123',
      insert_at: 'top'
    })
  })

  it('shows error state and retry options when API fails', async () => {
    const user = userEvent.setup()

    mockCreateTask.mockRejectedValue(new Error('Network error'))

    render(<TaskBoard />)

    await waitFor(() => {
      expect(screen.getByText('Task Board')).toBeInTheDocument()
    })

    // Create optimistic task
    const weekColumn = screen.getByText('This Week').closest('div')
    const addTaskButton = weekColumn?.querySelector('button[title*="Add task"]')

    if (addTaskButton) {
      await user.click(addTaskButton)
    }

    const input = await screen.findByPlaceholderText('Add task to This Week...')
    await user.type(input, 'Failed task')
    await user.keyboard('{Enter}')

    // Should show syncing state initially
    await waitFor(() => {
      expect(screen.getByLabelText('Syncing task')).toBeInTheDocument()
    })

    // Let API call fail and retries exhaust
    await vi.runAllTimersAsync()

    // Should show error state
    await waitFor(() => {
      expect(screen.getByText('Failed task')).toBeInTheDocument()
      expect(screen.getByLabelText('Failed to sync task')).toBeInTheDocument()
      expect(screen.getByText('Failed to sync')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /edit & retry/i })).toBeInTheDocument()
    })
  })

  it('retries successfully when retry button is clicked', async () => {
    const user = userEvent.setup()

    mockCreateTask
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        id: 'server-123',
        title: 'Retry task',
        description: null,
        tags: [],
        status: 'week',
        sort_order: 1500,
        size: null,
        project_id: null,
        goal_id: null,
        hard_due_at: null,
        soft_due_at: null,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      } as Task)

    render(<TaskBoard />)

    await waitFor(() => {
      expect(screen.getByText('Task Board')).toBeInTheDocument()
    })

    // Create optimistic task that will fail
    const weekColumn = screen.getByText('This Week').closest('div')
    const addTaskButton = weekColumn?.querySelector('button[title*="Add task"]')

    if (addTaskButton) {
      await user.click(addTaskButton)
    }

    const input = await screen.findByPlaceholderText('Add task to This Week...')
    await user.type(input, 'Retry task')
    await user.keyboard('{Enter}')

    // Let initial attempt fail
    await vi.runAllTimersAsync()

    // Should show error state
    await waitFor(() => {
      expect(screen.getByText('Failed to sync')).toBeInTheDocument()
    })

    // Click retry button
    const retryButton = screen.getByRole('button', { name: /retry/i })
    await user.click(retryButton)

    // Should go back to syncing
    await waitFor(() => {
      expect(screen.getByLabelText('Syncing task')).toBeInTheDocument()
    })

    // Let retry succeed
    await vi.runAllTimersAsync()

    // Should reconcile successfully
    await waitFor(() => {
      expect(screen.getByText('Retry task')).toBeInTheDocument()
      expect(screen.queryByLabelText('Failed to sync task')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Syncing task')).not.toBeInTheDocument()
    })
  })

  it('opens TaskEditor when "Edit & retry" is clicked', async () => {
    const user = userEvent.setup()

    mockCreateTask.mockRejectedValue(new Error('Network error'))

    render(<TaskBoard />)

    await waitFor(() => {
      expect(screen.getByText('Task Board')).toBeInTheDocument()
    })

    // Create optimistic task that will fail
    const weekColumn = screen.getByText('This Week').closest('div')
    const addTaskButton = weekColumn?.querySelector('button[title*="Add task"]')

    if (addTaskButton) {
      await user.click(addTaskButton)
    }

    const input = await screen.findByPlaceholderText('Add task to This Week...')
    await user.type(input, 'Edit retry task')
    await user.keyboard('{Enter}')

    // Let initial attempt fail
    await vi.runAllTimersAsync()

    // Should show error state
    await waitFor(() => {
      expect(screen.getByText('Failed to sync')).toBeInTheDocument()
    })

    // Click "Edit & retry" button
    const editRetryButton = screen.getByRole('button', { name: /edit & retry/i })
    await user.click(editRetryButton)

    // Should open TaskEditor
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Edit Task')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Edit retry task')).toBeInTheDocument()
    })
  })

  it('works correctly across different bucket columns', async () => {
    const user = userEvent.setup()

    mockCreateTask.mockImplementation((input) =>
      Promise.resolve({
        id: `server-${input.status}`,
        title: input.title,
        description: null,
        tags: [],
        status: input.status,
        sort_order: 1500,
        size: null,
        project_id: null,
        goal_id: null,
        hard_due_at: null,
        soft_due_at: null,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      } as Task)
    )

    render(<TaskBoard />)

    await waitFor(() => {
      expect(screen.getByText('Task Board')).toBeInTheDocument()
    })

    // Test different columns
    const columns = [
      { name: 'Backlog', status: 'backlog' },
      { name: 'This Week', status: 'week' },
      { name: 'Today', status: 'today' },
      { name: 'Doing', status: 'doing' }
    ]

    for (const column of columns) {
      const columnElement = screen.getByText(column.name).closest('div')
      const addTaskButton = columnElement?.querySelector('button[title*="Add task"]')

      if (addTaskButton) {
        await user.click(addTaskButton)
      }

      const placeholder = column.name === 'This Week' ? 'This Week' : column.name
      const input = await screen.findByPlaceholderText(`Add task to ${placeholder}...`)
      await user.type(input, `Task for ${column.name}`)
      await user.keyboard('{Enter}')

      // Should appear with syncing state
      await waitFor(() => {
        expect(screen.getByText(`Task for ${column.name}`)).toBeInTheDocument()
      })
    }

    // Let all API calls complete
    await vi.runAllTimersAsync()

    // All tasks should be reconciled
    await waitFor(() => {
      expect(screen.queryAllByLabelText('Syncing task')).toHaveLength(0)
    })

    // Verify API was called for each column
    expect(mockCreateTask).toHaveBeenCalledTimes(4)
    columns.forEach((column) => {
      expect(mockCreateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          status: column.status,
          title: `Task for ${column.name}`
        })
      )
    })
  })

  it('maintains task position at top of column through full lifecycle', async () => {
    const user = userEvent.setup()

    // Mock existing tasks in the column
    const existingTasks = [
      {
        id: 'existing-1',
        title: 'Existing Task 1',
        status: 'week',
        sort_order: 2000,
        tags: [],
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      },
      {
        id: 'existing-2',
        title: 'Existing Task 2',
        status: 'week',
        sort_order: 3000,
        tags: [],
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      }
    ]

    // Mock listTasks to return existing tasks
    const mockListTasks = vi.fn(() => Promise.resolve(existingTasks))
    vi.doMock('../../api/tasks', () => ({
      createTask: mockCreateTask,
      listTasks: mockListTasks,
      patchTask: vi.fn(),
      promoteTasksToWeek: vi.fn()
    }))

    mockCreateTask.mockResolvedValueOnce({
      id: 'server-123',
      title: 'New top task',
      description: null,
      tags: [],
      status: 'week',
      sort_order: 1500, // Server assigns different sort order
      size: null,
      project_id: null,
      goal_id: null,
      hard_due_at: null,
      soft_due_at: null,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    } as Task)

    render(<TaskBoard />)

    await waitFor(() => {
      expect(screen.getByText('Existing Task 1')).toBeInTheDocument()
      expect(screen.getByText('Existing Task 2')).toBeInTheDocument()
    })

    // Create optimistic task
    const weekColumn = screen.getByText('This Week').closest('div')
    const addTaskButton = weekColumn?.querySelector('button[title*="Add task"]')

    if (addTaskButton) {
      await user.click(addTaskButton)
    }

    const input = await screen.findByPlaceholderText('Add task to This Week...')
    await user.type(input, 'New top task')
    await user.keyboard('{Enter}')

    // Should appear at top immediately
    await waitFor(() => {
      const weekTasks = weekColumn?.querySelectorAll('[class*="bg-white"][class*="rounded-xl"]')
      const firstTask = weekTasks?.[0]
      expect(firstTask).toContainElement(screen.getByText('New top task'))
    })

    // Let API complete
    await vi.runAllTimersAsync()

    // Should still be at top after reconciliation
    await waitFor(() => {
      const weekTasks = weekColumn?.querySelectorAll('[class*="bg-white"][class*="rounded-xl"]')
      const firstTask = weekTasks?.[0]
      expect(firstTask).toContainElement(screen.getByText('New top task'))
      expect(screen.queryByLabelText('Syncing task')).not.toBeInTheDocument()
    })
  })
})