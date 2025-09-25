import { api } from './client'
import type { Task, TaskStatus } from '../types'
import { BUCKETS } from '../constants'

export interface TaskFilters {
  statuses?: TaskStatus[]
  project_id?: string
  goal_id?: string
  search?: string
  tags?: string[]
  due_date_start?: string
  due_date_end?: string
}

export async function listTasks(filters: TaskFilters = {}): Promise<Task[]> {
  const params = new URLSearchParams()
  
  // Add status filters (default to all statuses if none provided)
  const statuses = filters.statuses || [...BUCKETS, 'done']
  statuses.forEach(s => params.append('status', s))
  
  // Add other filters
  if (filters.project_id) params.append('project_id', filters.project_id)
  if (filters.goal_id) params.append('goal_id', filters.goal_id)
  if (filters.search) params.append('search', filters.search)
  if (filters.tags?.length) filters.tags.forEach(tag => params.append('tags', tag))
  if (filters.due_date_start) params.append('due_date_start', filters.due_date_start)
  if (filters.due_date_end) params.append('due_date_end', filters.due_date_end)
  
  const { data } = await api.get('/tasks', { params })
  return data as Task[]
}

// Keep backward compatibility
export async function listTasksByStatuses(statuses: TaskStatus[]): Promise<Task[]> {
  return listTasks({ statuses })
}

type CreateTaskInput = Omit<Task, 'id' | 'sort_order' | 'created_at' | 'updated_at' | '__optimistic' | '__state' | '__tempId' | '__clientRequestId'> & {
  status: TaskStatus
  insert_at?: 'top' | 'bottom'
  client_request_id?: string
}
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