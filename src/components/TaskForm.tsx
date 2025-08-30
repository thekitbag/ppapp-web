import React, { FormEvent, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listProjects } from '../api/projects'
import { listGoals } from '../api/goals'

export interface TaskFormValues {
  title: string
  tags: string
  project_id?: string | null
  goal_id?: string | null
  hard_due_at?: string | null
  soft_due_at?: string | null
}

export default function TaskForm({ onSubmit, disabled }: { onSubmit: (values: TaskFormValues) => void; disabled?: boolean }) {
  const [title, setTitle] = useState('')
  const [tags, setTags] = useState('')
  const [projectId, setProjectId] = useState('')
  const [goalId, setGoalId] = useState('')
  const [hardDue, setHardDue] = useState('')
  const [softDue, setSoftDue] = useState('')

  const projectsQ = useQuery({ queryKey: ['projects'], queryFn: listProjects })
  const goalsQ = useQuery({ queryKey: ['goals'], queryFn: listGoals })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    onSubmit({
      title: title.trim(),
      tags,
      project_id: projectId || null,
      goal_id: goalId || null,
      hard_due_at: hardDue || null,
      soft_due_at: softDue || null,
    })
    setTitle('')
    setTags('')
    setProjectId('')
    setGoalId('')
    setHardDue('')
    setSoftDue('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4 bg-white rounded-2xl shadow-md">
      <input
        className="flex-1 border rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary"
        placeholder="Task title*"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          className="border rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary"
          placeholder="tags (comma-separated)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />
        <select
          className="border rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
        >
          <option value="">No project</option>
          {projectsQ.data?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select
          className="border rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary"
          value={goalId}
          onChange={(e) => setGoalId(e.target.value)}
        >
          <option value="">No goal</option>
          {goalsQ.data?.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
        </select>
        <input
          type="datetime-local"
          className="border rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary"
          placeholder="Soft due date"
          value={softDue}
          onChange={(e) => setSoftDue(e.target.value)}
        />
        <input
          type="datetime-local"
          className="border rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary"
          placeholder="Hard due date"
          value={hardDue}
          onChange={(e) => setHardDue(e.target.value)}
        />
      </div>
      <div className="flex justify-end">
        <button type="submit" disabled={disabled} className="px-5 py-2 rounded-xl bg-primary text-white font-medium shadow hover:bg-blue-700 disabled:opacity-50">
          Add Task
        </button>
      </div>
    </form>
  )
}
