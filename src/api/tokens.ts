import { api } from './client'
import type { components } from '../types/api'

export type Token = components['schemas']['TokenOut']
export type TokenCreated = components['schemas']['TokenCreated']
export type TokenInput = components['schemas']['TokenCreate']

export async function listTokens(): Promise<Token[]> {
  return (await api.get('/tokens')).data
}

export async function createToken(input: TokenInput): Promise<TokenCreated> {
  return (await api.post('/tokens', input)).data
}

export async function revokeToken(id: string): Promise<void> {
  await api.delete(`/tokens/${id}`)
}
