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
      const tasks = await listTasks({ statuses: ['backlog'] })

      expect(Array.isArray(tasks)).toBe(true)
      expect(tasks.length).toBeGreaterThan(0)
      expect(tasks[0]).toHaveProperty('id')
      expect(tasks[0]).toHaveProperty('title')
      expect(tasks[0]).toHaveProperty('status')
    })

    it('fetches tasks with multiple statuses', async () => {
      const tasks = await listTasks({ statuses: ['backlog', 'week'] })

      expect(Array.isArray(tasks)).toBe(true)
      expect(tasks.length).toBeGreaterThan(0)
    })

    it('handles empty status array', async () => {
      const tasks = await listTasks({ statuses: [] })

      expect(Array.isArray(tasks)).toBe(true)
    })

    describe('query parameter construction', () => {
      it('constructs correct query params for status only', async () => {
        const API_BASE = 'http://127.0.0.1:8000'

        server.use(
          http.get(`${API_BASE}/api/v1/tasks`, ({ request }) => {
            const url = new URL(request.url)
            const statusParams = url.searchParams.getAll('status')

            expect(statusParams).toEqual(['backlog', 'week'])
            expect(url.searchParams.has('statuses')).toBe(false) // Should NOT have 'statuses' param

            return HttpResponse.json([])
          })
        )

        await listTasks({ statuses: ['backlog', 'week'] })
      })

      it('constructs correct query params for project filter', async () => {
        const API_BASE = 'http://127.0.0.1:8000'

        server.use(
          http.get(`${API_BASE}/api/v1/tasks`, ({ request }) => {
            const url = new URL(request.url)

            expect(url.searchParams.get('project_id')).toBe('project-123')
            expect(url.searchParams.getAll('status')).toEqual(['backlog', 'week', 'doing', 'done'])

            return HttpResponse.json([])
          })
        )

        await listTasks({ project_id: 'project-123' })
      })

      it('constructs correct query params for goal filter', async () => {
        const API_BASE = 'http://127.0.0.1:8000'

        server.use(
          http.get(`${API_BASE}/api/v1/tasks`, ({ request }) => {
            const url = new URL(request.url)

            expect(url.searchParams.get('goal_id')).toBe('goal-456')

            return HttpResponse.json([])
          })
        )

        await listTasks({ goal_id: 'goal-456' })
      })

      it('constructs correct query params for multiple tags', async () => {
        const API_BASE = 'http://127.0.0.1:8000'

        server.use(
          http.get(`${API_BASE}/api/v1/tasks`, ({ request }) => {
            const url = new URL(request.url)
            const tagsParams = url.searchParams.getAll('tags')

            expect(tagsParams).toEqual(['urgent', 'frontend'])

            return HttpResponse.json([])
          })
        )

        await listTasks({ tags: ['urgent', 'frontend'] })
      })

      it('constructs correct query params for search', async () => {
        const API_BASE = 'http://127.0.0.1:8000'

        server.use(
          http.get(`${API_BASE}/api/v1/tasks`, ({ request }) => {
            const url = new URL(request.url)

            expect(url.searchParams.get('search')).toBe('fix bug')

            return HttpResponse.json([])
          })
        )

        await listTasks({ search: 'fix bug' })
      })

      it('constructs correct query params for date range', async () => {
        const API_BASE = 'http://127.0.0.1:8000'

        server.use(
          http.get(`${API_BASE}/api/v1/tasks`, ({ request }) => {
            const url = new URL(request.url)

            expect(url.searchParams.get('due_date_start')).toBe('2025-09-01')
            expect(url.searchParams.get('due_date_end')).toBe('2025-09-30')

            return HttpResponse.json([])
          })
        )

        await listTasks({
          due_date_start: '2025-09-01',
          due_date_end: '2025-09-30'
        })
      })

      it('constructs correct query params for all filters combined', async () => {
        const API_BASE = 'http://127.0.0.1:8000'

        server.use(
          http.get(`${API_BASE}/api/v1/tasks`, ({ request }) => {
            const url = new URL(request.url)

            expect(url.searchParams.getAll('status')).toEqual(['week', 'doing'])
            expect(url.searchParams.get('project_id')).toBe('project-123')
            expect(url.searchParams.get('goal_id')).toBe('goal-456')
            expect(url.searchParams.getAll('tags')).toEqual(['urgent', 'backend'])
            expect(url.searchParams.get('search')).toBe('api endpoint')
            expect(url.searchParams.get('due_date_start')).toBe('2025-09-15')
            expect(url.searchParams.get('due_date_end')).toBe('2025-09-20')

            return HttpResponse.json([])
          })
        )

        await listTasks({
          statuses: ['week', 'doing'],
          project_id: 'project-123',
          goal_id: 'goal-456',
          tags: ['urgent', 'backend'],
          search: 'api endpoint',
          due_date_start: '2025-09-15',
          due_date_end: '2025-09-20'
        })
      })

      it('does not append empty arrays or undefined values', async () => {
        const API_BASE = 'http://127.0.0.1:8000'

        server.use(
          http.get(`${API_BASE}/api/v1/tasks`, ({ request }) => {
            const url = new URL(request.url)

            // Should only have status params, no empty arrays
            expect(url.searchParams.getAll('status')).toEqual(['backlog', 'week', 'doing', 'done'])
            expect(url.searchParams.has('tags')).toBe(false)
            expect(url.searchParams.has('project_id')).toBe(false)
            expect(url.searchParams.has('goal_id')).toBe(false)
            expect(url.searchParams.has('search')).toBe(false)
            expect(url.searchParams.has('due_date_start')).toBe(false)
            expect(url.searchParams.has('due_date_end')).toBe(false)

            return HttpResponse.json([])
          })
        )

        await listTasks({
          tags: [], // Empty array should not be appended
          project_id: undefined,
          goal_id: undefined,
          search: undefined,
          due_date_start: undefined,
          due_date_end: undefined
        })
      })
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