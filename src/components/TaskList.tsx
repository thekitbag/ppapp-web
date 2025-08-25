import React, { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createTask, updateTaskStatus } from '../api/tasks'
import type { Task, TaskStatus } from '../types'
import TaskForm, { TaskFormValues } from './TaskForm'
import { listRecommendations, type RecommendationItem } from '../api/recommendations'
import NextBestCard from './NextBestCard'

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
  const [dismissed, setDismissed] = useState<string[]>([])

  const recQ = useQuery({
    queryKey: ['recs', 10],
    queryFn: () => listRecommendations(10),
  })
  

  const createM = useMutation({
    mutationFn: (vals: TaskFormValues) => createTask({ title: vals.title, tags: splitTags(vals.tags), project_id: vals.project_id ?? null }),
    onSuccess: () => { onToast('Task created'); qc.invalidateQueries({ predicate: q => q.queryKey[0] === 'recs' }) },
    onSettled: () => { qc.invalidateQueries({ predicate: q => q.queryKey[0] === 'recs' }) },
    onError: () => onToast('Failed to create task', 'error'),
  })

  const statusM = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) => updateTaskStatus(id, status),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ['recs'] })
      const prev = qc.getQueryData<RecommendationItem[]>(['recs', { limit: 10 }])
      if (prev) {
        qc.setQueryData<RecommendationItem[]>(['recs', { limit: 10 }], prev.map(r => r.task.id === id ? { ...r, task: { ...r.task, status } } : r))
      }
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['recs', { limit: 10 }], ctx.prev)
      onToast('Failed to update status', 'error')
    },
    onSuccess: () => onToast('Status updated'),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['recs'] })
    }
  })

  function splitTags(input: string): string[] {
    return input.split(',').map(s=>s.trim()).filter(Boolean)
  }

  const topRec = useMemo(() => {
    const data = recQ.data
    if (!Array.isArray(data)) return undefined
    const items = data.filter(r => !dismissed.includes(r.task.id))
    return items[0]
  }, [recQ.data, dismissed])

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6 bg-white rounded-2xl shadow-md">
      <h1 className="text-2xl font-semibold text-secondary">Today</h1>

      {topRec && (
        <NextBestCard
          rec={topRec}
          onDone={(id, status) => statusM.mutate({ id, status })}
          onSnooze={(id) => setDismissed((d) => [...d, id])}
        />
      )}

      <TaskForm onSubmit={(v)=>createM.mutate(v)} disabled={createM.isPending} />

      {recQ.isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_,i)=> <div key={i} className="skeleton h-14 rounded-xl" />)}
        </div>
      )}

      {recQ.isError && (
        <div role="alert" className="p-3 rounded-xl bg-red-100 text-red-800">Failed to load recommendations.</div>
      )}

      {Array.isArray(recQ.data) && (
        <ul className="divide-y">
          {recQ.data.map((rec, idx) => (
            <li key={rec.task.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 transition">
              <span aria-hidden className="text-gray-400 select-none cursor-not-allowed">⋮⋮</span>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="font-medium text-gray-800">{rec.task.title}</div>
                  {idx === 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-600 text-white">Recommended</span>}
                </div>
                <TagChips tags={rec.task.tags} />
                <div className="text-xs text-gray-500 mt-1">{rec.why}</div>
              </div>

              <StatusControl task={rec.task} onChange={(s)=>statusM.mutate({ id: rec.task.id, status: s })} />

              <button className="ml-2 px-2 py-1 text-sm rounded-lg border" onClick={() => setDismissed(d => [...d, rec.task.id])}>
                Dismiss
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}