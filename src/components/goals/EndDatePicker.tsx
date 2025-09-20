import { useState, useRef, useEffect } from 'react'
import { Calendar, Check, X } from 'lucide-react'

interface EndDatePickerProps {
  endDate: string | null | undefined
  onChange: (date: string) => void
  disabled?: boolean
  compact?: boolean
}

export default function EndDatePicker({
  endDate,
  onChange,
  disabled = false,
  compact = true
}: EndDatePickerProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Format date for display
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'No date'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    })
  }

  // Format date for input (YYYY-MM-DD)
  const formatDateForInput = (dateString: string | null | undefined) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toISOString().split('T')[0]
  }

  // Handle edit start
  const handleEditStart = () => {
    if (disabled) return
    setInputValue(formatDateForInput(endDate))
    setIsEditing(true)
  }

  // Handle save
  const handleSave = () => {
    if (inputValue) {
      // Convert to ISO string for consistency
      const date = new Date(inputValue)
      onChange(date.toISOString())
    }
    setIsEditing(false)
  }

  // Handle cancel
  const handleCancel = () => {
    setIsEditing(false)
    setInputValue('')
  }

  // Handle keyboard events
  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'Enter':
        event.preventDefault()
        handleSave()
        break
      case 'Escape':
        event.preventDefault()
        handleCancel()
        break
    }
  }

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isEditing])

  // Check if date is overdue
  const isOverdue = endDate && new Date(endDate) < new Date()

  if (isEditing) {
    return (
      <div className="inline-flex items-center gap-1">
        <input
          ref={inputRef}
          type="date"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={(e) => {
            // Don't cancel if clicking on save button
            if (e.relatedTarget?.getAttribute('aria-label') === 'Save date') {
              return
            }
            handleCancel()
          }}
          className={`
            border border-blue-500 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent
            ${compact ? 'w-32' : 'w-40'}
          `}
          aria-label="Edit end date"
        />
        <button
          type="button"
          onClick={handleSave}
          className="text-green-600 hover:text-green-700 p-1"
          aria-label="Save date"
          disabled={!inputValue}
        >
          <Check size={14} />
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="text-gray-500 hover:text-gray-700 p-1"
          aria-label="Cancel edit"
        >
          <X size={14} />
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={handleEditStart}
      disabled={disabled}
      className={`
        inline-flex items-center gap-1 text-sm transition-colors
        ${disabled
          ? 'text-gray-400 cursor-not-allowed'
          : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded px-2 py-1'
        }
        ${isOverdue ? 'text-red-600 font-medium' : ''}
      `}
      aria-label={`End date: ${formatDate(endDate)}. Click to edit`}
    >
      <Calendar size={12} />
      <span>{formatDate(endDate)}</span>
    </button>
  )
}