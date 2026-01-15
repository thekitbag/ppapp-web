import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProjectChip from '../ProjectChip'

describe('ProjectChip', () => {
  it('renders project name with default color', () => {
    const project = {
      id: 'proj_1',
      name: 'Test Project',
      color: null,
      milestone_title: null,
      milestone_due_at: null
    }

    render(<ProjectChip project={project} />)

    expect(screen.getByText('Test Project')).toBeInTheDocument()
    const colorDot = screen.getByText('Test Project').parentElement?.querySelector('div[style*="background-color"]')
    expect(colorDot).toHaveStyle('background-color: rgb(59, 130, 246)') // Default blue
  })

  it('renders project with custom color', () => {
    const project = {
      id: 'proj_1',
      name: 'Colorful Project',
      color: '#FF0000',
      milestone_title: null,
      milestone_due_at: null
    }

    render(<ProjectChip project={project} />)

    expect(screen.getByText('Colorful Project')).toBeInTheDocument()
    const colorDot = screen.getByText('Colorful Project').parentElement?.querySelector('div[style*="background-color"]')
    expect(colorDot).toHaveStyle('background-color: rgb(255, 0, 0)')
  })

  it('shows "Today" badge for milestone due today', () => {
    // Set to middle of today to ensure it's counted as today
    const today = new Date()
    today.setHours(12, 0, 0, 0) // Middle of today

    const project = {
      id: 'proj_1',
      name: 'Urgent Project',
      color: '#FF0000',
      milestone_title: 'Launch',
      milestone_due_at: today.toISOString()
    }

    render(<ProjectChip project={project} />)

    expect(screen.getByText('Urgent Project')).toBeInTheDocument()
    expect(screen.getByText('Today')).toBeInTheDocument()
  })

  it('shows "1d" badge for milestone due tomorrow', () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)

    const project = {
      id: 'proj_1',
      name: 'Near Project',
      color: '#FF0000',
      milestone_title: 'Launch',
      milestone_due_at: tomorrow.toISOString()
    }

    render(<ProjectChip project={project} />)

    expect(screen.getByText('Near Project')).toBeInTheDocument()
    expect(screen.getByText('1d')).toBeInTheDocument()
  })

  it('shows days count for milestone due in multiple days', () => {
    const future = new Date()
    future.setDate(future.getDate() + 5)

    const project = {
      id: 'proj_1',
      name: 'Future Project',
      color: '#FF0000',
      milestone_title: 'Launch',
      milestone_due_at: future.toISOString()
    }

    render(<ProjectChip project={project} />)

    expect(screen.getByText('Future Project')).toBeInTheDocument()
    expect(screen.getByText('5d')).toBeInTheDocument()
  })

  it('does not show badge for milestones more than 14 days away', () => {
    const farFuture = new Date()
    farFuture.setDate(farFuture.getDate() + 20)

    const project = {
      id: 'proj_1',
      name: 'Far Project',
      color: '#FF0000',
      milestone_title: 'Launch',
      milestone_due_at: farFuture.toISOString()
    }

    render(<ProjectChip project={project} />)

    expect(screen.getByText('Far Project')).toBeInTheDocument()
    expect(screen.queryByText('20d')).not.toBeInTheDocument()
  })

  it('does not show badge for past milestones', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const project = {
      id: 'proj_1',
      name: 'Past Project',
      color: '#FF0000',
      milestone_title: 'Launch',
      milestone_due_at: yesterday.toISOString()
    }

    render(<ProjectChip project={project} />)

    expect(screen.getByText('Past Project')).toBeInTheDocument()
    expect(screen.queryByText(/\dd/)).not.toBeInTheDocument()
    expect(screen.queryByText('Today')).not.toBeInTheDocument()
  })

  it('handles project without milestone_due_at', () => {
    const project = {
      id: 'proj_1',
      name: 'No Deadline Project',
      color: '#00FF00',
      milestone_title: 'Some Milestone',
      milestone_due_at: null
    }

    render(<ProjectChip project={project} />)

    expect(screen.getByText('No Deadline Project')).toBeInTheDocument()
    expect(screen.queryByText(/\dd/)).not.toBeInTheDocument()
    expect(screen.queryByText('Today')).not.toBeInTheDocument()
  })

  it('handles undefined project gracefully', () => {
    render(<ProjectChip project={undefined} />)

    expect(screen.getByText('Unknown Project')).toBeInTheDocument()
  })

  it('applies custom colorClass when provided', () => {
    const project = {
      id: 'proj_1',
      name: 'Custom Style Project',
      color: '#FF0000',
      milestone_title: null,
      milestone_due_at: null
    }

    render(<ProjectChip project={project} colorClass="bg-red-100 text-red-800" />)

    const chip = screen.getByText('Custom Style Project').parentElement
    expect(chip).toHaveClass('bg-red-100', 'text-red-800')
    expect(chip).not.toHaveClass('bg-blue-100', 'text-blue-800')
  })
})