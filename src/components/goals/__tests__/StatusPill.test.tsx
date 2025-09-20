import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../../../test/utils'
import userEvent from '@testing-library/user-event'
import StatusPill from '../StatusPill'

describe('StatusPill', () => {
  const mockOnChange = vi.fn()

  beforeEach(() => {
    mockOnChange.mockClear()
  })

  it('renders current status correctly', () => {
    render(
      <StatusPill status="on_target" onChange={mockOnChange} />
    )

    expect(screen.getByText('On Target')).toBeInTheDocument()
    expect(screen.getByRole('button')).toHaveClass('bg-green-100', 'text-green-800')
  })

  it('shows dropdown when clicked', async () => {
    const user = userEvent.setup()
    render(
      <StatusPill status="on_target" onChange={mockOnChange} />
    )

    const button = screen.getByRole('button')
    await user.click(button)

    expect(screen.getByText('At Risk')).toBeInTheDocument()
    expect(screen.getByText('Off Target')).toBeInTheDocument()
  })

  it('calls onChange when option is selected', async () => {
    const user = userEvent.setup()
    render(
      <StatusPill status="on_target" onChange={mockOnChange} />
    )

    const button = screen.getByRole('button')
    await user.click(button)

    const atRiskOption = screen.getByText('At Risk')
    await user.click(atRiskOption)

    expect(mockOnChange).toHaveBeenCalledWith('at_risk')
  })

  it('handles disabled state', () => {
    render(
      <StatusPill status="on_target" onChange={mockOnChange} disabled />
    )

    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveClass('opacity-50', 'cursor-not-allowed')
  })

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup()
    render(
      <StatusPill status="on_target" onChange={mockOnChange} />
    )

    const button = screen.getByRole('button')
    button.focus()

    await user.keyboard('{Enter}')
    expect(screen.getByText('At Risk')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByText('At Risk')).not.toBeInTheDocument()
  })

  it('renders different sizes correctly', () => {
    const { rerender } = render(
      <StatusPill status="on_target" onChange={mockOnChange} size="sm" />
    )

    expect(screen.getByRole('button')).toHaveClass('text-xs', 'px-2', 'py-1')

    rerender(
      <StatusPill status="on_target" onChange={mockOnChange} size="md" />
    )

    expect(screen.getByRole('button')).toHaveClass('text-sm', 'px-3', 'py-1.5')
  })
})