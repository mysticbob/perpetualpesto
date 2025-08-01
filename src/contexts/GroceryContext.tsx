import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { generateSampleGroceryData, shouldShowStarterData } from '../utils/starterData'

export interface GroceryItem {
  id: string
  name: string
  amount?: string
  unit?: string
  category?: string
  completed: boolean
  addedDate: string
}

interface GroceryContextType {
  groceryItems: GroceryItem[]
  addGroceryItem: (item: Omit<GroceryItem, 'id' | 'completed' | 'addedDate'>) => void
  removeGroceryItem: (id: string) => void
  toggleGroceryItem: (id: string) => void
  clearCompleted: () => void
  updateGroceryItem: (id: string, updates: Partial<GroceryItem>) => void
  consolidateItems: () => void
}

const GroceryContext = createContext<GroceryContextType | undefined>(undefined)

interface GroceryProviderProps {
  children: ReactNode
}

// Mock grocery data based on the chili recipe - this will be replaced with actual data management
const initialMockData: GroceryItem[] = [
  { id: '1', name: 'black beans', amount: '500', unit: 'g', category: 'dried', completed: false, addedDate: new Date().toISOString() },
  { id: '2', name: 'beluga lentils', amount: '500', unit: 'g', category: 'dried', completed: false, addedDate: new Date().toISOString() },
  { id: '3', name: 'diced tomatoes', amount: '4', unit: 'cans', category: 'canned', completed: false, addedDate: new Date().toISOString() },
  { id: '4', name: 'corn', amount: '1', unit: 'cans', category: 'canned', completed: false, addedDate: new Date().toISOString() },
  { id: '5', name: 'bell peppers', amount: '4', unit: 'pieces', category: 'vegetables', completed: false, addedDate: new Date().toISOString() },
  { id: '6', name: 'onion', amount: '1', unit: 'pieces', category: 'vegetables', completed: false, addedDate: new Date().toISOString() },
  { id: '7', name: 'garlic', amount: '2', unit: 'cloves', category: 'vegetables', completed: false, addedDate: new Date().toISOString() },
  { id: '8', name: 'chilli peppers', amount: '2', unit: 'pieces', category: 'vegetables', completed: false, addedDate: new Date().toISOString() },
  { id: '9', name: 'tomato paste', amount: '5', unit: 'tbsp', category: 'canned', completed: false, addedDate: new Date().toISOString() },
  { id: '10', name: 'canola oil', amount: '3', unit: 'tbsp', category: 'oils', completed: true, addedDate: new Date().toISOString() },
  { id: '11', name: 'vegetable broth', amount: '2', unit: 'cups', category: 'canned', completed: true, addedDate: new Date().toISOString() },
  { id: '12', name: 'salt', amount: '1', unit: 'tsp', category: 'spices', completed: true, addedDate: new Date().toISOString() }
]

