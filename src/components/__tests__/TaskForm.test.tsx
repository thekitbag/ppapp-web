import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../../test/utils'
import userEvent from '@testing-library/user-event'
import TaskForm, { type TaskFormValues } from '../TaskForm'

describe('TaskForm', () => {
  const mockOnSubmit = vi.fn()

  beforeEach(() => {
    mockOnSubmit.mockClear()
  })

  it('renders all form fields', async () => {
    render(<TaskForm onSubmit={mockOnSubmit} />)

    expect(screen.getByLabelText(/task title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/tags/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/project/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/goal/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/soft due date/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/hard due date/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add task/i })).toBeInTheDocument()
  })

  it('loads projects and goals in select options', async () => {
    render(<TaskForm onSubmit={mockOnSubmit} />)

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText('Test Goal')).toBeInTheDocument()
    })
  })

  it('submits form with all fields filled', async () => {
    const user = userEvent.setup()
    render(<TaskForm onSubmit={mockOnSubmit} />)

    const titleInput = screen.getByLabelText(/task title/i)
    const tagsInput = screen.getByLabelText(/tags/i)
    const projectSelect = screen.getByLabelText(/project/i)
    const goalSelect = screen.getByLabelText(/goal/i)
    const softDueInput = screen.getByLabelText(/soft due date/i)
    const hardDueInput = screen.getByLabelText(/hard due date/i)
    const submitButton = screen.getByRole('button', { name: /add task/i })

    await user.type(titleInput, 'Test Task')
    await user.type(tagsInput, 'test,frontend')

    // Wait for projects to load before selecting
    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument()
    })
    await user.selectOptions(projectSelect, '1')

    // Wait for goals to load before selecting
    await waitFor(() => {
      expect(screen.getByText('Test Goal')).toBeInTheDocument()
    })
    await user.selectOptions(goalSelect, '1')

    await user.type(softDueInput, '2023-12-31T23:59')
    await user.type(hardDueInput, '2023-12-25T23:59')

    await user.click(submitButton)

    expect(mockOnSubmit).toHaveBeenCalledWith({
      title: 'Test Task',
      tags: 'test,frontend',
      project_id: '1',
      goal_id: '1',
      hard_due_at: '2023-12-25T23:59',
      soft_due_at: '2023-12-31T23:59',
    })
  })

  it('submits form with only title (minimal required fields)', async () => {
    const user = userEvent.setup()
    render(<TaskForm onSubmit={mockOnSubmit} />)

    const titleInput = screen.getByLabelText(/task title/i)
    const submitButton = screen.getByRole('button', { name: /add task/i })

    await user.type(titleInput, 'Simple Task')
    await user.click(submitButton)

    expect(mockOnSubmit).toHaveBeenCalledWith({
      title: 'Simple Task',
      tags: '',
      project_id: null,
      goal_id: null,
      hard_due_at: null,
      soft_due_at: null,
    })
  })

  it('trims whitespace from title', async () => {
    const user = userEvent.setup()
    render(<TaskForm onSubmit={mockOnSubmit} />)

    const titleInput = screen.getByLabelText(/task title/i)
    const submitButton = screen.getByRole('button', { name: /add task/i })

    await user.type(titleInput, '  Task with spaces  ')
    await user.click(submitButton)

    expect(mockOnSubmit).toHaveBeenCalledWith({
      title: 'Task with spaces',
      tags: '',
      project_id: null,
      goal_id: null,
      hard_due_at: null,
      soft_due_at: null,
    })
  })

  it('does not submit with empty title', async () => {
    const user = userEvent.setup()
    render(<TaskForm onSubmit={mockOnSubmit} />)

    const titleInput = screen.getByLabelText(/task title/i)
    const submitButton = screen.getByRole('button', { name: /add task/i })

    await user.type(titleInput, '   ')
    await user.click(submitButton)

    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('clears form after successful submission', async () => {
    const user = userEvent.setup()
    render(<TaskForm onSubmit={mockOnSubmit} />)

    const titleInput = screen.getByLabelText(/task title/i)
    const tagsInput = screen.getByLabelText(/tags/i)
    const submitButton = screen.getByRole('button', { name: /add task/i })

    await user.type(titleInput, 'Test Task')
    await user.type(tagsInput, 'test')
    await user.click(submitButton)

    expect(titleInput).toHaveValue('')
    expect(tagsInput).toHaveValue('')
  })

  it('disables submit button when disabled prop is true', () => {
    render(<TaskForm onSubmit={mockOnSubmit} disabled={true} />)

    const submitButton = screen.getByRole('button', { name: /add task/i })
    expect(submitButton).toBeDisabled()
  })

  it('converts empty strings to null for optional fields', async () => {
    const user = userEvent.setup()
    render(<TaskForm onSubmit={mockOnSubmit} />)

    const titleInput = screen.getByLabelText(/task title/i)
    const projectSelect = screen.getByLabelText(/project/i)
    const goalSelect = screen.getByLabelText(/goal/i)
    const submitButton = screen.getByRole('button', { name: /add task/i })

    await user.type(titleInput, 'Test Task')
    
    // Ensure default values are empty strings
    expect(projectSelect).toHaveValue('')
    expect(goalSelect).toHaveValue('')

    await user.click(submitButton)

    expect(mockOnSubmit).toHaveBeenCalledWith({
      title: 'Test Task',
      tags: '',
      project_id: null,
      goal_id: null,
      hard_due_at: null,
      soft_due_at: null,
    })
  })

  it('prevents default form submission', async () => {
    const user = userEvent.setup()
    render(<TaskForm onSubmit={mockOnSubmit} />)

    const form = screen.getByLabelText(/task title/i).closest('form')
    expect(form).toBeTruthy()

    const titleInput = screen.getByLabelText(/task title/i)
    const submitButton = screen.getByRole('button', { name: /add task/i })

    await user.type(titleInput, 'Test Task')
    await user.click(submitButton)

    expect(mockOnSubmit).toHaveBeenCalledWith({
      title: 'Test Task',
      tags: '',
      project_id: null,
      goal_id: null,
      hard_due_at: null,
      soft_due_at: null,
    })
  })
})