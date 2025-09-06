import React, { createContext, useContext, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getCurrentUser, getMicrosoftLoginUrl, devLogin as apiDevLogin, type User } from '../api/auth'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  requiresLogin: boolean
  login: () => void
  logout: () => void
  devLogin: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true)
  const requireLogin = import.meta.env.VITE_REQUIRE_LOGIN !== 'false'
  const env = import.meta.env.VITE_ENV
  const isLocalDev = env === 'local'

  const userQuery = useQuery({
    queryKey: ['auth', 'user'],
    queryFn: getCurrentUser,
    retry: false,
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    // Once we get the initial result (success or failure), we're done loading
    if (!userQuery.isLoading) {
      setIsLoading(false)
    }
  }, [userQuery.isLoading])

  useEffect(() => {
    // Only auto-redirect to login if VITE_REQUIRE_LOGIN is not explicitly false
    if (userQuery.error && !isLoading && requireLogin) {
      const error = userQuery.error as any
      if (error.response?.status === 401) {
        window.location.href = getMicrosoftLoginUrl()
      }
    }
  }, [userQuery.error, isLoading, requireLogin])

  const login = () => {
    window.location.href = getMicrosoftLoginUrl()
  }

  const devLogin = async () => {
    if (!isLocalDev) {
      console.warn('Dev login is only available in local development')
      return
    }
    
    try {
      console.log('Attempting dev login...', {
        isLocalDev,
        baseURL: import.meta.env.VITE_API_BASE,
        endpoint: '/auth/dev-login'
      })
      
      await apiDevLogin('dev@eigentask.co.uk', 'Local Developer')
      
      console.log('Dev login successful, refetching user data')
      // Refetch user data after successful dev login
      await userQuery.refetch()
    } catch (error) {
      console.error('Dev login error:', error)
    }
  }

  const logout = () => {
    // Redirect to logout endpoint which will clear cookies and redirect back
    if (isLocalDev) {
      // Use relative URL for local dev (proxy handles routing)
      window.location.href = '/api/v1/auth/logout'
    } else {
      const baseUrl = import.meta.env.VITE_OAUTH_BASE_URL || import.meta.env.VITE_API_BASE_URL
      if (!baseUrl) {
        console.error('No OAuth or API base URL configured for logout')
        return
      }
      window.location.href = `${baseUrl}/api/v1/auth/logout`
    }
  }

  const value: AuthContextType = {
    user: userQuery.data || null,
    isLoading,
    isAuthenticated: !!userQuery.data,
    requiresLogin: requireLogin,
    login,
    logout,
    devLogin,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
