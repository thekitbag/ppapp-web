import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Calendar, Flag, Target, Edit, Plus } from 'lucide-react'
import { listTasks, createTask } from '../../api/tasks'
import { listProjects } from '../../api/projects'
import { linkTasksToGoal } from '../../api/goals'
import { qk } from '../../lib/queryKeys'
import { Task, TaskStatus } from '../../types'
import { STATUS_ORDER } from '../../constants'

interface WeeklyGoalTaskListProps {
  goalId: string
  onTaskClick: (task: Task) => void
}

function getStatusColor(status: TaskStatus): string {
  switch (status) {
    case 'today': return 'bg-red-100 text-red-800'
    case 'doing': return 'bg-yellow-100 text-yellow-800'
    case 'week': return 'bg-blue-100 text-blue-800'
    case 'backlog': return 'bg-gray-100 text-gray-800'
    case 'waiting': return 'bg-purple-100 text-purple-800'
    case 'done': return 'bg-green-100 text-green-800'
    case 'archived': return 'bg-gray-50 text-gray-500'
    default: return 'bg-gray-100 text-gray-800'
  }
}

function getStatusLabel(status: TaskStatus): string {
  switch (status) {
    case 'today': return 'Today'
    case 'doing': return 'Doing'
    case 'week': return 'Week'
    case 'backlog': return 'Backlog'
    case 'waiting': return 'Waiting'
    case 'done': return 'Done'
    case 'archived': return 'Archived'
    default: return status
  }
}

function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
      {getStatusLabel(status)}
    </span>
  )
}

function DueBadge({ task }: { task: Task }) {
  const dueDate = task.hard_due_at || task.soft_due_at
  if (!dueDate) return null

  const isHard = !!task.hard_due_at
  const date = new Date(dueDate)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  let label = ''
  let colorClass = ''

  if (diffDays < 0) {
    label = 'Overdue'
    colorClass = 'bg-red-100 text-red-800'
  } else if (diffDays === 0) {
    label = 'Today'
    colorClass = isHard ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
  } else if (diffDays === 1) {
    label = 'Tomorrow'
    colorClass = isHard ? 'bg-orange-100 text-orange-800' : 'bg-yellow-100 text-yellow-800'
  } else if (diffDays <= 7) {
    label = `${diffDays}d`
    colorClass = isHard ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
  } else {
    label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    colorClass = 'bg-gray-100 text-gray-800'
  }

  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
      {isHard ? <Flag size={12} /> : <Calendar size={12} />}
      {label}
    </div>
  )
}

function ProjectChip({ project }: { project: any }) {
  if (!project) return null

  return (
    <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
      <div
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: project.color || '#3B82F6' }}
      />
      <span>{project.name}</span>
    </div>
  )
}

function TaskRow({ task, project, onClick }: { task: Task; project?: any; onClick: () => void }) {
  return (
    <div
      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors group"
      onClick={onClick}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <h4 className="font-medium text-gray-900 truncate flex-1">{task.title}</h4>
          <button className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600 transition-all">
            <Edit size={14} />
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={task.status} />
          <DueBadge task={task} />
          <ProjectChip project={project} />
        </div>
      </div>
    </div>
  )
}

