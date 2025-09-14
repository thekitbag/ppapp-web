import { useQuery } from '@tanstack/react-query'
import { qk } from '../lib/queryKeys'
import { listTasks } from '../api/tasks'
import { Archive, Target } from 'lucide-react'

export default function ArchivePage() {
  const archivedTasksQ = useQuery({
    queryKey: qk.tasks.byStatuses(['archived']),
    queryFn: () => listTasks({ statuses: ['archived'] })
  })

  if (archivedTasksQ.isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">Loading archived tasks...</div>
      </div>
    )
  }

  const tasks = archivedTasksQ.data || []

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Archive size={24} className="text-gray-600" />
        <h1 className="text-2xl font-semibold text-gray-800">Archive</h1>
        <span className="text-sm text-gray-500">({tasks.length} tasks)</span>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Archive size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg mb-2">No archived tasks</p>
          <p>Completed or irrelevant tasks will appear here when archived</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => (
            <div key={task.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 mb-1">{task.title}</h3>
                  
                  <div className="flex items-center gap-2 text-sm">
                    {task.tags.length > 0 && (
                      <div className="flex gap-1">
                        {task.tags.slice(0, 3).map((tag, i) => (
                          <span key={`${tag}-${i}`} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                            {tag}
                          </span>
                        ))}
                        {task.tags.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                            +{task.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {task.goals && task.goals.length > 0 && (
                      <div className="flex items-center gap-1">
                        {task.goals.slice(0, 1).map(g => (
                          <span key={g.id} className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                            <Target size={10} />
                            {g.title}
                          </span>
                        ))}
                        {task.goals.length > 1 && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                            <Target size={10} />
                            +{task.goals.length - 1}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-gray-400 mb-1">
                    Archived {new Date(task.updated_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}