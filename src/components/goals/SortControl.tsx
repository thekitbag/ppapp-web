import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ArrowUpDown } from 'lucide-react'
import type { SortOption } from '../../lib/goalTreeUtils'

interface SortControlProps {
  sortBy: SortOption
  sortOrder: 'asc' | 'desc'
  onSortChange: (sortBy: SortOption, sortOrder: 'asc' | 'desc') => void
  disabled?: boolean
}

interface SortOptionConfig {
  value: SortOption
  label: string
  labelShort: string
  ascLabel: string
  descLabel: string
}

const SORT_OPTIONS: SortOptionConfig[] = [
  {
    value: 'title',
    label: 'Title',
    labelShort: 'Title',
    ascLabel: 'A → Z',
    descLabel: 'Z → A'
  },
  {
    value: 'end_date',
    label: 'End Date',
    labelShort: 'Date',
    ascLabel: 'Soonest First',
    descLabel: 'Latest First'
  },
  {
    value: 'status',
    label: 'Status',
    labelShort: 'Status',
    ascLabel: 'On Target First',
    descLabel: 'Off Target First'
  },
  {
    value: 'type',
    label: 'Type',
    labelShort: 'Type',
    ascLabel: 'Annual → Weekly',
    descLabel: 'Weekly → Annual'
  },
  {
    value: 'created_at',
    label: 'Created',
    labelShort: 'Created',
    ascLabel: 'Oldest First',
    descLabel: 'Newest First'
  }
]

export default function SortControl({
  sortBy,
  sortOrder,
  onSortChange,
  disabled = false
}: SortControlProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const currentOption = SORT_OPTIONS.find(opt => opt.value === sortBy) || SORT_OPTIONS[0]
  const orderLabel = sortOrder === 'asc' ? currentOption.ascLabel : currentOption.descLabel

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

  const handleSortByChange = (newSortBy: SortOption) => {
    onSortChange(newSortBy, sortOrder)
    setIsOpen(false)
  }

  const handleToggleOrder = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSortChange(sortBy, sortOrder === 'asc' ? 'desc' : 'asc')
  }

  return (
    <div className="relative inline-block" ref={containerRef}>
      <div className="flex items-center gap-2">
        {/* Main sort dropdown button */}
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`
            inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg
            border-2 border-black transition-all
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:translate-y-[-2px]'}
          `}
          style={{
            fontFamily: 'var(--font-display)',
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            boxShadow: disabled ? 'none' : 'var(--shadow-subtle)'
          }}
          aria-label={`Sort by: ${currentOption.label}. Click to change`}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <span>Sort: {currentOption.labelShort}</span>
          <ChevronDown
            size={14}
            className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Order toggle button */}
        <button
          type="button"
          onClick={handleToggleOrder}
          disabled={disabled}
          className={`
            inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg
            border-2 border-black transition-all
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:translate-y-[-1px]'}
          `}
          style={{
            fontFamily: 'var(--font-body)',
            background: 'var(--color-surface)',
            color: 'var(--color-text-muted)',
            boxShadow: disabled ? 'none' : '1px 1px 0px var(--color-border)'
          }}
          aria-label={`Current order: ${orderLabel}. Click to reverse`}
          title={orderLabel}
        >
          <ArrowUpDown size={14} />
          <span className="hidden sm:inline">{orderLabel}</span>
        </button>
      </div>

      {/* Dropdown menu */}
      {isOpen && !disabled && (
        <div
          className="absolute top-full left-0 mt-2 rounded-lg border-3 border-black overflow-hidden z-50 min-w-[200px]"
          style={{
            background: 'var(--color-surface)',
            boxShadow: 'var(--shadow-brutal)'
          }}
        >
          <div role="listbox" className="py-2">
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSortByChange(option.value)}
                className={`
                  w-full text-left px-4 py-2.5 text-sm font-medium transition-colors
                  ${option.value === sortBy
                    ? 'text-white'
                    : 'hover:text-white'
                  }
                `}
                style={{
                  fontFamily: 'var(--font-body)',
                  background: option.value === sortBy
                    ? 'var(--color-accent)'
                    : 'transparent',
                  color: option.value === sortBy
                    ? 'white'
                    : 'var(--color-text)'
                }}
                onMouseEnter={(e) => {
                  if (option.value !== sortBy) {
                    e.currentTarget.style.background = 'var(--color-accent)'
                    e.currentTarget.style.color = 'white'
                  }
                }}
                onMouseLeave={(e) => {
                  if (option.value !== sortBy) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--color-text)'
                  }
                }}
                role="option"
                aria-selected={option.value === sortBy}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
