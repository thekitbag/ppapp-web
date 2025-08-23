import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createTask, listTasks, updateTaskStatus } from '../api/tasks'
import type { Task, TaskStatus } from '../types'
import TaskForm, { TaskFormValues } from './TaskForm'

function TagChips({ tags }: { tags: string[] }) {
  if (!tags?.length) return null
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {tags.map((t, i) => (
        <span key={`${t}-${i}`} className="text-xs rounded-full px-2 py-1 bg-blue-100 text-blue-700">{t}</span>
      ))}
    </div>
  )
}

function StatusControl({ task, onChange }: { task: Task; onChange: (s: TaskStatus) => void }) {
  const nexts: TaskStatus[] = ['inbox','todo','doing','done']
  return (
    <select aria-label={`Change status for ${task.title}`} value={task.status} onChange={(e)=>onChange(e.target.value as TaskStatus)} className="border rounded-lg px-2 py-1 focus:ring-2 focus:ring-primary">
      {nexts.map((s)=> <option key={s} value={s}>{s}</option>)}
    </select>
  )
}

export default function TaskList({ onToast }: { onToast: (msg: string, type?: 'success'|'error') => void }) {
  const qc = useQueryClient()
  const tasksQ = useQuery({ queryKey: ['tasks'], queryFn: listTasks })

  const createM = useMutation({
    mutationFn: (vals: TaskFormValues) => createTask({ title: vals.title, tags: splitTags(vals.tags), project_id: vals.project_id ?? null }),
    onSuccess: () => { onToast('Task created'); qc.invalidateQueries({ queryKey: ['tasks'] }) },
    onError: () => onToast('Failed to create task', 'error'),
  })

  const statusM = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) => updateTaskStatus(id, status),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ['tasks'] })
      const prev = qc.getQueryData<Task[]>(['tasks'])
      if (prev) {
        qc.setQueryData<Task[]>(['tasks'], prev.map(t => t.id === id ? { ...t, status } : t))
      }
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['tasks'], ctx.prev)
      onToast('Failed to update status', 'error')
    },
    onSuccess: () => onToast('Status updated'),
    onSettled: () => qc.invalidateQueries({ queryKey: ['tasks'] })
  })

  function splitTags(input: string): string[] {
    return input.split(',').map(s=>s.trim()).filter(Boolean)
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6 bg-white rounded-2xl shadow-md">
      <h1 className="text-2xl font-semibold text-secondary">Today</h1>

      <TaskForm onSubmit={(v)=>createM.mutate(v)} disabled={createM.isPending} />

      {tasksQ.isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_,i)=> <div key={i} className="skeleton h-14 rounded-xl" />)}
        </div>
      )}

      {tasksQ.isError && (
        <div role="alert" className="p-3 rounded-xl bg-red-100 text-red-800">Failed to load tasks.</div>
      )}

      {tasksQ.data && (
        <ul className="divide-y">
          {tasksQ.data.map(task => (
            <li key={task.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 transition">
              <span aria-hidden className="text-gray-400 select-none cursor-not-allowed">⋮⋮</span>

              <div className="flex-1">
                <div className="font-medium text-gray-800">{task.title}</div>
                <TagChips tags={task.tags} />
              </div>

              <StatusControl task={task} onChange={(s)=>statusM.mutate({ id: task.id, status: s })} />

              <button className="ml-2 px-2 py-1 text-sm rounded-lg border text-gray-400 cursor-not-allowed" aria-disabled={true} disabled>
                note
              </button>
              <button className="ml-1 px-2 py-1 text-sm rounded-lg border text-gray-400 cursor-not-allowed" aria-disabled={true} disabled>
                block
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
