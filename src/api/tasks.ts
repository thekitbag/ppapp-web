import { api } from './client'
import type { Task, TaskStatus } from '../types'

export async function listTasks(): Promise<Task[]> {
  const { data } = await api.get('/tasks')
  return data as Task[]
}

export async function createTask(input: { title: string; tags: string[]; project_id?: string | null }): Promise<Task> {
  const { data } = await api.post('/tasks', input)
  return data as Task
}

export async function updateTaskStatus(id: string | number, status: TaskStatus): Promise<Task> {
  const { data } = await api.patch(`/tasks/${id}` as string, { status })
  return data as Task
}

export async function updateTaskOrder(id: string | number, sort_order: number): Promise<Task> {
  const { data } = await api.patch(`/tasks/${id}` as string, { sort_order })
  return data as Task
}

export async function promoteTasksToWeek(task_ids: Array<string | number>): Promise<{ moved: number } | any> {
  const { data } = await api.post('/tasks/promote-week', { task_ids })
  return data
}
