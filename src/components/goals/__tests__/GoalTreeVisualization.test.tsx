import { render, screen, fireEvent, within } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import GoalTreeVisualization from '../GoalTreeVisualization'
import type { GoalNode } from '../../../types'

const goal = (id: string, type: GoalNode['type'], children: GoalNode[] = []): GoalNode => ({
  id, title: id, type, children, created_at: '2026-01-01T00:00:00Z', status: 'on_target'
})
const callbacks = () => ({ onStatusChange: vi.fn(), onEndDateChange: vi.fn(), onEdit: vi.fn(), onClose: vi.fn() })

describe('GoalTreeVisualization unparented goals', () => {
  it('shows an orphan quarterly goal with working edit and close controls', () => {
    const quarter = goal('Orphan quarter', 'quarterly')
    const props = callbacks()
    render(<GoalTreeVisualization goals={[quarter]} {...props} />)
    const section = screen.getByRole('region', { name: 'Unparented goals' })
    expect(within(section).getByText(quarter.title)).toBeInTheDocument()
    expect(screen.queryByText('No annual goals yet')).not.toBeInTheDocument()
    fireEvent.click(within(section).getByRole('button', { name: 'Goal actions' }))
    fireEvent.click(within(section).getByRole('menuitem', { name: 'Edit' }))
    expect(props.onEdit).toHaveBeenCalledWith(quarter)
    fireEvent.click(within(section).getByRole('button', { name: 'Goal actions' }))
    fireEvent.click(within(section).getByRole('menuitem', { name: 'Close Goal' }))
    expect(props.onClose).toHaveBeenCalledWith(quarter)
  })

  it('shows orphan weekly goals and children of orphan quarters once each', () => {
    const weekly = goal('Quarter child', 'weekly')
    render(<GoalTreeVisualization goals={[goal('Quarter root', 'quarterly', [weekly]), goal('Weekly root', 'weekly')]} {...callbacks()} />)
    for (const title of ['Quarter root', 'Quarter child', 'Weekly root']) {
      expect(screen.getAllByText(title)).toHaveLength(1)
    }
  })

  it('keeps a normal hierarchy in its annual bucket without duplicates', () => {
    render(<GoalTreeVisualization goals={[goal('Annual', 'annual', [goal('Quarter', 'quarterly', [goal('Week', 'weekly')])])]} {...callbacks()} />)
    expect(screen.queryByRole('region', { name: 'Unparented goals' })).not.toBeInTheDocument()
    for (const title of ['Annual', 'Quarter', 'Week']) expect(screen.getAllByText(title)).toHaveLength(1)
  })

  it('shows orphan and normally parented goals together', () => {
    render(<GoalTreeVisualization goals={[goal('Annual', 'annual', [goal('Quarter', 'quarterly')]), goal('Orphan', 'quarterly')]} {...callbacks()} />)
    const section = screen.getByRole('region', { name: 'Unparented goals' })
    expect(within(section).getByText('Orphan')).toBeInTheDocument()
    expect(within(section).queryByText('Quarter')).not.toBeInTheDocument()
    expect(screen.getAllByText('Quarter')).toHaveLength(1)
  })
})
