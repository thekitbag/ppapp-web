import { api } from './client'
import type { Task } from '../types'

export interface RecommendationItem {
  task: Task
  score: number
  factors?: Record<string, number>
  why: string
}

export async function listRecommendations(limit = 10): Promise<RecommendationItem[]> {
  const { data } = await api.get('/api/v1/recommendations/next', { params: { limit } })
  if (data && Array.isArray((data as any).items)) return (data as any).items as RecommendationItem[]
  return []
}

export async function suggestWeek(limit = 5): Promise<RecommendationItem[]> {
  const { data } = await api.post('/api/v1/recommendations/suggest-week', { limit })
  if (data && Array.isArray((data as any).items)) return (data as any).items as RecommendationItem[]
  return []
}
