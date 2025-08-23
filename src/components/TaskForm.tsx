import React, { FormEvent, useState } from 'react'

export interface TaskFormValues {
  title: string
  tags: string
  project_id?: string | null
}

export default function TaskForm({ onSubmit, disabled }: { onSubmit: (values: TaskFormValues) => void; disabled?: boolean }) {
  const [title, setTitle] = useState('')
  const [tags, setTags] = useState('')
  const [project, setProject] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    onSubmit({ title: title.trim(), tags, project_id: project ? project : null })
    setTitle(''); setTags(''); setProject('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4 bg-white rounded-2xl shadow-md">
      <input
        className="flex-1 border rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary"
        placeholder="Task title*"
        value={title}
        onChange={(e)=>setTitle(e.target.value)}
        required
      />
      <div className="flex gap-2">
        <input
          className="flex-1 border rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary"
          placeholder="tags (comma-separated)"
          value={tags}
          onChange={(e)=>setTags(e.target.value)}
        />
        <input
          className="w-48 border rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary"
          placeholder="project (optional)"
          value={project}
          onChange={(e)=>setProject(e.target.value)}
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
