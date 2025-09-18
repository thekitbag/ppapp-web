import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import GoalPicker from '../GoalPicker'
import type { GoalNode } from '../../types'

const mockGoalTree: GoalNode[] = [
  {
    id: '1',
    title: 'Annual Goal 2024',
    type: 'annual',
    parent_goal_id: null,
    end_date: '2024-12-31T23:59:59Z',
    status: 'on_target',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    children: [
      {
        id: '2',
        title: 'Q1 Goals',
        type: 'quarterly',
        parent_goal_id: '1',
        end_date: '2024-03-31T23:59:59Z',
        status: 'at_risk',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        children: [
          {
            id: '3',
            title: 'Week 1 Sprint',
            type: 'weekly',
            parent_goal_id: '2',
            end_date: '2024-01-07T23:59:59Z',
            status: 'on_target',
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
            children: []
          }
        ]
      },
      {
        id: '4',
        title: 'Direct Weekly Under Annual',
        type: 'weekly',
        parent_goal_id: '1',
        end_date: '2024-01-14T23:59:59Z',
        status: 'on_target',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        children: []
      }
    ]
  },
  {
    id: '5',
    title: 'Standalone Weekly',
    type: 'weekly',
    parent_goal_id: null,
    end_date: '2024-01-21T23:59:59Z',
    status: 'on_target',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    children: []
  }
]

