import { useState, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { v4 as uuidv4 } from 'uuid'
import { createTask, type TaskFilters } from '../api/tasks'
import { Task, TaskStatus, TaskSize } from '../types'
import { midpoint } from '../constants'

interface OptimisticCreateRequest {
  client_request_id: string
  payload: {
    title: string
    status: TaskStatus
    description?: string | null
    tags: string[]
    project_id?: string | null
    goal_id?: string | null
    size?: string | null
    effort_minutes?: number | null
    soft_due_at?: string | null
    hard_due_at?: string | null
  }
  attempts: number
  tempId: string
}

interface RetryQueue {
  [key: string]: OptimisticCreateRequest
}

interface OptimisticCreateConfig {
  maxRetries?: number
  baseDelay?: number
}

// Module-scoped retry queue
const retryQueue: RetryQueue = {}
const activeTimeouts = new Map<string, NodeJS.Timeout>()

export function useOptimisticCreate(config: OptimisticCreateConfig = {}) {
  const { maxRetries = 4, baseDelay = 2000 } = config
  const qc = useQueryClient()
  const [errorStates, setErrorStates] = useState<Record<string, boolean>>({})
  const [syncingStates, setSyncingStates] = useState<Record<string, boolean>>({})
  const clientRequestIdMapRef = useRef<Map<string, string>>(new Map()) // tempId -> client_request_id

  const createOptimisticTask = useCallback((
    status: TaskStatus,
    title: string,
    options: {
      description?: string | null
      tags?: string[]
      project_id?: string | null
      goal_id?: string | null
      size?: string | null
      effort_minutes?: number | null
      soft_due_at?: string | null
      hard_due_at?: string | null
    } = {}
  ): Task => {
    const tempId = `temp_${uuidv4()}`
    const client_request_id = uuidv4()
    const now = new Date().toISOString()

    // Store mapping for reconciliation
    clientRequestIdMapRef.current.set(tempId, client_request_id)

    return {
      id: tempId,
      title,
      description: options.description || null,
      tags: options.tags || [],
      status,
      sort_order: 0, // Will be computed below
      size: options.size as any || null,
      project_id: options.project_id || null,
      goal_id: options.goal_id || null,
      goals: undefined,
      hard_due_at: options.hard_due_at || null,
      soft_due_at: options.soft_due_at || null,
      effort_minutes: options.effort_minutes || null,
      created_at: now,
      updated_at: now,
      __optimistic: true,
      __state: 'syncing',
      __tempId: tempId,
      __clientRequestId: client_request_id,
    }
  }, [])

  const insertOptimisticTask = useCallback((filters: TaskFilters, optimisticTask: Task) => {
    // Update the tasks cache
    const queryKey = ['tasks', 'filtered', filters]
    qc.setQueryData(queryKey, (old: Task[] | undefined) => {
      if (!old) return [optimisticTask]

      // Find tasks in the same status
      const sameStatusTasks = old.filter(t => t.status === optimisticTask.status)
      const firstTask = sameStatusTasks[0]

      // Compute sort order to appear at top
      const topSortOrder = firstTask
        ? midpoint(undefined, firstTask.sort_order)
        : 1000

      const updatedOptimisticTask = {
        ...optimisticTask,
        sort_order: topSortOrder
      }

      // Insert at beginning and re-sort
      const newTasks = [updatedOptimisticTask, ...old]
      return newTasks.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    })
  }, [qc])

  const processRetryQueue = useCallback(async (client_request_id: string) => {
    const request = retryQueue[client_request_id]
    if (!request) return

    try {
      // Make the API call
      const serverTask = await createTask({
        ...request.payload,
        client_request_id,
        insert_at: 'top'
      })

      // Success: reconcile optimistic task with server response
      const tempId = request.tempId

      // Update all relevant query keys
      qc.getQueriesData({ predicate: (query) => {
        return query.queryKey[0] === 'tasks' && query.queryKey[1] === 'filtered'
      }}).forEach(([queryKey, data]) => {
        if (Array.isArray(data)) {
          qc.setQueryData(queryKey, (old: Task[] | undefined) => {
            if (!old) return old
            return old.map(task =>
              task.__tempId === tempId
                ? {
                    ...serverTask,
                    sort_order: task.sort_order, // Preserve position
                    __state: 'ok'
                  }
                : task
            )
          })
        }
      })

      // Clean up
      delete retryQueue[client_request_id]
      const timeout = activeTimeouts.get(client_request_id)
      if (timeout) {
        clearTimeout(timeout)
        activeTimeouts.delete(client_request_id)
      }
      clientRequestIdMapRef.current.delete(tempId)
      setSyncingStates(prev => {
        const { [tempId]: _, ...rest } = prev
        return rest
      })
      setErrorStates(prev => {
        const { [tempId]: _, ...rest } = prev
        return rest
      })

    } catch (error) {
      console.error('Create task failed:', error)
      request.attempts++

      if (request.attempts >= maxRetries) {
        // Max retries reached, show error state
        const tempId = request.tempId
        setErrorStates(prev => ({ ...prev, [tempId]: true }))
        setSyncingStates(prev => {
          const { [tempId]: _, ...rest } = prev
          return rest
        })

        // Update task state to error
        qc.getQueriesData({ predicate: (query) => {
          return query.queryKey[0] === 'tasks' && query.queryKey[1] === 'filtered'
        }}).forEach(([queryKey, data]) => {
          if (Array.isArray(data)) {
            qc.setQueryData(queryKey, (old: Task[] | undefined) => {
              if (!old) return old
              return old.map(task =>
                task.__tempId === tempId
                  ? { ...task, __state: 'error' }
                  : task
              )
            })
          }
        })
      } else {
        // Schedule retry with exponential backoff
        const delay = baseDelay * Math.pow(2, request.attempts - 1)
        const timeout = setTimeout(() => {
          processRetryQueue(client_request_id)
        }, delay)
        activeTimeouts.set(client_request_id, timeout)
      }
    }
  }, [qc, maxRetries, baseDelay])

  const quickAdd = useCallback((status: TaskStatus, title: string, filters: TaskFilters) => {
    if (!title.trim()) return

    // Create optimistic task
    const optimisticTask = createOptimisticTask(status, title.trim())
    const client_request_id = optimisticTask.__clientRequestId!
    const tempId = optimisticTask.__tempId!

    // Insert into cache immediately
    insertOptimisticTask(filters, optimisticTask)

    // Add to retry queue
    retryQueue[client_request_id] = {
      client_request_id,
      payload: {
        title: optimisticTask.title,
        status: optimisticTask.status,
        description: optimisticTask.description,
        tags: optimisticTask.tags || [],
        project_id: optimisticTask.project_id,
        goal_id: optimisticTask.goal_id,
        size: optimisticTask.size as TaskSize | null | undefined,
        effort_minutes: optimisticTask.effort_minutes,
        soft_due_at: optimisticTask.soft_due_at,
        hard_due_at: optimisticTask.hard_due_at,
      },
      attempts: 0,
      tempId,
    }

    // Set syncing state
    setSyncingStates(prev => ({ ...prev, [tempId]: true }))

    // Start the process
    processRetryQueue(client_request_id)

    return tempId
  }, [createOptimisticTask, insertOptimisticTask, processRetryQueue])

  const retry = useCallback((tempId: string) => {
    const client_request_id = clientRequestIdMapRef.current.get(tempId)
    if (!client_request_id || !retryQueue[client_request_id]) return

    // Reset attempts and retry immediately
    retryQueue[client_request_id].attempts = 0
    setErrorStates(prev => {
      const { [tempId]: _, ...rest } = prev
      return rest
    })
    setSyncingStates(prev => ({ ...prev, [tempId]: true }))

    // Update task state back to syncing
    qc.getQueriesData({ predicate: (query) => {
      return query.queryKey[0] === 'tasks' && query.queryKey[1] === 'filtered'
    }}).forEach(([queryKey, data]) => {
      if (Array.isArray(data)) {
        qc.setQueryData(queryKey, (old: Task[] | undefined) => {
          if (!old) return old
          return old.map(task =>
            task.__tempId === tempId
              ? { ...task, __state: 'syncing' }
              : task
          )
        })
      }
    })

    processRetryQueue(client_request_id)
  }, [qc, processRetryQueue])

  const cancel = useCallback((tempId: string) => {
    const client_request_id = clientRequestIdMapRef.current.get(tempId)
    if (client_request_id) {
      // Clean up retry queue
      delete retryQueue[client_request_id]
      const timeout = activeTimeouts.get(client_request_id)
      if (timeout) {
        clearTimeout(timeout)
        activeTimeouts.delete(client_request_id)
      }
      clientRequestIdMapRef.current.delete(tempId)
    }

    // Remove from cache
    qc.getQueriesData({ predicate: (query) => {
      return query.queryKey[0] === 'tasks' && query.queryKey[1] === 'filtered'
    }}).forEach(([queryKey, data]) => {
      if (Array.isArray(data)) {
        qc.setQueryData(queryKey, (old: Task[] | undefined) => {
          if (!old) return old
          return old.filter(task => task.__tempId !== tempId)
        })
      }
    })

    // Clean up states
    setSyncingStates(prev => {
      const { [tempId]: _, ...rest } = prev
      return rest
    })
    setErrorStates(prev => {
      const { [tempId]: _, ...rest } = prev
      return rest
    })
  }, [qc])

  const getTaskState = useCallback((tempId: string) => {
    if (errorStates[tempId]) return 'error'
    if (syncingStates[tempId]) return 'syncing'
    return 'ok'
  }, [errorStates, syncingStates])

  return {
    quickAdd,
    retry,
    cancel,
    getTaskState,
    isTaskSyncing: (tempId: string) => syncingStates[tempId] || false,
    isTaskError: (tempId: string) => errorStates[tempId] || false,
  }
}