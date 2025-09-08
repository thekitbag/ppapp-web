import { api } from './client'
import type { Task, TaskStatus } from '../types'

export async function listTasks(statuses: TaskStatus[]): Promise<Task[]> {
  const params = new URLSearchParams()
  statuses.forEach(s => params.append('status', s))
  const { data } = await api.get('/tasks', { params })
  return data as Task[]
}

type CreateTaskInput = Omit<Task, 'id' | 'sort_order' | 'created_at' | 'updated_at'> & { status: TaskStatus }
export async function createTask(input: CreateTaskInput): Promise<Task> {
  const { data } = await api.post('/tasks', input)
  return data as Task
}

type TaskCreate = Omit<Task, 'id' | 'sort_order' | 'created_at' | 'updated_at'>
type UpdateTaskInput = Partial<TaskCreate & { status: TaskStatus; sort_order: number }>

export async function updateTask(id: string, body: UpdateTaskInput): Promise<Task> {
  const { data } = await api.patch(`/tasks/${id}`, body)
  return data as Task
}

// Keep legacy function for backward compatibility
type PatchTaskInput = Partial<Omit<Task, 'id' | 'tags'>>
export async function patchTask(id: string | number, input: PatchTaskInput): Promise<Task> {
  const { data } = await api.patch(`/tasks/${id}`, input)
  return data as Task
}

export async function updateTaskOrder(id: string | number, sort_order: number): Promise<Task> {
  const { data } = await api.patch(`/tasks/${id}` as string, { sort_order })
  return data as Task
}

export async function getBacklogTasks(): Promise<Task[]> {
  const { data } = await api.get('/tasks', { params: { status: 'backlog' } })
  return data as Task[]
}

export async function promoteTasksToWeek(task_ids: Array<string | number>): Promise<string[]> {
  const { data } = await api.post('/tasks/promote-week', { task_ids })
  return data as string[]
}