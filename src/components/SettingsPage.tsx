import { useEffect, useState } from 'react'
import { createToken, listTokens, revokeToken, type Token } from '../api/tokens'

export default function SettingsPage() {
  const [tokens, setTokens] = useState<Token[]>([])
  const [name, setName] = useState('')
  const [read, setRead] = useState(true)
  const [write, setWrite] = useState(false)
  const [secret, setSecret] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    listTokens().then(data => { if (active) setTokens(data) })
      .catch(() => { if (active) setError('Could not load tokens. Please try again.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  async function create(event: React.FormEvent) {
    event.preventDefault()
    setError(''); setBusy(true); setSecret(null); setCopied(false)
    try {
      const result = await createToken({ name: name.trim(), scopes: [...(read ? ['read' as const] : []), ...(write ? ['write' as const] : [])] })
      // Keep the secret only in component memory; do not put it in query caches.
      const { token, ...metadata } = result
      setSecret(token); setName(''); setTokens(current => [metadata, ...current])
    } catch {
      setError('Could not create a token. Check your connection and try again.')
    } finally { setBusy(false) }
  }

  async function revoke(id: string) {
    setBusy(true); setError('')
    try {
      await revokeToken(id)
      setSecret(null)
      setTokens(current => current.map(token => token.id === id ? { ...token, revoked_at: new Date().toISOString() } : token))
    } catch { setError('Could not revoke the token. Please try again.') }
    finally { setBusy(false) }
  }

  return <section className="max-w-3xl mx-auto space-y-6">
    <h2 className="text-3xl font-bold">Settings</h2>
    <div className="card-brutal p-6 space-y-4">
      <h3 className="text-xl font-bold">Claude connection</h3>
      <p>Create a personal access token to connect Claude Code to your tasks and goals. Milestone 1 supports reading only.</p>
      {error && <p role="alert">{error}</p>}
      <form onSubmit={create} className="space-y-3">
        <label className="block">Token name
          <input value={name} onChange={e => setName(e.target.value)} maxLength={100} required
            className="block w-full border-2 border-black rounded p-2" placeholder="e.g. Claude Code" />
        </label>
        <fieldset className="flex gap-4"><legend>Permissions</legend>
          <label><input type="checkbox" checked={read} onChange={e => setRead(e.target.checked)} /> Read</label>
          <label><input type="checkbox" checked={write} onChange={e => setWrite(e.target.checked)} /> Write (for milestone 2)</label>
        </fieldset>
        <button className="btn-brutal px-4 py-2" disabled={busy || !name.trim() || (!read && !write)}>Create token</button>
      </form>
      {secret && <div className="border-2 border-black rounded p-4 space-y-2">
        <p>Copy this token now. It will not be shown again after you dismiss it or leave Settings.</p>
        <label className="block">New token<input readOnly value={secret} className="block w-full border rounded p-2 font-mono" /></label>
        <button className="btn-brutal px-3 py-1" onClick={async () => {
          try { await navigator.clipboard.writeText(secret); setCopied(true) }
          catch { setError('Copy failed. Select and copy the token manually.') }
        }}>{copied ? 'Copied' : 'Copy token'}</button>
        <button className="ml-3 underline" onClick={() => setSecret(null)}>Done — hide token</button>
      </div>}
    </div>
    <div className="card-brutal p-6 space-y-3">
      <h3 className="text-xl font-bold">Personal access tokens</h3>
      {loading ? <p>Loading tokens…</p> : tokens.length === 0 ? <p>No tokens yet.</p> :
        <ul className="space-y-3">{tokens.map(token => <li key={token.id} className="border-b pb-3">
          <p className="font-bold">{token.name} {token.revoked_at && '(revoked)'}</p>
          <p>{token.prefix}… · {token.scopes.join(', ')} · Created {new Date(token.created_at).toLocaleDateString()}</p>
          <p>Last used: {token.last_used_at ? new Date(token.last_used_at).toLocaleString() : 'Never'}</p>
          {!token.revoked_at && <button className="underline" disabled={busy} onClick={() => revoke(token.id)}>Revoke {token.name}</button>}
        </li>)}</ul>}
    </div>
  </section>
}
