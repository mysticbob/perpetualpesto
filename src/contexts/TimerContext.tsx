import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface Timer {
  id: string
  name: string
  totalSeconds: number
  remainingSeconds: number
  isRunning: boolean
  isCompleted: boolean
  recipeStep?: number
  recipeName?: string
}

interface TimerContextType {
  timers: Timer[]
  addTimer: (name: string, minutes: number, recipeStep?: number, recipeName?: string) => string
  startTimer: (id: string) => void
  pauseTimer: (id: string) => void
  removeTimer: (id: string) => void
  clearCompletedTimers: () => void
}

const TimerContext = createContext<TimerContextType | undefined>(undefined)

export function TimerProvider({ children }: { children: ReactNode }) {
  const [timers, setTimers] = useState<Timer[]>([])

  // Update timers every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers(prevTimers => 
        prevTimers.map(timer => {
          if (timer.isRunning && timer.remainingSeconds > 0) {
            const newRemainingSeconds = timer.remainingSeconds - 1
            return {
              ...timer,
              remainingSeconds: newRemainingSeconds,
              isCompleted: newRemainingSeconds === 0,
              isRunning: newRemainingSeconds > 0
            }
          }
          return timer
        })
      )
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const addTimer = (name: string, minutes: number, recipeStep?: number, recipeName?: string): string => {
    const totalSeconds = minutes * 60
    const newTimer: Timer = {
      id: Date.now().toString(),
      name,
      totalSeconds,
      remainingSeconds: totalSeconds,
      isRunning: false,
      isCompleted: false,
      recipeStep,
      recipeName
    }

    setTimers(prev => [...prev, newTimer])
    return newTimer.id
  }

  const startTimer = (id: string) => {
    setTimers(prev => 
      prev.map(timer => 
        timer.id === id ? { ...timer, isRunning: true } : timer
      )
    )
  }

  const pauseTimer = (id: string) => {
    setTimers(prev =>
      prev.map(timer =>
        timer.id === id ? { ...timer, isRunning: false } : timer
      )
    )
  }

  const removeTimer = (id: string) => {
    setTimers(prev => prev.filter(timer => timer.id !== id))
  }

  const clearCompletedTimers = () => {
    setTimers(prev => prev.filter(timer => !timer.isCompleted))
  }

  return (
    <TimerContext.Provider value={{
      timers,
      addTimer,
      startTimer,
      pauseTimer,
      removeTimer,
      clearCompletedTimers
    }}>
      {children}
    </TimerContext.Provider>
  )
}

export function useTimers() {
  const context = useContext(TimerContext)
  if (context === undefined) {
    throw new Error('useTimers must be used within a TimerProvider')
  }
  return context
}