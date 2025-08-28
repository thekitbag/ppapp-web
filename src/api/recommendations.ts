import { api } from './client'
import type { Task } from '../types'

export interface RecommendationItem {
  task: Task
  score: number
  factors?: Record<string, number>
  why: string
}

export async function listRecommendations(limit = 10): Promise<RecommendationItem[]> {
  const { data } = await api.get('/recommendations/next', { params: { limit } })
  if (Array.isArray(data)) return data as RecommendationItem[]
  if (data && Array.isArray((data as any).items)) return (data as any).items as RecommendationItem[]
  if (data && Array.isArray((data as any).results)) return (data as any).results as RecommendationItem[]
  if (data && Array.isArray((data as any).recommendations)) return (data as any).recommendations as RecommendationItem[]
  return []
}

export async function suggestWeek(limit = 5): Promise<RecommendationItem[]> {
  const { data } = await api.post('/recommendations/suggest-week', { limit })
  if (Array.isArray(data)) return data as RecommendationItem[]
  if (data && Array.isArray((data as any).items)) return (data as any).items as RecommendationItem[]
  if (data && Array.isArray((data as any).results)) return (data as any).results as RecommendationItem[]
  if (data && Array.isArray((data as any).recommendations)) return (data as any).recommendations as RecommendationItem[]
  return []
}
