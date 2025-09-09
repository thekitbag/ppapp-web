import { describe, it, expect, vi } from 'vitest'
import { getGoalsTree, listGoalsByType, createGoal, linkTasksToGoal } from '../goals'
import { api } from '../client'

// Mock the API client
vi.mock('../client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  }
}))

const mockApi = {
  get: vi.mocked(api.get),
  post: vi.mocked(api.post),
  patch: vi.mocked(api.patch),
}

describe('Goals Hierarchy API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getGoalsTree', () => {
    it('fetches hierarchical goals tree', async () => {
      const mockTreeData = [
        {
          id: '1',
          title: 'Annual Goal',
          type: 'annual',
          children: [
            {
              id: '2',
              title: 'Quarterly Goal',
              type: 'quarterly',
              parent_goal_id: '1',
              children: [
                {
                  id: '3',
                  title: 'Weekly Goal',
                  type: 'weekly',
                  parent_goal_id: '2',
                  children: []
                }
              ]
            }
          ]
        }
      ]

      mockApi.get.mockResolvedValue({ data: mockTreeData })

      const result = await getGoalsTree()

      expect(mockApi.get).toHaveBeenCalledWith('/goals/tree')
      expect(result).toEqual(mockTreeData)
    })
  })

  describe('listGoalsByType', () => {
    it('fetches goals filtered by type', async () => {
      const mockGoals = [
        { id: '1', title: 'Annual Goal 1', type: 'annual' },
        { id: '2', title: 'Annual Goal 2', type: 'annual' }
      ]

      mockApi.get.mockResolvedValue({ data: mockGoals })

      const result = await listGoalsByType('annual')

      expect(mockApi.get).toHaveBeenCalledWith('/goals?type=annual')
      expect(result).toEqual(mockGoals)
    })

    it('includes parent_id parameter when provided', async () => {
      const mockGoals = [
        { id: '3', title: 'Quarterly Goal', type: 'quarterly', parent_goal_id: '1' }
      ]

      mockApi.get.mockResolvedValue({ data: mockGoals })

      const result = await listGoalsByType('quarterly', '1')

      expect(mockApi.get).toHaveBeenCalledWith('/goals?type=quarterly&parent_id=1')
      expect(result).toEqual(mockGoals)
    })
  })

  describe('createGoal', () => {
    it('creates goal with hierarchical fields', async () => {
      const newGoal = {
        title: 'New Weekly Goal',
        description: 'Test description',
        type: 'weekly' as const,
        parent_goal_id: '2',
        end_date: '2024-01-07T23:59:59Z',
        status: 'on_target' as const
      }

      const createdGoal = {
        id: '4',
        ...newGoal,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      mockApi.post.mockResolvedValue({ data: createdGoal })

      const result = await createGoal(newGoal)

      expect(mockApi.post).toHaveBeenCalledWith('/goals', newGoal)
      expect(result).toEqual(createdGoal)
    })

    it('handles minimal goal creation', async () => {
      const newGoal = {
        title: 'Minimal Goal',
        type: 'annual' as const
      }

      const createdGoal = {
        id: '5',
        ...newGoal,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }

      mockApi.post.mockResolvedValue({ data: createdGoal })

      const result = await createGoal(newGoal)

      expect(mockApi.post).toHaveBeenCalledWith('/goals', newGoal)
      expect(result).toEqual(createdGoal)
    })
  })

  describe('linkTasksToGoal', () => {
    it('successfully links tasks to weekly goal', async () => {
      const mockResponse = {
        linked: ['task1', 'task2'],
        already_linked: []
      }

      mockApi.post.mockResolvedValue({ data: mockResponse })

      const result = await linkTasksToGoal('3', ['task1', 'task2'])

      expect(mockApi.post).toHaveBeenCalledWith('/goals/3/link-tasks', {
        task_ids: ['task1', 'task2']
      })
      expect(result).toEqual(mockResponse)
    })

    it('throws enhanced error for non-weekly goals', async () => {
      const errorResponse = {
        response: {
          data: {
            message: 'Only weekly goals can have tasks linked'
          }
        }
      }

      mockApi.post.mockRejectedValue(errorResponse)

      await expect(linkTasksToGoal('1', ['task1'])).rejects.toThrow(
        'Only weekly goals can have tasks linked to them'
      )
    })

    it('re-throws other errors unchanged', async () => {
      const genericError = new Error('Network error')
      mockApi.post.mockRejectedValue(genericError)

      await expect(linkTasksToGoal('3', ['task1'])).rejects.toThrow('Network error')
    })

    it('handles partial linking response', async () => {
      const mockResponse = {
        linked: ['task1'],
        already_linked: ['task2']
      }

      mockApi.post.mockResolvedValue({ data: mockResponse })

      const result = await linkTasksToGoal('3', ['task1', 'task2'])

      expect(result).toEqual(mockResponse)
    })
  })

  describe('Error handling', () => {
    it('handles API errors gracefully', async () => {
      mockApi.get.mockRejectedValue(new Error('API Error'))

      await expect(getGoalsTree()).rejects.toThrow('API Error')
    })

    it('handles network timeouts', async () => {
      mockApi.get.mockRejectedValue({ code: 'TIMEOUT' })

      await expect(listGoalsByType('annual')).rejects.toMatchObject({
        code: 'TIMEOUT'
      })
    })
  })

  describe('Parameter validation', () => {
    it('constructs URLs correctly for complex queries', async () => {
      mockApi.get.mockResolvedValue({ data: [] })

      await listGoalsByType('quarterly', 'parent-123')

      expect(mockApi.get).toHaveBeenCalledWith('/goals?type=quarterly&parent_id=parent-123')
    })

    it('handles special characters in parent IDs', async () => {
      mockApi.get.mockResolvedValue({ data: [] })

      await listGoalsByType('weekly', 'goal-with-special-chars-&-symbols')

      const expectedUrl = '/goals?type=weekly&parent_id=goal-with-special-chars-%26-symbols'
      expect(mockApi.get).toHaveBeenCalledWith(expectedUrl)
    })
  })
})