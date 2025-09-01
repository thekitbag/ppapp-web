import { FormEvent, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { qk } from '../lib/queryKeys'
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

  const projectsQ = useQuery({ queryKey: qk.projects.all, queryFn: listProjects })
  const goalsQ = useQuery({ queryKey: qk.goals.all, queryFn: listGoals })

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
    <form onSubmit={handleSubmit} className="p-4 bg-white rounded-2xl shadow-md">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Task Title*</label>
          <input
            id="title"
            className="w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary"
            placeholder="Enter a descriptive title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
          <input
            id="tags"
            className="w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary"
            placeholder="e.g. frontend, bug"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="project" className="block text-sm font-medium text-gray-700 mb-1">Project</label>
          <select
            id="project"
            className="w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="">No project</option>
            {projectsQ.data?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="goal" className="block text-sm font-medium text-gray-700 mb-1">Goal</label>
          <select
            id="goal"
            className="w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary"
            value={goalId}
            onChange={(e) => setGoalId(e.target.value)}
          >
            <option value="">No goal</option>
            {goalsQ.data?.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="soft-due" className="block text-sm font-medium text-gray-700 mb-1">Soft Due Date</label>
          <input
            id="soft-due"
            type="datetime-local"
            className="w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary"
            value={softDue}
            onChange={(e) => setSoftDue(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="hard-due" className="block text-sm font-medium text-gray-700 mb-1">Hard Due Date</label>
          <input
            id="hard-due"
            type="datetime-local"
            className="w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary"
            value={hardDue}
            onChange={(e) => setHardDue(e.target.value)}
          />
        </div>

        <div className="md:col-span-2 flex justify-end">
          <button type="submit" disabled={disabled} className="px-6 py-2 rounded-xl bg-primary text-white font-medium shadow hover:bg-blue-700 disabled:opacity-50 transition-colors">
            Add Task
          </button>
        </div>
      </div>
    </form>
  )
}
