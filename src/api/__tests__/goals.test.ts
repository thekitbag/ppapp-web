import { describe, it, expect } from 'vitest'
import { listGoals, createGoal } from '../goals'

describe('Goals API', () => {
  describe('listGoals', () => {
    it('fetches all goals', async () => {
      const goals = await listGoals()
      
      expect(Array.isArray(goals)).toBe(true)
      expect(goals.length).toBeGreaterThan(0)
      
      const goal = goals[0]
      expect(goal).toHaveProperty('id')
      expect(goal).toHaveProperty('title')
      expect(goal).toHaveProperty('type')
      expect(goal).toHaveProperty('created_at')
      expect(typeof goal.title).toBe('string')
      expect(typeof goal.type).toBe('string')
    })
  })

  describe('createGoal', () => {
    it('creates a goal with title only', async () => {
      const input = { title: 'Test Goal' }
      
      const result = await createGoal(input)
      
      expect(result).toHaveProperty('id')
      expect(result.title).toBe(input.title)
      expect(result).toHaveProperty('created_at')
    })

    it('creates a goal with title and type', async () => {
      const input = { 
        title: 'Learning Goal',
        type: 'learning'
      }
      
      const result = await createGoal(input)
      
      expect(result).toHaveProperty('id')
      expect(result.title).toBe(input.title)
      expect(result.type).toBe(input.type)
      expect(result).toHaveProperty('created_at')
    })
  })
})