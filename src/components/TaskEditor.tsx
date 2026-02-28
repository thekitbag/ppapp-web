import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Save } from 'lucide-react'
import { qk } from '../lib/queryKeys'
import { getGoalsTree } from '../api/goals'
import { createTask, updateTask } from '../api/tasks'
import GoalPicker from './GoalPicker'
import type { Task, TaskStatus, TaskSize } from '../types'

interface TaskEditorProps {
  task?: Task // Optional - if provided, we're editing; if not, we're creating
  defaultStatus?: TaskStatus // Default status for new tasks
  isOpen: boolean
  onClose: () => void
  onSuccess?: (task: Task) => void // Called after successful create/update
}

interface TaskFormData {
  title: string
  description: string
  goal_id: string
  soft_due_at: string
  hard_due_at: string
  isHardDeadline: boolean
  size: string
  tags: string
  status: TaskStatus
}

export default function TaskEditor({ task, defaultStatus = 'week', isOpen, onClose, onSuccess }: TaskEditorProps) {
  const qc = useQueryClient()
  const isEditing = !!task
  
  const [formData, setFormData] = useState<TaskFormData>({
    title: task?.title || '',
    description: task?.description || '',
    goal_id: task?.goal_id || '',
    soft_due_at: task?.soft_due_at ? new Date(task.soft_due_at).toISOString().slice(0, 16) : '',
    hard_due_at: task?.hard_due_at ? new Date(task.hard_due_at).toISOString().slice(0, 16) : '',
    isHardDeadline: !!task?.hard_due_at,
    size: task?.size?.toString() || '',
    tags: task?.tags.join(', ') || '',
    status: task?.status || defaultStatus,
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const titleInputRef = useRef<HTMLInputElement>(null)

  // Reset form when task changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: task?.title || '',
        description: task?.description || '',
        goal_id: task?.goal_id || '',
        soft_due_at: task?.soft_due_at ? new Date(task.soft_due_at).toISOString().slice(0, 16) : '',
        hard_due_at: task?.hard_due_at ? new Date(task.hard_due_at).toISOString().slice(0, 16) : '',
        isHardDeadline: !!task?.hard_due_at,
        size: task?.size?.toString() || '',
        tags: task?.tags.join(', ') || '',
        status: task?.status || defaultStatus,
      })
      setErrors({})

      // Focus title input
      setTimeout(() => titleInputRef.current?.focus(), 100)
    }
  }, [isOpen, task, defaultStatus])

  // Validate hard due date
  useEffect(() => {
    if (formData.isHardDeadline && formData.hard_due_at) {
      const hardDate = new Date(formData.hard_due_at)
      const now = new Date()
      if (hardDate < now) {
        setErrors(prev => ({ ...prev, hard_due_at: 'Hard deadline cannot be in the past' }))
      } else {
        setErrors(prev => {
          const { hard_due_at, ...rest } = prev
          return rest
        })
      }
    } else {
      setErrors(prev => {
        const { hard_due_at, ...rest } = prev
        return rest
      })
    }
  }, [formData.hard_due_at, formData.isHardDeadline])

  const goalsQ = useQuery({ queryKey: qk.goals.tree, queryFn: getGoalsTree })

  const createMutation = useMutation({
    mutationFn: createTask,
    onSuccess: (newTask) => {
      // Update the tasks cache
      qc.setQueryData(['tasks', 'filtered'], (old: Task[] = []) => {
        return [newTask, ...old].sort((a, b) => a.sort_order - b.sort_order)
      })
      qc.invalidateQueries({ queryKey: qk.tasks.byStatuses(['backlog', 'week', 'doing', 'done']) })
      onSuccess?.(newTask)
      onClose()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...input }: { id: string } & Partial<any>) => updateTask(id, input),
    onSuccess: (updatedTask) => {
      // Update the tasks cache
      qc.setQueryData(['tasks', 'filtered'], (old: Task[] = []) => {
        return old.map(t => t.id === updatedTask.id ? updatedTask : t)
      })
      qc.invalidateQueries({ queryKey: qk.tasks.byStatuses(['backlog', 'week', 'doing', 'done']) })
      onSuccess?.(updatedTask)
      onClose()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields
    const newErrors: Record<string, string> = {}
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    }
    
    // Check hard deadline validation
    if (formData.isHardDeadline && formData.hard_due_at) {
      const hardDate = new Date(formData.hard_due_at)
      const now = new Date()
      if (hardDate < now) {
        newErrors.hard_due_at = 'Hard deadline cannot be in the past'
      }
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    const taskData = {
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      goal_id: formData.goal_id || null,
      soft_due_at: formData.soft_due_at ? new Date(formData.soft_due_at).toISOString() : null,
      hard_due_at: formData.isHardDeadline && formData.hard_due_at ? new Date(formData.hard_due_at).toISOString() : null,
      size: formData.size ? (parseInt(formData.size) as TaskSize) : null,
      tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
      status: formData.status,
    }

    if (isEditing && task) {
      updateMutation.mutate({ id: task.id, ...taskData })
    } else {
      createMutation.mutate({ ...taskData, insert_at: 'top' })
    }
  }

  const handleInputChange = (field: keyof TaskFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear errors when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const { [field]: _, ...rest } = prev
        return rest
      })
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending
  const hasValidationErrors = Object.keys(errors).length > 0

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col" role="dialog" aria-modal="true" aria-labelledby="task-editor-title">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 id="task-editor-title" className="text-xl font-semibold">
            {isEditing ? 'Edit Task' : 'Create New Task'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors"
            disabled={isLoading}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <input
              id="title"
              ref={titleInputRef}
              type="text"
              required
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.title ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="What needs to be done?"
            />
            {errors.title && (
              <p className="text-sm text-red-600 mt-1">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Add more details..."
            />
          </div>

          {/* Status/Bucket (only for new tasks) */}
          {!isEditing && (
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                Bucket
              </label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value as TaskStatus)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="backlog">Backlog</option>
                <option value="week">This Week</option>
                <option value="today">Today</option>
                <option value="doing">Doing</option>
              </select>
            </div>
          )}

          {/* Goal */}
          <div>
            <label htmlFor="goal" className="block text-sm font-medium text-gray-700 mb-2">
              Goal
            </label>
            <GoalPicker
              tree={goalsQ.data || []}
              value={formData.goal_id}
              onChange={(goalId) => handleInputChange('goal_id', goalId)}
              placeholder="Select a goal..."
              className="w-full"
            />
          </div>

          {/* Due Dates */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Due Date
            </label>
            <div className="space-y-3">
              <div>
                <label htmlFor="soft_due_at" className="block text-xs text-gray-500 mb-1">
                  Soft deadline
                </label>
                <input
                  id="soft_due_at"
                  type="datetime-local"
                  value={formData.soft_due_at}
                  onChange={(e) => handleInputChange('soft_due_at', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div className="flex items-center gap-3">
                <input
                  id="is_hard_deadline"
                  type="checkbox"
                  checked={formData.isHardDeadline}
                  onChange={(e) => handleInputChange('isHardDeadline', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_hard_deadline" className="text-sm text-gray-700">
                  Hard deadline
                </label>
              </div>
              
              {formData.isHardDeadline && (
                <div>
                  <input
                    id="hard_due_at"
                    type="datetime-local"
                    value={formData.hard_due_at}
                    onChange={(e) => handleInputChange('hard_due_at', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.hard_due_at ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.hard_due_at && (
                    <p className="text-sm text-red-600 mt-1">{errors.hard_due_at}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Size */}
          <div>
            <label htmlFor="size" className="block text-sm font-medium text-gray-700 mb-2">
              Size
            </label>
            <select
              id="size"
              value={formData.size}
              onChange={(e) => handleInputChange('size', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">No size</option>
              <option value="1">1 — Trivial</option>
              <option value="2">2 — Small</option>
              <option value="3">3 — Easy</option>
              <option value="5">5 — Medium</option>
              <option value="8">8 — Large</option>
              <option value="13">13 — Complex</option>
              <option value="21">21 — Very Complex</option>
            </select>
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <input
              id="tags"
              type="text"
              value={formData.tags}
              onChange={(e) => handleInputChange('tags', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="urgent, research, design (comma-separated)"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!formData.title.trim() || hasValidationErrors || isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Save size={16} />
            {isLoading ? 'Saving...' : isEditing ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}