describe('GoalPicker', () => {
  const mockOnChange = vi.fn()

  beforeEach(() => {
    mockOnChange.mockClear()
  })

  it('renders with placeholder when no value selected', () => {
    render(<GoalPicker tree={mockGoalTree} onChange={mockOnChange} />)

    expect(screen.getByText('Select a goal...')).toBeInTheDocument()
  })

  it('renders with custom placeholder', () => {
    render(<GoalPicker tree={mockGoalTree} onChange={mockOnChange} placeholder="Choose your goal" />)

    expect(screen.getByText('Choose your goal')).toBeInTheDocument()
  })

  it('shows selected goal title when value is provided', () => {
    render(<GoalPicker tree={mockGoalTree} value="2" onChange={mockOnChange} />)

    expect(screen.getByText('Q1 Goals')).toBeInTheDocument()
  })

  it('shows selected goal path when value is provided', () => {
    render(<GoalPicker tree={mockGoalTree} value="3" onChange={mockOnChange} />)

    expect(screen.getByText('Week 1 Sprint')).toBeInTheDocument()
    expect(screen.getByText('Annual Goal 2024 › Q1 Goals')).toBeInTheDocument()
  })

  it('opens dropdown when clicked', async () => {
    const user = userEvent.setup()
    render(<GoalPicker tree={mockGoalTree} onChange={mockOnChange} />)

    const trigger = screen.getByRole('button', { name: /select a goal/i })
    await user.click(trigger)

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument()
      expect(screen.getByText('No goal')).toBeInTheDocument()
    })
  })

  it('displays all goals from tree with proper hierarchy', async () => {
    const user = userEvent.setup()
    render(<GoalPicker tree={mockGoalTree} onChange={mockOnChange} />)

    const trigger = screen.getByRole('button', { name: /select a goal/i })
    await user.click(trigger)

    await waitFor(() => {
      // All goals should be present - use getAllByText to handle duplicates in hierarchy display
      expect(screen.getAllByText('Annual Goal 2024')).toHaveLength(3) // Title + 2 paths
      expect(screen.getByText('Q1 Goals')).toBeInTheDocument()
      expect(screen.getByText('Week 1 Sprint')).toBeInTheDocument()
      expect(screen.getByText('Direct Weekly Under Annual')).toBeInTheDocument()
      expect(screen.getByText('Standalone Weekly')).toBeInTheDocument()
    })
  })

  it('shows goal types for each option', async () => {
    const user = userEvent.setup()
    render(<GoalPicker tree={mockGoalTree} onChange={mockOnChange} />)

    const trigger = screen.getByRole('button', { name: /select a goal/i })
    await user.click(trigger)

    await waitFor(() => {
      // The CSS uppercase class makes them uppercase, but in test they appear as written
      expect(screen.getByText('annual')).toBeInTheDocument()
      expect(screen.getByText('quarterly')).toBeInTheDocument()
      expect(screen.getAllByText('weekly')).toHaveLength(3) // Three weekly goals
    })
  })

  it('calls onChange when goal is selected', async () => {
    const user = userEvent.setup()
    render(<GoalPicker tree={mockGoalTree} onChange={mockOnChange} />)

    const trigger = screen.getByRole('button', { name: /select a goal/i })
    await user.click(trigger)

    await waitFor(() => {
      const weeklyGoal = screen.getByRole('option', { name: /week 1 sprint/i })
      return user.click(weeklyGoal)
    })

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith('3')
    })
  })

  it('calls onChange with empty string when No goal is selected', async () => {
    const user = userEvent.setup()
    render(<GoalPicker tree={mockGoalTree} value="2" onChange={mockOnChange} />)

    const trigger = screen.getByRole('button', { name: /q1 goals/i })
    await user.click(trigger)

    await waitFor(() => {
      const noGoalOption = screen.getByRole('option', { name: /no goal/i })
      return user.click(noGoalOption)
    })

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith('')
    })
  })

  it('shows clear button when goal is selected', () => {
    render(<GoalPicker tree={mockGoalTree} value="2" onChange={mockOnChange} />)

    expect(screen.getByLabelText('Clear selection')).toBeInTheDocument()
  })

  it('clears selection when clear button is clicked', async () => {
    const user = userEvent.setup()
    render(<GoalPicker tree={mockGoalTree} value="2" onChange={mockOnChange} />)

    const clearButton = screen.getByLabelText('Clear selection')
    await user.click(clearButton)

    expect(mockOnChange).toHaveBeenCalledWith('')
  })

  it('filters goals when searching', async () => {
    const user = userEvent.setup()
    render(<GoalPicker tree={mockGoalTree} onChange={mockOnChange} />)

    const trigger = screen.getByRole('button', { name: /select a goal/i })
    await user.click(trigger)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search goals...')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Search goals...')
    await user.type(searchInput, 'Standalone')

    await waitFor(() => {
      // Should only show the standalone goal
      expect(screen.getByText('Standalone Weekly')).toBeInTheDocument()
      // Other goals should not show up
      expect(screen.queryByText('Annual Goal 2024')).not.toBeInTheDocument()
      expect(screen.queryByText('Q1 Goals')).not.toBeInTheDocument()
      expect(screen.queryByText('Direct Weekly Under Annual')).not.toBeInTheDocument()
    })
  })

  it('shows no results message when search has no matches', async () => {
    const user = userEvent.setup()
    render(<GoalPicker tree={mockGoalTree} onChange={mockOnChange} />)

    const trigger = screen.getByRole('button', { name: /select a goal/i })
    await user.click(trigger)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search goals...')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Search goals...')
    await user.type(searchInput, 'nonexistent')

    await waitFor(() => {
      expect(screen.getByText('No goals found matching "nonexistent"')).toBeInTheDocument()
    })
  })

  it('closes dropdown when clicking outside', async () => {
    const user = userEvent.setup()
    render(
      <div>
        <GoalPicker tree={mockGoalTree} onChange={mockOnChange} />
        <div data-testid="outside">Outside element</div>
      </div>
    )

    const trigger = screen.getByRole('button', { name: /select a goal/i })
    await user.click(trigger)

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })

    const outsideElement = screen.getByTestId('outside')
    await user.click(outsideElement)

    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })
  })

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup()
    render(<GoalPicker tree={mockGoalTree} onChange={mockOnChange} />)

    const trigger = screen.getByRole('button', { name: /select a goal/i })
    await user.click(trigger)

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })

    // Press Escape to close
    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })
  })

  it('handles empty tree gracefully', () => {
    render(<GoalPicker tree={[]} onChange={mockOnChange} />)

    expect(screen.getByText('Select a goal...')).toBeInTheDocument()
    expect(() => {
      const trigger = screen.getByRole('button', { name: /select a goal/i })
      expect(trigger).toBeInTheDocument()
    }).not.toThrow()
  })
})