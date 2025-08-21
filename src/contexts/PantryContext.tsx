import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { convertToCommonUnit } from '../utils/units'
import { parseFraction } from '../utils/fractionParser'
import { generateSamplePantryData, shouldShowStarterData } from '../utils/starterData'
import { useAuth } from './AuthContext'

export interface PantryItem {
  id: string
  name: string
  amount: string
  unit: string
  location: string
  category?: string
  expirationDate?: string // ISO date string
  addedDate?: string // ISO date string
}

export interface DepletedItem {
  id: string
  name: string
  lastAmount: string
  unit: string
  category?: string
  depletedDate: string
  timesUsed: number
  isFrequentlyUsed: boolean
}

export interface PantryLocation {
  id: string
  name: string
  items: PantryItem[]
}

export interface PantryData {
  locations: PantryLocation[]
  depletedItems: DepletedItem[]
}

interface PantryContextType {
  pantryData: PantryLocation[]
  depletedItems: DepletedItem[]
  setPantryData: (data: PantryLocation[] | ((prev: PantryLocation[]) => PantryLocation[])) => void
  addDepletedItem: (item: PantryItem) => void
  getRecentlyDepleted: () => DepletedItem[]
  getFrequentlyUsed: () => DepletedItem[]
  findItemInPantry: (itemName: string) => PantryItem | null
  getItemAvailability: (itemName: string, neededAmount?: string, neededUnit?: string) => {
    available: boolean
    item?: PantryItem
    location?: string
    currentAmount?: string
    remainingAmount?: string
    substitution?: {
      available: boolean
      item: PantryItem
      originalName: string
      suggestedName: string
    }
  }
}

// Mock pantry data with mixed expiration dates for testing dot colors
const today = new Date()
const yesterday = new Date(today)
yesterday.setDate(yesterday.getDate() - 1)
const twoDaysAgo = new Date(today)
twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
const tomorrow = new Date(today)
tomorrow.setDate(tomorrow.getDate() + 1)
const nextWeek = new Date(today)
nextWeek.setDate(nextWeek.getDate() + 7)
const twoWeeks = new Date(today)
twoWeeks.setDate(twoWeeks.getDate() + 14)

