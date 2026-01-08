import { useState, useMemo, useEffect, useRef } from 'react'
import { Search, X, Filter, LayoutGrid, List, Target, CheckCircle2, AlertTriangle, XCircle as XCircleIcon } from 'lucide-react'
import type { TaskFilters as TaskFiltersType } from '../api/tasks'
import type { GoalStatus } from '../types'

interface TaskFiltersProps {
  filters: TaskFiltersType
  onFiltersChange: (filters: TaskFiltersType) => void
  projects: Array<{ id: string; name: string; color?: string | null }>
  goals: Array<{ id: string; title: string; type?: string | null; status?: GoalStatus | null; description?: string | null; end_date?: string | null; is_closed?: boolean }>
  allTags: string[]
  density?: 'comfortable' | 'compact'
  onDensityChange?: (density: 'comfortable' | 'compact') => void
  taskCount?: number
  isLoading?: boolean
}

export default function TaskFilters({ filters, onFiltersChange, projects, goals, allTags, density = 'comfortable', onDensityChange, taskCount, isLoading }: TaskFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const filtersPanelRef = useRef<HTMLDivElement>(null)
  const filtersButtonRef = useRef<HTMLButtonElement>(null)

  const handleSearchChange = (search: string) => {
    onFiltersChange({ ...filters, search: search || undefined })
  }

  const handleProjectChange = (projectId: string) => {
    onFiltersChange({ ...filters, project_id: projectId || undefined })
  }

  const handleGoalChange = (goalId: string) => {
    onFiltersChange({ ...filters, goal_id: goalId || undefined })
  }

  const handleTagChange = (tag: string) => {
    const currentTags = filters.tags || []
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag]
    onFiltersChange({ ...filters, tags: newTags.length > 0 ? newTags : undefined })
  }

  const handleDateRangeChange = (start?: string, end?: string) => {
    onFiltersChange({
      ...filters,
      due_date_start: start || undefined,
      due_date_end: end || undefined
    })
  }

  const getDatePresets = () => {
    const today = new Date()
    const thisWeekStart = new Date(today)
    thisWeekStart.setDate(today.getDate() - today.getDay())
    const thisWeekEnd = new Date(thisWeekStart)
    thisWeekEnd.setDate(thisWeekStart.getDate() + 6)
    
    const next2WeeksEnd = new Date(today)
    next2WeeksEnd.setDate(today.getDate() + 14)
    
    return {
      'This week': {
        start: thisWeekStart.toISOString().split('T')[0],
        end: thisWeekEnd.toISOString().split('T')[0]
      },
      'Next 2 weeks': {
        start: today.toISOString().split('T')[0],
        end: next2WeeksEnd.toISOString().split('T')[0]
      },
      'Overdue': {
        start: undefined,
        end: new Date(today.getTime() - 24*60*60*1000).toISOString().split('T')[0]
      }
    }
  }

  const handleDatePreset = (presetName: string) => {
    const presets = getDatePresets()
    const preset = presets[presetName as keyof typeof presets]
    if (preset) {
      handleDateRangeChange(preset.start, preset.end)
    }
  }

  const formatDateRange = (start?: string, end?: string) => {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    
    if (!start && !end) return ''
    
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr)
      const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      
      if (dateStr === todayStr) return 'today'
      if (diffDays === -1) return 'yesterday'
      if (diffDays === 1) return 'tomorrow'
      if (diffDays >= -7 && diffDays <= 7) {
        return date.toLocaleDateString(undefined, { weekday: 'long' }).toLowerCase()
      }
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    }
    
    if (!start) return `before ${formatDate(end!)}`
    if (!end) return `from ${formatDate(start)} onwards`
    if (start === end) return `on ${formatDate(start)}`
    
    return `${formatDate(start)} → ${formatDate(end)}`
  }

  const clearFilters = () => {
    onFiltersChange({ statuses: filters.statuses })
  }

  // Focus management for expanded filters panel
  useEffect(() => {
    if (isExpanded && filtersPanelRef.current) {
      // Focus the first input in the expanded panel
      const firstInput = filtersPanelRef.current.querySelector('select, input, button') as HTMLElement
      if (firstInput) {
        firstInput.focus()
      }
    }
  }, [isExpanded])

  // Keyboard navigation for filters panel
  useEffect(() => {
    if (!isExpanded) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsExpanded(false)
        filtersButtonRef.current?.focus()
        return
      }

      // Focus trap - keep focus within the expanded panel
      if (e.key === 'Tab' && filtersPanelRef.current) {
        const focusableElements = filtersPanelRef.current.querySelectorAll(
          'select, input, button, [href], [tabindex]:not([tabindex="-1"])'
        )
        const focusableArray = Array.from(focusableElements) as HTMLElement[]
        const firstElement = focusableArray[0]
        const lastElement = focusableArray[focusableArray.length - 1]

        if (e.shiftKey) {
          // Shift + Tab - go backwards
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement.focus()
          }
        } else {
          // Tab - go forwards
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isExpanded])

  const handleToggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  const hasActiveFilters = useMemo(() => {
    return !!(
      filters.search ||
      filters.project_id ||
      filters.goal_id ||
      filters.tags?.length ||
      filters.due_date_start ||
      filters.due_date_end
    )
  }, [filters])

  const activeFiltersCount = useMemo(() => {
    return [
      !!filters.search,
      !!filters.project_id,
      !!filters.goal_id,
      !!(filters.tags?.length),
      !!(filters.due_date_start || filters.due_date_end)
    ].filter(Boolean).length
  }, [filters])

  // Weekly goals
  const weeklyGoals = useMemo(() => {
    return goals.filter(g => g.type === 'weekly' && !g.is_closed)
  }, [goals])

  const handleGoalClick = (goalId: string) => {
    // Filter tasks by this goal
    onFiltersChange({ ...filters, goal_id: goalId })
  }

  const getStatusInfo = (status?: GoalStatus | null): { bg: string; text: string; icon: React.ElementType } => {
    switch (status) {
      case 'on_target':
        return { bg: 'var(--color-accent)', text: 'white', icon: CheckCircle2 };
      case 'at_risk':
        return { bg: 'var(--color-secondary)', text: 'var(--color-text)', icon: AlertTriangle };
      case 'off_target':
        return { bg: 'var(--color-primary)', text: 'white', icon: XCircleIcon };
      default:
        return { bg: 'var(--color-surface)', text: 'var(--color-text-muted)', icon: Target };
    }
  }

  return (
    <div className="mb-4">
      {/* Weekly Goals - The North Star */}
      {weeklyGoals.length > 0 && (
        <div className="card-brutal rounded-xl p-4 mb-4"
             style={{ background: 'var(--color-surface)' }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-md flex items-center justify-center border-2 border-black"
                 style={{ background: 'var(--color-accent)' }}>
              <Target size={16} color="white" />
            </div>
            <h3 className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
              Weekly Goals
            </h3>
            <span className="text-xs font-bold rounded-md px-2 py-1 border-2 border-black"
                  style={{ background: 'var(--color-secondary)', color: 'var(--color-text)', fontFamily: 'var(--font-display)' }}>
              {weeklyGoals.length}
            </span>
          </div>

          <div className="overflow-x-auto -mx-4 px-4">
            <div className="flex gap-3 pb-2 min-w-min">
              {weeklyGoals.map(goal => {
                const statusInfo = getStatusInfo(goal.status);
                const StatusIcon = statusInfo.icon;
                const isSelected = filters.goal_id === goal.id;

                return (
                  <div
                    key={goal.id}
                    className={`w-72 flex-shrink-0 card-brutal rounded-lg p-3 cursor-pointer transition-all hover:translate-y-[-2px] ${
                      isSelected ? 'ring-4 ring-offset-2 ring-teal-500' : ''
                    }`}
                    onClick={() => handleGoalClick(goal.id)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-bold text-sm flex-1 line-clamp-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
                        {goal.title}
                      </h4>
                      <div className="flex items-center gap-1 px-2 py-1 rounded-md border-2 border-black text-xs font-bold flex-shrink-0"
                           style={{ background: statusInfo.bg, color: statusInfo.text, fontFamily: 'var(--font-display)' }}>
                        <StatusIcon size={10} />
                      </div>
                    </div>

                    {goal.description && (
                      <p className="text-xs mb-2 line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>
                        {goal.description}
                      </p>
                    )}

                    {goal.end_date && (
                      <div className="flex items-center gap-2 text-xs font-medium">
                        <span className="px-2 py-0.5 rounded-md border border-black text-xs"
                              style={{ background: 'var(--color-background)', color: 'var(--color-text)' }}>
                          📅 {new Date(goal.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    )}

                    {isSelected && (
                      <div className="mt-2 pt-2 border-t border-black/10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onFiltersChange({ ...filters, goal_id: undefined });
                          }}
                          className="text-xs font-bold px-2 py-1 rounded-md border-2 border-black"
                          style={{ background: 'var(--color-surface)', color: 'var(--color-text-muted)' }}
                        >
                          Clear filter
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
      {/* Unified Toolbar */}
      <div className="flex items-center gap-4 mb-4">
        {/* Search - Takes up most space */}
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={filters.search || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        {/* Filters Button */}
        <button
          ref={filtersButtonRef}
          onClick={handleToggleExpanded}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            hasActiveFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-300 text-gray-600'
          }`}
          aria-expanded={isExpanded}
          aria-controls="filters-panel"
          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} filters panel`}
        >
          <Filter size={16} />
          Filters{hasActiveFilters && ` • ${activeFiltersCount}`}
        </button>

        {/* Density Toggle */}
        {onDensityChange && (
          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => onDensityChange('comfortable')}
              className={`flex items-center gap-1 px-3 py-2 text-sm transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                density === 'comfortable' 
                  ? 'bg-blue-50 text-blue-700' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              title="Comfortable view"
            >
              <LayoutGrid size={14} />
              Comfortable
            </button>
            <button
              onClick={() => onDensityChange('compact')}
              className={`flex items-center gap-1 px-3 py-2 text-sm border-l border-gray-300 transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                density === 'compact' 
                  ? 'bg-blue-50 text-blue-700' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
              title="Compact view"
            >
              <List size={14} />
              Compact
            </button>
          </div>
        )}

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-gray-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            title="Clear all filters"
          >
            <X size={16} />
            Clear
          </button>
        )}
      </div>

      {/* Results Count and Status */}
      {!isLoading && taskCount !== undefined && (
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <div>
            {taskCount === 0 && hasActiveFilters ? (
              <span className="text-orange-600">No tasks match your current filters</span>
            ) : (
              <span>{taskCount} {taskCount === 1 ? 'task' : 'tasks'} found</span>
            )}
          </div>
          {taskCount === 0 && hasActiveFilters && (
            <span className="text-xs">Try adjusting your filters or clearing them to see more tasks</span>
          )}
        </div>
      )}

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
          <span>Loading tasks...</span>
        </div>
      )}

      {/* Expanded Filters */}
      {isExpanded && (
        <div 
          ref={filtersPanelRef}
          id="filters-panel"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t"
          role="region"
          aria-label="Filter options"
        >
          {/* Project Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Project</label>
            <select
              value={filters.project_id || ''}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:border-transparent"
            >
              <option value="">All Projects</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* Goal Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Goal</label>
            <select
              value={filters.goal_id || ''}
              onChange={(e) => handleGoalChange(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:border-transparent"
            >
              <option value="">All Goals</option>
              {goals.map(goal => (
                <option key={goal.id} value={goal.id}>
                  {goal.title}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Due Date Range</label>
            
            {/* Quick Presets */}
            <div className="flex flex-wrap gap-2 mb-3">
              {Object.keys(getDatePresets()).map(presetName => (
                <button
                  key={presetName}
                  onClick={() => handleDatePreset(presetName)}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  {presetName}
                </button>
              ))}
            </div>
            
            <div className="flex gap-2">
              <input
                type="date"
                value={filters.due_date_start || ''}
                onChange={(e) => handleDateRangeChange(e.target.value, filters.due_date_end)}
                className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:border-transparent"
                placeholder="From"
              />
              <input
                type="date"
                value={filters.due_date_end || ''}
                onChange={(e) => handleDateRangeChange(filters.due_date_start, e.target.value)}
                className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:border-transparent"
                placeholder="To"
              />
            </div>
            
            {/* Date helper text and range summary */}
            <div className="text-xs text-gray-500 mt-1">
              {(filters.due_date_start || filters.due_date_end) ? (
                <div className="font-medium text-gray-700">
                  Due: {formatDateRange(filters.due_date_start, filters.due_date_end)}
                </div>
              ) : (
                'Dates shown in your locale'
              )}
            </div>
          </div>

          {/* Tags Filter */}
          {allTags.length > 0 && (
            <div className="md:col-span-2 lg:col-span-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
              <div className="flex flex-wrap gap-2">
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => handleTagChange(tag)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      filters.tags?.includes(tag)
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  )
}