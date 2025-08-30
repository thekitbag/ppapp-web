import { api } from './client'
import type { Task, TaskStatus } from '../types'

export async function listTasks(statuses: TaskStatus[]): Promise<Task[]> {
  const params = new URLSearchParams()
  statuses.forEach(s => params.append('status', s))
  const { data } = await api.get('/tasks', { params })
  return data as Task[]
}

type CreateTaskInput = Omit<Task, 'id' | 'sort_order' | 'status'> & { status: TaskStatus }
export async function createTask(input: CreateTaskInput): Promise<Task> {
  const { data } = await api.post('/tasks', input)
  return data as Task
}

type PatchTaskInput = Partial<Omit<Task, 'id' | 'tags'>>
export async function patchTask(id: string | number, input: PatchTaskInput): Promise<Task> {
  const { data } = await api.patch(`/tasks/${id}`, input)
  return data as Task
}
