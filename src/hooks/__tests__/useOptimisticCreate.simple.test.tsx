import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook as originalRenderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { createTask } from '../../api/tasks'
import { useOptimisticCreate } from '../useOptimisticCreate'
import { Task, TaskStatus } from '../../types'

// Mock the API
vi.mock('../../api/tasks', () => ({
  createTask: vi.fn()
}))

// Mock uuid to return predictable values
let uuidCounter = 0
vi.mock('uuid', () => ({
  v4: () => `test-uuid-${++uuidCounter}`
}))

const mockCreateTask = vi.mocked(createTask)

describe('useOptimisticCreate - Basic Functionality', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    uuidCounter = 0
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )


  const filters = { statuses: ['backlog', 'week', 'today', 'doing'] as TaskStatus[] }

  it('exposes the expected API methods', () => {
    const { result } = originalRenderHook(() => useOptimisticCreate(), { wrapper })

    expect(typeof result.current.quickAdd).toBe('function')
    expect(typeof result.current.retry).toBe('function')
    expect(typeof result.current.cancel).toBe('function')
    expect(typeof result.current.getTaskState).toBe('function')
    expect(typeof result.current.isTaskSyncing).toBe('function')
    expect(typeof result.current.isTaskError).toBe('function')
  })

  it('creates optimistic task and inserts into cache', () => {
    const { result } = originalRenderHook(() => useOptimisticCreate(), { wrapper })

    queryClient.setQueryData(['tasks', 'filtered', filters], [])

    act(() => {
      result.current.quickAdd('week', 'New Task', filters)
    })

    const cachedTasks = queryClient.getQueryData(['tasks', 'filtered', filters]) as Task[]
    expect(cachedTasks).toHaveLength(1)

    const optimisticTask = cachedTasks[0]
    expect(optimisticTask.title).toBe('New Task')
    expect(optimisticTask.status).toBe('week')
    expect(optimisticTask.__optimistic).toBe(true)
    expect(optimisticTask.__state).toBe('syncing')
    expect(optimisticTask.id).toMatch(/^temp_/)
  })

  it('computes correct sort order for top insertion', () => {
    const { result } = originalRenderHook(() => useOptimisticCreate(), { wrapper })

    const existingTasks: Task[] = [
      {
        id: 'existing-1',
        title: 'Existing Task',
        description: null,
        tags: [],
        status: 'week',
        sort_order: 2000,
        size: null,
        project_id: null,
        goal_id: null,
        hard_due_at: null,
        soft_due_at: null,
        effort_minutes: null,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      }
    ]

    queryClient.setQueryData(['tasks', 'filtered', filters], existingTasks)

    act(() => {
      result.current.quickAdd('week', 'New Task', filters)
    })

    const cachedTasks = queryClient.getQueryData(['tasks', 'filtered', filters]) as Task[]
    const optimisticTask = cachedTasks.find(t => t.__optimistic)

    expect(optimisticTask?.sort_order).toBe(1999) // midpoint(undefined, 2000) = 2000 - 1 = 1999

    // Verify sorted order
    const sortedTasks = cachedTasks.sort((a, b) => a.sort_order - b.sort_order)
    expect(sortedTasks[0]).toBe(optimisticTask) // Should be first
  })

  it('handles state tracking correctly', () => {
    const { result } = originalRenderHook(() => useOptimisticCreate(), { wrapper })

    queryClient.setQueryData(['tasks', 'filtered', filters], [])

    let tempId: string | undefined
    act(() => {
      tempId = result.current.quickAdd('week', 'New Task', filters)
    })

    expect(tempId).toBeDefined()
    if (tempId) {
      expect(result.current.isTaskSyncing(tempId)).toBe(true)
      expect(result.current.isTaskError(tempId)).toBe(false)
      expect(result.current.getTaskState(tempId)).toBe('syncing')
    }
  })

  it('cancels task and removes from cache', () => {
    const { result } = originalRenderHook(() => useOptimisticCreate(), { wrapper })

    queryClient.setQueryData(['tasks', 'filtered', filters], [])

    let tempId: string | undefined
    act(() => {
      tempId = result.current.quickAdd('week', 'New Task', filters)
    })

    // Verify task was added
    let cachedTasks = queryClient.getQueryData(['tasks', 'filtered', filters]) as Task[]
    expect(cachedTasks).toHaveLength(1)

    // Cancel the task
    act(() => {
      if (tempId) {
        result.current.cancel(tempId)
      }
    })

    // Verify task was removed
    cachedTasks = queryClient.getQueryData(['tasks', 'filtered', filters]) as Task[]
    expect(cachedTasks).toHaveLength(0)

    // Verify state is cleaned up
    if (tempId) {
      expect(result.current.isTaskSyncing(tempId)).toBe(false)
      expect(result.current.isTaskError(tempId)).toBe(false)
    }
  })

  it('calls createTask API with correct parameters', () => {
    const { result } = originalRenderHook(() => useOptimisticCreate(), { wrapper })

    queryClient.setQueryData(['tasks', 'filtered', filters], [])

    act(() => {
      result.current.quickAdd('week', 'New Task', filters)
    })

    // Verify API was called with correct parameters
    expect(mockCreateTask).toHaveBeenCalledWith({
      title: 'New Task',
      status: 'week',
      description: null,
      tags: [],
      project_id: null,
      goal_id: null,
      size: null,
      effort_minutes: null,
      soft_due_at: null,
      hard_due_at: null,
      client_request_id: expect.stringMatching(/^test-uuid-\d+$/),
      insert_at: 'top'
    })
  })

  it('handles retry functionality', () => {
    const { result } = originalRenderHook(() => useOptimisticCreate(), { wrapper })

    queryClient.setQueryData(['tasks', 'filtered', filters], [])

    let tempId: string | undefined
    act(() => {
      tempId = result.current.quickAdd('week', 'New Task', filters)
    })

    // Simulate retry
    act(() => {
      if (tempId) {
        result.current.retry(tempId)
      }
    })

    // Should still be syncing
    if (tempId) {
      expect(result.current.isTaskSyncing(tempId)).toBe(true)
    }
  })
})