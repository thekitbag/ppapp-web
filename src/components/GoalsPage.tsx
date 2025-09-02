import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { qk } from '../lib/queryKeys'
import { listGoals, createGoal, updateGoal, type CreateGoalInput } from '../api/goals'
import { Plus, Target, Flag } from 'lucide-react'

interface GoalFormData {
  title: string
  description: string
  type: string
}

function GoalModal({ 
  open, 
  onClose, 
  goal, 
  onSubmit, 
  isLoading 
}: { 
  open: boolean
  onClose: () => void
  goal?: any
  onSubmit: (data: CreateGoalInput) => void
  isLoading?: boolean
}) {
  const [formData, setFormData] = useState<GoalFormData>({
    title: goal?.title || '',
    description: goal?.description || '',
    type: goal?.type || 'quarterly'
  })

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) return

    onSubmit({
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      type: formData.type || null
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div 
        className="bg-white rounded-2xl p-6 w-full max-w-md"
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
              className="w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Improve Retention"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              className="w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 h-20"
              placeholder="What this goal aims to achieve..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              id="type"
              className="w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            >
              <option value="quarterly">Quarterly</option>
              <option value="annual">Annual</option>
              <option value="monthly">Monthly</option>
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
              disabled={!formData.title.trim() || isLoading}
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

function getTypeColor(type: string) {
  switch (type) {
    case 'annual': return 'bg-purple-100 text-purple-800'
    case 'quarterly': return 'bg-blue-100 text-blue-800'
    case 'monthly': return 'bg-green-100 text-green-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

export default function GoalsPage({ 
  selectedGoalId, 
  onSelectGoal 
}: { 
  selectedGoalId?: string | null
  onSelectGoal?: (goalId: string) => void 
}) {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editingGoal, setEditingGoal] = useState<any>(null)

  const goalsQ = useQuery({ 
    queryKey: qk.goals.all, 
    queryFn: listGoals 
  })

  const createM = useMutation({
    mutationFn: createGoal,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.goals.all })
      setShowModal(false)
    }
  })

  const updateM = useMutation({
    mutationFn: ({ id, ...input }: { id: string } & Partial<CreateGoalInput>) => 
      updateGoal(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.goals.all })
      setEditingGoal(null)
    }
  })

  const handleCreateGoal = () => {
    setEditingGoal(null)
    setShowModal(true)
  }

  const handleEditGoal = (goal: any) => {
    setEditingGoal(goal)
  }

  const handleSubmit = (data: CreateGoalInput) => {
    if (editingGoal) {
      updateM.mutate({ id: editingGoal.id, ...data })
    } else {
      createM.mutate(data)
    }
  }

  const handleGoalClick = (goal: any) => {
    if (onSelectGoal) {
      onSelectGoal(goal.id)
    }
  }

  if (goalsQ.isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">Loading goals...</div>
      </div>
    )
  }

  const goals = goalsQ.data || []

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

      {goals.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Target size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg mb-2">No goals yet</p>
          <p>Create your first goal to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map(goal => (
            <div 
              key={goal.id}
              className={`bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer ${
                selectedGoalId === goal.id ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => handleGoalClick(goal)}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                  {goal.title}
                </h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleEditGoal(goal)
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  ✏️
                </button>
              </div>

              {goal.type && (
                <div className="mb-3">
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${getTypeColor(goal.type)}`}>
                    <Flag size={12} />
                    {goal.type}
                  </span>
                </div>
              )}

              {goal.description && (
                <p className="text-gray-600 text-sm line-clamp-3 mb-3">
                  {goal.description}
                </p>
              )}

              <div className="text-xs text-gray-400">
                Created {new Date(goal.created_at).toLocaleDateString()}
              </div>
            </div>
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
      />
    </div>
  )
}