import { useState, useRef, useEffect } from 'react'
import { MoreHorizontal, Edit, Archive, RotateCcw, Trash2, CheckCircle } from 'lucide-react'
import type { GoalNode } from '../../types'

interface GoalActionsMenuProps {
  goal: GoalNode
  onEdit: () => void
  onClose: () => void
  onArchive?: () => void
  onReopen?: () => void
  onDelete?: () => void
  disabled?: boolean
}

export default function GoalActionsMenu({
  goal,
  onEdit,
  onClose,
  onArchive,
  onReopen,
  onDelete,
  disabled = false
}: GoalActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const isClosed = goal.is_closed

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault()
        setIsOpen(!isOpen)
        break
      case 'Escape':
        setIsOpen(false)
        break
    }
  }

  const handleAction = (action: () => void) => {
    action()
    setIsOpen(false)
  }

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`
          p-1 rounded text-gray-400 transition-colors
          ${disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:text-gray-600 hover:bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1'
          }
        `}
        aria-label="Goal actions"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <MoreHorizontal size={16} />
      </button>

      {isOpen && !disabled && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[160px]">
          <div role="menu" className="py-1">
            {!isClosed && (
              <>
                <button
                  type="button"
                  onClick={() => handleAction(onEdit)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  role="menuitem"
                >
                  <Edit size={14} />
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => handleAction(onClose)}
                  className="w-full text-left px-3 py-2 text-sm text-green-700 hover:bg-green-50 flex items-center gap-2"
                  role="menuitem"
                  title="Mark goal as achieved/completed"
                >
                  <CheckCircle size={14} />
                  Close Goal
                </button>

                {onArchive && (
                  <button
                    type="button"
                    onClick={() => handleAction(onArchive)}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    role="menuitem"
                    title="Archive goal (abandoned/cleanup)"
                  >
                    <Archive size={14} />
                    Archive Goal
                  </button>
                )}
              </>
            )}

            {isClosed && onReopen && (
              <button
                type="button"
                onClick={() => handleAction(onReopen)}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                role="menuitem"
              >
                <RotateCcw size={14} />
                Reopen
              </button>
            )}

            {onDelete && (
              <>
                <div className="border-t border-gray-100 my-1" />
                <button
                  type="button"
                  onClick={() => handleAction(onDelete)}
                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  role="menuitem"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}