export default function WeeklyGoalTaskList({ goalId, onTaskClick }: WeeklyGoalTaskListProps) {
  const qc = useQueryClient()
  const [newTaskTitle, setNewTaskTitle] = useState('')

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: [qk.tasks.all, { goal_id: goalId }],
    queryFn: () => listTasks({ goal_id: goalId }),
    enabled: !!goalId
  })

  const { data: projects = [] } = useQuery({
    queryKey: qk.projects.all,
    queryFn: listProjects
  })

  const projectsById = useMemo(() => {
    return projects.reduce((acc, p) => ({ ...acc, [p.id]: p }), {} as Record<string, any>)
  }, [projects])

  // Mutation for creating and linking tasks
  const createAndLinkTaskMutation = useMutation({
    mutationFn: async (title: string) => {
      // Generate client request ID for idempotency
      const clientRequestId = `${goalId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // Create the task
      const newTask = await createTask({
        title,
        status: 'week',
        tags: [],
        project_id: null,
        goal_id: goalId,
        hard_due_at: null,
        soft_due_at: null,
        effort_minutes: null,
        client_request_id: clientRequestId
      })

      // Link to goal
      await linkTasksToGoal(goalId, [newTask.id])

      return newTask
    },
    onMutate: async (title: string) => {
      // Cancel any outgoing refetches
      await qc.cancelQueries({ queryKey: [qk.tasks.all, { goal_id: goalId }] })
      await qc.cancelQueries({ queryKey: ['tasks', 'filtered'] })

      // Snapshot the previous values
      const previousTasks = qc.getQueryData([qk.tasks.all, { goal_id: goalId }])
      const previousFilteredQueries = qc.getQueriesData({
        predicate: (query) => query.queryKey[0] === 'tasks' && query.queryKey[1] === 'filtered'
      })

      // Optimistically update to the new value
      const tempId = `temp-${Date.now()}`
      const optimisticTask: Task = {
        id: tempId,
        title,
        status: 'week',
        sort_order: 0, // Will be at top
        tags: [],
        project_id: null,
        goal_id: goalId,
        hard_due_at: null,
        soft_due_at: null,
        effort_minutes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Update weekly goal task list
      qc.setQueryData([qk.tasks.all, { goal_id: goalId }], (old: Task[] | undefined) => {
        return [optimisticTask, ...(old || [])]
      })

      // Update TaskBoard filtered queries that include 'week' status
      qc.getQueriesData({
        predicate: (query) => query.queryKey[0] === 'tasks' && query.queryKey[1] === 'filtered'
      }).forEach(([queryKey, data]) => {
        if (Array.isArray(data)) {
          const filters = queryKey[2] as any
          // Add to queries that include 'week' status or have no status filter
          if (!filters?.statuses || filters.statuses.includes('week')) {
            qc.setQueryData(queryKey, [optimisticTask, ...data])
          }
        }
      })

      return { previousTasks, previousFilteredQueries, tempId }
    },
    onError: (err, _title, context) => {
      // If the mutation fails, use the context to roll back
      if (context?.previousTasks) {
        qc.setQueryData([qk.tasks.all, { goal_id: goalId }], context.previousTasks)
      }

      // Roll back filtered queries
      if (context?.previousFilteredQueries) {
        context.previousFilteredQueries.forEach(([queryKey, data]) => {
          qc.setQueryData(queryKey, data)
        })
      }

      console.error('Failed to create task:', err)
    },
    onSuccess: (newTask, _title, context) => {
      // Replace the optimistic task with the real one in goal task list
      qc.setQueryData([qk.tasks.all, { goal_id: goalId }], (old: Task[] | undefined) => {
        if (!old) return [newTask]
        return old.map(task => task.id === context?.tempId ? newTask : task)
      })

      // Replace the optimistic task in filtered queries
      qc.getQueriesData({
        predicate: (query) => query.queryKey[0] === 'tasks' && query.queryKey[1] === 'filtered'
      }).forEach(([queryKey, data]) => {
        if (Array.isArray(data)) {
          const filters = queryKey[2] as any
          // Update queries that include 'week' status or have no status filter
          if (!filters?.statuses || filters.statuses.includes('week')) {
            qc.setQueryData(queryKey, (old: Task[] | undefined) => {
              if (!old) return [newTask]
              return old.map(task => task.id === context?.tempId ? newTask : task)
            })
          }
        }
      })

      // Invalidate queries to ensure consistency across all views
      qc.invalidateQueries({ queryKey: [qk.tasks.all] })
      qc.invalidateQueries({ queryKey: ['tasks', 'filtered'] })
      qc.invalidateQueries({ queryKey: qk.tasks.byStatuses(['backlog', 'week', 'doing', 'done']) })

      // Clear the input
      setNewTaskTitle('')
    }
  })

  // Handler functions
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newTaskTitle.trim() && !createAndLinkTaskMutation.isPending) {
      createAndLinkTaskMutation.mutate(newTaskTitle.trim())
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  // Sort tasks by status priority, then by sort_order
  const sortedTasks = [...tasks].sort((a, b) => {
    const statusA = STATUS_ORDER.indexOf(a.status)
    const statusB = STATUS_ORDER.indexOf(b.status)

    if (statusA !== statusB) {
      return statusA - statusB
    }

    return (a.sort_order || 0) - (b.sort_order || 0)
  })

  if (isLoading) {
    return (
      <div className="mt-3 space-y-2">
        <div className="h-16 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-16 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    )
  }

  if (sortedTasks.length === 0) {
    return (
      <div className="mt-3 space-y-3">
        <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <Target size={20} className="mx-auto mb-2 text-gray-400" />
          <p className="text-sm">No tasks yet — add one to drive this goal forward.</p>
        </div>

        {/* Quick Add Form */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Add task"
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={createAndLinkTaskMutation.isPending}
          />
          <button
            type="submit"
            disabled={!newTaskTitle.trim() || createAndLinkTaskMutation.isPending}
            className="inline-flex items-center justify-center w-8 h-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={16} />
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="mt-3 space-y-2">
      {sortedTasks.map(task => {
        const project = task.project_id ? projectsById[task.project_id] : undefined
        return (
          <TaskRow
            key={task.id}
            task={task}
            project={project}
            onClick={() => onTaskClick(task)}
          />
        )
      })}

      {/* Quick Add Form */}
      <form onSubmit={handleSubmit} className="flex gap-2 mt-3">
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Add task"
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={createAndLinkTaskMutation.isPending}
        />
        <button
          type="submit"
          disabled={!newTaskTitle.trim() || createAndLinkTaskMutation.isPending}
          className="inline-flex items-center justify-center w-8 h-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={16} />
        </button>
      </form>
    </div>
  )
}