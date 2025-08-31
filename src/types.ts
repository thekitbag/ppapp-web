export type TaskStatus = 'backlog' | 'doing' | 'week' | 'done' | 'waiting' | 'today'

export interface Task {
  id: string
  title: string
  tags: string[]
  status: TaskStatus
  sort_order: number
  project_id?: string | null
  goal_id?: string | null
  hard_due_at?: string | null
  soft_due_at?: string | null
  effort_minutes?: number | null
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  name: string
  color?: string | null
  created_at: string
}

export interface Goal {
  id: string
  title: string
  type?: string | null
  created_at: string
}