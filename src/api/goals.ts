import { api } from './client'
import type { Goal, KeyResult, GoalDetail, GoalCadence, GoalNode, GoalStatus } from '../types'

export async function listGoals(): Promise<Goal[]> {
  const { data } = await api.get('/goals')
  return data as Goal[]
}

export interface CreateGoalInput {
  title: string
  description?: string | null
  // Accept broader string for tests/backward-compat, UI restricts to GoalCadence
  type?: GoalCadence | string | null
  parent_goal_id?: string | null
  end_date?: string | null
  status?: GoalStatus | null
}

export async function createGoal(input: CreateGoalInput): Promise<Goal> {
  const { data } = await api.post('/goals', input)
  return data as Goal
}

export async function updateGoal(id: string, input: Partial<CreateGoalInput>): Promise<Goal> {
  const { data } = await api.patch(`/goals/${id}`, input)
  return data as Goal
}

export async function getGoal(id: string): Promise<GoalDetail> {
  const { data } = await api.get(`/goals/${id}`)
  return data as GoalDetail
}

export interface CreateKRInput {
  name: string
  target_value: number
  unit: string
  baseline_value?: number | null
}

export async function createKR(goalId: string, input: CreateKRInput): Promise<KeyResult> {
  const { data } = await api.post(`/goals/${goalId}/krs`, input)
  return data as KeyResult
}

export async function linkTasksToGoal(goalId: string, taskIds: string[]): Promise<{ linked: string[]; already_linked: string[] }> {
  try {
    const { data } = await api.post(`/goals/${goalId}/link-tasks`, { task_ids: taskIds })
    return data
  } catch (error: any) {
    // Re-throw with enhanced error info for UI handling
    if (error.response?.data?.message?.includes('weekly')) {
      throw new Error('Only weekly goals can have tasks linked to them')
    }
    throw error
  }
}

export async function getGoalsTree(): Promise<GoalNode[]> {
  const { data } = await api.get('/goals/tree')
  return data as GoalNode[]
}

export async function listGoalsByType(type: GoalCadence, parentId?: string): Promise<Goal[]> {
  const params = new URLSearchParams({ type })
  if (parentId) {
    params.append('parent_id', parentId)
  }
  const { data } = await api.get(`/goals?${params.toString()}`)
  return data as Goal[]
}
