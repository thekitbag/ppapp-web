import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { qk } from '../lib/queryKeys'
import {
  getGoalsTree,
  createGoal,
  updateGoal,
  closeGoal,
  reopenGoal,
  deleteGoal,
  getClosedGoals,
  reorderGoal,
  type CreateGoalInput
} from '../api/goals'
import { Target, Archive } from 'lucide-react'
import GoalTreeVisualization from './goals/GoalTreeVisualization'
import SortControl from './goals/SortControl'
import ClosedGoalsList from './goals/ClosedGoalsList'
import GoalCreateModal from './goals/GoalCreateModal'
import TaskEditDrawer from './TaskEditDrawer'
import { getTreeMemberIds, type SortOption } from '../lib/goalTreeUtils'

import type { GoalCadence, GoalStatus, Goal, GoalNode, Task } from '../types'

type TabType = 'open' | 'closed'

export default function GoalsPage() {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabType>('open')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createModalType, setCreateModalType] = useState<GoalCadence>('annual')
  const [createModalParentId, setCreateModalParentId] = useState<string | undefined>()
  const [editGoal, setEditGoal] = useState<Goal | undefined>()
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  // Focus and sort state
  const [focusedGoalId, setFocusedGoalId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>('type')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // Queries - Using tree structure
  const goalsTreeQ = useQuery({
    queryKey: qk.goals.tree,
    queryFn: getGoalsTree
  })

  const closedGoalsQ = useQuery({
    queryKey: ['goals', 'closed'],
    queryFn: getClosedGoals,
    enabled: activeTab === 'closed'
  })

  // Get only open goals for the tree view
  const openGoalsTree = goalsTreeQ.data?.filter(goal => !goal.is_closed) || []

  // Compute tree members when focus is active
  const treeMemberIds = useMemo(() => {
    if (!focusedGoalId || !openGoalsTree) return undefined
    return getTreeMemberIds(focusedGoalId, openGoalsTree)
  }, [focusedGoalId, openGoalsTree])

  // Mutations
  const updateM = useMutation({
    mutationFn: ({ id, ...input }: { id: string } & Partial<Goal>) =>
      updateGoal(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.goals.all })
      qc.invalidateQueries({ queryKey: qk.goals.tree })
      setShowCreateModal(false)
      setEditGoal(undefined)
    },
    onError: (err) => {
      console.error('Failed to update goal:', err)
    }
  })

  const closeM = useMutation({
    mutationFn: closeGoal,
    onSuccess: (_, goalId) => {
      // Clear focus if the closed goal was focused
      if (focusedGoalId === goalId) {
        setFocusedGoalId(null)
      }
      qc.invalidateQueries({ queryKey: qk.goals.all })
      qc.invalidateQueries({ queryKey: qk.goals.tree })
      qc.invalidateQueries({ queryKey: ['goals', 'closed'] })
    }
  })

  const reopenM = useMutation({
    mutationFn: reopenGoal,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.goals.all })
      qc.invalidateQueries({ queryKey: qk.goals.tree })
      qc.invalidateQueries({ queryKey: ['goals', 'closed'] })
    }
  })

  const createM = useMutation({
    mutationFn: createGoal,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.goals.all })
      qc.invalidateQueries({ queryKey: qk.goals.tree })
      setShowCreateModal(false)
      setEditGoal(undefined)
    }
  })

  const deleteM = useMutation({
    mutationFn: deleteGoal,
    onSuccess: (_, goalId) => {
      // Clear focus if the deleted goal was focused
      if (focusedGoalId === goalId) {
        setFocusedGoalId(null)
      }
      qc.invalidateQueries({ queryKey: qk.goals.all })
      qc.invalidateQueries({ queryKey: qk.goals.tree })
    }
  })

  const reorderM = useMutation({
    mutationFn: ({ id, direction }: { id: string; direction: 'up' | 'down' }) =>
      reorderGoal(id, direction),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.goals.all })
      qc.invalidateQueries({ queryKey: qk.goals.tree })
    },
    onError: (err) => {
      console.error('Failed to reorder goal:', err)
    }
  })

  // Handlers
  const handleStatusChange = (goalId: string, status: string) => {
    updateM.mutate({ id: goalId, status: status as GoalStatus })
  }

  const handleChangePriority = (goalId: string, direction: 'up' | 'down') => {
    // Frontend is "dumb" - just send the direction to the backend
    // Backend handles all the sort order calculation logic
    reorderM.mutate({ id: goalId, direction })
  }

  const handleEndDateChange = (goalId: string, date: string) => {
    updateM.mutate({ id: goalId, end_date: date })
  }

  const handleCloseGoal = (goal: GoalNode) => {
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

  const handleGoalClick = (goal: GoalNode) => {
    // Toggle focus: click same goal to unfocus
    setFocusedGoalId(prev => prev === goal.id ? null : goal.id)
  }

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
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

  const handleEditGoal = (goal: GoalNode) => {
    // Convert GoalNode to Goal for the modal
    const { children, taskCount, ...goalData } = goal
    setEditGoal(goalData as Goal)
    setCreateModalType(goal.type || 'annual')
    setCreateModalParentId(goal.parent_goal_id || undefined)
    setShowCreateModal(true)
  }

  const handleDeleteGoal = (goal: GoalNode) => {
    if (window.confirm(`Are you sure you want to delete "${goal.title}"? This action cannot be undone.`)) {
      deleteM.mutate(goal.id)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-4xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
            Goals
          </h1>
        </div>
        <div className="w-20 h-1 rounded-full" style={{ background: 'var(--color-accent)' }}></div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-3 mb-6">
        <button
          className={`flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-lg border-3 border-black transition-all ${
            activeTab === 'open'
              ? 'translate-y-[-2px]'
              : 'hover:translate-y-[-2px]'
          }`}
          onClick={() => setActiveTab('open')}
          style={{
            fontFamily: 'var(--font-display)',
            background: activeTab === 'open' ? 'var(--color-accent)' : 'var(--color-surface)',
            color: activeTab === 'open' ? 'white' : 'var(--color-text)',
            boxShadow: activeTab === 'open' ? 'var(--shadow-brutal)' : 'var(--shadow-subtle)'
          }}
        >
          <Target size={18} />
          Open Goals
        </button>
        <button
          className={`flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-lg border-3 border-black transition-all ${
            activeTab === 'closed'
              ? 'translate-y-[-2px]'
              : 'hover:translate-y-[-2px]'
          }`}
          onClick={() => setActiveTab('closed')}
          style={{
            fontFamily: 'var(--font-display)',
            background: activeTab === 'closed' ? 'var(--color-secondary)' : 'var(--color-surface)',
            color: 'var(--color-text)',
            boxShadow: activeTab === 'closed' ? 'var(--shadow-brutal)' : 'var(--shadow-subtle)'
          }}
        >
          <Archive size={18} />
          Closed Goals
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 flex flex-col gap-4">
        {activeTab === 'open' ? (
          <>
            {/* Controls bar */}
            <div className="flex items-center justify-between">
              <SortControl
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={(by, order) => {
                  setSortBy(by)
                  setSortOrder(order)
                }}
              />

              {focusedGoalId && (
                <button
                  onClick={() => setFocusedGoalId(null)}
                  className="px-4 py-2 text-sm font-bold rounded-lg border-2 border-black transition-all hover:translate-y-[-1px]"
                  style={{
                    background: 'var(--color-secondary)',
                    color: 'var(--color-text)',
                    boxShadow: 'var(--shadow-subtle)',
                    fontFamily: 'var(--font-display)'
                  }}
                >
                  Clear Focus
                </button>
              )}
            </div>

            {/* Tree visualization */}
            <div className="flex-1 rounded-xl border-3 border-black overflow-hidden"
                 style={{ background: 'var(--color-background)', boxShadow: 'var(--shadow-brutal)' }}>
              <GoalTreeVisualization
                goals={openGoalsTree}
                focusedGoalId={focusedGoalId}
                treeMemberIds={treeMemberIds}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onGoalClick={handleGoalClick}
                onTaskClick={handleTaskClick}
                onStatusChange={handleStatusChange}
                onEndDateChange={handleEndDateChange}
                onEdit={handleEditGoal}
                onClose={handleCloseGoal}
                onDelete={handleDeleteGoal}
                onCreateGoal={handleCreateGoal}
                onChangePriority={handleChangePriority}
                isReordering={reorderM.isPending}
              />
            </div>
          </>
        ) : (
          <div className="rounded-xl border-3 border-black overflow-hidden h-full"
               style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow-brutal)' }}>
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

      {/* Task Edit Drawer */}
      {selectedTask && (
        <TaskEditDrawer
          task={selectedTask}
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  )
}