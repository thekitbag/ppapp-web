import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Goal, Task } from '../../types'
import GoalCard from './GoalCard'

interface ThreeColumnGoalViewProps {
  goals: Goal[]
  onStatusChange: (goalId: string, status: string) => void
  onEndDateChange: (goalId: string, date: string) => void
  onEdit?: (goal: Goal) => void
  onClose?: (goal: Goal) => void
  onDelete?: (goal: Goal) => void
  onCreateGoal?: (type: 'annual' | 'quarterly' | 'weekly', parentId?: string) => void
  onTaskClick?: (task: Task) => void
}

export default function ThreeColumnGoalView({
  goals,
  onStatusChange,
  onEndDateChange,
  onEdit,
  onClose,
  onDelete,
  onCreateGoal,
  onTaskClick
}: ThreeColumnGoalViewProps) {
  const [selectedAnnualId, setSelectedAnnualId] = useState<string | null>(null)
  const [selectedQuarterlyId, setSelectedQuarterlyId] = useState<string | null>(null)

  // Separate goals by type
  const annualGoals = goals.filter(goal => goal.type === 'annual')
  const quarterlyGoals = goals.filter(goal =>
    goal.type === 'quarterly' && goal.parent_goal_id === selectedAnnualId
  )
  const weeklyGoals = goals.filter(goal =>
    goal.type === 'weekly' && goal.parent_goal_id === selectedQuarterlyId
  )

  // Compute child counts
  const quarterlyChildrenCountByAnnual: Record<string, number> = goals.reduce((acc, g) => {
    if (g.type === 'quarterly' && g.parent_goal_id) {
      acc[g.parent_goal_id] = (acc[g.parent_goal_id] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  const weeklyChildrenCountByQuarterly: Record<string, number> = goals.reduce((acc, g) => {
    if (g.type === 'weekly' && g.parent_goal_id) {
      acc[g.parent_goal_id] = (acc[g.parent_goal_id] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  const handleAnnualSelect = (goalId: string) => {
    setSelectedAnnualId(goalId === selectedAnnualId ? null : goalId)
    setSelectedQuarterlyId(null) // Reset quarterly selection
  }

  const handleQuarterlySelect = (goalId: string) => {
    setSelectedQuarterlyId(goalId === selectedQuarterlyId ? null : goalId)
  }

  return (
    <div className="flex gap-6 h-full overflow-hidden">
      {/* Annual Goals Column */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Annual Goals</h2>
          <button
            onClick={() => onCreateGoal?.('annual')}
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
          >
            <Plus size={16} />
            Add Annual Goal
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto h-full">
          {annualGoals.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="mb-3">No Annual goals yet.</p>
              <button
                onClick={() => onCreateGoal?.('annual')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus size={16} />
                Add Annual Goal
              </button>
            </div>
          ) : (
            annualGoals.map(goal => (
              <GoalCard
                key={goal.id}
                goal={goal}
                isSelected={selectedAnnualId === goal.id}
                onClick={() => handleAnnualSelect(goal.id)}
                onStatusChange={onStatusChange}
                onEndDateChange={onEndDateChange}
                onEdit={() => onEdit?.(goal)}
                onClose={() => onClose?.(goal)}
                onDelete={() => onDelete?.(goal)}
                childCount={quarterlyChildrenCountByAnnual[goal.id] || 0}
              />
            ))
          )}
        </div>
      </div>

      {/* Visual Connector */}
      {selectedAnnualId && (
        <div className="w-px bg-gray-200 self-stretch" />
      )}

      {/* Quarterly Goals Column */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Quarterly Goals</h2>
          {selectedAnnualId && (
            <button
              onClick={() => onCreateGoal?.('quarterly', selectedAnnualId)}
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
            >
              <Plus size={16} />
              Add Quarterly Goal
            </button>
          )}
        </div>

        <div className="space-y-3 overflow-y-auto h-full">
          {!selectedAnnualId ? (
            <div className="text-center py-12 text-gray-400">
              <p>Select an Annual goal to view Quarterly goals</p>
            </div>
          ) : quarterlyGoals.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="mb-3">No Quarterly goals yet.</p>
              <button
                onClick={() => onCreateGoal?.('quarterly', selectedAnnualId)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus size={16} />
                Add Quarterly Goal
              </button>
            </div>
          ) : (
            quarterlyGoals.map(goal => (
              <GoalCard
                key={goal.id}
                goal={goal}
                isSelected={selectedQuarterlyId === goal.id}
                onClick={() => handleQuarterlySelect(goal.id)}
                onStatusChange={onStatusChange}
                onEndDateChange={onEndDateChange}
                onEdit={() => onEdit?.(goal)}
                onClose={() => onClose?.(goal)}
                onDelete={() => onDelete?.(goal)}
                childCount={weeklyChildrenCountByQuarterly[goal.id] || 0}
              />
            ))
          )}
        </div>
      </div>

      {/* Visual Connector */}
      {selectedQuarterlyId && (
        <div className="w-px bg-gray-200 self-stretch" />
      )}

      {/* Weekly Goals Column */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Weekly Goals</h2>
          {selectedQuarterlyId && (
            <button
              onClick={() => onCreateGoal?.('weekly', selectedQuarterlyId)}
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
            >
              <Plus size={16} />
              Add Weekly Goal
            </button>
          )}
        </div>

        <div className="space-y-3 overflow-y-auto h-full">
          {!selectedQuarterlyId ? (
            <div className="text-center py-12 text-gray-400">
              <p>Select a Quarterly goal to view Weekly goals</p>
            </div>
          ) : weeklyGoals.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="mb-3">No Weekly goals yet.</p>
              <button
                onClick={() => onCreateGoal?.('weekly', selectedQuarterlyId)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus size={16} />
                Add Weekly Goal
              </button>
            </div>
          ) : (
            weeklyGoals.map(goal => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onClick={() => {}} // Weekly goals don't have children to select
                onStatusChange={onStatusChange}
                onEndDateChange={onEndDateChange}
                onEdit={() => onEdit?.(goal)}
                onClose={() => onClose?.(goal)}
                onDelete={() => onDelete?.(goal)}
                onTaskClick={onTaskClick}
                showTasks={true}
                childCount={0}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
