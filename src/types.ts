export type TaskStatus = 'backlog' | 'doing' | 'week' | 'done' | 'waiting' | 'today' | 'archived'

export type TaskSize = 'xs' | 's' | 'm' | 'l' | 'xl'

export type GoalCadence = 'annual' | 'quarterly' | 'weekly'

export interface Task {
  id: string
  title: string
  description?: string | null
  tags: string[]
  status: TaskStatus
  sort_order: number
  size?: TaskSize | null
  project_id?: string | null
  goal_id?: string | null
  goals?: { id: string; title: string }[]
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
  milestone_title?: string | null
  milestone_due_at?: string | null
  created_at: string
}

export interface Goal {
  id: string
  title: string
  description?: string | null
  type?: GoalCadence | null
  created_at: string
}

export interface KeyResult {
  id: string
  goal_id: string
  name: string
  target_value: number
  unit: string
  baseline_value?: number | null
  created_at: string
}

export interface GoalDetail {
  goal: Goal
  krs: KeyResult[]
  tasks: Task[]
}