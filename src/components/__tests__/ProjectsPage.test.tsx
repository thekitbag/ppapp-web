import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ProjectsPage from '../ProjectsPage'
import { server } from '../../test/mocks/server'
import { http, HttpResponse } from 'msw'

const API_BASE = 'http://127.0.0.1:8000'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('ProjectsPage', () => {
  beforeEach(() => {
    server.resetHandlers()
  })

  it('renders the projects page with header and new project button after loading', async () => {
    render(<ProjectsPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Projects')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'New Project' })).toBeInTheDocument()
    })
  })

  it('renders table with correct headers after loading', async () => {
    render(<ProjectsPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText('Project')).toBeInTheDocument()
      expect(screen.getByText('Milestone')).toBeInTheDocument()
      expect(screen.getByText('Due')).toBeInTheDocument()
      expect(screen.getByText('Actions')).toBeInTheDocument()
    })
  })

  it('opens create modal when New Project button is clicked', async () => {
    const user = userEvent.setup()
    render(<ProjectsPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'New Project' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'New Project' }))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    expect(screen.getByText('Create New Project')).toBeInTheDocument()
    expect(screen.getByLabelText('Project Name *')).toBeInTheDocument()
    expect(screen.getByLabelText('Color')).toBeInTheDocument()
    expect(screen.getByLabelText('Milestone Title')).toBeInTheDocument()
    expect(screen.getByLabelText('Milestone Date')).toBeInTheDocument()
  })

  it('renders modal form fields with correct aria labels', async () => {
    const user = userEvent.setup()
    render(<ProjectsPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'New Project' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'New Project' }))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    expect(screen.getByLabelText('Project Name *')).toBeInTheDocument()
    expect(screen.getByLabelText('Color')).toBeInTheDocument()
    expect(screen.getByLabelText('Milestone Title')).toBeInTheDocument()
    expect(screen.getByLabelText('Milestone Date')).toBeInTheDocument()
    
    // Check the aria-describedby for date format
    expect(screen.getByText('Select date and time for the milestone')).toBeInTheDocument()
  })

  it('closes modal when Cancel is clicked', async () => {
    const user = userEvent.setup()
    render(<ProjectsPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'New Project' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'New Project' }))
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })
})