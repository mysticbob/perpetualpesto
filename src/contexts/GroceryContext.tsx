import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { generateSampleGroceryData, shouldShowStarterData } from '../utils/starterData'
import { parseAmount, formatAmount } from '../utils/amountParsing'
import { useAuth } from './AuthContext'

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
  { id: '1', name: 'black beans', amount: '500', unit: 'g', category: 'legumes', completed: false, addedDate: new Date().toISOString() },
  { id: '2', name: 'beluga lentils', amount: '500', unit: 'g', category: 'legumes', completed: false, addedDate: new Date().toISOString() },
  { id: '3', name: 'diced tomatoes', amount: '4', unit: 'cans', category: 'canned', completed: false, addedDate: new Date().toISOString() },
  { id: '4', name: 'corn', amount: '1', unit: 'cans', category: 'canned', completed: false, addedDate: new Date().toISOString() },
  { id: '5', name: 'bell peppers', amount: '4', unit: 'pieces', category: 'vegetables', completed: false, addedDate: new Date().toISOString() },
  { id: '6', name: 'onion', amount: '1', unit: 'pieces', category: 'aromatics', completed: false, addedDate: new Date().toISOString() },
  { id: '7', name: 'garlic', amount: '2', unit: 'cloves', category: 'aromatics', completed: false, addedDate: new Date().toISOString() },
  { id: '8', name: 'chilli peppers', amount: '2', unit: 'pieces', category: 'spices', completed: false, addedDate: new Date().toISOString() },
  { id: '9', name: 'tomato paste', amount: '5', unit: 'tbsp', category: 'canned', completed: false, addedDate: new Date().toISOString() },
  { id: '10', name: 'canola oil', amount: '3', unit: 'tbsp', category: 'oils', completed: true, addedDate: new Date().toISOString() },
  { id: '11', name: 'vegetable broth', amount: '2', unit: 'cups', category: 'canned', completed: true, addedDate: new Date().toISOString() },
  { id: '12', name: 'salt', amount: '1', unit: 'tsp', category: 'spices', completed: true, addedDate: new Date().toISOString() }
]

export const GroceryProvider = ({ children }: GroceryProviderProps) => {
  const { currentUser } = useAuth()
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>([])
  const [loading, setLoading] = useState(true)

  // Load user's grocery data from API
  const loadGroceryData = async (userId: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/grocery?userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setGroceryItems(data.items || [])
      } else {
        // If no data found, create default grocery items for new user
        const defaultItems = generateSampleGroceryData()
        setGroceryItems(defaultItems)
        await saveGroceryData(userId, defaultItems)
      }
    } catch (error) {
      console.error('Failed to load grocery data:', error)
      // Fallback to sample data
      setGroceryItems(generateSampleGroceryData())
    } finally {
      setLoading(false)
    }
  }

  // Save grocery data to API
  const saveGroceryData = async (userId: string, items: GroceryItem[]) => {
    try {
      await fetch('http://localhost:3001/api/grocery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          items
        })
      })
    } catch (error) {
      console.error('Failed to save grocery data:', error)
    }
  }

  // Load data when user changes
  useEffect(() => {
    if (currentUser) {
      loadGroceryData(currentUser.uid)
    } else {
      setGroceryItems([])
      setLoading(false)
    }
  }, [currentUser])

  // Auto-save when data changes (with debouncing)
  useEffect(() => {
    if (currentUser && !loading) {
      const timeoutId = setTimeout(() => {
        saveGroceryData(currentUser.uid, groceryItems)
      }, 1000) // Debounce saves by 1 second

      return () => clearTimeout(timeoutId)
    }
  }, [currentUser, groceryItems, loading])


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
    // Check if item with same name already exists (not completed)
    const normalizedItemName = item.name.toLowerCase().trim()
    const normalizedItemUnit = normalizeUnit(item.unit)
    
    const existingItem = groceryItems.find(existing => {
      const existingName = existing.name.toLowerCase().trim()
      const existingUnit = normalizeUnit(existing.unit)
      
      // Must have same name and not be completed
      if (existingName !== normalizedItemName || existing.completed) {
        return false
      }
      
      // Case 1: Both have the same normalized unit (including both empty)
      if (existingUnit === normalizedItemUnit) {
        return true
      }
      
      // Case 2: One has no unit and the other has a unit - still consolidate by name
      if (!existingUnit || !normalizedItemUnit) {
        return true
      }
      
      return false
    })

    if (existingItem) {
      // Consolidate with existing item
      let consolidatedAmount = existingItem.amount
      let consolidatedUnit = existingItem.unit
      
      // Try to add amounts if both have amounts
      if (item.amount && existingItem.amount) {
        try {
          const existingParsed = parseAmount(existingItem.amount)
          const newParsed = parseAmount(item.amount)
          
          // If units match or one is empty, we can add amounts
          const existingUnit = normalizeUnit(existingItem.unit)
          const newUnit = normalizeUnit(item.unit)
          
          if (existingUnit === newUnit || !existingUnit || !newUnit) {
            const totalAmount = existingParsed.value + newParsed.value
            consolidatedAmount = formatAmount(totalAmount)
            // Keep the more specific unit (non-empty over empty)
            consolidatedUnit = item.unit || existingItem.unit
          } else {
            // Units don't match - keep existing amount and note the addition
            consolidatedAmount = `${existingItem.amount} + ${item.amount}`
            consolidatedUnit = existingItem.unit
          }
        } catch (error) {
          // If parsing fails, concatenate amounts
          consolidatedAmount = `${existingItem.amount} + ${item.amount}`
        }
      } else if (item.amount && !existingItem.amount) {
        // New item has amount, existing doesn't
        consolidatedAmount = item.amount
        consolidatedUnit = item.unit || existingItem.unit
      }
      // If existing has amount but new doesn't, keep existing amount
      
      setGroceryItems(prev => prev.map(grocery =>
        grocery.id === existingItem.id
          ? { 
              ...grocery, 
              amount: consolidatedAmount,
              unit: consolidatedUnit,
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