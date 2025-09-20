import { RotateCcw, Archive } from 'lucide-react'
import StatusPill from './StatusPill'
import GoalActionsMenu from './GoalActionsMenu'
import type { Goal } from '../../types'

interface ClosedGoalsListProps {
  goals: Goal[]
  onReopen: (goal: Goal) => void
  onEdit?: (goal: Goal) => void
  onDelete?: (goal: Goal) => void
  isLoading?: boolean
}

function formatRelativeDate(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (diffInDays === 0) return 'Today'
  if (diffInDays === 1) return 'Yesterday'
  if (diffInDays < 7) return `${diffInDays} days ago`
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`
  if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function getTypeColor(type?: string | null) {
  switch (type) {
    case 'annual': return 'bg-purple-100 text-purple-800'
    case 'quarterly': return 'bg-blue-100 text-blue-800'
    case 'weekly': return 'bg-green-100 text-green-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

export default function ClosedGoalsList({
  goals,
  onReopen,
  onEdit,
  onDelete,
  isLoading = false
}: ClosedGoalsListProps) {
  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-pulse text-gray-500">Loading closed goals...</div>
      </div>
    )
  }

  if (goals.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Archive size={48} className="mx-auto mb-4 opacity-50" />
        <p className="text-lg mb-2">No closed goals yet</p>
        <p className="text-sm">Closed goals will appear here when you archive them.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {goals.map((goal) => (
        <div
          key={goal.id}
          className="bg-gray-50 rounded-lg border border-gray-200 p-4 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-medium text-gray-900 truncate">{goal.title}</h3>
                {goal.type && (
                  <span className={`inline-flex items-center text-xs px-2 py-1 rounded-full ${getTypeColor(goal.type)}`}>
                    {goal.type}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Closed:</span>
                  <span className="text-gray-700 font-medium">
                    {goal.closed_at ? formatRelativeDate(goal.closed_at) : 'Unknown'}
                  </span>
                </div>

                {goal.status && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Status:</span>
                    <StatusPill
                      status={goal.status}
                      onChange={() => {}} // Read-only for closed goals
                      disabled={true}
                      size="sm"
                    />
                  </div>
                )}
              </div>

              {goal.description && (
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                  {goal.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => onReopen(goal)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
                aria-label={`Reopen ${goal.title}`}
              >
                <RotateCcw size={14} />
                Reopen
              </button>

              {(onEdit || onDelete) && (
                <GoalActionsMenu
                  goal={goal as any} // Cast to GoalNode for menu compatibility
                  onEdit={() => onEdit?.(goal)}
                  onClose={() => {}} // Not applicable for closed goals
                  onReopen={() => onReopen(goal)}
                  onDelete={() => onDelete?.(goal)}
                />
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}