const mockPantryData: PantryLocation[] = [
  {
    id: 'refrigerator',
    name: 'Refrigerator',
    items: [
      { id: '1', name: 'carrots', amount: '3', unit: 'lb', location: 'refrigerator', category: 'vegetables', expirationDate: nextWeek.toISOString(), addedDate: today.toISOString() },
      { id: '2', name: 'milk', amount: '1', unit: 'l', location: 'refrigerator', category: 'dairy', expirationDate: tomorrow.toISOString(), addedDate: today.toISOString() },
      { id: '3', name: 'eggs', amount: '12', unit: 'pieces', location: 'refrigerator', category: 'dairy', expirationDate: twoWeeks.toISOString(), addedDate: today.toISOString() },
      { id: '4', name: 'bell peppers', amount: '6', unit: 'pieces', location: 'refrigerator', category: 'vegetables', expirationDate: yesterday.toISOString(), addedDate: today.toISOString() },
      { id: '5', name: 'cheese (cheddar)', amount: '500', unit: 'g', location: 'refrigerator', category: 'dairy', expirationDate: today.toISOString(), addedDate: today.toISOString() },
      { id: '18', name: 'onion', amount: '3', unit: 'pieces', location: 'refrigerator', category: 'vegetables', expirationDate: nextWeek.toISOString(), addedDate: today.toISOString() }
    ]
  },
  {
    id: 'pantry',
    name: 'Pantry',
    items: [
      { id: '6', name: 'rice (basmati)', amount: '2', unit: 'kg', location: 'pantry', category: 'grains', expirationDate: new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(), addedDate: today.toISOString() },
      { id: '7', name: 'black beans (dried)', amount: '1', unit: 'kg', location: 'pantry', category: 'legumes', expirationDate: new Date(today.getTime() + 300 * 24 * 60 * 60 * 1000).toISOString(), addedDate: today.toISOString() },
      { id: '19', name: 'beluga lentils (dried)', amount: '800', unit: 'g', location: 'pantry', category: 'legumes', expirationDate: new Date(today.getTime() + 200 * 24 * 60 * 60 * 1000).toISOString(), addedDate: today.toISOString() },
      { id: '8', name: 'olive oil', amount: '750', unit: 'ml', location: 'pantry', category: 'oils', expirationDate: new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(), addedDate: today.toISOString() },
      { id: '20', name: 'canola oil', amount: '1', unit: 'l', location: 'pantry', category: 'oils', expirationDate: new Date(today.getTime() + 120 * 24 * 60 * 60 * 1000).toISOString(), addedDate: today.toISOString() },
      { id: '9', name: 'pasta (spaghetti)', amount: '1', unit: 'kg', location: 'pantry', category: 'grains', expirationDate: new Date(today.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString(), addedDate: today.toISOString() },
      { id: '10', name: 'diced tomatoes', amount: '8', unit: 'cans', location: 'pantry', category: 'canned', expirationDate: twoDaysAgo.toISOString(), addedDate: today.toISOString() },
      { id: '21', name: 'corn', amount: '4', unit: 'cans', location: 'pantry', category: 'canned', expirationDate: new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString(), addedDate: today.toISOString() },
      { id: '22', name: 'tomato paste', amount: '3', unit: 'cans', location: 'pantry', category: 'canned', expirationDate: tomorrow.toISOString(), addedDate: today.toISOString() },
      { id: '23', name: 'vegetable broth', amount: '2', unit: 'l', location: 'pantry', category: 'liquids', expirationDate: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(), addedDate: today.toISOString() }
    ]
  },
  {
    id: 'freezer',
    name: 'Freezer',
    items: [
      { id: '11', name: 'chicken breast', amount: '2', unit: 'lb', location: 'freezer', category: 'meat', expirationDate: new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(), addedDate: today.toISOString() },
      { id: '12', name: 'frozen peas', amount: '500', unit: 'g', location: 'freezer', category: 'vegetables', expirationDate: new Date(today.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString(), addedDate: today.toISOString() },
      { id: '13', name: 'ice cream', amount: '1', unit: 'l', location: 'freezer', category: 'desserts', expirationDate: new Date(today.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString(), addedDate: today.toISOString() }
    ]
  },
  {
    id: 'spice-rack',
    name: 'Spice Rack',
    items: [
      { id: '14', name: 'salt', amount: '1', unit: 'kg', location: 'spice-rack', category: 'spices', expirationDate: new Date(today.getTime() + 1000 * 24 * 60 * 60 * 1000).toISOString(), addedDate: today.toISOString() },
      { id: '15', name: 'black pepper', amount: '100', unit: 'g', location: 'spice-rack', category: 'spices', expirationDate: new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(), addedDate: today.toISOString() },
      { id: '16', name: 'garlic powder', amount: '50', unit: 'g', location: 'spice-rack', category: 'spices', expirationDate: new Date(today.getTime() + 200 * 24 * 60 * 60 * 1000).toISOString(), addedDate: today.toISOString() },
      { id: '17', name: 'paprika', amount: '75', unit: 'g', location: 'spice-rack', category: 'spices', expirationDate: new Date(today.getTime() + 150 * 24 * 60 * 60 * 1000).toISOString(), addedDate: today.toISOString() },
      { id: '24', name: 'garlic', amount: '1', unit: 'bulb', location: 'spice-rack', category: 'aromatics', expirationDate: tomorrow.toISOString(), addedDate: today.toISOString() },
      { id: '25', name: 'chilli peppers', amount: '10', unit: 'pieces', location: 'spice-rack', category: 'spices', expirationDate: yesterday.toISOString(), addedDate: today.toISOString() }
    ]
  }
]

const PantryContext = createContext<PantryContextType | undefined>(undefined)

export function PantryProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth()
  const [pantryData, setPantryData] = useState<PantryLocation[]>([])
  const [depletedItems, setDepletedItems] = useState<DepletedItem[]>([])
  const [loading, setLoading] = useState(true)

  // Load user's pantry data from API
  const loadPantryData = async (userId: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/pantry?userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setPantryData(data.locations || [])
        setDepletedItems(data.depletedItems || [])
      } else {
        // If no data found, create default pantry locations for new user
        const defaultLocations = generateSamplePantryData()
        setPantryData(defaultLocations)
        await savePantryData(userId, defaultLocations, [])
      }
    } catch (error) {
      console.error('Failed to load pantry data:', error)
      // Fallback to sample data
      setPantryData(generateSamplePantryData())
    } finally {
      setLoading(false)
    }
  }

  // Save pantry data to API
  const savePantryData = async (userId: string, locations: PantryLocation[], depleted: DepletedItem[]) => {
    try {
      await fetch('http://localhost:3001/api/pantry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          locations,
          depletedItems: depleted
        })
      })
    } catch (error) {
      console.error('Failed to save pantry data:', error)
    }
  }

  // Load data when user changes
  useEffect(() => {
    if (currentUser) {
      loadPantryData(currentUser.uid)
    } else {
      setPantryData([])
      setDepletedItems([])
      setLoading(false)
    }
  }, [currentUser])

  // Auto-save when data changes (with debouncing)
  useEffect(() => {
    if (currentUser && !loading) {
      const timeoutId = setTimeout(() => {
        savePantryData(currentUser.uid, pantryData, depletedItems)
      }, 1000) // Debounce saves by 1 second

      return () => clearTimeout(timeoutId)
    }
  }, [currentUser, pantryData, depletedItems, loading])

  const findSubstitution = (itemName: string): PantryItem | null => {
    const normalizedName = itemName.toLowerCase().trim()
    
    // Common substitution patterns
    const substitutionRules = [
      // Onion variations
      { pattern: /^(yellow|white|red|sweet)\s+onion/, replacement: 'onion' },
      { pattern: /^onion,?\s+(yellow|white|red|sweet)/, replacement: 'onion' },
      
      // Pepper variations  
      { pattern: /^(red|green|yellow|orange)\s+bell\s+pepper/, replacement: 'bell pepper' },
      { pattern: /^bell\s+pepper,?\s+(red|green|yellow|orange)/, replacement: 'bell pepper' },
      
      // Tomato variations
      { pattern: /^(fresh|ripe|cherry|roma|grape)\s+tomato/, replacement: 'tomato' },
      { pattern: /^tomato,?\s+(fresh|ripe|cherry|roma|grape)/, replacement: 'tomato' },
      
      // Garlic variations
      { pattern: /^fresh\s+garlic/, replacement: 'garlic' },
      { pattern: /^garlic\s+cloves?/, replacement: 'garlic' },
      
      // Herb variations
      { pattern: /^fresh\s+(basil|oregano|thyme|rosemary|sage|parsley|cilantro)/, replacement: '$1' },
      { pattern: /^dried\s+(basil|oregano|thyme|rosemary|sage|parsley|cilantro)/, replacement: '$1' },
      
      // Cheese variations
      { pattern: /^(aged|sharp|mild|extra sharp)\s+(cheddar|parmesan|mozzarella)/, replacement: '$2' },
      
      // Oil variations
      { pattern: /^extra\s+virgin\s+olive\s+oil/, replacement: 'olive oil' },
      { pattern: /^(light|pure)\s+olive\s+oil/, replacement: 'olive oil' },
      
      // Generic descriptors
      { pattern: /^(organic|free-range|grass-fed|wild-caught)\s+(.+)/, replacement: '$2' },
      { pattern: /^(.+?),?\s+(organic|free-range|grass-fed|wild-caught)/, replacement: '$1' }
    ]
    
    // Try each substitution rule
    for (const rule of substitutionRules) {
      const match = normalizedName.match(rule.pattern)
      if (match) {
        const substituteName = rule.replacement.replace(/\$(\d+)/g, (_, num) => match[parseInt(num)] || '')
        console.log(`🔄 Trying substitution: "${itemName}" -> "${substituteName}"`)
        
        // Look for the substitution in pantry
        for (const location of pantryData) {
          for (const item of location.items) {
            const itemNameNormalized = item.name.toLowerCase().trim()
            
            // Check for exact or close match with substitution
            if (itemNameNormalized === substituteName || 
                itemNameNormalized.includes(substituteName) ||
                substituteName.includes(itemNameNormalized)) {
              console.log(`✅ Found substitution: "${item.name}" for "${itemName}"`)
              return item
            }
          }
        }
      }
    }
    
    // Try removing adjectives for broader matching
    const withoutAdjectives = normalizedName
      .replace(/\b(fresh|dried|frozen|canned|organic|raw|cooked|chopped|diced|sliced|minced|whole|ground|extra|virgin|pure|aged|sharp|mild|sweet|hot|spicy|large|medium|small)\s+/g, '')
      .replace(/\s+\b(fresh|dried|frozen|canned|organic|raw|cooked|chopped|diced|sliced|minced|whole|ground|extra|virgin|pure|aged|sharp|mild|sweet|hot|spicy|large|medium|small)\b/g, '')
      .trim()
    
    if (withoutAdjectives !== normalizedName && withoutAdjectives.length > 2) {
      console.log(`🔄 Trying without adjectives: "${itemName}" -> "${withoutAdjectives}"`)
      
      for (const location of pantryData) {
        for (const item of location.items) {
          const itemNameNormalized = item.name.toLowerCase().trim()
          
          if (itemNameNormalized === withoutAdjectives ||
              (withoutAdjectives.length > 4 && itemNameNormalized.includes(withoutAdjectives)) ||
              (withoutAdjectives.length > 4 && withoutAdjectives.includes(itemNameNormalized))) {
            console.log(`✅ Found substitution without adjectives: "${item.name}" for "${itemName}"`)
            return item
          }
        }
      }
    }
    
    return null
  }

  const findItemInPantry = (itemName: string): PantryItem | null => {
    const normalizedName = itemName.toLowerCase().trim()
    console.log(`🔍 Looking for ingredient: "${itemName}" (normalized: "${normalizedName}")`)
    console.log('📦 Current pantry data:', pantryData.map(loc => ({ 
      location: loc.name, 
      items: loc.items.map(item => item.name) 
    })))
    
    // Clean the search term by removing common cooking descriptors
    const cleanedName = normalizedName
      .replace(/,\s*(beaten|chopped|diced|minced|sliced|grated|fresh|dried|ground|whole|large|small|medium)\b.*$/g, '') // Remove everything after comma + descriptor
      .replace(/\b(beaten|chopped|diced|minced|sliced|grated|fresh|dried|ground|whole|large|small|medium)\b.*$/g, '') // Remove descriptors at end
      .replace(/\s*\([^)]*\)/g, '') // Remove parenthetical content
      .trim()
    
    console.log(`🧹 Cleaned ingredient name: "${cleanedName}"`)
    
    // Also try the original name for exact matches
    const searchTerms = [normalizedName, cleanedName].filter((term, index, array) => 
      term && array.indexOf(term) === index // Remove duplicates and empty strings
    )
    
    // Try each search term
    for (const searchTerm of searchTerms) {
      console.log(`🔍 Trying search term: "${searchTerm}"`)
      
      for (const location of pantryData) {
        for (const item of location.items) {
          const itemNameNormalized = item.name.toLowerCase().trim()
          
          // Exact match
          if (itemNameNormalized === searchTerm) {
            console.log(`✅ Found exact match: "${item.name}" in ${location.name} (using term: "${searchTerm}")`)
            return item
          }
          
          // More careful partial matching - only match if one is a clear subset of the other
          // and they share significant word boundaries
          const itemWords = itemNameNormalized.split(/\s+/)
          const searchWords = searchTerm.split(/\s+/)
          
          // Check if the search term is contained as complete words in the item name
          // This handles cases like "black beans" matching "black beans (dried)"
          const searchWordsInItem = searchWords.every(word => 
            itemWords.some(itemWord => itemWord === word || (word.length > 2 && itemWord.startsWith(word)))
          )
          
          // More restrictive reverse matching - only if the item word is substantial and matches exactly
          const itemWordsInSearch = itemWords.some(itemWord => 
            itemWord.length > 3 && searchWords.some(searchWord => searchWord === itemWord)
          )
          
          if ((searchWordsInItem || itemWordsInSearch) && searchWords.length > 0) {
            console.log(`✅ Found word-based match: "${item.name}" in ${location.name} (using term: "${searchTerm}", searchWordsInItem: ${searchWordsInItem}, itemWordsInSearch: ${itemWordsInSearch})`)
            return item
          }
          
          // Handle common variations
          const itemWithoutParens = itemNameNormalized.replace(/\s*\([^)]*\)/g, '').trim()
          const searchWithoutParens = searchTerm.replace(/\s*\([^)]*\)/g, '').trim()
          const itemWithoutPlural = itemNameNormalized.replace(/s$/, '')
          const searchWithoutPlural = searchTerm.replace(/s$/, '')
          
          // More precise matching - avoid false positives
          if (itemWithoutParens === searchWithoutParens || 
              itemWithoutParens === searchTerm ||
              itemNameNormalized === searchWithoutParens ||
              itemWithoutPlural === searchTerm ||
              itemNameNormalized === searchWithoutPlural) {
            console.log(`✅ Found variation match: "${item.name}" in ${location.name} (using term: "${searchTerm}")`)
            return item
          }
        }
      }
    }
    
    console.log(`❌ No match found for: "${itemName}"`)
    return null
  }

  const getItemAvailability = (itemName: string, neededAmount?: string, neededUnit?: string) => {
    const item = findItemInPantry(itemName)
    
    if (!item) {
      // Try to find a substitution
      const substitutionItem = findSubstitution(itemName)
      if (substitutionItem) {
        const location = pantryData.find(loc => loc.id === substitutionItem.location)?.name || substitutionItem.location
        return {
          available: false,
          substitution: {
            available: true,
            item: substitutionItem,
            originalName: itemName,
            suggestedName: substitutionItem.name
          }
        }
      }
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

    // Parse amounts (including fractions)
    const currentAmountNum = parseFraction(item.amount)
    const neededAmountNum = parseFraction(neededAmount)
    
    if (isNaN(currentAmountNum) || isNaN(neededAmountNum)) {
      // If we can't parse amounts, just show that we have the item
      return {
        available: true,
        item,
        location,
        currentAmount: `${item.amount} ${item.unit}`,
        remainingAmount: 'Check amounts'
      }
    }

    let hasEnough = false
    let remainingAmount = ''
    
    // Check if units match exactly
    if (item.unit?.toLowerCase() === neededUnit?.toLowerCase()) {
      hasEnough = currentAmountNum >= neededAmountNum
      if (hasEnough) {
        const remaining = currentAmountNum - neededAmountNum
        remainingAmount = `${remaining} ${item.unit}`
      }
    } else {
      // Try to convert units for comparison
      try {
        // Convert both to a common unit for comparison
        const itemInNeededUnit = convertToCommonUnit(item.amount, item.unit, neededUnit)
        const neededInSameUnit = convertToCommonUnit(neededAmount, neededUnit, neededUnit)
        
        if (itemInNeededUnit !== null && neededInSameUnit !== null) {
          hasEnough = itemInNeededUnit >= neededInSameUnit
          if (hasEnough) {
            const remaining = itemInNeededUnit - neededInSameUnit
            remainingAmount = `${remaining.toFixed(2)} ${neededUnit}`
          }
        } else {
          // If conversion fails, assume we have enough (for non-convertible units like "pieces", "cloves", etc.)
          hasEnough = true
          remainingAmount = 'Check amounts'
        }
      } catch (error) {
        // If unit conversion fails, assume we have enough
        hasEnough = true
        remainingAmount = 'Check amounts'
      }
    }

    return {
      available: hasEnough,
      item,
      location,
      currentAmount: `${item.amount} ${item.unit}`,
      remainingAmount: hasEnough ? remainingAmount : undefined
    }
  }



  const addDepletedItem = (item: PantryItem) => {
    const now = new Date().toISOString()
    const existingIndex = depletedItems.findIndex(depleted => 
      depleted.name.toLowerCase() === item.name.toLowerCase()
    )

    if (existingIndex >= 0) {
      // Update existing depleted item
      setDepletedItems(prev => prev.map((depleted, index) => {
        if (index === existingIndex) {
          const newTimesUsed = depleted.timesUsed + 1
          return {
            ...depleted,
            depletedDate: now,
            timesUsed: newTimesUsed,
            isFrequentlyUsed: newTimesUsed >= 3 // Mark as frequently used after 3 times
          }
        }
        return depleted
      }))
    } else {
      // Add new depleted item
      const newDepletedItem: DepletedItem = {
        id: item.id,
        name: item.name,
        lastAmount: item.amount,
        unit: item.unit,
        category: item.category,
        depletedDate: now,
        timesUsed: 1,
        isFrequentlyUsed: false
      }
      setDepletedItems(prev => [...prev, newDepletedItem])
    }
  }

  const getRecentlyDepleted = (): DepletedItem[] => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    return depletedItems
      .filter(item => new Date(item.depletedDate) >= thirtyDaysAgo)
      .sort((a, b) => new Date(b.depletedDate).getTime() - new Date(a.depletedDate).getTime())
  }

  const getFrequentlyUsed = (): DepletedItem[] => {
    return depletedItems
      .filter(item => item.isFrequentlyUsed)
      .sort((a, b) => b.timesUsed - a.timesUsed)
  }

  return (
    <PantryContext.Provider value={{
      pantryData,
      depletedItems,
      setPantryData,
      addDepletedItem,
      getRecentlyDepleted,
      getFrequentlyUsed,
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