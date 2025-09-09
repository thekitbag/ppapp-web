import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { qk } from '../lib/queryKeys'
import { getGoalsTree, listGoalsByType, createGoal, updateGoal, type CreateGoalInput } from '../api/goals'
import { Plus, Target, ChevronDown, ChevronRight, Calendar, AlertTriangle } from 'lucide-react'

import type { GoalCadence, GoalNode, GoalStatus } from '../types'

type TabType = 'annual' | 'quarterly' | 'weekly' | 'all'

interface GoalFormData extends CreateGoalInput {
  title: string
  description?: string
  type?: GoalCadence
  parent_goal_id?: string | null
  end_date?: string | null
  status?: GoalStatus | null
}

function GoalModal({ 
  open, 
  onClose, 
  goal, 
  onSubmit, 
  isLoading,
  availableParents = [],
  defaultType = 'quarterly'
}: { 
  open: boolean
  onClose: () => void
  goal?: any
  onSubmit: (data: CreateGoalInput) => void
  isLoading?: boolean
  availableParents?: GoalNode[]
  defaultType?: GoalCadence
}) {
  const [formData, setFormData] = useState<GoalFormData>({
    title: goal?.title || '',
    description: goal?.description || '',
    type: goal?.type || defaultType,
    parent_goal_id: goal?.parent_goal_id || null,
    end_date: goal?.end_date ? goal.end_date.slice(0, 16) : '',
    status: goal?.status || 'on_target'
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reset form when goal changes or modal opens for creation
  useEffect(() => {
    if (open) {
      setFormData({
        title: goal?.title || '',
        description: goal?.description || '',
        type: goal?.type || defaultType,
        parent_goal_id: goal?.parent_goal_id || null,
        end_date: goal?.end_date ? goal.end_date.slice(0, 16) : '',
        status: goal?.status || 'on_target'
      })
      setErrors({})
    }
  }, [open, goal, defaultType])

  // Close on Escape key when modal is open
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

    if (!formData.title?.trim()) {
      newErrors.title = 'Title is required'
    }
    if (!formData.end_date) {
      newErrors.end_date = 'End date is required'
    }
    if (formData.type === 'quarterly' && !formData.parent_goal_id) {
      newErrors.parent_goal_id = 'Quarterly goals must have an annual parent'
    }
    if (formData.type === 'weekly' && !formData.parent_goal_id) {
      newErrors.parent_goal_id = 'Weekly goals must have a quarterly parent'
    }

    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    const isoEndDate = formData.end_date ? new Date(formData.end_date).toISOString() : null

    onSubmit({
      title: formData.title!.trim(),
      description: formData.description?.trim() || null,
      type: formData.type || null,
      parent_goal_id: formData.parent_goal_id,
      end_date: isoEndDate,
      status: formData.status || null
    })
  }

  const getParentOptions = () => {
    if (formData.type === 'quarterly') {
      return availableParents.filter(g => g.type === 'annual')
    }
    if (formData.type === 'weekly') {
      return availableParents.flatMap(a => a.children).filter(g => g.type === 'quarterly')
    }
    return []
  }

  const parentOptions = getParentOptions()

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div 
        className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="goal-modal-title"
      >
        <h2 id="goal-modal-title" className="text-xl font-semibold mb-4">
          {goal ? 'Edit Goal' : 'Create New Goal'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Goal Title *
            </label>
            <input
              id="title"
              type="text"
              required
              className={`w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 ${errors.title ? 'border-red-500' : ''}`}
              placeholder="e.g. Improve Retention"
              value={formData.title}
              onChange={(e) => {
                setFormData({ ...formData, title: e.target.value })
                if (errors.title) setErrors({ ...errors, title: '' })
              }}
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              className="w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 h-20"
              placeholder="What this goal aims to achieve..."
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
              Type *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['annual', 'quarterly', 'weekly'] as GoalCadence[]).map(type => (
                <label key={type} className="flex items-center space-x-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="type"
                    value={type}
                    checked={formData.type === type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as GoalCadence, parent_goal_id: null })}
                    className="text-blue-600"
                  />
                  <span className="text-sm capitalize">{type}</span>
                </label>
              ))}
            </div>
          </div>

          {formData.type !== 'annual' && (
            <div>
              <label htmlFor="parent" className="block text-sm font-medium text-gray-700 mb-1">
                {formData.type === 'quarterly' ? 'Annual Goal' : 'Quarterly Goal'} *
              </label>
              {parentOptions.length > 0 ? (
                <select
                  id="parent"
                  className={`w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 ${errors.parent_goal_id ? 'border-red-500' : ''}`}
                  value={formData.parent_goal_id || ''}
                  onChange={(e) => {
                    setFormData({ ...formData, parent_goal_id: e.target.value || null })
                    if (errors.parent_goal_id) setErrors({ ...errors, parent_goal_id: '' })
                  }}
                >
                  <option value="">Select parent goal</option>
                  {parentOptions.map(parent => (
                    <option key={parent.id} value={parent.id}>{parent.title}</option>
                  ))}
                </select>
              ) : (
                <div className="w-full border border-gray-300 rounded-xl px-3 py-2 bg-gray-50 text-gray-500">
                  {formData.type === 'quarterly' 
                    ? 'No annual goals available. Create an annual goal first.'
                    : 'No quarterly goals available. Create a quarterly goal first.'
                  }
                </div>
              )}
              {errors.parent_goal_id && <p className="text-red-500 text-xs mt-1">{errors.parent_goal_id}</p>}
            </div>
          )}

          <div>
            <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1">
              End Date *
            </label>
            <input
              id="end_date"
              type="datetime-local"
              required
              className={`w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 ${errors.end_date ? 'border-red-500' : ''}`}
              value={formData.end_date || ''}
              onChange={(e) => {
                setFormData({ ...formData, end_date: e.target.value })
                if (errors.end_date) setErrors({ ...errors, end_date: '' })
              }}
            />
            {errors.end_date && <p className="text-red-500 text-xs mt-1">{errors.end_date}</p>}
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status"
              className="w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500"
              value={formData.status || 'on_target'}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as GoalStatus })}
            >
              <option value="on_target">On Target</option>
              <option value="at_risk">At Risk</option>
              <option value="off_target">Off Target</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                !formData.title?.trim() || 
                isLoading || 
                (formData.type !== 'annual' && parentOptions.length === 0)
              }
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : goal ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function getStatusColor(status?: GoalStatus | null) {
  switch (status) {
    case 'on_target': return 'bg-green-100 text-green-800'
    case 'at_risk': return 'bg-amber-100 text-amber-800'
    case 'off_target': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

function getTypeColor(type?: string | null) {
  switch (type) {
    case 'annual': return 'bg-purple-100 text-purple-800'
    case 'quarterly': return 'bg-blue-100 text-blue-800'
    case 'weekly': return 'bg-green-100 text-green-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

function isOverdue(endDate?: string | null) {
  if (!endDate) return false
  return new Date(endDate) < new Date()
}

function GoalRow({ goal, level = 0, isExpanded, onToggle, onEdit }: {
  goal: GoalNode
  level?: number
  isExpanded: boolean
  onToggle: () => void
  onEdit: (goal: GoalNode) => void
}) {
  const hasChildren = goal.children.length > 0
  const paddingLeft = level * 24

  return (
    <div>
      <div 
        className="flex items-center gap-3 p-4 border-b border-gray-100 hover:bg-gray-50 group"
        style={{ paddingLeft: `${paddingLeft + 16}px` }}
      >
        {hasChildren && (
          <button
            onClick={onToggle}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        )}
        {!hasChildren && <div className="w-6" />}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-gray-900 truncate">{goal.title}</h3>
            {isOverdue(goal.end_date) && (
              <AlertTriangle size={16} className="text-amber-500" title="Past end date" />
            )}
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-600">
            {goal.type && (
              <span className={`inline-flex items-center text-xs px-2 py-1 rounded-full ${getTypeColor(goal.type)}`}>
                {goal.type}
              </span>
            )}
            {goal.status && (
              <span className={`inline-flex items-center text-xs px-2 py-1 rounded-full ${getStatusColor(goal.status)}`}>
                {goal.status.replace('_', ' ')}
              </span>
            )}
            {goal.end_date && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <Calendar size={12} />
                {new Date(goal.end_date).toLocaleDateString()}
              </span>
            )}
            {goal.taskCount !== undefined && goal.taskCount > 0 && (
              <span className="text-xs text-gray-500">
                {goal.taskCount} task{goal.taskCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => onEdit(goal)}
          aria-label="Edit goal"
          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 p-1"
        >
          ✏️
        </button>
      </div>

      {isExpanded && hasChildren && (
        <div>
          {goal.children.map(child => (
            <GoalRowContainer key={child.id} goal={child} level={level + 1} onEdit={onEdit} />
          ))}
        </div>
      )}
    </div>
  )
}

function GoalRowContainer({ goal, level, onEdit }: {
  goal: GoalNode
  level: number
  onEdit: (goal: GoalNode) => void
}) {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <GoalRow
      goal={goal}
      level={level}
      isExpanded={isExpanded}
      onToggle={() => setIsExpanded(!isExpanded)}
      onEdit={onEdit}
    />
  )
}

function EmptyState({ type, parentName }: { type: GoalCadence, parentName?: string }) {
  const messages = {
    annual: 'No annual goals yet',
    quarterly: parentName ? `No quarterly goals under "${parentName}"` : 'No quarterly goals yet',
    weekly: parentName ? `No weekly goals under "${parentName}"` : 'No weekly goals yet'
  }

  const actions = {
    annual: 'Add Annual Goal',
    quarterly: 'Add Quarterly Goal',
    weekly: 'Add Weekly Goal'
  }

  return (
    <div className="text-center py-8 text-gray-500">
      <Target size={32} className="mx-auto mb-2 opacity-50" />
      <p className="text-sm mb-2">{messages[type]}</p>
      <p className="text-xs">{actions[type]}</p>
    </div>
  )
}

export default function GoalsPage() {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabType>('all')
  const [showModal, setShowModal] = useState(false)
  const [editingGoal, setEditingGoal] = useState<GoalNode | null>(null)

  const goalsTreeQ = useQuery({ 
    queryKey: qk.goals.tree, 
    queryFn: getGoalsTree 
  })

  const createM = useMutation({
    mutationFn: createGoal,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.goals.all })
      qc.invalidateQueries({ queryKey: qk.goals.tree })
      setShowModal(false)
    }
  })

  const updateM = useMutation({
    mutationFn: ({ id, ...input }: { id: string } & Partial<CreateGoalInput>) => 
      updateGoal(id, input),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: qk.goals.all })
      qc.invalidateQueries({ queryKey: qk.goals.tree })
      qc.invalidateQueries({ queryKey: qk.goals.detail(id) })
      setEditingGoal(null)
    }
  })

  const handleCreateGoal = () => {
    setEditingGoal(null)
    setShowModal(true)
  }

  // Determine the best default goal type based on existing goals
  const getDefaultGoalType = (): GoalCadence => {
    if (goalsTree.length === 0) return 'annual'
    
    const hasAnnual = goalsTree.some(g => g.type === 'annual')
    if (!hasAnnual) return 'annual'
    
    const hasQuarterly = goalsTree.some(g => g.children.some(c => c.type === 'quarterly'))
    if (!hasQuarterly) return 'quarterly'
    
    return 'weekly'
  }

  const handleEditGoal = (goal: GoalNode) => {
    setEditingGoal(goal)
  }

  const handleSubmit = (data: CreateGoalInput) => {
    if (editingGoal) {
      updateM.mutate({ id: editingGoal.id, ...data })
    } else {
      createM.mutate(data)
    }
  }

  if (goalsTreeQ.isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">Loading goals...</div>
      </div>
    )
  }

  const goalsTree = goalsTreeQ.data || []

  const getFilteredGoals = () => {
    if (activeTab === 'all') return goalsTree
    
    return goalsTree.filter(goal => {
      if (activeTab === 'annual') return goal.type === 'annual'
      if (activeTab === 'quarterly') return goal.type === 'quarterly' || goal.children.some(c => c.type === 'quarterly')
      if (activeTab === 'weekly') return goal.type === 'weekly' || goal.children.some(c => c.type === 'weekly' || c.children.some(cc => cc.type === 'weekly'))
      return true
    })
  }

  const filteredGoals = getFilteredGoals()

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Goals</h1>
        <button
          onClick={handleCreateGoal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={16} />
          New Goal
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 border-b border-gray-200">
        {[
          { key: 'all' as const, label: 'All' },
          { key: 'annual' as const, label: 'Annual' },
          { key: 'quarterly' as const, label: 'Quarterly' },
          { key: 'weekly' as const, label: 'Weekly' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key 
                ? 'text-blue-600 border-blue-600' 
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Goals List */}
      {filteredGoals.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Target size={48} className="mx-auto mb-4 opacity-50" />
          {activeTab === 'all' ? (
            <>
              <p className="text-lg mb-2">No goals yet</p>
              <p className="mb-4">Start by creating an annual goal, then add quarterly and weekly goals under it</p>
              <div className="text-sm bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                <p className="font-medium text-blue-800 mb-2">Goal Hierarchy:</p>
                <div className="text-left text-blue-700">
                  <p>1. Annual Goal (top level)</p>
                  <p className="ml-4">↳ Quarterly Goal</p>
                  <p className="ml-8">↳ Weekly Goal</p>
                </div>
              </div>
            </>
          ) : activeTab === 'annual' ? (
            <>
              <p className="text-lg mb-2">No annual goals</p>
              <p>Create an annual goal to get started with your goal hierarchy</p>
            </>
          ) : activeTab === 'quarterly' ? (
            <>
              <p className="text-lg mb-2">No quarterly goals</p>
              <p>Create an annual goal first, then add quarterly goals under it</p>
            </>
          ) : (
            <>
              <p className="text-lg mb-2">No weekly goals</p>
              <p>Create annual and quarterly goals first, then add weekly goals under them</p>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200">
          {filteredGoals.map(goal => (
            <GoalRowContainer key={goal.id} goal={goal} level={0} onEdit={handleEditGoal} />
          ))}
        </div>
      )}

      <GoalModal
        open={showModal || !!editingGoal}
        onClose={() => {
          setShowModal(false)
          setEditingGoal(null)
        }}
        goal={editingGoal}
        onSubmit={handleSubmit}
        isLoading={createM.isPending || updateM.isPending}
        availableParents={goalsTree}
        defaultType={getDefaultGoalType()}
      />
    </div>
  )
}
