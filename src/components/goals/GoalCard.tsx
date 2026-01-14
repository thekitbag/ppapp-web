import { Goal, Task } from '../../types'
import { ChevronUp, ChevronDown } from 'lucide-react'
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
  onIncreasePriority?: () => void
  onDecreasePriority?: () => void
  canMoveUp?: boolean
  canMoveDown?: boolean
  isReordering?: boolean
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
  childCount: _childCount,
  onIncreasePriority,
  onDecreasePriority,
  canMoveUp = true,
  canMoveDown = true,
  isReordering = false,
}: GoalCardProps) {
  return (
    <div
      className={`
        rounded-lg border p-4 bg-white shadow-sm hover:shadow-md transition-all cursor-pointer relative
        ${isSelected ? 'ring-2 ring-blue-500 border-blue-200' : 'border-gray-200 hover:border-gray-300'}
      `}
      onClick={onClick}
    >
      {/* Priority Controls - Top Left */}
      <div className="absolute top-2 left-2 flex flex-col gap-0.5">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onIncreasePriority?.()
          }}
          disabled={!canMoveUp || isReordering}
          className={`p-0.5 rounded transition-colors ${
            canMoveUp && !isReordering
              ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              : 'text-gray-200 cursor-not-allowed'
          }`}
          title={isReordering ? 'Reordering...' : 'Increase priority (move up)'}
        >
          <ChevronUp size={14} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDecreasePriority?.()
          }}
          disabled={!canMoveDown || isReordering}
          className={`p-0.5 rounded transition-colors ${
            canMoveDown && !isReordering
              ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              : 'text-gray-200 cursor-not-allowed'
          }`}
          title={isReordering ? 'Reordering...' : 'Decrease priority (move down)'}
        >
          <ChevronDown size={14} />
        </button>
      </div>

      {/* Actions Menu - Top Right */}
      <div className="absolute top-2 right-2">
        <GoalActionsMenu
          goal={{ ...goal, children: [] }}
          onEdit={onEdit || (() => {})}
          onClose={onClose || (() => {})}
          onDelete={onDelete || (() => {})}
        />
      </div>

      {/* Title */}
      <h3 className="font-medium text-gray-900 mb-3 leading-relaxed pl-5 pr-8">
        {goal.title}
      </h3>

      {/* Metadata Row */}
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
