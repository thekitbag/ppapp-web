import React, { createContext, useContext, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getCurrentUser, getMicrosoftLoginUrl, type User } from '../api/auth'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: () => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true)

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
    // If we get a 401, redirect to Microsoft login
    if (userQuery.error && !isLoading) {
      const error = userQuery.error as any
      if (error.response?.status === 401) {
        window.location.href = getMicrosoftLoginUrl()
      }
    }
  }, [userQuery.error, isLoading])

  const login = () => {
    window.location.href = getMicrosoftLoginUrl()
  }

  const logout = () => {
    // Redirect to logout endpoint which will clear cookies and redirect back
    const baseUrl = import.meta.env.VITE_API_BASE_URL
    window.location.href = `${baseUrl}/api/v1/auth/logout`
  }

  const value: AuthContextType = {
    user: userQuery.data || null,
    isLoading,
    isAuthenticated: !!userQuery.data,
    login,
    logout,
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
