import { useState, useRef, useEffect } from 'react'
import { Plus, Check, X } from 'lucide-react'
import { TaskStatus } from '../types'

interface QuickAddProps {
  status: TaskStatus
  onSubmit: (title: string) => void
  className?: string
}

export default function QuickAdd({ status, onSubmit, className = '' }: QuickAddProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isEditing])

  const handleSubmit = () => {
    if (!title.trim()) return

    onSubmit(title.trim())
    setTitle('')
    setIsEditing(false)
  }

  const handleCancel = () => {
    setTitle('')
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }

  const statusLabels = {
    backlog: 'Backlog',
    week: 'This Week',
    today: 'Today',
    doing: 'Doing',
    waiting: 'Waiting',
    done: 'Done',
    archived: 'Archived'
  }

  if (isEditing) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-3 ${className}`}>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Add task to ${statusLabels[status]}...`}
            className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="text-green-600 hover:text-green-800 p-1 rounded transition-colors disabled:text-gray-400 disabled:cursor-not-allowed"
            title="Add task"
          >
            <Check size={16} />
          </button>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors"
            title="Cancel"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className={`w-full flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors text-sm font-medium ${className}`}
      title={`Add task to ${statusLabels[status]}`}
    >
      <Plus size={16} />
      <span>Add task</span>
    </button>
  )
}