export const GroceryProvider = ({ children }: GroceryProviderProps) => {
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>([])

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('groceryItems')
    if (stored && stored !== 'undefined' && stored !== 'null') {
      try {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          console.log('Loaded grocery items from localStorage:', parsed.length, 'items')
          setGroceryItems(parsed)
        } else {
          console.warn('Invalid grocery items format in localStorage, using mock data')
          setGroceryItems(initialMockData)
        }
      } catch (error) {
        console.error('Failed to parse grocery items from localStorage:', error)
        setGroceryItems(initialMockData)
      }
    } else {
      // Use starter data for new users, otherwise use mock data
      const starterData = shouldShowStarterData() ? generateSampleGroceryData() : initialMockData
      console.log('No valid grocery items in localStorage, using starter data')
      setGroceryItems(starterData)
    }
  }, [])

  // Save to localStorage whenever items change (with debouncing to prevent excessive saves)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (groceryItems.length >= 0) { // Allow saving empty arrays
        console.log('Saving grocery items to localStorage:', groceryItems.length, 'items')
        localStorage.setItem('groceryItems', JSON.stringify(groceryItems))
      }
    }, 500) // Debounce saves by 500ms
    
    return () => clearTimeout(timeoutId)
  }, [groceryItems])

  // Helper function to parse amount strings like "2 cloves", "1/2 tsp", etc.
  const parseAmount = (amount?: string): { value: number; unit?: string } => {
    if (!amount) return { value: 1 }
    
    // Handle fractions like "1/2", "3/4", etc.
    const fractionMatch = amount.match(/^(\d+)\/(\d+)/)
    if (fractionMatch) {
      const numerator = parseInt(fractionMatch[1])
      const denominator = parseInt(fractionMatch[2])
      return { value: numerator / denominator }
    }
    
    // Handle mixed numbers like "1 1/2"
    const mixedMatch = amount.match(/^(\d+)\s+(\d+)\/(\d+)/)
    if (mixedMatch) {
      const whole = parseInt(mixedMatch[1])
      const numerator = parseInt(mixedMatch[2])
      const denominator = parseInt(mixedMatch[3])
      return { value: whole + (numerator / denominator) }
    }
    
    // Handle regular numbers
    const numberMatch = amount.match(/^(\d+(?:\.\d+)?)/)
    if (numberMatch) {
      return { value: parseFloat(numberMatch[1]) }
    }
    
    return { value: 1 }
  }

  // Helper function to format amount back to string
  const formatAmount = (value: number): string => {
    if (value === Math.floor(value)) {
      return value.toString()
    }
    
    // Convert decimals to fractions for common cooking measurements
    const commonFractions = [
      { decimal: 0.125, fraction: '1/8' },
      { decimal: 0.25, fraction: '1/4' },
      { decimal: 0.333, fraction: '1/3' },
      { decimal: 0.5, fraction: '1/2' },
      { decimal: 0.667, fraction: '2/3' },
      { decimal: 0.75, fraction: '3/4' }
    ]
    
    for (const { decimal, fraction } of commonFractions) {
      if (Math.abs(value - decimal) < 0.01) {
        return fraction
      }
    }
    
    // Check for mixed numbers
    const whole = Math.floor(value)
    const remainder = value - whole
    
    for (const { decimal, fraction } of commonFractions) {
      if (Math.abs(remainder - decimal) < 0.01) {
        return whole > 0 ? `${whole} ${fraction}` : fraction
      }
    }
    
    return value.toFixed(2).replace(/\.?0+$/, '')
  }

  // Helper function to normalize units for comparison
  const normalizeUnit = (unit?: string): string => {
    if (!unit) return ''
    const normalized = unit.toLowerCase().trim()
    
    // Group similar units together
    const unitGroups: Record<string, string> = {
      // Volume units
      'tsp': 'teaspoon',
      'teaspoon': 'teaspoon',
      'teaspoons': 'teaspoon',
      'tbsp': 'tablespoon', 
      'tablespoon': 'tablespoon',
      'tablespoons': 'tablespoon',
      'cup': 'cup',
      'cups': 'cup',
      'ml': 'ml',
      'milliliter': 'ml',
      'milliliters': 'ml',
      'l': 'liter',
      'liter': 'liter',
      'liters': 'liter',
      
      // Weight units
      'g': 'gram',
      'gram': 'gram', 
      'grams': 'gram',
      'kg': 'kilogram',
      'kilogram': 'kilogram',
      'kilograms': 'kilogram',
      'oz': 'ounce',
      'ounce': 'ounce',
      'ounces': 'ounce',
      'lb': 'pound',
      'pound': 'pound',
      'pounds': 'pound',
      
      // Count units
      'piece': 'piece',
      'pieces': 'piece',
      'clove': 'clove',
      'cloves': 'clove',
      'can': 'can',
      'cans': 'can',
      'jar': 'jar',
      'jars': 'jar',
      'bottle': 'bottle',
      'bottles': 'bottle',
      'bag': 'bag',
      'bags': 'bag',
      'box': 'box',
      'boxes': 'box'
    }
    
    return unitGroups[normalized] || normalized
  }

  const addGroceryItem = (item: Omit<GroceryItem, 'id' | 'completed' | 'addedDate'>) => {
    // Check if item with same name and compatible unit already exists
    const normalizedItemUnit = normalizeUnit(item.unit)
    const existingItem = groceryItems.find(existing => 
      existing.name.toLowerCase().trim() === item.name.toLowerCase().trim() &&
      normalizeUnit(existing.unit) === normalizedItemUnit &&
      !existing.completed &&
      normalizedItemUnit !== '' // Only consolidate if we have a valid unit
    )

    if (existingItem && item.amount && existingItem.amount && normalizedItemUnit) {
      // Consolidate amounts only if units are compatible
      const existingParsed = parseAmount(existingItem.amount)
      const newParsed = parseAmount(item.amount)
      const totalAmount = existingParsed.value + newParsed.value
      
      setGroceryItems(prev => prev.map(grocery =>
        grocery.id === existingItem.id
          ? { 
              ...grocery, 
              amount: formatAmount(totalAmount),
              unit: item.unit || grocery.unit, // Keep the more specific unit
              category: item.category || grocery.category,
              completed: false 
            }
          : grocery
      ))
    } else {
      // Create new item
      const newItem: GroceryItem = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: item.name,
        amount: item.amount,
        unit: item.unit,
        category: item.category,
        completed: false,
        addedDate: new Date().toISOString()
      }
      setGroceryItems(prev => [...prev, newItem])
    }
  }

  const removeGroceryItem = (id: string) => {
    setGroceryItems(prev => prev.filter(item => item.id !== id))
  }

  const toggleGroceryItem = (id: string) => {
    setGroceryItems(prev => prev.map(item =>
      item.id === id ? { ...item, completed: !item.completed } : item
    ))
  }

  const clearCompleted = () => {
    console.log('Clearing completed items')
    setGroceryItems(prev => prev.filter(item => !item.completed))
  }

  const updateGroceryItem = (id: string, updates: Partial<GroceryItem>) => {
    setGroceryItems(prev => prev.map(item =>
      item.id === id ? { ...item, ...updates } : item
    ))
  }

  const consolidateItems = () => {
    const consolidated: GroceryItem[] = []
    const processed = new Set<string>()

    groceryItems.forEach(item => {
      if (processed.has(item.id)) return

      // Find all items with the same name and compatible unit
      const normalizedItemUnit = normalizeUnit(item.unit)
      const duplicates = groceryItems.filter(other => 
        other.name.toLowerCase().trim() === item.name.toLowerCase().trim() &&
        normalizeUnit(other.unit) === normalizedItemUnit &&
        other.completed === item.completed &&
        normalizedItemUnit !== '' // Only consolidate items with valid units
      )

      if (duplicates.length > 1 && normalizedItemUnit) {
        // Consolidate amounts
        let totalAmount = 0
        let hasValidAmount = false
        let bestUnit = item.unit

        duplicates.forEach(dup => {
          if (dup.amount) {
            const parsed = parseAmount(dup.amount)
            totalAmount += parsed.value
            hasValidAmount = true
          }
          // Keep the most descriptive unit
          if (dup.unit && dup.unit.length > (bestUnit?.length || 0)) {
            bestUnit = dup.unit
          }
          processed.add(dup.id)
        })

        // Create consolidated item
        consolidated.push({
          ...item,
          amount: hasValidAmount ? formatAmount(totalAmount) : item.amount,
          unit: bestUnit,
          id: item.id // Keep the first item's ID
        })
      } else {
        consolidated.push(item)
        processed.add(item.id)
      }
    })

    setGroceryItems(consolidated)
  }

  return (
    <GroceryContext.Provider value={{
      groceryItems,
      addGroceryItem,
      removeGroceryItem,
      toggleGroceryItem,
      clearCompleted,
      updateGroceryItem,
      consolidateItems
    }}>
      {children}
    </GroceryContext.Provider>
  )
}

export const useGrocery = () => {
  const context = useContext(GroceryContext)
  if (context === undefined) {
    throw new Error('useGrocery must be used within a GroceryProvider')
  }
  return context
}