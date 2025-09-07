import React, { createContext, useContext, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getCurrentUser, getMicrosoftLoginUrl, devLogin as apiDevLogin, type User } from '../api/auth'
import { api } from '../api/client'

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
  const isLocalDev = import.meta.env.DEV

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
      
      // Debug logging to distinguish between CORS and auth errors
      console.log('Auth error detected:', {
        error: error,
        status: error.response?.status,
        message: error.message,
        code: error.code,
        isCors: error.message?.includes('CORS') || error.code === 'ERR_NETWORK'
      })
      
      // Only redirect on actual 401 auth errors, not CORS errors
      if (error.response?.status === 401) {
        console.log('Redirecting to Microsoft login due to 401 status')
        window.location.href = getMicrosoftLoginUrl()
      } else if (error.code === 'ERR_NETWORK' || error.message?.includes('CORS')) {
        console.warn('CORS or network error detected - API server needs CORS configuration for https://www.eigentask.co.uk')
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
        baseURL: '/api/v1',
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

  const logout = async () => {
    try {
      // Call logout API to clear server-side session/cookies
      await api.post('/auth/logout')
    } catch (error) {
      console.warn('Logout API call failed:', error)
      // Continue with logout even if API call fails
    }
    
    // Clear local user data
    userQuery.refetch()
    
    // Redirect to home page - auth system will handle login redirect if needed
    window.location.href = '/'
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
