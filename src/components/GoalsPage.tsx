import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { qk } from '../lib/queryKeys'
import {
  listGoals,
  createGoal,
  updateGoal,
  closeGoal,
  reopenGoal,
  deleteGoal,
  getClosedGoals,
  type CreateGoalInput
} from '../api/goals'
import { Target, Archive } from 'lucide-react'
import ThreeColumnGoalView from './goals/ThreeColumnGoalView'
import ClosedGoalsList from './goals/ClosedGoalsList'
import GoalCreateModal from './goals/GoalCreateModal'

import type { GoalCadence, GoalStatus, Goal } from '../types'

type TabType = 'open' | 'closed'

// Helper functions for optimistic updates
function updateGoalInList(goals: Goal[], goalId: string, updates: Partial<Goal>): Goal[] {
  return goals.map(goal =>
    goal.id === goalId ? { ...goal, ...updates } : goal
  )
}

function removeGoalFromList(goals: Goal[], goalId: string): Goal[] {
  return goals.filter(goal => goal.id !== goalId)
}

export default function GoalsPage() {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabType>('open')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createModalType, setCreateModalType] = useState<GoalCadence>('annual')
  const [createModalParentId, setCreateModalParentId] = useState<string | undefined>()
  const [editGoal, setEditGoal] = useState<Goal | undefined>()

  // Queries - Using flat list instead of tree structure
  const goalsQ = useQuery({
    queryKey: qk.goals.all,
    queryFn: listGoals
  })

  const closedGoalsQ = useQuery({
    queryKey: ['goals', 'closed'],
    queryFn: getClosedGoals,
    enabled: activeTab === 'closed'
  })

  // Get only open goals for the 3-column view
  const openGoals = goalsQ.data?.filter(goal => !goal.is_closed) || []

  // Mutations
  const updateM = useMutation({
    mutationFn: ({ id, ...input }: { id: string } & Partial<Goal>) =>
      updateGoal(id, input),
    onMutate: async ({ id, ...input }) => {
      await qc.cancelQueries({ queryKey: qk.goals.all })
      const previousGoals = qc.getQueryData(qk.goals.all)

      qc.setQueryData(qk.goals.all, (old: Goal[] | undefined) => {
        if (!old) return old
        return updateGoalInList(old, id, input)
      })

      return { previousGoals }
    },
    onError: (err, _variables, context) => {
      if (context?.previousGoals) {
        qc.setQueryData(qk.goals.all, context.previousGoals)
      }
      console.error('Failed to update goal:', err)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.goals.all })
      setShowCreateModal(false)
      setEditGoal(undefined)
    }
  })

  const closeM = useMutation({
    mutationFn: closeGoal,
    onMutate: async (goalId) => {
      await qc.cancelQueries({ queryKey: qk.goals.all })
      const previousGoals = qc.getQueryData(qk.goals.all)

      // Optimistically remove from main list
      qc.setQueryData(qk.goals.all, (old: Goal[] | undefined) => {
        if (!old) return old
        return removeGoalFromList(old, goalId)
      })

      // Optimistically add to closed list if we have that query cached
      const closedGoal = goalsQ.data?.find(g => g.id === goalId)
      if (closedGoal) {
        qc.setQueryData(['goals', 'closed'], (old: Goal[] | undefined) => {
          const updatedGoal = { ...closedGoal, is_closed: true, closed_at: new Date().toISOString() }
          return [updatedGoal, ...(old || [])]
        })
      }

      return { previousGoals }
    },
    onError: (err, _goalId, context) => {
      if (context?.previousGoals) {
        qc.setQueryData(qk.goals.all, context.previousGoals)
      }
      console.error('Failed to close goal:', err)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.goals.all })
      qc.invalidateQueries({ queryKey: ['goals', 'closed'] })
    }
  })

  const reopenM = useMutation({
    mutationFn: reopenGoal,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.goals.all })
      qc.invalidateQueries({ queryKey: ['goals', 'closed'] })
    }
  })

  const createM = useMutation({
    mutationFn: createGoal,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.goals.all })
      setShowCreateModal(false)
      setEditGoal(undefined)
    }
  })

  const deleteM = useMutation({
    mutationFn: deleteGoal,
    onMutate: async (goalId) => {
      await qc.cancelQueries({ queryKey: qk.goals.all })
      const previousGoals = qc.getQueryData(qk.goals.all)

      // Optimistically remove from main list
      qc.setQueryData(qk.goals.all, (old: Goal[] | undefined) => {
        if (!old) return old
        return removeGoalFromList(old, goalId)
      })

      return { previousGoals }
    },
    onError: (err, _goalId, context) => {
      if (context?.previousGoals) {
        qc.setQueryData(qk.goals.all, context.previousGoals)
      }
      console.error('Failed to delete goal:', err)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.goals.all })
    }
  })

  // Handlers
  const handleStatusChange = (goalId: string, status: string) => {
    updateM.mutate({ id: goalId, status: status as GoalStatus })
  }

  const handleEndDateChange = (goalId: string, date: string) => {
    updateM.mutate({ id: goalId, end_date: date })
  }

  const handleCloseGoal = (goal: Goal) => {
    closeM.mutate(goal.id)
  }

  const handleReopenGoal = (goal: Goal) => {
    reopenM.mutate(goal.id)
  }

  const handleCreateGoal = (type: 'annual' | 'quarterly' | 'weekly', parentId?: string) => {
    setEditGoal(undefined) // Clear any edit state
    setCreateModalType(type)
    setCreateModalParentId(parentId)
    setShowCreateModal(true)
  }

  const handleCreateSubmit = (data: CreateGoalInput) => {
    if (editGoal) {
      // Update existing goal
      updateM.mutate({
        id: editGoal.id,
        title: data.title,
        description: data.description,
        type: data.type as GoalCadence,
        parent_goal_id: data.parent_goal_id,
        end_date: data.end_date,
        status: data.status as GoalStatus
      })
    } else {
      // Create new goal
      createM.mutate(data)
    }
  }

  const handleEditGoal = (goal: Goal) => {
    setEditGoal(goal)
    setCreateModalType(goal.type || 'annual')
    setCreateModalParentId(goal.parent_goal_id || undefined)
    setShowCreateModal(true)
  }

  const handleDeleteGoal = (goal: Goal) => {
    if (window.confirm(`Are you sure you want to delete "${goal.title}"? This action cannot be undone.`)) {
      deleteM.mutate(goal.id)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Goals</h1>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 border-b border-gray-200">
        <button
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'open'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('open')}
        >
          <Target size={16} />
          Open Goals
        </button>
        <button
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'closed'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('closed')}
        >
          <Archive size={16} />
          Closed Goals
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {activeTab === 'open' ? (
          <ThreeColumnGoalView
            goals={openGoals}
            onStatusChange={handleStatusChange}
            onEndDateChange={handleEndDateChange}
            onEdit={handleEditGoal}
            onClose={handleCloseGoal}
            onDelete={handleDeleteGoal}
            onCreateGoal={handleCreateGoal}
          />
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden h-full">
            <ClosedGoalsList
              goals={closedGoalsQ.data || []}
              onReopen={handleReopenGoal}
              isLoading={closedGoalsQ.isLoading}
            />
          </div>
        )}
      </div>

      {/* Create Goal Modal */}
      <GoalCreateModal
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          setEditGoal(undefined)
        }}
        onSubmit={handleCreateSubmit}
        isLoading={editGoal ? updateM.isPending : createM.isPending}
        defaultType={createModalType}
        parentId={createModalParentId}
        editGoal={editGoal}
      />
    </div>
  )
}