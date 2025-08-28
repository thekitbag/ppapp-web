export type TaskStatus = 'backlog' | 'doing' | 'week' | 'done' | 'waiting' | 'today'

export interface Task {
  id: string
  title: string
  tags: string[]
  status: TaskStatus
  project_id?: string | null
  sort_order?: number
}