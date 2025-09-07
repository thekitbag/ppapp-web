import { api } from './client'
import type { Goal, KeyResult, GoalDetail, GoalCadence } from '../types'

export async function listGoals(): Promise<Goal[]> {
  const { data } = await api.get('/goals')
  return data as Goal[]
}

export interface CreateGoalInput {
  title: string
  description?: string | null
  // Accept broader string for tests/backward-compat, UI restricts to GoalCadence
  type?: GoalCadence | string | null
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
  const { data } = await api.post(`/goals/${goalId}/link-tasks`, { task_ids: taskIds })
  return data
}
