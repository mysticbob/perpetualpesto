import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface PantryItem {
  id: string
  name: string
  amount: string
  unit: string
  location: string
  category?: string
}

export interface PantryLocation {
  id: string
  name: string
  items: PantryItem[]
}

interface PantryContextType {
  pantryData: PantryLocation[]
  setPantryData: (data: PantryLocation[]) => void
  findItemInPantry: (itemName: string) => PantryItem | null
  getItemAvailability: (itemName: string, neededAmount?: string, neededUnit?: string) => {
    available: boolean
    item?: PantryItem
    location?: string
    currentAmount?: string
    remainingAmount?: string
  }
}

// Mock pantry data
const mockPantryData: PantryLocation[] = [
  {
    id: 'refrigerator',
    name: 'Refrigerator',
    items: [
      { id: '1', name: 'carrots', amount: '3', unit: 'lb', location: 'refrigerator', category: 'vegetables' },
      { id: '2', name: 'milk', amount: '1', unit: 'l', location: 'refrigerator', category: 'dairy' },
      { id: '3', name: 'eggs', amount: '12', unit: 'pieces', location: 'refrigerator', category: 'dairy' },
      { id: '4', name: 'bell peppers', amount: '6', unit: 'pieces', location: 'refrigerator', category: 'vegetables' },
      { id: '5', name: 'cheese (cheddar)', amount: '500', unit: 'g', location: 'refrigerator', category: 'dairy' },
      { id: '18', name: 'onion', amount: '3', unit: 'pieces', location: 'refrigerator', category: 'vegetables' }
    ]
  },
  {
    id: 'pantry',
    name: 'Pantry',
    items: [
      { id: '6', name: 'rice (basmati)', amount: '2', unit: 'kg', location: 'pantry', category: 'grains' },
      { id: '7', name: 'black beans (dried)', amount: '1', unit: 'kg', location: 'pantry', category: 'legumes' },
      { id: '19', name: 'beluga lentils (dried)', amount: '800', unit: 'g', location: 'pantry', category: 'legumes' },
      { id: '8', name: 'olive oil', amount: '750', unit: 'ml', location: 'pantry', category: 'oils' },
      { id: '20', name: 'canola oil', amount: '1', unit: 'l', location: 'pantry', category: 'oils' },
      { id: '9', name: 'pasta (spaghetti)', amount: '1', unit: 'kg', location: 'pantry', category: 'grains' },
      { id: '10', name: 'diced tomatoes', amount: '8', unit: 'cans', location: 'pantry', category: 'canned' },
      { id: '21', name: 'corn', amount: '4', unit: 'cans', location: 'pantry', category: 'canned' },
      { id: '22', name: 'tomato paste', amount: '3', unit: 'cans', location: 'pantry', category: 'canned' },
      { id: '23', name: 'vegetable broth', amount: '2', unit: 'l', location: 'pantry', category: 'liquids' }
    ]
  },
  {
    id: 'freezer',
    name: 'Freezer',
    items: [
      { id: '11', name: 'chicken breast', amount: '2', unit: 'lb', location: 'freezer', category: 'meat' },
      { id: '12', name: 'frozen peas', amount: '500', unit: 'g', location: 'freezer', category: 'vegetables' },
      { id: '13', name: 'ice cream', amount: '1', unit: 'l', location: 'freezer', category: 'desserts' }
    ]
  },
  {
    id: 'spice-rack',
    name: 'Spice Rack',
    items: [
      { id: '14', name: 'salt', amount: '1', unit: 'kg', location: 'spice-rack', category: 'spices' },
      { id: '15', name: 'black pepper', amount: '100', unit: 'g', location: 'spice-rack', category: 'spices' },
      { id: '16', name: 'garlic powder', amount: '50', unit: 'g', location: 'spice-rack', category: 'spices' },
      { id: '17', name: 'paprika', amount: '75', unit: 'g', location: 'spice-rack', category: 'spices' },
      { id: '24', name: 'garlic', amount: '1', unit: 'bulb', location: 'spice-rack', category: 'aromatics' },
      { id: '25', name: 'chilli peppers', amount: '10', unit: 'pieces', location: 'spice-rack', category: 'spices' }
    ]
  }
]

