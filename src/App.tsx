import { useMutation, useQueryClient } from '@tanstack/react-query'
import { qk } from './lib/queryKeys'
import { STATUS_ORDER } from './constants'
import Toaster, { useToaster } from './components/Toaster'
import TaskBoard from './components/TaskBoard'
import TaskForm, { TaskFormValues } from './components/TaskForm'
import { createTask } from './api/tasks'

export default function App() {
  const t = useToaster()
  const qc = useQueryClient()

  const createM = useMutation({
    mutationFn: (vals: TaskFormValues) => {
      const tags = vals.tags.split(',').map(s => s.trim()).filter(Boolean)
      return createTask({
        title: vals.title,
        tags,
        project_id: vals.project_id,
        goal_id: vals.goal_id,
        hard_due_at: vals.hard_due_at ? new Date(vals.hard_due_at).toISOString() : null,
        soft_due_at: vals.soft_due_at ? new Date(vals.soft_due_at).toISOString() : null,
        status: 'backlog',
      })
    },
    onSuccess: () => {
      t.push('Task created')
      qc.invalidateQueries({ queryKey: qk.tasks.byStatuses(STATUS_ORDER) })
    },
    onError: () => t.push('Failed to create task', 'error'),
  })

  return (
    <div className="min-h-dvh bg-gray-100 font-sans">
      <header className="px-6 py-4 border-b bg-primary text-white shadow">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="text-lg font-semibold">Personal Chief of Staff</div>
        </div>
      </header>
      <main className="p-6 space-y-8">
        <div>
          <h2 className="text-xl font-semibold mb-3">Add a new task</h2>
          <TaskForm onSubmit={(v) => createM.mutate(v)} disabled={createM.isPending} />
        </div>
        <div className="max-w-7xl mx-auto">
          <TaskBoard />
        </div>
      </main>
      <Toaster toasts={t.toasts} onClose={t.remove} />
      <footer className="mt-8 py-4 border-t text-center text-sm text-gray-500">© 2025 Personal Productivity App</footer>
    </div>
  )
}
