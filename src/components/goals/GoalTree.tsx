import { useState } from 'react'
import { ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react'
import StatusPill from './StatusPill'
import EndDatePicker from './EndDatePicker'
import GoalActionsMenu from './GoalActionsMenu'
import type { GoalNode, GoalStatus } from '../../types'

interface GoalTreeProps {
  goals: GoalNode[]
  onStatusChange: (goalId: string, status: GoalStatus) => void
  onEndDateChange: (goalId: string, endDate: string) => void
  onEdit: (goal: GoalNode) => void
  onClose: (goal: GoalNode) => void
  onDelete?: (goal: GoalNode) => void
  expandedNodes?: Set<string>
  onToggleExpansion?: (goalId: string) => void
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

interface GoalRowProps {
  goal: GoalNode
  level: number
  isExpanded: boolean
  onToggle: () => void
  onStatusChange: (goalId: string, status: GoalStatus) => void
  onEndDateChange: (goalId: string, endDate: string) => void
  onEdit: (goal: GoalNode) => void
  onClose: (goal: GoalNode) => void
  onDelete?: (goal: GoalNode) => void
}

function GoalRow({
  goal,
  level,
  isExpanded,
  onToggle,
  onStatusChange,
  onEndDateChange,
  onEdit,
  onClose,
  onDelete
}: GoalRowProps) {
  const hasChildren = goal.children.length > 0
  const paddingLeft = level * 24

  return (
    <div>
      <div
        className={`
          flex items-center gap-3 p-4 border-b border-gray-100 hover:bg-gray-50 group transition-colors
          ${level > 0 ? 'bg-gray-50/30' : ''}
        `}
        style={{ paddingLeft: `${paddingLeft + 16}px` }}
      >
        {/* Expand/collapse button */}
        {hasChildren ? (
          <button
            onClick={onToggle}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
            className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-200 transition-colors"
          >
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        ) : (
          <div className="w-6" />
        )}

        {/* Goal content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-medium text-gray-900 truncate">{goal.title}</h3>
            {isOverdue(goal.end_date) && (
              <AlertTriangle size={16} className="text-amber-500" />
            )}
            {goal.type && (
              <span className={`inline-flex items-center text-xs px-2 py-1 rounded-full ${getTypeColor(goal.type)}`}>
                {goal.type}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm">
            {/* Status pill with inline editing */}
            <StatusPill
              status={goal.status}
              onChange={(status) => onStatusChange(goal.id, status)}
              size="sm"
            />

            {/* End date with inline editing */}
            <EndDatePicker
              endDate={goal.end_date}
              onChange={(date) => onEndDateChange(goal.id, date)}
              compact
            />

            {/* Task count if available */}
            {goal.taskCount !== undefined && goal.taskCount > 0 && (
              <span className="text-xs text-gray-500">
                {goal.taskCount} task{goal.taskCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Description if available */}
          {goal.description && (
            <p className="text-sm text-gray-600 mt-2 line-clamp-2">
              {goal.description}
            </p>
          )}
        </div>

        {/* Actions menu */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <GoalActionsMenu
            goal={goal}
            onEdit={() => onEdit(goal)}
            onClose={() => onClose(goal)}
            onDelete={onDelete ? () => onDelete(goal) : undefined}
          />
        </div>
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div>
          {goal.children.map(child => (
            <GoalRowContainer
              key={child.id}
              goal={child}
              level={level + 1}
              onStatusChange={onStatusChange}
              onEndDateChange={onEndDateChange}
              onEdit={onEdit}
              onClose={onClose}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface GoalRowContainerProps {
  goal: GoalNode
  level: number
  onStatusChange: (goalId: string, status: GoalStatus) => void
  onEndDateChange: (goalId: string, endDate: string) => void
  onEdit: (goal: GoalNode) => void
  onClose: (goal: GoalNode) => void
  onDelete?: (goal: GoalNode) => void
}

function GoalRowContainer({
  goal,
  level,
  onStatusChange,
  onEndDateChange,
  onEdit,
  onClose,
  onDelete
}: GoalRowContainerProps) {
  // Default expanded state based on level (annual expanded, others collapsed)
  const [isExpanded, setIsExpanded] = useState(level === 0)

  return (
    <GoalRow
      goal={goal}
      level={level}
      isExpanded={isExpanded}
      onToggle={() => setIsExpanded(!isExpanded)}
      onStatusChange={onStatusChange}
      onEndDateChange={onEndDateChange}
      onEdit={onEdit}
      onClose={onClose}
      onDelete={onDelete}
    />
  )
}

export default function GoalTree({
  goals,
  onStatusChange,
  onEndDateChange,
  onEdit,
  onClose,
  onDelete
}: GoalTreeProps) {
  if (goals.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg mb-2">No goals found</p>
        <p className="text-sm">Create your first goal to get started.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {goals.map(goal => (
        <GoalRowContainer
          key={goal.id}
          goal={goal}
          level={0}
          onStatusChange={onStatusChange}
          onEndDateChange={onEndDateChange}
          onEdit={onEdit}
          onClose={onClose}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}