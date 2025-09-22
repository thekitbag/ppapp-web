import { http, HttpResponse } from 'msw'

// Mock API handlers for testing
// Using relative paths to match API client requests (baseURL: '/api/v1')
export const handlers = [
  // Tasks endpoints
  http.get('/api/v1/tasks', ({ request }) => {
    const url = new URL(request.url)
    const status = url.searchParams.getAll('status')
    
    const mockTasks = [
      {
        id: '1',
        title: 'Test Task 1',
        status: 'backlog',
        sort_order: 1000,
        tags: ['test'],
        project_id: null,
        goal_id: null,
        hard_due_at: null,
        soft_due_at: null,
        effort_minutes: null,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      },
      {
        id: '2', 
        title: 'Test Task 2',
        status: 'week',
        sort_order: 2000,
        tags: [],
        project_id: '1',
        goal_id: '3',
        hard_due_at: null,
        soft_due_at: '2023-12-31T23:59:59Z',
        effort_minutes: 30,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      }
    ]

    if (status.length > 0) {
      const filteredTasks = mockTasks.filter(task => status.includes(task.status))
      return HttpResponse.json(filteredTasks)
    }
    
    return HttpResponse.json(mockTasks)
  }),

  http.post('/api/v1/tasks', async ({ request }) => {
    const body = await request.json() as any
    const newTask = {
      id: '3',
      ...body,
      sort_order: 3000,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    }
    return HttpResponse.json(newTask, { status: 201 })
  }),

  http.patch('/api/v1/tasks/:id', async ({ params, request }) => {
    const body = await request.json() as any
    const updatedTask = {
      id: params.id,
      title: 'Updated Task',
      status: 'week',
      sort_order: body.sort_order || 2000,
      tags: [],
      project_id: null,
      goal_id: null,
      hard_due_at: null,
      soft_due_at: null,
      effort_minutes: null,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: new Date().toISOString(),
      ...body,
    }
    return HttpResponse.json(updatedTask)
  }),

  http.post('/api/v1/tasks/promote-week', async ({ request }) => {
    const body = await request.json() as any
    return HttpResponse.json(body.task_ids)
  }),

  // Projects endpoints
  http.get('/api/v1/projects', () => {
    return HttpResponse.json([
      {
        id: '1',
        name: 'Test Project',
        color: '#3b82f6',
        milestone_title: null,
        milestone_due_at: null,
        created_at: '2023-01-01T00:00:00Z',
      }
    ])
  }),

  http.post('/api/v1/projects', async ({ request }) => {
    const body = await request.json() as any
    return HttpResponse.json({
      id: '2',
      ...body,
      created_at: '2023-01-01T00:00:00Z',
    }, { status: 201 })
  }),

  http.patch('/api/v1/projects/:id', async ({ params, request }) => {
    const body = await request.json() as any
    return HttpResponse.json({
      id: params.id,
      name: 'Test Project',
      color: '#3b82f6',
      milestone_title: null,
      milestone_due_at: null,
      created_at: '2023-01-01T00:00:00Z',
      ...body,
    })
  }),

  // Goals endpoints
  http.get('/api/v1/goals', ({ request }) => {
    const url = new URL(request.url)
    const isClosed = url.searchParams.get('is_closed')

    if (isClosed === 'true') {
      return HttpResponse.json([])
    }

    return HttpResponse.json([
      {
        id: '1',
        title: 'Test Annual Goal',
        type: 'annual',
        parent_goal_id: null,
        end_date: '2024-12-31T23:59:59Z',
        status: 'on_target',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      },
      {
        id: '2',
        title: 'Test Quarterly Goal',
        type: 'quarterly',
        parent_goal_id: '1',
        end_date: '2024-03-31T23:59:59Z',
        status: 'at_risk',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      },
      {
        id: '3',
        title: 'Test Weekly Goal',
        type: 'weekly',
        parent_goal_id: '2',
        end_date: '2024-01-07T23:59:59Z',
        status: 'on_target',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      }
    ])
  }),

  http.get('/api/v1/goals/tree', () => {
    return HttpResponse.json([
      {
        id: '1',
        title: 'Test Annual Goal',
        type: 'annual',
        parent_goal_id: null,
        end_date: '2024-12-31T23:59:59Z',
        status: 'on_target',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        taskCount: 1,
        children: [
          {
            id: '2',
            title: 'Test Quarterly Goal',
            type: 'quarterly',
            parent_goal_id: '1',
            end_date: '2024-03-31T23:59:59Z',
            status: 'at_risk',
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
            taskCount: 1,
            children: [
              {
                id: '3',
                title: 'Test Weekly Goal',
                type: 'weekly',
                parent_goal_id: '2',
                end_date: '2024-01-07T23:59:59Z',
                status: 'on_target',
                created_at: '2023-01-01T00:00:00Z',
                updated_at: '2023-01-01T00:00:00Z',
                taskCount: 1,
                children: []
              }
            ]
          }
        ]
      }
    ])
  }),

  http.post('/api/v1/goals', async ({ request }) => {
    const body = await request.json() as any
    return HttpResponse.json({
      id: String(Date.now()),
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
      ...body,
    }, { status: 201 })
  }),

  http.patch('/api/v1/goals/:id', async ({ params, request }) => {
    const body = await request.json() as any
    return HttpResponse.json({
      id: params.id,
      title: 'Updated Goal',
      type: 'weekly',
      parent_goal_id: null,
      end_date: '2024-01-07T23:59:59Z',
      status: 'on_target',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: new Date().toISOString(),
      ...body,
    })
  }),

  // Close goal endpoint
  http.post('/api/v1/goals/:id/close', async ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      title: 'Test Goal',
      is_closed: true,
      closed_at: new Date().toISOString(),
      status: 'on_target',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: new Date().toISOString(),
    })
  }),

  // Reopen goal endpoint
  http.post('/api/v1/goals/:id/reopen', async ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      title: 'Test Goal',
      is_closed: false,
      closed_at: null,
      status: 'on_target',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: new Date().toISOString(),
    })
  }),

  // Delete goal endpoint
  http.delete('/api/v1/goals/:id', async () => {
    return new HttpResponse(null, { status: 204 })
  }),


  // Recommendations endpoints
  http.get('/api/v1/recommendations/next', () => {
    return HttpResponse.json({
      items: [
        {
          task: {
            id: '1',
            title: 'High Priority Task',
            status: 'backlog',
            sort_order: 1000,
            tags: ['urgent'],
            project_id: null,
            goal_id: null,
            hard_due_at: '2023-12-31T23:59:59Z',
            soft_due_at: null,
            effort_minutes: 15,
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
          },
          score: 0.95,
          factors: { urgency: 0.8, effort: 0.9 },
          why: 'Due soon and low effort'
        }
      ]
    })
  }),

  http.post('/api/v1/recommendations/suggest-week', () => {
    return HttpResponse.json({
      items: [
        {
          task: {
            id: '1',
            title: 'Recommended Task 1',
            status: 'backlog',
            sort_order: 1000,
            tags: ['important'],
            project_id: null,
            goal_id: null,
            hard_due_at: null,
            soft_due_at: '2023-12-31T23:59:59Z',
            effort_minutes: 45,
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
          },
          score: 0.9,
          factors: { priority: 0.8, deadline: 0.7 },
          why: 'High priority with upcoming soft deadline'
        },
        {
          task: {
            id: '2',
            title: 'Recommended Task 2',
            status: 'backlog',
            sort_order: 2000,
            tags: [],
            project_id: '1',
            goal_id: null,
            hard_due_at: null,
            soft_due_at: null,
            effort_minutes: 20,
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
          },
          score: 0.8,
          factors: { effort: 0.9, project: 0.7 },
          why: 'Quick win for active project'
        }
      ]
    })
  }),
]