export type TaskStatus = 'backlog' | 'doing' | 'week' | 'done' | 'waiting' | 'today' | 'archived'

export type TaskSize = 1 | 2 | 3 | 5 | 8 | 13 | 21

export type GoalCadence = 'annual' | 'quarterly' | 'weekly'

export type GoalStatus = 'on_target' | 'at_risk' | 'off_target'

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
  completed_at?: string | null
  created_at: string
  updated_at: string
  // Client-side only optimistic fields
  __optimistic?: boolean
  __state?: 'syncing' | 'error' | 'ok'
  __tempId?: string
  __clientRequestId?: string
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
  parent_goal_id?: string | null
  end_date?: string | null
  status?: GoalStatus | null
  is_closed?: boolean
  closed_at?: string | null
  is_archived?: boolean
  priority?: number
  created_at: string
  updated_at?: string
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

export interface GoalNode extends Goal {
  children: GoalNode[]
  taskCount?: number
}

export interface GoalGroup {
  goal_id: string | null
  goal_title: string | null
  total_size: number
}

export interface ReportSummary {
  impact_score: number
  start_date: string
  end_date: string
  groups: GoalGroup[]
}

export interface BreakdownEntry {
  goal_id: string | null
  goal_title: string | null
  goal_type?: 'annual' | 'quarterly' | 'weekly' | null
  points: number
  percentage: number
  has_children: boolean
}

export interface ReportBreakdown {
  parent_id: string | null
  total_impact: number
  breakdown: BreakdownEntry[]
}

export type TrendGranularity = 'day' | 'week' | 'month'

export interface TrendBucket {
  bucket_start: string
  bucket_end: string
  /** Axis label, formatted server-side so UTC buckets are never re-dated by the browser. */
  label: string
  points: number
  task_count: number
}

export interface TrendSeries {
  goal_id: string | null
  goal_title: string
  is_no_goal: boolean
  /** Stable position of this goal at the current drill level — keys its colour. */
  order_index: number
  points: number
  /** Index-aligned to ReportTrends.buckets. */
  values: number[]
}

export interface TrendStats {
  total_points: number
  task_count: number
  days_in_period: number
  active_days: number
  avg_points_per_day: number
  avg_points_per_active_day: number
  avg_points_per_week: number
  best_day: string | null
  best_day_points: number
}

export interface ReportTrends {
  start_date: string
  end_date: string
  granularity: TrendGranularity
  parent_id: string | null
  total_points: number
  buckets: TrendBucket[]
  series: TrendSeries[]
  stats: TrendStats
}
