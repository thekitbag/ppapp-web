import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../../test/utils'
import userEvent from '@testing-library/user-event'
import QuickAdd from '../QuickAdd'

describe('QuickAdd', () => {
  const mockOnSubmit = vi.fn()

  beforeEach(() => {
    mockOnSubmit.mockClear()
  })

  it('renders add button initially', () => {
    render(<QuickAdd status="week" onSubmit={mockOnSubmit} />)

    expect(screen.getByRole('button', { name: /add task/i })).toBeInTheDocument()
    expect(screen.getByText('Add task')).toBeInTheDocument()
  })

  it('shows input form when add button is clicked', async () => {
    const user = userEvent.setup()
    render(<QuickAdd status="week" onSubmit={mockOnSubmit} />)

    const addButton = screen.getByRole('button', { name: /add task/i })
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Add task to This Week...')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /add task/i })).toBeInTheDocument() // Check button
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })
  })

  it('focuses input when editing mode is activated', async () => {
    const user = userEvent.setup()
    render(<QuickAdd status="backlog" onSubmit={mockOnSubmit} />)

    const addButton = screen.getByRole('button', { name: /add task/i })
    await user.click(addButton)

    await waitFor(() => {
      const input = screen.getByPlaceholderText('Add task to Backlog...')
      expect(input).toHaveFocus()
    })
  })

  it('shows correct placeholder for different statuses', async () => {
    const user = userEvent.setup()

    const { rerender } = render(<QuickAdd status="today" onSubmit={mockOnSubmit} />)
    await user.click(screen.getByRole('button', { name: /add task/i }))
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Add task to Today...')).toBeInTheDocument()
    })

    rerender(<QuickAdd status="doing" onSubmit={mockOnSubmit} />)
    await user.click(screen.getByRole('button', { name: /add task/i }))
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Add task to Doing...')).toBeInTheDocument()
    })
  })

  it('calls onSubmit when Enter is pressed with valid title', async () => {
    const user = userEvent.setup()
    render(<QuickAdd status="week" onSubmit={mockOnSubmit} />)

    const addButton = screen.getByRole('button', { name: /add task/i })
    await user.click(addButton)

    const input = await screen.findByPlaceholderText('Add task to This Week...')
    await user.type(input, 'New task title')
    await user.keyboard('{Enter}')

    expect(mockOnSubmit).toHaveBeenCalledWith('New task title')
  })

  it('calls onSubmit when check button is clicked', async () => {
    const user = userEvent.setup()
    render(<QuickAdd status="week" onSubmit={mockOnSubmit} />)

    const addButton = screen.getByRole('button', { name: /add task/i })
    await user.click(addButton)

    const input = await screen.findByPlaceholderText('Add task to This Week...')
    await user.type(input, 'New task title')

    const checkButton = screen.getByRole('button', { name: /add task/i })
    await user.click(checkButton)

    expect(mockOnSubmit).toHaveBeenCalledWith('New task title')
  })

  it('trims whitespace from title before submitting', async () => {
    const user = userEvent.setup()
    render(<QuickAdd status="week" onSubmit={mockOnSubmit} />)

    const addButton = screen.getByRole('button', { name: /add task/i })
    await user.click(addButton)

    const input = await screen.findByPlaceholderText('Add task to This Week...')
    await user.type(input, '  New task with spaces  ')
    await user.keyboard('{Enter}')

    expect(mockOnSubmit).toHaveBeenCalledWith('New task with spaces')
  })

  it('does not submit empty or whitespace-only titles', async () => {
    const user = userEvent.setup()
    render(<QuickAdd status="week" onSubmit={mockOnSubmit} />)

    const addButton = screen.getByRole('button', { name: /add task/i })
    await user.click(addButton)

    const input = await screen.findByPlaceholderText('Add task to This Week...')

    // Try empty title
    await user.keyboard('{Enter}')
    expect(mockOnSubmit).not.toHaveBeenCalled()

    // Try whitespace-only title
    await user.type(input, '   ')
    await user.keyboard('{Enter}')
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('disables submit button when title is empty', async () => {
    const user = userEvent.setup()
    render(<QuickAdd status="week" onSubmit={mockOnSubmit} />)

    const addButton = screen.getByRole('button', { name: /add task/i })
    await user.click(addButton)

    await waitFor(() => {
      const checkButton = screen.getByRole('button', { name: /add task/i })
      expect(checkButton).toBeDisabled()
    })

    const input = screen.getByPlaceholderText('Add task to This Week...')
    await user.type(input, 'Valid title')

    await waitFor(() => {
      const checkButton = screen.getByRole('button', { name: /add task/i })
      expect(checkButton).toBeEnabled()
    })
  })

  it('clears input and exits editing mode after successful submit', async () => {
    const user = userEvent.setup()
    render(<QuickAdd status="week" onSubmit={mockOnSubmit} />)

    const addButton = screen.getByRole('button', { name: /add task/i })
    await user.click(addButton)

    const input = await screen.findByPlaceholderText('Add task to This Week...')
    await user.type(input, 'New task')
    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add task/i })).toBeInTheDocument()
      expect(screen.queryByPlaceholderText('Add task to This Week...')).not.toBeInTheDocument()
    })
  })

  it('cancels editing when Escape is pressed', async () => {
    const user = userEvent.setup()
    render(<QuickAdd status="week" onSubmit={mockOnSubmit} />)

    const addButton = screen.getByRole('button', { name: /add task/i })
    await user.click(addButton)

    const input = await screen.findByPlaceholderText('Add task to This Week...')
    await user.type(input, 'Some text')
    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add task/i })).toBeInTheDocument()
      expect(screen.queryByPlaceholderText('Add task to This Week...')).not.toBeInTheDocument()
    })

    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('cancels editing when cancel button is clicked', async () => {
    const user = userEvent.setup()
    render(<QuickAdd status="week" onSubmit={mockOnSubmit} />)

    const addButton = screen.getByRole('button', { name: /add task/i })
    await user.click(addButton)

    const input = await screen.findByPlaceholderText('Add task to This Week...')
    await user.type(input, 'Some text')

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add task/i })).toBeInTheDocument()
      expect(screen.queryByPlaceholderText('Add task to This Week...')).not.toBeInTheDocument()
    })

    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('applies custom className', () => {
    const { container } = render(
      <QuickAdd status="week" onSubmit={mockOnSubmit} className="custom-class" />
    )

    expect(container.firstChild).toHaveClass('custom-class')
  })
})