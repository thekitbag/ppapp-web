import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { GoalCadence, GoalStatus, Goal } from '../../types'

interface GoalCreateModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: {
    title: string
    description?: string
    type: GoalCadence
    parent_goal_id?: string
    end_date?: string
    status: GoalStatus
  }) => void
  isLoading?: boolean
  defaultType?: GoalCadence
  parentId?: string
  editGoal?: Goal
}

export default function GoalCreateModal({
  open,
  onClose,
  onSubmit,
  isLoading = false,
  defaultType = 'annual',
  parentId,
  editGoal
}: GoalCreateModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: defaultType,
    end_date: '',
    status: 'on_target' as GoalStatus
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      if (editGoal) {
        // Editing mode - populate with existing data
        const endDate = editGoal.end_date ? new Date(editGoal.end_date).toISOString().slice(0, 16) : ''
        setFormData({
          title: editGoal.title,
          description: editGoal.description || '',
          type: editGoal.type || 'annual',
          end_date: endDate,
          status: editGoal.status || 'on_target'
        })
      } else {
        // Creation mode - use defaults
        setFormData({
          title: '',
          description: '',
          type: defaultType,
          end_date: '',
          status: 'on_target'
        })
      }
      setErrors({})
    }
  }, [open, defaultType, editGoal])

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    }

    if (!formData.end_date) {
      newErrors.end_date = 'End date is required'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Convert to ISO string
    const endDate = new Date(formData.end_date).toISOString()

    onSubmit({
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      type: formData.type,
      parent_goal_id: parentId,
      end_date: endDate,
      status: formData.status
    })
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const getTypeLabel = (type: GoalCadence) => {
    switch (type) {
      case 'annual': return 'Annual Goal'
      case 'quarterly': return 'Quarterly Goal'
      case 'weekly': return 'Weekly Goal'
      default: return 'Goal'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {editGoal ? 'Edit' : 'Create'} {getTypeLabel(formData.type)}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="goal-title" className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              id="goal-title"
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.title ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter goal title"
              autoFocus
            />
            {errors.title && (
              <p className="text-red-500 text-sm mt-1">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="goal-description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="goal-description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Optional description"
              rows={3}
            />
          </div>

          {/* End Date */}
          <div>
            <label htmlFor="goal-end-date" className="block text-sm font-medium text-gray-700 mb-1">
              End Date *
            </label>
            <input
              id="goal-end-date"
              type="datetime-local"
              value={formData.end_date}
              onChange={(e) => handleInputChange('end_date', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.end_date ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.end_date && (
              <p className="text-red-500 text-sm mt-1">{errors.end_date}</p>
            )}
          </div>

          {/* Status */}
          <div>
            <label htmlFor="goal-status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="goal-status"
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="on_target">On Target</option>
              <option value="at_risk">At Risk</option>
              <option value="off_target">Off Target</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
              disabled={isLoading || !formData.title.trim()}
            >
              {isLoading ? (editGoal ? 'Saving...' : 'Creating...') : (editGoal ? 'Save Changes' : 'Create Goal')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}