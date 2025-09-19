import { useState } from 'react'
import { Loader2, AlertCircle, RotateCcw, Edit } from 'lucide-react'
import { Task } from '../types'
import TaskEditor from './TaskEditor'

interface OptimisticTaskCardProps {
  task: Task
  onRetry: (tempId: string) => void
  onCancel: (tempId: string) => void
  density?: 'comfortable' | 'compact'
}

export default function OptimisticTaskCard({
  task,
  onRetry,
  onCancel,
  density = 'comfortable'
}: OptimisticTaskCardProps) {
  const [showEditRetry, setShowEditRetry] = useState(false)

  const isOptimistic = task.__optimistic
  const state = task.__state || 'ok'
  const tempId = task.__tempId

  const handleEditRetry = () => {
    setShowEditRetry(true)
  }

  const handleTaskEditorSuccess = (_updatedTask: Task) => {
    // When task editor saves successfully, we want to cancel the optimistic task
    // since TaskEditor creates a new proper task
    if (tempId) {
      onCancel(tempId)
    }
    setShowEditRetry(false)
  }

  if (!isOptimistic) {
    return null // Not an optimistic task, should be rendered by regular TaskCard
  }

  return (
    <>
      <div
        className={`bg-white rounded-xl shadow-md border border-gray-200/80 transition-all flex flex-col ${
          density === 'compact' ? 'p-3 gap-2' : 'p-4 gap-3'
        } ${
          state === 'syncing' ? 'border-blue-400 bg-blue-50/30' :
          state === 'error' ? 'border-red-400 bg-red-50/30' : ''
        }`}
      >
        {/* Title Row with State Indicators */}
        <div className="flex items-start justify-between gap-3">
          <h3 className={`font-medium leading-snug break-words flex-1 overflow-hidden ${
            state === 'error' ? 'text-red-800' : 'text-gray-800'
          }`}
            style={{
              display: '-webkit-box',
              WebkitLineClamp: density === 'compact' ? 2 : 3,
              WebkitBoxOrient: 'vertical'
            }}
          >
            {task.title}
          </h3>

          <div className="flex items-center gap-1 flex-shrink-0">
            {state === 'syncing' && (
              <div
                className="flex items-center gap-1 text-blue-600"
                title="Syncing..."
                aria-label="Syncing task"
              >
                <Loader2 size={14} className="animate-spin" />
              </div>
            )}

            {state === 'error' && (
              <div
                className="flex items-center gap-1 text-red-600"
                title="Failed to sync"
                aria-label="Failed to sync task"
              >
                <AlertCircle size={14} />
              </div>
            )}
          </div>
        </div>

        {/* Error Actions */}
        {state === 'error' && (
          <div className="border-t border-red-200 pt-3 flex flex-col gap-2">
            <div className="text-xs text-red-700 font-medium">
              Failed to sync
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => tempId && onRetry(tempId)}
                className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                title="Retry now"
              >
                <RotateCcw size={12} />
                Retry
              </button>
              <button
                onClick={handleEditRetry}
                className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                title="Edit and retry"
              >
                <Edit size={12} />
                Edit & retry
              </button>
            </div>
          </div>
        )}

        {/* Syncing State */}
        {state === 'syncing' && (
          <div className="border-t border-blue-200 pt-3">
            <div className="text-xs text-blue-700 font-medium flex items-center gap-1">
              <Loader2 size={12} className="animate-spin" />
              Syncing...
            </div>
          </div>
        )}
      </div>

      {/* Task Editor Modal for Edit & Retry */}
      <TaskEditor
        isOpen={showEditRetry}
        task={{
          ...task,
          // Remove optimistic fields for the editor
          __optimistic: undefined,
          __state: undefined,
          __tempId: undefined,
          __clientRequestId: undefined,
        }}
        defaultStatus={task.status}
        onClose={() => setShowEditRetry(false)}
        onSuccess={handleTaskEditorSuccess}
      />
    </>
  )
}