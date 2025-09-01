import { describe, it, expect } from 'vitest'
import { listProjects, createProject, patchProject } from '../projects'

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
      expect(project).toHaveProperty('milestone_title')
      expect(project).toHaveProperty('milestone_due_at')
      expect(project).toHaveProperty('created_at')
      expect(typeof project.name).toBe('string')
      if (project.color) expect(typeof project.color).toBe('string')
      if (project.milestone_title) expect(typeof project.milestone_title).toBe('string')
      if (project.milestone_due_at) expect(typeof project.milestone_due_at).toBe('string')
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

    it('creates a project with milestone data', async () => {
      const input = { 
        name: 'Project with Milestone',
        color: '#00ff00',
        milestone_title: 'Public Beta',
        milestone_due_at: '2025-09-15T12:00:00Z'
      }
      
      const result = await createProject(input)
      
      expect(result).toHaveProperty('id')
      expect(result.name).toBe(input.name)
      expect(result.color).toBe(input.color)
      expect(result.milestone_title).toBe(input.milestone_title)
      expect(result.milestone_due_at).toBe(input.milestone_due_at)
      expect(result).toHaveProperty('created_at')
    })

    it('creates a project with null milestone values', async () => {
      const input = { 
        name: 'Project without Milestone',
        color: null,
        milestone_title: null,
        milestone_due_at: null
      }
      
      const result = await createProject(input)
      
      expect(result).toHaveProperty('id')
      expect(result.name).toBe(input.name)
      expect(result.color).toBeNull()
      expect(result.milestone_title).toBeNull()
      expect(result.milestone_due_at).toBeNull()
      expect(result).toHaveProperty('created_at')
    })
  })

  describe('patchProject', () => {
    it('calls the patch endpoint with milestone data', async () => {
      const projectId = '1'
      const updateInput = {
        milestone_title: 'Launch Phase',
        milestone_due_at: '2025-10-01T12:00:00Z'
      }
      
      const result = await patchProject(projectId, updateInput)
      
      expect(result.id).toBe(projectId)
      expect(result.milestone_title).toBe(updateInput.milestone_title)
      expect(result.milestone_due_at).toBe(updateInput.milestone_due_at)
    })

    it('calls the patch endpoint to update name and color', async () => {
      const projectId = '1'
      const updateInput = {
        name: 'Updated Name',
        color: '#00ff00'
      }
      
      const result = await patchProject(projectId, updateInput)
      
      expect(result.id).toBe(projectId)
      expect(result.name).toBe(updateInput.name)
      expect(result.color).toBe(updateInput.color)
    })

    it('calls the patch endpoint to clear milestone data', async () => {
      const projectId = '1'
      const updateInput = {
        milestone_title: null,
        milestone_due_at: null
      }
      
      const result = await patchProject(projectId, updateInput)
      
      expect(result.id).toBe(projectId)
      expect(result.milestone_title).toBeNull()
      expect(result.milestone_due_at).toBeNull()
    })
  })
})