import { Goal, Task } from '../../types'
import { GitBranch } from 'lucide-react'
import StatusPill from './StatusPill'
import EndDatePicker from './EndDatePicker'
import GoalActionsMenu from './GoalActionsMenu'
import WeeklyGoalTaskList from './WeeklyGoalTaskList'

interface GoalCardProps {
  goal: Goal
  isSelected?: boolean
  onClick?: () => void
  onStatusChange: (goalId: string, status: string) => void
  onEndDateChange: (goalId: string, date: string) => void
  onEdit?: () => void
  onClose?: () => void
  onDelete?: () => void
  onTaskClick?: (task: Task) => void
  showTasks?: boolean
  childCount?: number
}

export default function GoalCard({
  goal,
  isSelected = false,
  onClick,
  onStatusChange,
  onEndDateChange,
  onEdit,
  onClose,
  onDelete,
  onTaskClick,
  showTasks = false,
  childCount,
}: GoalCardProps) {
  return (
    <div
      className={`
        rounded-lg border p-4 bg-white shadow-sm hover:shadow-md transition-all cursor-pointer
        ${isSelected ? 'ring-2 ring-blue-500 border-blue-200' : 'border-gray-200 hover:border-gray-300'}
      `}
      onClick={onClick}
    >
      {/* Title */}
      <h3 className="font-medium text-gray-900 mb-3 leading-relaxed">
        {goal.title}
      </h3>

      {/* Metadata Row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Status Pill */}
          <StatusPill
            status={goal.status}
            onChange={(status) => onStatusChange(goal.id, status)}
            size="sm"
          />

          {/* End Date */}
          <EndDatePicker
            endDate={goal.end_date}
            onChange={(date) => onEndDateChange(goal.id, date)}
            compact
          />
        </div>

        {/* Right side: child count (if any) + actions */}
        <div className="flex items-center gap-2">
          {typeof childCount === 'number' && childCount > 0 && (
            <div className="flex items-center gap-1 text-gray-600 text-xs select-none">
              <GitBranch size={16} className="text-gray-400" />
              <span className="tabular-nums">{childCount}</span>
            </div>
          )}
          <GoalActionsMenu
            goal={{ ...goal, children: [] }}
            onEdit={onEdit || (() => {})}
            onClose={onClose || (() => {})}
            onDelete={onDelete || (() => {})}
          />
        </div>
      </div>

      {/* Weekly Goal Tasks */}
      {showTasks && goal.type === 'weekly' && onTaskClick && (
        <WeeklyGoalTaskList
          goalId={goal.id}
          onTaskClick={onTaskClick}
        />
      )}
    </div>
  )
}
