import { describe, it, expect } from 'vitest'
import { server } from '../../test/mocks/server'
import { http, HttpResponse } from 'msw'
import {
  listTasks,
  createTask,
  patchTask,
  updateTaskOrder,
  getBacklogTasks,
  promoteTasksToWeek
} from '../tasks'

describe('Tasks API', () => {
  describe('listTasks', () => {
    it('fetches tasks with single status', async () => {
      const tasks = await listTasks(['backlog'])
      
      expect(Array.isArray(tasks)).toBe(true)
      expect(tasks.length).toBeGreaterThan(0)
      expect(tasks[0]).toHaveProperty('id')
      expect(tasks[0]).toHaveProperty('title')
      expect(tasks[0]).toHaveProperty('status')
    })

    it('fetches tasks with multiple statuses', async () => {
      const tasks = await listTasks(['backlog', 'week'])
      
      expect(Array.isArray(tasks)).toBe(true)
      expect(tasks.length).toBeGreaterThan(0)
    })

    it('handles empty status array', async () => {
      const tasks = await listTasks([])
      
      expect(Array.isArray(tasks)).toBe(true)
    })
  })

  describe('createTask', () => {
    it('creates a new task successfully', async () => {
      const newTask = {
        title: 'New Test Task',
        status: 'backlog' as const,
        tags: ['test'],
        project_id: null,
        goal_id: null,
        hard_due_at: null,
        soft_due_at: null,
        effort_minutes: null,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      }

      const result = await createTask(newTask)
      
      expect(result).toHaveProperty('id')
      expect(result.title).toBe(newTask.title)
      expect(result.status).toBe(newTask.status)
      expect(result).toHaveProperty('sort_order')
    })
  })

  describe('patchTask', () => {
    it('updates a task successfully', async () => {
      const taskId = '1'
      const updates = {
        title: 'Updated Task Title',
        status: 'week' as const
      }

      const result = await patchTask(taskId, updates)
      
      expect(result).toHaveProperty('id', taskId)
      expect(result).toHaveProperty('updated_at')
    })

    it('handles numeric task ID', async () => {
      const taskId = 1
      const updates = { title: 'Updated Task' }

      const result = await patchTask(taskId, updates)
      
      expect(result).toHaveProperty('id')
    })
  })

  describe('updateTaskOrder', () => {
    it('updates task sort order', async () => {
      const taskId = '1'
      const newSortOrder = 1500

      const result = await updateTaskOrder(taskId, newSortOrder)
      
      expect(result).toHaveProperty('id')
      expect(result.sort_order).toBe(newSortOrder)
    })
  })

  describe('getBacklogTasks', () => {
    it('fetches backlog tasks only', async () => {
      const API_BASE = 'http://127.0.0.1:8000'
      
      server.use(
        http.get(`${API_BASE}/api/v1/tasks`, ({ request }) => {
          const url = new URL(request.url)
          const status = url.searchParams.get('status')
          
          expect(status).toBe('backlog')
          
          return HttpResponse.json([
            {
              id: '1',
              title: 'Backlog Task',
              status: 'backlog',
              sort_order: 1000,
              tags: [],
              project_id: null,
              goal_id: null,
              hard_due_at: null,
              soft_due_at: null,
              effort_minutes: null,
              created_at: '2023-01-01T00:00:00Z',
              updated_at: '2023-01-01T00:00:00Z',
            }
          ])
        })
      )

      const tasks = await getBacklogTasks()
      
      expect(Array.isArray(tasks)).toBe(true)
      expect(tasks[0].status).toBe('backlog')
    })
  })

  describe('promoteTasksToWeek', () => {
    it('promotes tasks to week successfully', async () => {
      const taskIds = ['1', '2']
      
      const result = await promoteTasksToWeek(taskIds)
      
      expect(Array.isArray(result)).toBe(true)
      expect(result).toEqual(taskIds)
    })

    it('handles numeric task IDs', async () => {
      const taskIds = [1, 2]
      
      const result = await promoteTasksToWeek(taskIds)
      
      expect(Array.isArray(result)).toBe(true)
    })

    it('handles empty task ID array', async () => {
      const result = await promoteTasksToWeek([])
      
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(0)
    })
  })
})