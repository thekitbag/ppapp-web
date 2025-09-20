import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '../../../test/utils'
import userEvent from '@testing-library/user-event'
import EndDatePicker from '../EndDatePicker'

describe('EndDatePicker', () => {
  const mockOnChange = vi.fn()

  beforeEach(() => {
    mockOnChange.mockClear()
  })

  it('displays formatted date correctly', () => {
    render(
      <EndDatePicker
        endDate="2024-12-31T23:59:59Z"
        onChange={mockOnChange}
      />
    )

    expect(screen.getByText('Dec 31, 2024')).toBeInTheDocument()
  })

  it('shows "No date" when endDate is null', () => {
    render(
      <EndDatePicker
        endDate={null}
        onChange={mockOnChange}
      />
    )

    expect(screen.getByText('No date')).toBeInTheDocument()
  })

  it('enters edit mode when clicked', async () => {
    const user = userEvent.setup()
    render(
      <EndDatePicker
        endDate="2024-12-31T23:59:59Z"
        onChange={mockOnChange}
      />
    )

    await user.click(screen.getByRole('button'))

    expect(screen.getByDisplayValue('2024-12-31')).toBeInTheDocument()
    expect(screen.getByLabelText('Save date')).toBeInTheDocument()
    expect(screen.getByLabelText('Cancel edit')).toBeInTheDocument()
  })

  it('saves date when save button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <EndDatePicker
        endDate="2024-12-31T23:59:59Z"
        onChange={mockOnChange}
      />
    )

    await user.click(screen.getByRole('button'))

    const input = screen.getByDisplayValue('2024-12-31')
    await user.clear(input)
    await user.type(input, '2025-01-15')

    // Use mouse down to avoid blur canceling the action
    const saveButton = screen.getByLabelText('Save date')
    await user.click(saveButton)

    expect(mockOnChange).toHaveBeenCalledWith(expect.stringContaining('2025-01-15'))
  })

  it('cancels edit on cancel button click', async () => {
    const user = userEvent.setup()
    render(
      <EndDatePicker
        endDate="2024-12-31T23:59:59Z"
        onChange={mockOnChange}
      />
    )

    await user.click(screen.getByRole('button'))
    await user.click(screen.getByLabelText('Cancel edit'))

    expect(screen.getByText('Dec 31, 2024')).toBeInTheDocument()
    expect(mockOnChange).not.toHaveBeenCalled()
  })

  it('handles keyboard shortcuts', async () => {
    const user = userEvent.setup()
    render(
      <EndDatePicker
        endDate="2024-12-31T23:59:59Z"
        onChange={mockOnChange}
      />
    )

    await user.click(screen.getByRole('button'))

    const input = screen.getByDisplayValue('2024-12-31')
    await user.clear(input)
    await user.type(input, '2025-01-15')

    await user.keyboard('{Enter}')

    expect(mockOnChange).toHaveBeenCalledWith(expect.stringContaining('2025-01-15'))
  })

  it('shows overdue styling for past dates', () => {
    const pastDate = new Date('2020-01-01').toISOString()
    render(
      <EndDatePicker
        endDate={pastDate}
        onChange={mockOnChange}
      />
    )

    expect(screen.getByRole('button')).toHaveClass('text-red-600', 'font-medium')
  })

  it('handles disabled state', () => {
    render(
      <EndDatePicker
        endDate="2024-12-31T23:59:59Z"
        onChange={mockOnChange}
        disabled
      />
    )

    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveClass('text-gray-400', 'cursor-not-allowed')
  })
})