import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface AuthContextType {
  currentUser: any | null
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => Promise<void>
  loginWithGoogle: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  // For local development, automatically log in as Bob
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  const signup = async (email: string, password: string, displayName: string) => {
    // Mock signup
    setCurrentUser({
      uid: 'local-user-' + Date.now(),
      email,
      displayName
    })
  }

  const login = async (email: string, password: string) => {
    // Mock login - accept any credentials for local dev
    setCurrentUser({
      uid: 'cmerd586z0000aiocycckrwx8', // Bob's actual user ID from database
      email,
      displayName: email.split('@')[0]
    })
  }

  const loginWithGoogle = async () => {
    // Mock Google login
    setCurrentUser({
      uid: 'google-user-' + Date.now(),
      email: 'user@gmail.com',
      displayName: 'Google User'
    })
  }

  const logout = async () => {
    setCurrentUser(null)
  }

  useEffect(() => {
    // Auto-login for development
    const autoLogin = async () => {
      // Check if we're in development mode
      if (window.location.hostname === 'localhost') {
        // Automatically log in as Bob for local development
        setCurrentUser({
          uid: 'cmerd586z0000aiocycckrwx8', // Bob's user ID
          email: 'bobkuehne@gmail.com',
          displayName: 'Bob Kuehne'
        })
      }
      setLoading(false)
    }
    
    autoLogin()
  }, [])

  const value: AuthContextType = {
    currentUser,
    login,
    signup,
    logout,
    loginWithGoogle,
    loading
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}