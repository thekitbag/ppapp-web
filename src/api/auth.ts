import { api } from './client'

export interface User {
  id: string
  email: string
  name: string
}

export async function getCurrentUser(): Promise<User> {
  const { data } = await api.get('/api/v1/me')
  return data as User
}

export function getMicrosoftLoginUrl(): string {
  const baseUrl = import.meta.env.VITE_OAUTH_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
  return `${baseUrl}/auth/ms/login`
}

export async function logout(): Promise<void> {
  await api.post('/api/v1/auth/logout')
}