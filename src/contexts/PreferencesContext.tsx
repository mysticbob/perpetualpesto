import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { UnitSystem } from '../utils/units'
import { useAuth } from './AuthContext'

export type ThemeMode = 'automatic' | 'light' | 'dark'

interface Preferences {
  unitSystem: UnitSystem
  themeMode: ThemeMode
}

interface PreferencesContextType {
  preferences: Preferences
  updatePreferences: (updates: Partial<Preferences>) => void
  setUnitSystem: (system: UnitSystem) => void
  setThemeMode: (mode: ThemeMode) => void
}

const defaultPreferences: Preferences = {
  unitSystem: 'metric',
  themeMode: 'automatic'
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined)

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth()
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences)
  const [loading, setLoading] = useState(true)

  // Load user's preferences from API
  const loadPreferences = async (userId: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/preferences?userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setPreferences({ ...defaultPreferences, ...data })
      } else {
        // If no preferences found, use defaults
        setPreferences(defaultPreferences)
        await savePreferences(userId, defaultPreferences)
      }
    } catch (error) {
      console.error('Failed to load preferences:', error)
      setPreferences(defaultPreferences)
    } finally {
      setLoading(false)
    }
  }

  // Save preferences to API
  const savePreferences = async (userId: string, prefs: Preferences) => {
    try {
      await fetch('http://localhost:3001/api/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          ...prefs
        })
      })
    } catch (error) {
      console.error('Failed to save preferences:', error)
    }
  }

  // Load data when user changes
  useEffect(() => {
    if (currentUser) {
      loadPreferences(currentUser.uid)
    } else {
      setPreferences(defaultPreferences)
      setLoading(false)
    }
  }, [currentUser])

  // Auto-save when preferences change (with debouncing)
  useEffect(() => {
    if (currentUser && !loading) {
      const timeoutId = setTimeout(() => {
        savePreferences(currentUser.uid, preferences)
      }, 1000) // Debounce saves by 1 second

      return () => clearTimeout(timeoutId)
    }
  }, [currentUser, preferences, loading])

  const updatePreferences = (updates: Partial<Preferences>) => {
    setPreferences(prev => ({ ...prev, ...updates }))
  }

  const setUnitSystem = (system: UnitSystem) => {
    console.log('Setting unit system to:', system)
    updatePreferences({ unitSystem: system })
  }

  const setThemeMode = (mode: ThemeMode) => {
    updatePreferences({ themeMode: mode })
  }

  return (
    <PreferencesContext.Provider value={{
      preferences,
      updatePreferences,
      setUnitSystem,
      setThemeMode
    }}>
      {children}
    </PreferencesContext.Provider>
  )
}

export function usePreferences() {
  const context = useContext(PreferencesContext)
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider')
  }
  return context
}