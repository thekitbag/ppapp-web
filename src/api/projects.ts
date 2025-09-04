import { api } from './client'
import type { Project } from '../types'

export async function listProjects(): Promise<Project[]> {
  const { data } = await api.get('/projects')
  return data as Project[]
}

export interface CreateProjectInput {
  name: string
  color?: string | null
  milestone_title?: string | null
  milestone_due_at?: string | null
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const { data } = await api.post('/projects', input)
  return data as Project
}

export async function patchProject(id: string, input: Partial<CreateProjectInput>): Promise<Project> {
  const { data } = await api.patch(`/projects/${id}`, input)
  return data as Project
}
