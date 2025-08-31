import { api } from './client'
import type { Task, TaskStatus } from '../types'

export async function listTasks(statuses: TaskStatus[]): Promise<Task[]> {
  const params = new URLSearchParams()
  statuses.forEach(s => params.append('status', s))
  const { data } = await api.get('/api/v1/tasks', { params })
  return data as Task[]
}

type CreateTaskInput = Omit<Task, 'id' | 'sort_order' | 'status'> & { status: TaskStatus }
export async function createTask(input: CreateTaskInput): Promise<Task> {
  const { data } = await api.post('/api/v1/tasks', input)
  return data as Task
}

type PatchTaskInput = Partial<Omit<Task, 'id' | 'tags'>>
export async function patchTask(id: string | number, input: PatchTaskInput): Promise<Task> {
  const { data } = await api.patch(`/api/v1/tasks/${id}`, input)
  return data as Task
}

export async function updateTaskOrder(id: string | number, sort_order: number): Promise<Task> {
  const { data } = await api.patch(`/api/v1/tasks/${id}` as string, { sort_order })
  return data as Task
}

export async function promoteTasksToWeek(task_ids: Array<string | number>): Promise<{ moved: number } | any> {
  const { data } = await api.post('/api/v1/tasks/promote-week', { task_ids })
  return data
}