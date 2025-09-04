import { api } from './client'

export interface User {
  id: string
  email: string
  name: string
}

export async function getCurrentUser(): Promise<User> {
  const { data } = await api.get('/me')
  return data as User
}

export function getMicrosoftLoginUrl(): string {
  const baseUrl = import.meta.env.VITE_OAUTH_BASE_URL
  return `${baseUrl}/auth/ms/login`
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout')
}
