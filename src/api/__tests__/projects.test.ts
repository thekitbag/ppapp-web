import { describe, it, expect } from 'vitest'
import { listProjects, createProject } from '../projects'

describe('Projects API', () => {
  describe('listProjects', () => {
    it('fetches all projects', async () => {
      const projects = await listProjects()
      
      expect(Array.isArray(projects)).toBe(true)
      expect(projects.length).toBeGreaterThan(0)
      
      const project = projects[0]
      expect(project).toHaveProperty('id')
      expect(project).toHaveProperty('name')
      expect(project).toHaveProperty('color')
      expect(project).toHaveProperty('created_at')
      expect(typeof project.name).toBe('string')
      expect(typeof project.color).toBe('string')
    })
  })

  describe('createProject', () => {
    it('creates a project with name only', async () => {
      const input = { name: 'Test Project' }
      
      const result = await createProject(input)
      
      expect(result).toHaveProperty('id')
      expect(result.name).toBe(input.name)
      expect(result).toHaveProperty('created_at')
    })

    it('creates a project with name and color', async () => {
      const input = { 
        name: 'Colorful Project',
        color: '#ff0000'
      }
      
      const result = await createProject(input)
      
      expect(result).toHaveProperty('id')
      expect(result.name).toBe(input.name)
      expect(result.color).toBe(input.color)
      expect(result).toHaveProperty('created_at')
    })
  })
})