import React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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
      qc.invalidateQueries({ queryKey: ['tasks', ['backlog', 'week', 'today', 'doing', 'waiting', 'done']] })
    },
    onError: () => t.push('Failed to create task', 'error'),
  })

  return (
    <div className="min-h-dvh bg-gray-100 font-sans">
      <header className="px-6 py-4 border-b bg-primary text-white shadow">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="text-lg font-semibold">Personal Chief of Staff</div>
          <nav className="text-sm">feat/metadata-and-bucket-dnd</nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto p-6 space-y-8">
        <div className="max-w-2xl">
          <h2 className="text-xl font-semibold mb-3">Add a new task</h2>
          <TaskForm onSubmit={(v) => createM.mutate(v)} disabled={createM.isPending} />
        </div>
        <TaskBoard />
      </main>
      <Toaster toasts={t.toasts} onClose={t.remove} />
      <footer className="mt-8 py-4 border-t text-center text-sm text-gray-500">© 2025 Personal Productivity App</footer>
    </div>
  )
}
