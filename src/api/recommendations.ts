import { api } from './client'
import type { Task } from '../types'

export interface RecommendationItem {
  task: Task
  score: number
  factors?: Record<string, number>
  why: string
}

export type EnergyLevel = 'low' | 'medium' | 'high'

export interface NextRecommendationParams {
  energy: EnergyLevel
  time_window: number
  limit?: number
}

export async function listRecommendations(limit = 10): Promise<RecommendationItem[]> {
  const { data } = await api.get('/recommendations/next', { params: { limit } })
  if (data && Array.isArray((data as any).items)) return (data as any).items as RecommendationItem[]
  return []
}

export async function getNextRecommendations(params: NextRecommendationParams): Promise<RecommendationItem[]> {
  const { data } = await api.get('/recommendations/next', {
    params: { energy: params.energy, time_window: params.time_window, limit: params.limit ?? 5 },
  })
  if (data && Array.isArray((data as any).items)) return (data as any).items as RecommendationItem[]
  return []
}

export async function suggestWeek(limit = 5): Promise<RecommendationItem[]> {
  const { data } = await api.post('/recommendations/suggest-week', { limit })
  if (data && Array.isArray((data as any).items)) return (data as any).items as RecommendationItem[]
  return []
}
