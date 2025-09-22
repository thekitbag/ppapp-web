import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../../../test/utils'
import userEvent from '@testing-library/user-event'
import ThreeColumnGoalView from '../ThreeColumnGoalView'
import type { Goal } from '../../../types'

const mockGoals: Goal[] = [
  {
    id: '1',
    title: 'Annual Goal',
    type: 'annual',
    parent_goal_id: null,
    status: 'on_target',
    end_date: '2024-12-31T23:59:59Z',
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    title: 'Quarterly Goal',
    type: 'quarterly',
    parent_goal_id: '1',
    status: 'at_risk',
    end_date: '2024-03-31T23:59:59Z',
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '3',
    title: 'Weekly Goal',
    type: 'weekly',
    parent_goal_id: '2',
    status: 'on_target',
    end_date: '2024-01-07T23:59:59Z',
    created_at: '2024-01-01T00:00:00Z'
  }
]

describe('ThreeColumnGoalView', () => {
  const mockProps = {
    goals: mockGoals,
    onStatusChange: vi.fn(),
    onEndDateChange: vi.fn(),
    onEdit: vi.fn(),
    onClose: vi.fn(),
    onDelete: vi.fn(),
    onCreateGoal: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders three column headers', () => {
    render(<ThreeColumnGoalView {...mockProps} />)

    expect(screen.getByText('Annual Goals')).toBeInTheDocument()
    expect(screen.getByText('Quarterly Goals')).toBeInTheDocument()
    expect(screen.getByText('Weekly Goals')).toBeInTheDocument()
  })

  it('shows annual goals in first column', () => {
    render(<ThreeColumnGoalView {...mockProps} />)

    expect(screen.getByText('Annual Goal')).toBeInTheDocument()
  })

  it('shows selection flow from annual to quarterly to weekly', async () => {
    const user = userEvent.setup()
    render(<ThreeColumnGoalView {...mockProps} />)

    // Initially quarterly and weekly columns show prompt text
    expect(screen.getByText('Select an Annual goal to view Quarterly goals')).toBeInTheDocument()
    expect(screen.getByText('Select a Quarterly goal to view Weekly goals')).toBeInTheDocument()

    // Click annual goal
    const annualGoal = screen.getByText('Annual Goal')
    await user.click(annualGoal.closest('div')!)

    // Should show quarterly goal
    expect(screen.getByText('Quarterly Goal')).toBeInTheDocument()

    // Click quarterly goal
    const quarterlyGoal = screen.getByText('Quarterly Goal')
    await user.click(quarterlyGoal.closest('div')!)

    // Should show weekly goal
    expect(screen.getByText('Weekly Goal')).toBeInTheDocument()
  })

  it('shows add buttons conditionally', async () => {
    const user = userEvent.setup()
    render(<ThreeColumnGoalView {...mockProps} />)

    // Annual add button should always be visible
    expect(screen.getByText('Add Annual Goal')).toBeInTheDocument()

    // Quarterly add button should not be visible initially
    expect(screen.queryByText('Add Quarterly Goal')).not.toBeInTheDocument()

    // Click annual goal to select it
    const annualGoal = screen.getByText('Annual Goal')
    await user.click(annualGoal.closest('div')!)

    // Now quarterly add button should be visible
    expect(screen.getByText('Add Quarterly Goal')).toBeInTheDocument()

    // Click quarterly goal
    const quarterlyGoal = screen.getByText('Quarterly Goal')
    await user.click(quarterlyGoal.closest('div')!)

    // Now weekly add button should be visible
    expect(screen.getByText('Add Weekly Goal')).toBeInTheDocument()
  })

  it('calls onCreateGoal with correct parameters', async () => {
    const user = userEvent.setup()
    render(<ThreeColumnGoalView {...mockProps} />)

    // Click annual add button
    await user.click(screen.getByText('Add Annual Goal'))
    expect(mockProps.onCreateGoal).toHaveBeenCalledWith('annual')

    // Select annual goal first
    await user.click(screen.getByText('Annual Goal').closest('div')!)

    // Click quarterly add button
    await user.click(screen.getByText('Add Quarterly Goal'))
    expect(mockProps.onCreateGoal).toHaveBeenCalledWith('quarterly', '1')
  })
})