const PantryContext = createContext<PantryContextType | undefined>(undefined)

export function PantryProvider({ children }: { children: ReactNode }) {
  const [pantryData, setPantryData] = useState<PantryLocation[]>(() => {
    // Initialize with mock data only if no data exists
    const saved = localStorage.getItem('pantry-data')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (error) {
        console.error('Failed to parse saved pantry data:', error)
      }
    }
    return mockPantryData
  })

  // Save pantry data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('pantry-data', JSON.stringify(pantryData))
  }, [pantryData])

  const findItemInPantry = (itemName: string): PantryItem | null => {
    const normalizedName = itemName.toLowerCase().trim()
    console.log(`🔍 Looking for ingredient: "${itemName}" (normalized: "${normalizedName}")`)
    console.log('📦 Current pantry data:', pantryData.map(loc => ({ 
      location: loc.name, 
      items: loc.items.map(item => item.name) 
    })))
    
    for (const location of pantryData) {
      for (const item of location.items) {
        const itemNameNormalized = item.name.toLowerCase().trim()
        
        // Exact match
        if (itemNameNormalized === normalizedName) {
          console.log(`✅ Found exact match: "${item.name}" in ${location.name}`)
          return item
        }
        
        // Partial match (for items like "black beans (dried)" matching "black beans")
        if (itemNameNormalized.includes(normalizedName) || normalizedName.includes(itemNameNormalized)) {
          console.log(`✅ Found partial match: "${item.name}" in ${location.name}`)
          return item
        }
        
        // Handle common variations
        const itemWithoutParens = itemNameNormalized.replace(/\s*\([^)]*\)/g, '').trim()
        const searchWithoutParens = normalizedName.replace(/\s*\([^)]*\)/g, '').trim()
        const itemWithoutPlural = itemNameNormalized.replace(/s$/, '')
        const searchWithoutPlural = normalizedName.replace(/s$/, '')
        
        // More precise matching - avoid false positives
        if (itemWithoutParens === searchWithoutParens || 
            itemWithoutParens === normalizedName ||
            itemNameNormalized === searchWithoutParens ||
            itemWithoutPlural === normalizedName ||
            itemNameNormalized === searchWithoutPlural) {
          console.log(`✅ Found variation match: "${item.name}" in ${location.name}`)
          return item
        }
      }
    }
    
    console.log(`❌ No match found for: "${itemName}"`)
    return null
  }

  const getItemAvailability = (itemName: string, neededAmount?: string, neededUnit?: string) => {
    const item = findItemInPantry(itemName)
    
    if (!item) {
      return { available: false }
    }

    const location = pantryData.find(loc => loc.id === item.location)?.name || item.location
    
    // If no needed amount specified, just return that we have it
    if (!neededAmount || !neededUnit) {
      return {
        available: true,
        item,
        location,
        currentAmount: `${item.amount} ${item.unit}`
      }
    }

    // Simple availability check - in a real app, you'd want proper unit conversion
    // For now, we'll assume we have enough if the item exists
    const currentAmountNum = parseFloat(item.amount)
    const neededAmountNum = parseFloat(neededAmount)
    
    // Basic unit matching - in reality you'd use the unit conversion system
    const hasEnough = item.unit === neededUnit ? currentAmountNum >= neededAmountNum : true
    
    let remainingAmount = ''
    if (hasEnough && item.unit === neededUnit) {
      const remaining = currentAmountNum - neededAmountNum
      remainingAmount = `${remaining} ${item.unit}`
    }

    return {
      available: true,
      item,
      location,
      currentAmount: `${item.amount} ${item.unit}`,
      remainingAmount: remainingAmount || 'Check amounts'
    }
  }

  return (
    <PantryContext.Provider value={{
      pantryData,
      setPantryData,
      findItemInPantry,
      getItemAvailability
    }}>
      {children}
    </PantryContext.Provider>
  )
}

export function usePantry() {
  const context = useContext(PantryContext)
  if (context === undefined) {
    throw new Error('usePantry must be used within a PantryProvider')
  }
  return context
}