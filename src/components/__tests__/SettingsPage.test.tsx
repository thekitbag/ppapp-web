import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../../test/utils'
import userEvent from '@testing-library/user-event'
import SettingsPage from '../SettingsPage'
import { createToken, listTokens, revokeToken } from '../../api/tokens'

vi.mock('../../api/tokens', () => ({ listTokens: vi.fn(), createToken: vi.fn(), revokeToken: vi.fn() }))
const metadata = { id:'token-1', name:'Claude', prefix:'et_pat_a', scopes:['read'], created_at:'2026-11-11T12:00:00Z', last_used_at:null, revoked_at:null }

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(listTokens).mockResolvedValue([])
  vi.mocked(createToken).mockResolvedValue({ ...metadata, token:'et_pat_PRIVATE_ONCE' })
  vi.mocked(revokeToken).mockResolvedValue(undefined)
})

describe('Token settings', () => {
  it('shows a token once without persisting it and hides it on dismissal', async () => {
    const user = userEvent.setup()
    const storage = vi.spyOn(Storage.prototype,'setItem')
    const view = render(<SettingsPage />)
    await screen.findByText('No tokens yet.')
    await user.type(screen.getByLabelText('Token name'), 'Claude')
    await user.click(screen.getByRole('button',{name:'Create token'}))
    expect(await screen.findByLabelText('New token')).toHaveValue('et_pat_PRIVATE_ONCE')
    expect(createToken).toHaveBeenCalledWith({name:'Claude',scopes:['read']})
    await user.click(screen.getByRole('button',{name:'Copy token'}))
    expect(await navigator.clipboard.readText()).toBe('et_pat_PRIVATE_ONCE')
    await user.click(screen.getByRole('button',{name:'Done — hide token'}))
    expect(screen.queryByLabelText('New token')).not.toBeInTheDocument()
    expect(storage).not.toHaveBeenCalled()
    view.unmount()
    vi.mocked(listTokens).mockResolvedValue([metadata])
    render(<SettingsPage />)
    await screen.findByRole('button',{name:'Revoke Claude'})
    expect(screen.queryByDisplayValue('et_pat_PRIVATE_ONCE')).not.toBeInTheDocument()
    storage.mockRestore()
  })

  it('lists metadata and revokes a token', async () => {
    vi.mocked(listTokens).mockResolvedValue([metadata])
    const user = userEvent.setup()
    render(<SettingsPage />)
    await user.click(await screen.findByRole('button',{name:'Revoke Claude'}))
    await waitFor(() => expect(revokeToken).toHaveBeenCalledWith('token-1'))
    expect(await screen.findByText('Claude (revoked)')).toBeInTheDocument()
    expect(screen.queryByRole('button',{name:'Revoke Claude'})).not.toBeInTheDocument()
  })

  it('requires a name and at least one scope', async () => {
    const user = userEvent.setup()
    render(<SettingsPage />)
    await screen.findByText('No tokens yet.')
    expect(screen.getByRole('button',{name:'Create token'})).toBeDisabled()
    await user.type(screen.getByLabelText('Token name'),'Claude')
    await user.click(screen.getByLabelText('Read'))
    expect(screen.getByRole('button',{name:'Create token'})).toBeDisabled()
    await user.click(screen.getByLabelText('Write (for milestone 2)'))
    expect(screen.getByRole('button',{name:'Create token'})).toBeEnabled()
  })

  it('shows a recoverable error without revealing a token on failure', async () => {
    vi.mocked(createToken).mockRejectedValue(new Error('network'))
    const user = userEvent.setup()
    render(<SettingsPage />)
    await screen.findByText('No tokens yet.')
    await user.type(screen.getByLabelText('Token name'),'Claude')
    await user.click(screen.getByRole('button',{name:'Create token'}))
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not create a token')
    expect(screen.queryByLabelText('New token')).not.toBeInTheDocument()
  })
})
