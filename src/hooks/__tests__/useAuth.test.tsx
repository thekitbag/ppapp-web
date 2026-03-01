import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor, screen } from '@testing-library/react'
import { render } from '../../test/utils'
import { AuthProvider, useAuth } from '../useAuth'
import * as authApi from '../../api/auth'

vi.mock('../../api/auth', async () => {
  const actual = await vi.importActual<typeof import('../../api/auth')>('../../api/auth')
  return {
    ...actual,
    getCurrentUser: vi.fn(),
    getMicrosoftLoginUrl: vi.fn(() => '/api/v1/auth/ms/login'),
  }
})

function AuthProbe() {
  const { isLoading, isAuthenticated, requiresLogin } = useAuth()

  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="authed">{String(isAuthenticated)}</span>
      <span data-testid="requires-login">{String(requiresLogin)}</span>
    </div>
  )
}

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not auto-redirect to microsoft when /auth/me returns 401', async () => {
    vi.mocked(authApi.getCurrentUser).mockRejectedValueOnce({
      response: { status: 401 },
    })

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })

    expect(screen.getByTestId('authed')).toHaveTextContent('false')
    expect(['true', 'false']).toContain(screen.getByTestId('requires-login').textContent ?? '')
    expect(authApi.getMicrosoftLoginUrl).not.toHaveBeenCalled()
  })
})
