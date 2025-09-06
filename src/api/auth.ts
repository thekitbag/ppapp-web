import { api } from './client'

export interface User {
  id: string
  email: string
  name: string
}

export async function getCurrentUser(): Promise<User> {
  const { data } = await api.get('/auth/me')
  return data as User
}

export function getMicrosoftLoginUrl(): string {
  const env = import.meta.env.VITE_ENV
  const isLocalOrTest = env === 'local' || env === 'test'
  
  if (isLocalOrTest) {
    // Use relative URL for local dev (proxy handles routing) or test (not used in test anyway)
    return '/auth/ms/login'
  }
  
  const baseUrl = import.meta.env.VITE_OAUTH_BASE_URL || import.meta.env.VITE_API_BASE_URL
  if (!baseUrl) {
    throw new Error(
      'Neither VITE_OAUTH_BASE_URL nor VITE_API_BASE_URL environment variable is set. ' +
      'Check your .env, .env.development, or .env.production file.'
    )
  }
  return `${baseUrl}/auth/ms/login`
}

export async function devLogin(email: string, name: string): Promise<void> {
  await api.post('/auth/dev-login', { email, name })
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout')
}
