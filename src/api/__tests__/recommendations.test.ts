import { describe, it, expect } from 'vitest'
import { server } from '../../test/mocks/server'
import { http, HttpResponse } from 'msw'
import { listRecommendations, suggestWeek, getNextRecommendations } from '../recommendations'

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
      server.use(
        http.get('/api/v1/recommendations/next', ({ request }) => {
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
      server.use(
        http.get('/api/v1/recommendations/next', () => {
          return HttpResponse.json({ items: [] })
        })
      )

      const recommendations = await listRecommendations()
      
      expect(Array.isArray(recommendations)).toBe(true)
      expect(recommendations.length).toBe(0)
    })

    it('handles malformed response gracefully', async () => {
      server.use(
        http.get('/api/v1/recommendations/next', () => {
          return HttpResponse.json({})
        })
      )

      const recommendations = await listRecommendations()
      
      expect(Array.isArray(recommendations)).toBe(true)
      expect(recommendations.length).toBe(0)
    })

    it('handles non-array items in response', async () => {
      server.use(
        http.get('/api/v1/recommendations/next', () => {
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
      server.use(
        http.post('/api/v1/recommendations/suggest-week', async ({ request }) => {
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
      server.use(
        http.post('/api/v1/recommendations/suggest-week', () => {
          return HttpResponse.json({ items: [] })
        })
      )

      const suggestions = await suggestWeek()
      
      expect(Array.isArray(suggestions)).toBe(true)
      expect(suggestions.length).toBe(0)
    })

    it('handles malformed response gracefully', async () => {
      server.use(
        http.post('/api/v1/recommendations/suggest-week', () => {
          return HttpResponse.json({})
        })
      )

      const suggestions = await suggestWeek()
      
      expect(Array.isArray(suggestions)).toBe(true)
      expect(suggestions.length).toBe(0)
    })
  })

  describe('getNextRecommendations', () => {
    it('sends energy and time_window query params', async () => {
      let capturedParams: Record<string, string> = {}

      server.use(
        http.get('/api/v1/recommendations/next', ({ request }) => {
          const url = new URL(request.url)
          capturedParams = {
            energy: url.searchParams.get('energy') ?? '',
            time_window: url.searchParams.get('time_window') ?? '',
            limit: url.searchParams.get('limit') ?? '',
          }
          return HttpResponse.json({ items: [] })
        })
      )

      await getNextRecommendations({ energy: 'high', time_window: 60 })

      expect(capturedParams.energy).toBe('high')
      expect(capturedParams.time_window).toBe('60')
      expect(capturedParams.limit).toBe('5')
    })

    it('sends custom limit', async () => {
      let capturedLimit = ''

      server.use(
        http.get('/api/v1/recommendations/next', ({ request }) => {
          const url = new URL(request.url)
          capturedLimit = url.searchParams.get('limit') ?? ''
          return HttpResponse.json({ items: [] })
        })
      )

      await getNextRecommendations({ energy: 'low', time_window: 30, limit: 3 })

      expect(capturedLimit).toBe('3')
    })

    it('returns items array from response', async () => {
      server.use(
        http.get('/api/v1/recommendations/next', () =>
          HttpResponse.json({
            items: [
              {
                task: {
                  id: '1',
                  title: 'Focus task',
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
                factors: {},
                why: 'Good fit for your energy',
              },
            ],
          })
        )
      )

      const items = await getNextRecommendations({ energy: 'medium', time_window: 120 })

      expect(items.length).toBe(1)
      expect(items[0].task.title).toBe('Focus task')
      expect(items[0].why).toBe('Good fit for your energy')
    })

    it('handles empty response gracefully', async () => {
      server.use(
        http.get('/api/v1/recommendations/next', () =>
          HttpResponse.json({ items: [] })
        )
      )

      const items = await getNextRecommendations({ energy: 'low', time_window: 15 })

      expect(Array.isArray(items)).toBe(true)
      expect(items.length).toBe(0)
    })

    it('handles malformed response gracefully', async () => {
      server.use(
        http.get('/api/v1/recommendations/next', () =>
          HttpResponse.json({})
        )
      )

      const items = await getNextRecommendations({ energy: 'high', time_window: 240 })

      expect(Array.isArray(items)).toBe(true)
      expect(items.length).toBe(0)
    })

    it('supports all energy levels', async () => {
      const energyLevels = ['low', 'medium', 'high'] as const

      for (const energy of energyLevels) {
        let captured = ''
        server.use(
          http.get('/api/v1/recommendations/next', ({ request }) => {
            captured = new URL(request.url).searchParams.get('energy') ?? ''
            return HttpResponse.json({ items: [] })
          })
        )

        await getNextRecommendations({ energy, time_window: 30 })
        expect(captured).toBe(energy)
      }
    })
  })
})