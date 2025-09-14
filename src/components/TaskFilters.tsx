import { useState, useMemo } from 'react'
import { Search, X, Filter } from 'lucide-react'
import type { TaskFilters as TaskFiltersType } from '../api/tasks'

interface TaskFiltersProps {
  filters: TaskFiltersType
  onFiltersChange: (filters: TaskFiltersType) => void
  projects: Array<{ id: string; name: string; color?: string | null }>
  goals: Array<{ id: string; title: string }>
  allTags: string[]
}

export default function TaskFilters({ filters, onFiltersChange, projects, goals, allTags }: TaskFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)

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

  const clearFilters = () => {
    onFiltersChange({ statuses: filters.statuses })
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

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
      {/* Search Bar - Always Visible */}
      <div className="flex items-center gap-4 mb-4">
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
        
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
            hasActiveFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-300 text-gray-600'
          }`}
        >
          <Filter size={16} />
          Filters
          {hasActiveFilters && (
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
              {[
                filters.project_id && 'Project',
                filters.goal_id && 'Goal', 
                filters.tags?.length && `${filters.tags.length} Tag${filters.tags.length !== 1 ? 's' : ''}`,
                (filters.due_date_start || filters.due_date_end) && 'Date'
              ].filter(Boolean).join(', ')}
            </span>
          )}
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-gray-700 transition-colors"
            title="Clear all filters"
          >
            <X size={16} />
            Clear
          </button>
        )}
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
          {/* Project Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Project</label>
            <select
              value={filters.project_id || ''}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            <div className="flex gap-2">
              <input
                type="date"
                value={filters.due_date_start || ''}
                onChange={(e) => handleDateRangeChange(e.target.value, filters.due_date_end)}
                className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="From"
              />
              <input
                type="date"
                value={filters.due_date_end || ''}
                onChange={(e) => handleDateRangeChange(filters.due_date_start, e.target.value)}
                className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="To"
              />
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
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
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
  )
}