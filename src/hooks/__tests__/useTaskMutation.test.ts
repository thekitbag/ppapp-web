import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '../../test/utils'
import { useTaskUpdateMutation } from '../useTaskMutation'
import { updateTask } from '../../api/tasks'

// Mock the API function
vi.mock('../../api/tasks', () => ({
  updateTask: vi.fn()
}))

const mockUpdateTask = vi.mocked(updateTask)

describe('useTaskUpdateMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateTask.mockResolvedValue({
      id: '1',
      title: 'Updated Task',
      description: 'Updated description',
      tags: ['updated'],
      status: 'week',
      sort_order: 1,
      size: 'l',
      project_id: '1',
      goal_id: '1',
      hard_due_at: null,
      soft_due_at: '2023-12-31T23:59:00.000Z',
      effort_minutes: 120,
      created_at: '2023-01-01T00:00:00.000Z',
      updated_at: '2023-01-02T00:00:00.000Z',
    })
  })

  it('creates a mutation function', () => {
    const { result } = renderHook(() => useTaskUpdateMutation())
    
    expect(result.current.mutate).toBeDefined()
    expect(result.current.mutateAsync).toBeDefined()
  })

  it('calls updateTask API with correct parameters', async () => {
    const { result } = renderHook(() => useTaskUpdateMutation())
    
    const updatePayload = {
      id: '1',
      patch: { title: 'Updated Task', description: 'Updated description' }
    }
    
    result.current.mutate(updatePayload)
    
    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith('1', {
        title: 'Updated Task',
        description: 'Updated description'
      })
    })
  })

  it('handles successful mutation', async () => {
    const { result } = renderHook(() => useTaskUpdateMutation())
    
    const updatePayload = {
      id: '1', 
      patch: { title: 'Updated Task' }
    }
    
    result.current.mutate(updatePayload)
    
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    
    await waitFor(() => {
      expect(result.current.data).toEqual(expect.objectContaining({
        id: '1',
        title: 'Updated Task'
      }))
    })
  })

  it('handles mutation error', async () => {
    const error = new Error('Update failed')
    mockUpdateTask.mockRejectedValue(error)
    
    const { result } = renderHook(() => useTaskUpdateMutation())
    
    const updatePayload = {
      id: '1',
      patch: { title: 'Updated Task' }
    }
    
    result.current.mutate(updatePayload)
    
    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
    
    await waitFor(() => {
      expect(result.current.error).toBe(error)
    })
  })

  it('shows pending state during mutation', async () => {
    const { result } = renderHook(() => useTaskUpdateMutation())
    
    const updatePayload = {
      id: '1',
      patch: { title: 'Updated Task' }
    }
    
    // Initially not pending
    expect(result.current.isPending).toBe(false)
    
    result.current.mutate(updatePayload)
    
    // Wait for mutation to complete
    await waitFor(() => {
      expect(result.current.isPending).toBe(false)
    })
    
    // Verify it was successful
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
  })

  it('accepts partial task updates', async () => {
    const { result } = renderHook(() => useTaskUpdateMutation())
    
    // Test updating just the title
    result.current.mutate({
      id: '1',
      patch: { title: 'New Title' }
    })
    
    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith('1', { title: 'New Title' })
    })
    
    vi.clearAllMocks()
    
    // Test updating multiple fields
    result.current.mutate({
      id: '1',
      patch: { 
        title: 'Another Title',
        description: 'New description',
        tags: ['new', 'tags'],
        size: 'xl'
      }
    })
    
    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith('1', {
        title: 'Another Title',
        description: 'New description', 
        tags: ['new', 'tags'],
        size: 'xl'
      })
    })
  })

  it('accepts null values for optional fields', async () => {
    const { result } = renderHook(() => useTaskUpdateMutation())
    
    result.current.mutate({
      id: '1',
      patch: {
        description: null,
        project_id: null,
        goal_id: null,
        hard_due_at: null,
        soft_due_at: null,
        effort_minutes: null,
        size: null
      }
    })
    
    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith('1', {
        description: null,
        project_id: null,
        goal_id: null,
        hard_due_at: null,
        soft_due_at: null,
        effort_minutes: null,
        size: null
      })
    })
  })
})