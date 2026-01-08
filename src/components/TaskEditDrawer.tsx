import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, Save, Archive } from 'lucide-react'
import { qk } from '../lib/queryKeys'
import { getGoalsTree } from '../api/goals'
import { useTaskUpdateMutation } from '../hooks/useTaskMutation'
import GoalPicker from './GoalPicker'
import type { Task, TaskSize } from '../types'

interface TaskEditDrawerProps {
  task: Task
  isOpen: boolean
  onClose: () => void
}

export default function TaskEditDrawer({ task, isOpen, onClose }: TaskEditDrawerProps) {
  const [formData, setFormData] = useState({
    title: task.title,
    description: task.description || '',
    goal_id: task.goal_id || '',
    soft_due_at: task.soft_due_at ? new Date(task.soft_due_at).toISOString().slice(0, 16) : '',
    hard_due_at: task.hard_due_at ? new Date(task.hard_due_at).toISOString().slice(0, 16) : '',
    isHardDeadline: !!task.hard_due_at,
    size: task.size || '',
    effort_minutes: task.effort_minutes?.toString() || '',
    tags: task.tags.join(', '),
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const dialogRef = useRef<HTMLDivElement>(null)
  const firstInputRef = useRef<HTMLInputElement>(null)

  const goalsTreeQ = useQuery({ queryKey: qk.goals.tree, queryFn: getGoalsTree })
  const updateMutation = useTaskUpdateMutation()
  
  // Reset form data when task changes
  useEffect(() => {
    setFormData({
      title: task.title,
      description: task.description || '',
      goal_id: task.goal_id || '',
      soft_due_at: task.soft_due_at ? new Date(task.soft_due_at).toISOString().slice(0, 16) : '',
      hard_due_at: task.hard_due_at ? new Date(task.hard_due_at).toISOString().slice(0, 16) : '',
      isHardDeadline: !!task.hard_due_at,
      size: task.size || '',
      effort_minutes: task.effort_minutes?.toString() || '',
      tags: task.tags.join(', '),
    })
    setErrors({})
  }, [task])
  
  // Focus management and escape key handling
  useEffect(() => {
    if (isOpen && firstInputRef.current) {
      firstInputRef.current.focus()
    }
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])
  
  // Focus trap
  useEffect(() => {
    if (!isOpen) return
    
    const dialog = dialogRef.current
    if (!dialog) return
    
    const focusableElements = dialog.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement
    
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus()
          e.preventDefault()
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus()
          e.preventDefault()
        }
      }
    }
    
    dialog.addEventListener('keydown', handleTabKey)
    return () => dialog.removeEventListener('keydown', handleTabKey)
  }, [isOpen])
  
  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    }
    
    if (formData.isHardDeadline && !formData.soft_due_at) {
      newErrors.soft_due_at = 'Date is required when marked as hard deadline'
    }
    
    if (formData.soft_due_at && formData.hard_due_at) {
      const softDate = new Date(formData.soft_due_at)
      const hardDate = new Date(formData.hard_due_at)
      if (softDate > hardDate) {
        newErrors.hard_due_at = 'Hard deadline must be after soft due date'
      }
    }
    
    if (formData.isHardDeadline && formData.soft_due_at) {
      const hardDate = new Date(formData.soft_due_at)
      const now = new Date()
      if (hardDate < now) {
        newErrors.soft_due_at = 'Hard deadline cannot be in the past'
      }
    }
    
    if (formData.effort_minutes && (isNaN(Number(formData.effort_minutes)) || Number(formData.effort_minutes) < 0)) {
      newErrors.effort_minutes = 'Effort must be a positive number'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  const handleSave = () => {
    if (!validateForm()) return

    const tags = formData.tags.split(',').map(t => t.trim()).filter(Boolean)
    const patch = {
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      goal_id: formData.goal_id || null,
      soft_due_at: formData.soft_due_at ? new Date(formData.soft_due_at).toISOString() : null,
      hard_due_at: formData.isHardDeadline && formData.soft_due_at
        ? new Date(formData.soft_due_at).toISOString()
        : null,
      size: (formData.size as TaskSize) || null,
      effort_minutes: formData.effort_minutes ? Number(formData.effort_minutes) : null,
      tags,
    }

    updateMutation.mutate({ id: task.id, patch }, {
      onSuccess: () => {
        onClose()
      }
    })
  }

  const handleArchive = () => {
    updateMutation.mutate({ id: task.id, patch: { status: 'archived' } }, {
      onSuccess: () => {
        onClose()
      }
    })
  }
  
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }
  
  const handleHardDeadlineToggle = (checked: boolean) => {
    setFormData(prev => ({ ...prev, isHardDeadline: checked }))
    if (!checked) {
      setFormData(prev => ({ ...prev, hard_due_at: '' }))
    }
    if (errors.soft_due_at || errors.hard_due_at) {
      setErrors(prev => ({ ...prev, soft_due_at: '', hard_due_at: '' }))
    }
  }
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div 
        ref={dialogRef}
        role="dialog" 
        aria-labelledby="edit-task-title"
        aria-modal="true"
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 id="edit-task-title" className="text-lg font-semibold text-gray-900">
            Edit Task
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="px-6 py-4 space-y-4">
          <div>
            <label htmlFor="edit-title" className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              ref={firstInputRef}
              id="edit-title"
              type="text"
              className={`w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary ${
                errors.title ? 'border-red-500' : 'border-gray-300'
              }`}
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
            />
            {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
          </div>
          
          <div>
            <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="edit-description"
              rows={3}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Add task description..."
            />
          </div>
          
          <div>
            <label htmlFor="edit-goal" className="block text-sm font-medium text-gray-700 mb-1">
              Goal
            </label>
            <GoalPicker
              tree={goalsTreeQ.data || []}
              value={formData.goal_id}
              onChange={(goalId) => handleInputChange('goal_id', goalId)}
              placeholder="Select a goal..."
              className={`w-full ${errors.goal_id ? 'border-red-500' : ''}`}
            />
            {errors.goal_id && <p className="text-red-500 text-sm mt-1">{errors.goal_id}</p>}
          </div>
          
          <div>
            <label htmlFor="edit-due-date" className="block text-sm font-medium text-gray-700 mb-1">
              Due Date
            </label>
            <input
              id="edit-due-date"
              type="datetime-local"
              className={`w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary ${
                errors.soft_due_at ? 'border-red-500' : 'border-gray-300'
              }`}
              value={formData.soft_due_at}
              onChange={(e) => handleInputChange('soft_due_at', e.target.value)}
            />
            {errors.soft_due_at && <p className="text-red-500 text-sm mt-1">{errors.soft_due_at}</p>}
            
            <div className="mt-2 flex items-center">
              <input
                id="hard-deadline-toggle"
                type="checkbox"
                className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2"
                checked={formData.isHardDeadline}
                onChange={(e) => handleHardDeadlineToggle(e.target.checked)}
              />
              <label htmlFor="hard-deadline-toggle" className="ml-2 text-sm font-medium text-gray-700">
                Make this a hard deadline
              </label>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-size" className="block text-sm font-medium text-gray-700 mb-1">
                Size/Complexity
              </label>
              <select
                id="edit-size"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary"
                value={formData.size}
                onChange={(e) => handleInputChange('size', e.target.value)}
              >
                <option value="">No size set</option>
                <option value="xs">XS - Very Small</option>
                <option value="s">S - Small</option>
                <option value="m">M - Medium</option>
                <option value="l">L - Large</option>
                <option value="xl">XL - Very Large</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="edit-effort" className="block text-sm font-medium text-gray-700 mb-1">
                Effort (minutes)
              </label>
              <input
                id="edit-effort"
                type="number"
                min="0"
                className={`w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary ${
                  errors.effort_minutes ? 'border-red-500' : 'border-gray-300'
                }`}
                value={formData.effort_minutes}
                onChange={(e) => handleInputChange('effort_minutes', e.target.value)}
                placeholder="e.g. 90"
              />
              {errors.effort_minutes && <p className="text-red-500 text-sm mt-1">{errors.effort_minutes}</p>}
            </div>
          </div>
          
          <div>
            <label htmlFor="edit-tags" className="block text-sm font-medium text-gray-700 mb-1">
              Tags
            </label>
            <input
              id="edit-tags"
              type="text"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary"
              value={formData.tags}
              onChange={(e) => handleInputChange('tags', e.target.value)}
              placeholder="e.g. frontend, bug, urgent"
            />
            <p className="text-xs text-gray-500 mt-1">Separate tags with commas</p>
          </div>
        </div>
        
        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-between rounded-b-2xl">
          <button
            type="button"
            onClick={handleArchive}
            disabled={updateMutation.isPending}
            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-2 border border-red-200"
            title="Archive this task"
          >
            <Archive size={16} />
            Archive
          </button>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              disabled={updateMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              <Save size={16} />
              {updateMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}