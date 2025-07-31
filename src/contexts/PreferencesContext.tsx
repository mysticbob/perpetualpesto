import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { UnitSystem } from '../utils/units'

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
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences)

  // Load preferences from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('recipe-planner-preferences')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setPreferences({ ...defaultPreferences, ...parsed })
      } catch (error) {
        console.error('Failed to parse saved preferences:', error)
      }
    }
  }, [])

  // Save preferences to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('recipe-planner-preferences', JSON.stringify(preferences))
  }, [preferences])

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