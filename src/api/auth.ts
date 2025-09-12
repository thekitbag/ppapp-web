import { api } from './client'

export interface User {
  id: string
  email: string
  name: string
  provider: 'microsoft' | 'google' | 'dev'
}

export async function getCurrentUser(): Promise<User> {
  const { data } = await api.get('/auth/me')
  return data as User
}

export function getMicrosoftLoginUrl(): string {
  if (import.meta.env.DEV) return '/api/v1/auth/ms/login'

  const baseUrl = import.meta.env.VITE_OAUTH_BASE_URL || import.meta.env.VITE_API_BASE_URL
  if (!baseUrl) {
    throw new Error(
      'Neither VITE_OAUTH_BASE_URL nor VITE_API_BASE_URL environment variable is set. '
    )
  }
  return `${baseUrl}/auth/ms/login`
}

export function getGoogleLoginUrl(): string {
  if (import.meta.env.DEV) return '/api/v1/auth/google/login'

  const baseUrl = import.meta.env.VITE_OAUTH_BASE_URL || import.meta.env.VITE_API_BASE_URL
  if (!baseUrl) {
    throw new Error(
      'Neither VITE_OAUTH_BASE_URL nor VITE_API_BASE_URL environment variable is set. '
    )
  }
  return `${baseUrl}/auth/google/login`
}

export async function devLogin(email: string, name: string): Promise<void> {
  await api.post('/auth/dev-login', { email, name })
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout')
}
