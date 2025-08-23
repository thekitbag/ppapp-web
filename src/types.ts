export type TaskStatus = 'inbox' | 'todo' | 'doing' | 'done'

export interface Task {
  id: string
  title: string
  tags: string[]
  status: TaskStatus
  project_id?: string | null
  sort_order?: number
}