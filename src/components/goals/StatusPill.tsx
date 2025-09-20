import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import type { GoalStatus } from '../../types'

const STATUS_OPTIONS: { value: GoalStatus; label: string; color: string }[] = [
  { value: 'on_target', label: 'On Target', color: 'bg-green-100 text-green-800' },
  { value: 'at_risk', label: 'At Risk', color: 'bg-amber-100 text-amber-800' },
  { value: 'off_target', label: 'Off Target', color: 'bg-red-100 text-red-800' },
]

interface StatusPillProps {
  status: GoalStatus | null | undefined
  onChange: (status: GoalStatus) => void
  disabled?: boolean
  size?: 'sm' | 'md'
}

export default function StatusPill({
  status,
  onChange,
  disabled = false,
  size = 'sm'
}: StatusPillProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const currentStatus = status || 'on_target'
  const currentOption = STATUS_OPTIONS.find(opt => opt.value === currentStatus) || STATUS_OPTIONS[0]

  // Close dropdown when clicking outside
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
      case 'ArrowDown':
        if (!isOpen) {
          event.preventDefault()
          setIsOpen(true)
        }
        break
    }
  }

  const handleOptionSelect = (option: typeof STATUS_OPTIONS[0]) => {
    onChange(option.value)
    setIsOpen(false)
  }

  const sizeClasses = size === 'sm'
    ? 'text-xs px-2 py-1'
    : 'text-sm px-3 py-1.5'

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`
          inline-flex items-center gap-1 rounded-full font-medium transition-colors
          ${currentOption.color}
          ${sizeClasses}
          ${disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:opacity-80 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1'
          }
        `}
        aria-label={`Current status: ${currentOption.label}. Click to change`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span>{currentOption.label}</span>
        {!disabled && (
          <ChevronDown
            size={size === 'sm' ? 12 : 14}
            className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        )}
      </button>

      {isOpen && !disabled && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[120px]">
          <div role="listbox" className="py-1">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleOptionSelect(option)}
                className={`
                  w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors
                  ${option.value === currentStatus ? 'bg-blue-50 text-blue-900' : 'text-gray-900'}
                `}
                role="option"
                aria-selected={option.value === currentStatus}
              >
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${option.color}`}>
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}