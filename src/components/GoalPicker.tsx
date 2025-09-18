import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'
import type { GoalNode } from '../types'

interface GoalOption {
  id: string
  title: string
  path: string
  depth: number
  type: string
}

interface GoalPickerProps {
  tree: GoalNode[]
  value?: string
  onChange: (goalId: string | '') => void
  placeholder?: string
  className?: string
}

export default function GoalPicker({
  tree,
  value = '',
  onChange,
  placeholder = 'Select a goal...',
  className = ''
}: GoalPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Flatten tree to options with breadcrumb paths
  const flattenGoals = (nodes: GoalNode[], parentPath = ''): GoalOption[] => {
    const options: GoalOption[] = []

    nodes.forEach(node => {
      const currentPath = parentPath ? `${parentPath} › ${node.title}` : node.title
      const depth = parentPath.split(' › ').length - (parentPath ? 0 : 1)

      options.push({
        id: node.id,
        title: node.title,
        path: parentPath,
        depth,
        type: node.type || 'unknown'
      })

      if (node.children && node.children.length > 0) {
        options.push(...flattenGoals(node.children, currentPath))
      }
    })

    return options
  }

  const allOptions = flattenGoals(tree)

  // Filter options based on search term
  const filteredOptions = searchTerm
    ? allOptions.filter(option =>
        option.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        option.path.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : allOptions

  // Find selected option for display
  const selectedOption = allOptions.find(option => option.id === value)

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchTerm('')
        setHighlightedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          setIsOpen(false)
          setSearchTerm('')
          setHighlightedIndex(-1)
          break
        case 'ArrowDown':
          event.preventDefault()
          setHighlightedIndex(prev =>
            prev < filteredOptions.length - 1 ? prev + 1 : 0
          )
          break
        case 'ArrowUp':
          event.preventDefault()
          setHighlightedIndex(prev =>
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          )
          break
        case 'Enter':
          event.preventDefault()
          if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
            const option = filteredOptions[highlightedIndex]
            onChange(option.id)
            setIsOpen(false)
            setSearchTerm('')
            setHighlightedIndex(-1)
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, highlightedIndex, filteredOptions, onChange])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen])

  const handleToggle = () => {
    setIsOpen(!isOpen)
    setSearchTerm('')
    setHighlightedIndex(-1)
  }

  const handleOptionClick = (optionId: string) => {
    onChange(optionId)
    setIsOpen(false)
    setSearchTerm('')
    setHighlightedIndex(-1)
  }

  const handleClear = (event: React.MouseEvent) => {
    event.stopPropagation()
    onChange('')
    setIsOpen(false)
    setSearchTerm('')
    setHighlightedIndex(-1)
  }

  const getIndentClass = (depth: number) => {
    switch (depth) {
      case 0: return 'pl-3'
      case 1: return 'pl-6'
      case 2: return 'pl-9'
      default: return `pl-${Math.min(12, 3 + depth * 3)}`
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'annual': return 'text-purple-600'
      case 'quarterly': return 'text-blue-600'
      case 'weekly': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-left focus:ring-2 focus:ring-blue-500 focus:border-transparent flex items-center justify-between"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
          {selectedOption ? selectedOption.title : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {selectedOption && (
            <span
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors cursor-pointer"
              aria-label="Clear selection"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleClear(e as any)
                }
              }}
            >
              <X size={14} />
            </span>
          )}
          <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Selected Goal Path Display */}
      {selectedOption && selectedOption.path && (
        <div className="mt-1 text-xs text-gray-500">
          {selectedOption.path}
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-hidden"
          role="listbox"
        >
          {/* Search Input */}
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setHighlightedIndex(-1)
                }}
                placeholder="Search goals..."
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-48 overflow-y-auto">
            {/* No Goal Option */}
            <button
              type="button"
              onClick={() => handleOptionClick('')}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 transition-colors ${
                highlightedIndex === -1 ? 'bg-blue-50' : ''
              }`}
              role="option"
              aria-selected={value === ''}
            >
              <span className="text-gray-500 italic">No goal</span>
            </button>

            {/* Goal Options */}
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleOptionClick(option.id)}
                  className={`w-full py-2 text-left text-sm hover:bg-blue-50 transition-colors ${
                    highlightedIndex === index ? 'bg-blue-50' : ''
                  } ${getIndentClass(option.depth)}`}
                  role="option"
                  aria-selected={value === option.id}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{option.title}</span>
                    <span className={`text-xs font-medium uppercase ${getTypeColor(option.type)}`}>
                      {option.type}
                    </span>
                  </div>
                  {option.path && (
                    <div className="text-xs text-gray-500 mt-0.5">
                      {option.path}
                    </div>
                  )}
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500">
                No goals found matching "{searchTerm}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}