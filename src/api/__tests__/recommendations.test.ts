import { describe, it, expect } from 'vitest'
import { server } from '../../test/mocks/server'
import { http, HttpResponse } from 'msw'
import { listRecommendations, suggestWeek } from '../recommendations'

describe('Recommendations API', () => {
  describe('listRecommendations', () => {
    it('fetches recommendations with default limit', async () => {
      const recommendations = await listRecommendations()
      
      expect(Array.isArray(recommendations)).toBe(true)
      expect(recommendations.length).toBeGreaterThan(0)
      
      const item = recommendations[0]
      expect(item).toHaveProperty('task')
      expect(item).toHaveProperty('score')
      expect(item).toHaveProperty('why')
      expect(item.task).toHaveProperty('id')
      expect(item.task).toHaveProperty('title')
      expect(typeof item.score).toBe('number')
      expect(typeof item.why).toBe('string')
    })

    it('fetches recommendations with custom limit', async () => {
      const API_BASE = 'http://127.0.0.1:8000'
      
      server.use(
        http.get(`${API_BASE}/api/v1/recommendations/next`, ({ request }) => {
          const url = new URL(request.url)
          const limit = url.searchParams.get('limit')
          
          expect(limit).toBe('5')
          
          return HttpResponse.json({
            items: Array.from({ length: 3 }, (_, i) => ({
              task: {
                id: String(i + 1),
                title: `Recommendation ${i + 1}`,
                status: 'backlog',
                sort_order: 1000 * (i + 1),
                tags: [],
                project_id: null,
                goal_id: null,
                hard_due_at: null,
                soft_due_at: null,
                effort_minutes: 15,
                created_at: '2023-01-01T00:00:00Z',
                updated_at: '2023-01-01T00:00:00Z',
              },
              score: 0.9 - (i * 0.1),
              factors: { urgency: 0.8, effort: 0.9 },
              why: `Recommendation ${i + 1} reasoning`
            }))
          })
        })
      )

      const recommendations = await listRecommendations(5)
      
      expect(Array.isArray(recommendations)).toBe(true)
      expect(recommendations.length).toBe(3)
    })

    it('handles empty response gracefully', async () => {
      const API_BASE = 'http://127.0.0.1:8000'
      
      server.use(
        http.get(`${API_BASE}/api/v1/recommendations/next`, () => {
          return HttpResponse.json({ items: [] })
        })
      )

      const recommendations = await listRecommendations()
      
      expect(Array.isArray(recommendations)).toBe(true)
      expect(recommendations.length).toBe(0)
    })

    it('handles malformed response gracefully', async () => {
      const API_BASE = 'http://127.0.0.1:8000'
      
      server.use(
        http.get(`${API_BASE}/api/v1/recommendations/next`, () => {
          return HttpResponse.json({})
        })
      )

      const recommendations = await listRecommendations()
      
      expect(Array.isArray(recommendations)).toBe(true)
      expect(recommendations.length).toBe(0)
    })

    it('handles non-array items in response', async () => {
      const API_BASE = 'http://127.0.0.1:8000'
      
      server.use(
        http.get(`${API_BASE}/api/v1/recommendations/next`, () => {
          return HttpResponse.json({ items: null })
        })
      )

      const recommendations = await listRecommendations()
      
      expect(Array.isArray(recommendations)).toBe(true)
      expect(recommendations.length).toBe(0)
    })
  })

  describe('suggestWeek', () => {
    it('fetches week suggestions with default limit', async () => {
      const suggestions = await suggestWeek()
      
      expect(Array.isArray(suggestions)).toBe(true)
      expect(suggestions.length).toBeGreaterThan(0)
      
      const item = suggestions[0]
      expect(item).toHaveProperty('task')
      expect(item).toHaveProperty('score')
      expect(item).toHaveProperty('why')
      expect(item.task).toHaveProperty('id')
      expect(item.task).toHaveProperty('title')
    })

    it('fetches suggestions with custom limit', async () => {
      const API_BASE = 'http://127.0.0.1:8000'
      
      server.use(
        http.post(`${API_BASE}/api/v1/recommendations/suggest-week`, async ({ request }) => {
          const body = await request.json() as any
          
          expect(body.limit).toBe(3)
          
          return HttpResponse.json({
            items: [
              {
                task: {
                  id: '1',
                  title: 'Custom Limit Task',
                  status: 'backlog',
                  sort_order: 1000,
                  tags: [],
                  project_id: null,
                  goal_id: null,
                  hard_due_at: null,
                  soft_due_at: null,
                  effort_minutes: 30,
                  created_at: '2023-01-01T00:00:00Z',
                  updated_at: '2023-01-01T00:00:00Z',
                },
                score: 0.85,
                factors: { priority: 0.8 },
                why: 'Custom limit test'
              }
            ]
          })
        })
      )

      const suggestions = await suggestWeek(3)
      
      expect(Array.isArray(suggestions)).toBe(true)
      expect(suggestions.length).toBe(1)
      expect(suggestions[0].task.title).toBe('Custom Limit Task')
    })

    it('handles empty response gracefully', async () => {
      const API_BASE = 'http://127.0.0.1:8000'
      
      server.use(
        http.post(`${API_BASE}/api/v1/recommendations/suggest-week`, () => {
          return HttpResponse.json({ items: [] })
        })
      )

      const suggestions = await suggestWeek()
      
      expect(Array.isArray(suggestions)).toBe(true)
      expect(suggestions.length).toBe(0)
    })

    it('handles malformed response gracefully', async () => {
      const API_BASE = 'http://127.0.0.1:8000'
      
      server.use(
        http.post(`${API_BASE}/api/v1/recommendations/suggest-week`, () => {
          return HttpResponse.json({})
        })
      )

      const suggestions = await suggestWeek()
      
      expect(Array.isArray(suggestions)).toBe(true)
      expect(suggestions.length).toBe(0)
    })
  })
})