import React, { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createTask, listTasks, promoteTasksToWeek, updateTaskStatus } from '../api/tasks'
import type { Task, TaskStatus } from '../types'
import TaskForm, { TaskFormValues } from './TaskForm'
import { suggestWeek, type RecommendationItem } from '../api/recommendations'
import SuggestWeekModal from './SuggestWeekModal'

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
  const nexts: TaskStatus[] = ['backlog','today','week','waiting','done', 'doing']
  return (
    <select aria-label={`Change status for ${task.title}`} value={task.status} onChange={(e)=>onChange(e.target.value as TaskStatus)} className="border rounded-lg px-2 py-1 focus:ring-2 focus:ring-primary">
      {nexts.map((s)=> <option key={s} value={s}>{s}</option>)}
    </select>
  )
}

function Bucket({ title, cta, children }: { title: string; cta?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl shadow p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium capitalize">{title}</h3>
        {cta}
      </div>
      {children}
    </section>
  )
}

export default function TaskList({ onToast }: { onToast: (msg: string, type?: 'success'|'error') => void }) {
  const qc = useQueryClient()

  const tasksQ = useQuery({ queryKey: ['tasks'], queryFn: listTasks })
  const [modalOpen, setModalOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<RecommendationItem[]>([])

  const createM = useMutation({
    mutationFn: (vals: TaskFormValues) => createTask({ title: vals.title, tags: splitTags(vals.tags), project_id: vals.project_id ?? null }),
    onSuccess: () => { onToast('Task created'); qc.invalidateQueries({ queryKey: ['tasks'] }) },
    onError: () => onToast('Failed to create task', 'error'),
  })

  const statusM = useMutation({
    mutationFn: ({ id, status }: { id: string | number; status: TaskStatus }) => updateTaskStatus(String(id), status),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ['tasks'] })
      const prev = qc.getQueryData<Task[]>(['tasks'])
      if (prev) {
        qc.setQueryData<Task[]>(['tasks'], prev.map(t => t.id === id ? { ...t, status } : t))
      }
      return { prev }
    },
    onError: (_err, _vars, ctx) => { if (ctx?.prev) qc.setQueryData(['tasks'], ctx.prev); onToast('Failed to update status', 'error') },
    onSuccess: () => onToast('Status updated'),
    onSettled: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const suggestM = useMutation({
    mutationFn: (limit: number) => suggestWeek(limit),
    onSuccess: (items) => { setSuggestions(items); setModalOpen(true) },
    onError: () => onToast('Failed to get suggestions', 'error'),
  })

  const promoteM = useMutation({
    mutationFn: (ids: Array<string | number>) => promoteTasksToWeek(ids),
    onSuccess: (_res, ids) => {
      const prev = qc.getQueryData<Task[]>(['tasks'])
      if (prev) {
        qc.setQueryData<Task[]>(['tasks'], prev.map(t => ids.includes(t.id) ? { ...t, status: 'week' } as Task : t))
      }
      onToast(`${ids.length} tasks moved to This Week`)
      setModalOpen(false)
    },
    onError: () => onToast('Failed to move tasks', 'error'),
    onSettled: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); qc.invalidateQueries({ queryKey: ['recs', 'week'] }) }
  })

  function splitTags(input: string): string[] {
    return input.split(',').map(s=>s.trim()).filter(Boolean)
  }

  const tasks = tasksQ.data || []
  const current = useMemo(() => tasks.find(t => t.status === 'doing'), [tasks])
  const remainingToday = useMemo(() => tasks.filter(t => t.status === 'today'), [tasks])
  const backlog = useMemo(() => tasks.filter(t => t.status === 'backlog'), [tasks])
  const waiting = useMemo(() => tasks.filter(t => t.status === 'waiting'), [tasks])
  const week = useMemo(() => tasks.filter(t => t.status === 'week'), [tasks])

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <TaskForm onSubmit={(v)=>createM.mutate(v)} disabled={createM.isPending} />

      <section className="bg-white rounded-2xl shadow p-4">
        <h2 className="text-lg font-semibold mb-2">Currently in progress</h2>
        {current ? (
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <div className="font-medium text-gray-900">{current.title}</div>
              <TagChips tags={current.tags} />
            </div>
            <StatusControl task={current} onChange={(s)=>statusM.mutate({ id: current.id, status: s })} />
          </div>
        ) : (
          <div className="text-sm text-gray-500">No task in progress. Pick one from Today or Backlog.</div>
        )}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Bucket title="backlog">
          <ul className="space-y-2">
            {backlog.map(t => (
              <li key={t.id} className="p-2 rounded-lg border flex items-center gap-3">
                <div className="flex-1">
                  <div className="font-medium">{t.title}</div>
                  <TagChips tags={t.tags} />
                </div>
                <StatusControl task={t} onChange={(s)=>statusM.mutate({ id: t.id, status: s })} />
              </li>
            ))}
            {backlog.length === 0 && <li className="text-sm text-gray-500 italic">No backlog tasks.</li>}
          </ul>
        </Bucket>

        <Bucket title="today">
          <ul className="space-y-2">
            {remainingToday.map(t => (
              <li key={t.id} className="p-2 rounded-lg border flex items-center gap-3">
                <div className="flex-1">
                  <div className="font-medium">{t.title}</div>
                  <TagChips tags={t.tags} />
                </div>
                <StatusControl task={t} onChange={(s)=>statusM.mutate({ id: t.id, status: s })} />
              </li>
            ))}
            {!current && remainingToday.length === 0 && <li className="text-sm text-gray-500 italic">No tasks for today yet.</li>}
          </ul>
        </Bucket>

        <Bucket title="week" cta={<button className="px-3 py-1.5 rounded-lg bg-primary text-white" onClick={() => suggestM.mutate(5)}>Suggest Tasks</button>}>
          <ul className="space-y-2">
            {week.map(t => (
              <li key={t.id} className="p-2 rounded-lg border flex items-center gap-3">
                <div className="flex-1">
                  <div className="font-medium">{t.title}</div>
                  <TagChips tags={t.tags} />
                </div>
                <StatusControl task={t} onChange={(s)=>statusM.mutate({ id: t.id, status: s })} />
              </li>
            ))}
            {week.length === 0 && <li className="text-sm text-gray-500 italic">No tasks planned this week.</li>}
          </ul>
        </Bucket>

        <Bucket title="waiting">
          <ul className="space-y-2">
            {waiting.map(t => (
              <li key={t.id} className="p-2 rounded-lg border flex items-center gap-3">
                <div className="flex-1">
                  <div className="font-medium">{t.title}</div>
                  <TagChips tags={t.tags} />
                </div>
                <StatusControl task={t} onChange={(s)=>statusM.mutate({ id: t.id, status: s })} />
              </li>
            ))}
            {waiting.length === 0 && <li className="text-sm text-gray-500 italic">Nothing waiting on others.</li>}
          </ul>
        </Bucket>
      </div>

      {modalOpen && (
        <SuggestWeekModal
          open={modalOpen}
          suggestions={suggestions}
          onClose={() => setModalOpen(false)}
          onConfirm={(ids) => promoteM.mutate(ids)}
        />
      )}
    </div>
  )
}