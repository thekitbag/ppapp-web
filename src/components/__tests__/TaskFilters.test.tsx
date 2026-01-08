import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import TaskFilters from '../TaskFilters'
import type { TaskFilters as TaskFiltersType } from '../../api/tasks'

const mockGoals = [
  { id: 'goal-1', title: 'Goal Alpha' },
  { id: 'goal-2', title: 'Goal Beta' }
]

const mockAllTags = ['urgent', 'frontend', 'backend', 'testing']

describe('TaskFilters Integration Tests', () => {
  let mockFilters: TaskFiltersType
  let mockOnFiltersChange: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFilters = { statuses: ['backlog', 'week', 'doing', 'done'] }
    mockOnFiltersChange = vi.fn()
  })

  const renderTaskFilters = (overrides: Partial<React.ComponentProps<typeof TaskFilters>> = {}) => {
    return render(
      <TaskFilters
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        goals={mockGoals}
        allTags={mockAllTags}
        taskCount={5}
        isLoading={false}
        {...overrides}
      />
    )
  }

  describe('Search Filter', () => {
    it('calls onFiltersChange when search term is entered', async () => {
      renderTaskFilters()

      const searchInput = screen.getByPlaceholderText('Search tasks...')
      fireEvent.change(searchInput, { target: { value: 'fix bug' } })

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        ...mockFilters,
        search: 'fix bug'
      })
    })

    it('clears search when empty string is entered', async () => {
      const filtersWithSearch = { ...mockFilters, search: 'existing search' }
      renderTaskFilters({ filters: filtersWithSearch })

      const searchInput = screen.getByDisplayValue('existing search')
      fireEvent.change(searchInput, { target: { value: '' } })

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        ...filtersWithSearch,
        search: undefined
      })
    })
  })

  describe('Project Filter', () => {
    it('shows projects dropdown when filters are expanded', async () => {
      renderTaskFilters()

      const filtersButton = screen.getByRole('button', { name: /expand filters/i })
      fireEvent.click(filtersButton)

      await waitFor(() => {
        expect(screen.getByText('All Projects')).toBeInTheDocument()
        expect(screen.getByText('Project Alpha')).toBeInTheDocument()
        expect(screen.getByText('Project Beta')).toBeInTheDocument()
      })
    })

    it('calls onFiltersChange when project is selected', async () => {
      renderTaskFilters()

      const filtersButton = screen.getByRole('button', { name: /expand filters/i })
      fireEvent.click(filtersButton)

      await waitFor(() => {
        const projectSelect = screen.getAllByRole('combobox')[0] // First combobox is project
        fireEvent.change(projectSelect, { target: { value: 'project-1' } })

        expect(mockOnFiltersChange).toHaveBeenCalledWith({
          ...mockFilters,
          project_id: 'project-1'
        })
      })
    })
  })

  describe('Goal Filter', () => {
    it('shows goals dropdown when filters are expanded', async () => {
      renderTaskFilters()

      const filtersButton = screen.getByRole('button', { name: /expand filters/i })
      fireEvent.click(filtersButton)

      await waitFor(() => {
        expect(screen.getByText('All Goals')).toBeInTheDocument()
        expect(screen.getByText('Goal Alpha')).toBeInTheDocument()
        expect(screen.getByText('Goal Beta')).toBeInTheDocument()
      })
    })

    it('calls onFiltersChange when goal is selected', async () => {
      renderTaskFilters()

      const filtersButton = screen.getByRole('button', { name: /expand filters/i })
      fireEvent.click(filtersButton)

      await waitFor(() => {
        const goalSelect = screen.getAllByRole('combobox')[1] // Second combobox is goal
        fireEvent.change(goalSelect, { target: { value: 'goal-1' } })

        expect(mockOnFiltersChange).toHaveBeenCalledWith({
          ...mockFilters,
          goal_id: 'goal-1'
        })
      })
    })
  })

  describe('Tags Filter', () => {
    it('shows tag buttons when filters are expanded', async () => {
      renderTaskFilters()

      const filtersButton = screen.getByRole('button', { name: /expand filters/i })
      fireEvent.click(filtersButton)

      await waitFor(() => {
        expect(screen.getByText('urgent')).toBeInTheDocument()
        expect(screen.getByText('frontend')).toBeInTheDocument()
        expect(screen.getByText('backend')).toBeInTheDocument()
        expect(screen.getByText('testing')).toBeInTheDocument()
      })
    })

    it('toggles tags when clicked', async () => {
      renderTaskFilters()

      const filtersButton = screen.getByRole('button', { name: /expand filters/i })
      fireEvent.click(filtersButton)

      await waitFor(() => {
        const urgentTag = screen.getByText('urgent')
        fireEvent.click(urgentTag)

        expect(mockOnFiltersChange).toHaveBeenCalledWith({
          ...mockFilters,
          tags: ['urgent']
        })
      })
    })

    it('handles multiple tag selection', async () => {
      const filtersWithOneTag = { ...mockFilters, tags: ['urgent'] }
      renderTaskFilters({ filters: filtersWithOneTag })

      const filtersButton = screen.getByRole('button', { name: /expand filters/i })
      fireEvent.click(filtersButton)

      await waitFor(() => {
        const frontendTag = screen.getByText('frontend')
        fireEvent.click(frontendTag)

        expect(mockOnFiltersChange).toHaveBeenCalledWith({
          ...filtersWithOneTag,
          tags: ['urgent', 'frontend']
        })
      })
    })

    it('removes tag when clicked again', async () => {
      const filtersWithTags = { ...mockFilters, tags: ['urgent', 'frontend'] }
      renderTaskFilters({ filters: filtersWithTags })

      const filtersButton = screen.getByRole('button', { name: /expand filters/i })
      fireEvent.click(filtersButton)

      await waitFor(() => {
        const urgentTag = screen.getByText('urgent')
        fireEvent.click(urgentTag)

        expect(mockOnFiltersChange).toHaveBeenCalledWith({
          ...filtersWithTags,
          tags: ['frontend']
        })
      })
    })
  })

  describe('Date Range Filter', () => {
    it('shows date inputs when filters are expanded', async () => {
      renderTaskFilters()

      const filtersButton = screen.getByRole('button', { name: /expand filters/i })
      fireEvent.click(filtersButton)

      await waitFor(() => {
        expect(screen.getByText('Due Date Range')).toBeInTheDocument()
        const dateInputs = screen.getAllByDisplayValue('')
        // Should have at least 2 date inputs
        expect(dateInputs.filter(input => input.getAttribute('type') === 'date').length).toBeGreaterThanOrEqual(2)
      })
    })

    it('calls onFiltersChange when start date is set', async () => {
      renderTaskFilters()

      const filtersButton = screen.getByRole('button', { name: /expand filters/i })
      fireEvent.click(filtersButton)

      await waitFor(() => {
        const dateInputs = screen.getAllByDisplayValue('')
        const startDateInput = dateInputs.find(input => input.getAttribute('type') === 'date')

        if (startDateInput) {
          fireEvent.change(startDateInput, { target: { value: '2025-09-01' } })

          expect(mockOnFiltersChange).toHaveBeenCalledWith({
            ...mockFilters,
            due_date_start: '2025-09-01',
            due_date_end: undefined
          })
        }
      })
    })

    it('applies date presets correctly', async () => {
      renderTaskFilters()

      const filtersButton = screen.getByRole('button', { name: /expand filters/i })
      fireEvent.click(filtersButton)

      await waitFor(() => {
        const thisWeekButton = screen.getByText('This week')
        fireEvent.click(thisWeekButton)

        expect(mockOnFiltersChange).toHaveBeenCalledWith(
          expect.objectContaining({
            ...mockFilters,
            due_date_start: expect.any(String),
            due_date_end: expect.any(String)
          })
        )
      })
    })
  })

  describe('Clear Filters', () => {
    it('shows clear button when filters are active', () => {
      const filtersWithActive = {
        ...mockFilters,
        search: 'test',
        project_id: 'project-1'
      }
      renderTaskFilters({ filters: filtersWithActive })

      expect(screen.getByText('Clear')).toBeInTheDocument()
    })

    it('does not show clear button when no active filters', () => {
      renderTaskFilters()

      expect(screen.queryByText('Clear')).not.toBeInTheDocument()
    })

    it('clears all filters except statuses when clicked', () => {
      const filtersWithActive = {
        ...mockFilters,
        search: 'test',
        project_id: 'project-1',
        goal_id: 'goal-1',
        tags: ['urgent'],
        due_date_start: '2025-09-01',
        due_date_end: '2025-09-30'
      }
      renderTaskFilters({ filters: filtersWithActive })

      const clearButton = screen.getByText('Clear')
      fireEvent.click(clearButton)

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        statuses: mockFilters.statuses
      })
    })
  })

  describe('Results Display', () => {
    it('shows task count when tasks are found', () => {
      renderTaskFilters({ taskCount: 5 })

      expect(screen.getByText('5 tasks found')).toBeInTheDocument()
    })

    it('shows singular task when count is 1', () => {
      renderTaskFilters({ taskCount: 1 })

      expect(screen.getByText('1 task found')).toBeInTheDocument()
    })

    it('shows no results message when no tasks match filters', () => {
      const filtersWithActive = { ...mockFilters, search: 'test' }
      renderTaskFilters({
        filters: filtersWithActive,
        taskCount: 0
      })

      expect(screen.getByText('No tasks match your current filters')).toBeInTheDocument()
      expect(screen.getByText('Try adjusting your filters or clearing them to see more tasks')).toBeInTheDocument()
    })

    it('shows loading state', () => {
      renderTaskFilters({ isLoading: true })

      expect(screen.getByText('Loading tasks...')).toBeInTheDocument()
    })
  })

  describe('Filter State Indicators', () => {
    it('shows active filter count in button', () => {
      const filtersWithActive = {
        ...mockFilters,
        search: 'test',
        project_id: 'project-1',
        tags: ['urgent']
      }
      renderTaskFilters({ filters: filtersWithActive })

      expect(screen.getByText('Filters • 3')).toBeInTheDocument()
    })

    it('shows just "Filters" when no active filters', () => {
      renderTaskFilters()

      expect(screen.getByText('Filters')).toBeInTheDocument()
      expect(screen.queryByText(/Filters •/)).not.toBeInTheDocument()
    })

    it('applies correct styling for active filters', () => {
      const filtersWithActive = { ...mockFilters, search: 'test' }
      renderTaskFilters({ filters: filtersWithActive })

      const filtersButton = screen.getByRole('button', { name: /expand filters/i })
      expect(filtersButton).toHaveClass('bg-blue-50', 'border-blue-200', 'text-blue-700')
    })
  })
})