import { api } from './client'
import type { Project } from '../types'

export async function listProjects(): Promise<Project[]> {
  const { data } = await api.get('/api/v1/projects')
  return data as Project[]
}

export async function createProject(input: { name: string, color?: string }): Promise<Project> {
  const { data } = await api.post('/api/v1/projects', input)
  return data as Project
}
