import { api } from './client'
import type { Goal } from '../types'

export async function listGoals(): Promise<Goal[]> {
  const { data } = await api.get('/goals')
  return data as Goal[]
}

export async function createGoal(input: { title: string, type?: string }): Promise<Goal> {
  const { data } = await api.post('/goals', input)
  return data as Goal
}
