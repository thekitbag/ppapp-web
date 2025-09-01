import { useEffect, useState } from 'react'
import { Calendar, Flag } from 'lucide-react'
import type { Task } from '../types'

export default function SuggestWeekModal({ open, tasks, onClose, onConfirm, isLoading }: {
  open: boolean
  tasks: Task[]
  onClose: () => void
  onConfirm: (ids: string[]) => void
  isLoading?: boolean
}) {
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (open) {
      const initial: Record<string, boolean> = {}
      // Don't pre-select all tasks, let user choose
      tasks.forEach(task => { initial[task.id] = false })
      setChecked(initial)
    }
  }, [open, tasks])

  if (!open) return null

  const selectedIds = Object.entries(checked).filter(([, v]) => v).map(([k]) => k)

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl p-6 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Suggest Tasks for Week</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">Finding your best tasks for this week...</div>
          </div>
        ) : (
          <>
            <div className="text-sm text-gray-600 mb-4">
              Select tasks to move to this week. Tasks are intelligently prioritized based on deadlines, effort, and other factors.
            </div>
            
            <div className="flex-1 overflow-auto border border-gray-200 rounded-lg">
              {tasks.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No recommended tasks found
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {tasks.map((task) => (
                    <label key={task.id} className="flex items-start gap-3 p-4 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!checked[task.id]}
                        onChange={(e) => setChecked((c) => ({ ...c, [task.id]: e.target.checked }))}
                        className="mt-1.5 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        aria-label={`Select ${task.title}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 mb-2">{task.title}</div>
                        
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          {task.effort_minutes && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                              ⏱️ {task.effort_minutes}min
                            </span>
                          )}
                          
                          {task.soft_due_at && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                              <Calendar size={12} />
                              {formatDate(task.soft_due_at)} (soft)
                            </span>
                          )}
                          
                          {task.hard_due_at && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
                              <Flag size={12} />
                              {formatDate(task.hard_due_at)} (hard)
                            </span>
                          )}
                        </div>
                        
                        {task.tags && task.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {task.tags.map((tag, i) => (
                              <span key={`${tag}-${i}`} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-gray-600">
                {selectedIds.length > 0 ? `${selectedIds.length} task${selectedIds.length === 1 ? '' : 's'} selected` : 'No tasks selected'}
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => onConfirm(selectedIds)}
                  disabled={selectedIds.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Move to Week ({selectedIds.length})
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
