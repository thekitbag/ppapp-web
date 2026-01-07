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
        <div className="animate-pulse font-bold text-lg" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
          Loading archived tasks...
        </div>
      </div>
    )
  }

  const tasks = archivedTasksQ.data || []

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center border-3 border-black"
               style={{ background: 'var(--color-secondary)' }}>
            <Archive size={24} style={{ color: 'var(--color-text)' }} />
          </div>
          <h1 className="text-4xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
            Archive
          </h1>
          <span className="px-3 py-1 rounded-md border-2 border-black font-bold text-sm"
                style={{ background: 'var(--color-surface)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-display)' }}>
            {tasks.length} tasks
          </span>
        </div>
        <div className="w-24 h-1 rounded-full ml-16" style={{ background: 'var(--color-secondary)' }}></div>
      </div>

      {tasks.length === 0 ? (
        <div className="card-brutal text-center py-16 rounded-xl">
          <Archive size={64} className="mx-auto mb-6" style={{ color: 'var(--color-text-muted)' }} />
          <p className="text-xl mb-2 font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
            No archived tasks
          </p>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Completed or irrelevant tasks will appear here when archived
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map(task => (
            <div key={task.id} className="card-brutal rounded-xl p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold mb-3 text-lg" style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text)' }}>
                    {task.title}
                  </h3>

                  <div className="flex items-center gap-2 text-sm flex-wrap">
                    {task.tags.length > 0 && (
                      <div className="flex gap-2">
                        {task.tags.slice(0, 3).map((tag, i) => (
                          <span key={`${tag}-${i}`} className="px-2.5 py-1 rounded-md border-2 border-black text-xs font-medium"
                                style={{ background: 'var(--color-background)', color: 'var(--color-text)' }}>
                            {tag}
                          </span>
                        ))}
                        {task.tags.length > 3 && (
                          <span className="px-2.5 py-1 rounded-md border-2 border-black text-xs font-medium"
                                style={{ background: 'var(--color-background)', color: 'var(--color-text)' }}>
                            +{task.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {task.goals && task.goals.length > 0 && (
                      <div className="flex items-center gap-2">
                        {task.goals.slice(0, 1).map(g => (
                          <span key={g.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border-2 border-black text-xs font-medium"
                                style={{ background: 'var(--color-accent)', color: 'white' }}>
                            <Target size={12} />
                            {g.title}
                          </span>
                        ))}
                        {task.goals.length > 1 && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border-2 border-black text-xs font-medium"
                                style={{ background: 'var(--color-accent)', color: 'white' }}>
                            <Target size={12} />
                            +{task.goals.length - 1}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-medium px-3 py-1 rounded-md border-2 border-black"
                       style={{ background: 'var(--color-secondary)', color: 'var(--color-text)', fontFamily: 'var(--font-body)' }}>
                    {new Date(task.updated_at).toLocaleDateString()}
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