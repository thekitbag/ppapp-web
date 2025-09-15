import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ProjectsPage from '../ProjectsPage'
import { server } from '../../test/mocks/server'

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

    expect(await screen.findByRole('dialog')).toBeInTheDocument()

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

    expect(await screen.findByRole('dialog')).toBeInTheDocument()

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
    
    expect(await screen.findByRole('dialog')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('closes modal when Escape key is pressed', async () => {
    const user = userEvent.setup()
    render(<ProjectsPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'New Project' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'New Project' }))
    
    expect(await screen.findByRole('dialog')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('closes modal when backdrop is clicked but not when dialog content is clicked', async () => {
    const user = userEvent.setup()
    render(<ProjectsPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'New Project' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'New Project' }))
    
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toBeInTheDocument()

    // Clicking inside dialog should not close it
    await user.click(dialog)
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    // Click the backdrop by targeting the container with the backdrop click handler
    // We need to find the backdrop div which has the fixed positioning and click handler
    const backdrop = dialog.closest('[class*="fixed"][class*="inset-0"]')
    if (backdrop) {
      await user.click(backdrop as HTMLElement)
    }
    
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('focuses the name input when modal opens', async () => {
    const user = userEvent.setup()
    render(<ProjectsPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'New Project' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'New Project' }))
    
    await screen.findByRole('dialog')
    
    const nameInput = screen.getByLabelText('Project Name *')
    expect(nameInput).toHaveFocus()
  })
})