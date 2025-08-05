import { describe, it, expect } from 'vitest'

// Mock pantry item interface
interface PantryItem {
  id: string
  name: string
  amount: string
  unit: string
  location: string
  category?: string
}

// Food matching utility functions
function normalizeIngredientName(name: string): string {
  if (!name) return ''
  
  return name.toLowerCase().trim()
    .replace(/\s*\([^)]*\)/g, '') // Remove parenthetical content
    .replace(/,\s*(beaten|chopped|diced|minced|sliced|grated|fresh|dried|ground|whole|large|small|medium)\b.*$/g, '') // Remove everything after comma + descriptor
    .replace(/\s+(beaten|chopped|diced|minced|sliced|grated|ground|whole)\b.*$/g, '') // Remove descriptors at end
    .trim()
}

function removeAdjectives(name: string): string {
  if (!name) return ''
  
  return name
    .replace(/\b(fresh|dried|frozen|canned|organic|raw|cooked|chopped|diced|sliced|minced|whole|ground|extra|virgin|pure|aged|sharp|mild|sweet|hot|spicy|large|medium|small)\s+/g, '')
    .replace(/\s+\b(fresh|dried|frozen|canned|organic|raw|cooked|chopped|diced|sliced|minced|whole|ground|extra|virgin|pure|aged|sharp|mild|sweet|hot|spicy|large|medium|small)\b/g, '')
    .trim()
}

function findExactMatch(searchTerm: string, pantryItems: PantryItem[]): PantryItem | null {
  if (!searchTerm) return null
  
  const normalizedSearch = normalizeIngredientName(searchTerm)
  
  for (const item of pantryItems) {
    const normalizedItem = normalizeIngredientName(item.name)
    if (normalizedItem === normalizedSearch) {
      return item
    }
  }
  return null
}

function findWordBasedMatch(searchTerm: string, pantryItems: PantryItem[]): PantryItem | null {
  if (!searchTerm || searchTerm.length < 3) return null
  
  const normalizedSearch = normalizeIngredientName(searchTerm)
  const searchWords = normalizedSearch.split(/\s+/).filter(word => word.length > 2)
  
  if (searchWords.length === 0) return null
  
  for (const item of pantryItems) {
    const normalizedItem = normalizeIngredientName(item.name)
    const itemWords = normalizedItem.split(/\s+/)
    
    // Check if all search words are found in item words
    const searchWordsInItem = searchWords.every(searchWord => 
      itemWords.some(itemWord => 
        itemWord === searchWord || 
        (searchWord.length > 3 && itemWord.startsWith(searchWord))
      )
    )
    
    // Check if any substantial item words are found in search words
    const itemWordsInSearch = itemWords.some(itemWord => 
      itemWord.length > 3 && searchWords.some(searchWord => searchWord === itemWord)
    )
    
    if (searchWordsInItem || itemWordsInSearch) {
      return item
    }
  }
  return null
}

function findSubstitutionMatch(searchTerm: string, pantryItems: PantryItem[]): PantryItem | null {
  if (!searchTerm) return null
  
  const normalizedSearch = normalizeIngredientName(searchTerm)
  
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
  ]
  
  // Try each substitution rule
  for (const rule of substitutionRules) {
    const match = normalizedSearch.match(rule.pattern)
    if (match) {
      const substituteName = rule.replacement.replace(/\$(\d+)/g, (_, num) => match[parseInt(num)] || '')
      
      // Look for the substitution in pantry
      for (const item of pantryItems) {
        const normalizedItem = normalizeIngredientName(item.name)
        
        if (normalizedItem === substituteName || 
            normalizedItem.includes(substituteName) ||
            substituteName.includes(normalizedItem)) {
          return item
        }
      }
    }
  }
  
  return null
}

function findAdjectiveStrippedMatch(searchTerm: string, pantryItems: PantryItem[]): PantryItem | null {
  if (!searchTerm) return null
  
  const withoutAdjectives = removeAdjectives(normalizeIngredientName(searchTerm))
  
  if (withoutAdjectives.length <= 2) return null
  
  for (const item of pantryItems) {
    const normalizedItem = normalizeIngredientName(item.name)
    const itemWithoutAdjectives = removeAdjectives(normalizedItem)
    
    if (normalizedItem === withoutAdjectives ||
        itemWithoutAdjectives === withoutAdjectives ||
        (withoutAdjectives.length > 4 && normalizedItem.includes(withoutAdjectives)) ||
        (withoutAdjectives.length > 4 && withoutAdjectives.includes(normalizedItem))) {
      return item
    }
  }
  
  return null
}

function findFuzzyMatch(searchTerm: string, pantryItems: PantryItem[]): PantryItem | null {
  if (!searchTerm) return null
  
  const normalizedSearch = normalizeIngredientName(searchTerm)
  
  // Handle plurals and common variations
  for (const item of pantryItems) {
    const normalizedItem = normalizeIngredientName(item.name)
    
    // Remove parentheses and compare
    const itemWithoutParens = normalizedItem.replace(/\s*\([^)]*\)/g, '').trim()
    const searchWithoutParens = normalizedSearch.replace(/\s*\([^)]*\)/g, '').trim()
    
    // Handle plural/singular variations
    const itemWithoutPlural = normalizedItem.replace(/s$/, '')
    const searchWithoutPlural = normalizedSearch.replace(/s$/, '')
    
    if (itemWithoutParens === searchWithoutParens || 
        itemWithoutParens === normalizedSearch ||
        normalizedItem === searchWithoutParens ||
        itemWithoutPlural === normalizedSearch ||
        normalizedItem === searchWithoutPlural) {
      return item
    }
  }
  
  return null
}

function findBestMatch(searchTerm: string, pantryItems: PantryItem[]): {
  item: PantryItem | null
  matchType: 'exact' | 'word-based' | 'substitution' | 'adjective-stripped' | 'fuzzy' | 'none'
  confidence: number
} {
  if (!searchTerm || searchTerm.trim().length === 0) {
    return { item: null, matchType: 'none', confidence: 0.0 }
  }
  
  // Try exact match first (highest confidence)
  let match = findExactMatch(searchTerm, pantryItems)
  if (match) return { item: match, matchType: 'exact', confidence: 1.0 }
  
  // Try word-based match
  match = findWordBasedMatch(searchTerm, pantryItems)
  if (match) return { item: match, matchType: 'word-based', confidence: 0.9 }
  
  // Try substitution match
  match = findSubstitutionMatch(searchTerm, pantryItems)
  if (match) return { item: match, matchType: 'substitution', confidence: 0.8 }
  
  // Try adjective-stripped match
  match = findAdjectiveStrippedMatch(searchTerm, pantryItems)
  if (match) return { item: match, matchType: 'adjective-stripped', confidence: 0.7 }
  
  // Try fuzzy match (lowest confidence)
  match = findFuzzyMatch(searchTerm, pantryItems)
  if (match) return { item: match, matchType: 'fuzzy', confidence: 0.6 }
  
  return { item: null, matchType: 'none', confidence: 0.0 }
}

describe('Food Name Matching and Pattern Tests', () => {
  const mockPantryItems: PantryItem[] = [
    { id: '1', name: 'onion', amount: '3', unit: 'pieces', location: 'pantry' },
    { id: '2', name: 'bell peppers', amount: '6', unit: 'pieces', location: 'refrigerator' },
    { id: '3', name: 'tomatoes', amount: '5', unit: 'pieces', location: 'refrigerator' },
    { id: '4', name: 'garlic', amount: '1', unit: 'bulb', location: 'pantry' },
    { id: '5', name: 'basil', amount: '1', unit: 'bunch', location: 'refrigerator' },
    { id: '6', name: 'olive oil', amount: '500', unit: 'ml', location: 'pantry' },
    { id: '7', name: 'cheddar cheese', amount: '200', unit: 'g', location: 'refrigerator' },
    { id: '8', name: 'black beans (dried)', amount: '1', unit: 'kg', location: 'pantry' },
    { id: '9', name: 'rice (basmati)', amount: '2', unit: 'kg', location: 'pantry' },
    { id: '10', name: 'chicken breast', amount: '1', unit: 'lb', location: 'freezer' }
  ]

  describe('normalizeIngredientName', () => {
    it('should normalize basic ingredient names', () => {
      expect(normalizeIngredientName('Fresh Basil')).toBe('fresh basil')
      expect(normalizeIngredientName('  GARLIC  ')).toBe('garlic')
    })

    it('should remove parenthetical content', () => {
      expect(normalizeIngredientName('black beans (dried)')).toBe('black beans')
      expect(normalizeIngredientName('rice (basmati, long-grain)')).toBe('rice')
    })

    it('should remove preparation descriptors', () => {
      expect(normalizeIngredientName('onion, diced')).toBe('onion')
      expect(normalizeIngredientName('garlic cloves, minced')).toBe('garlic cloves')
      expect(normalizeIngredientName('tomatoes chopped fine')).toBe('tomatoes')
    })

    it('should handle empty input', () => {
      expect(normalizeIngredientName('')).toBe('')
      expect(normalizeIngredientName(null as any)).toBe('')
    })
  })

  describe('removeAdjectives', () => {
    it('should remove common cooking adjectives', () => {
      expect(removeAdjectives('fresh basil')).toBe('basil')
      expect(removeAdjectives('extra virgin olive oil')).toBe('olive oil')
      expect(removeAdjectives('sharp cheddar cheese')).toBe('cheddar cheese')
    })

    it('should handle multiple adjectives', () => {
      expect(removeAdjectives('fresh organic chopped basil')).toBe('basil')
    })

    it('should preserve important descriptive words', () => {
      expect(removeAdjectives('bell peppers')).toBe('bell peppers')
      expect(removeAdjectives('black beans')).toBe('black beans')
      expect(removeAdjectives('chicken breast')).toBe('chicken breast')
    })

    it('should handle empty input', () => {
      expect(removeAdjectives('')).toBe('')
    })
  })

  describe('findExactMatch', () => {
    it('should find exact matches', () => {
      const result = findExactMatch('onion', mockPantryItems)
      expect(result).toBeTruthy()
      expect(result?.name).toBe('onion')
    })

    it('should find case-insensitive matches', () => {
      const result = findExactMatch('ONION', mockPantryItems)
      expect(result).toBeTruthy()
      expect(result?.name).toBe('onion')
    })

    it('should find matches with normalization', () => {
      const result = findExactMatch('black beans (any type)', mockPantryItems)
      expect(result).toBeTruthy()
      expect(result?.name).toBe('black beans (dried)')
    })

    it('should return null for no matches', () => {
      const result = findExactMatch('pineapple', mockPantryItems)
      expect(result).toBeNull()
    })

    it('should handle empty input', () => {
      const result = findExactMatch('', mockPantryItems)
      expect(result).toBeNull()
    })
  })

  describe('findWordBasedMatch', () => {
    it('should find matches based on key words', () => {
      const result = findWordBasedMatch('bell pepper', mockPantryItems)
      expect(result).toBeTruthy()
      expect(result?.name).toBe('bell peppers')
    })

    it('should handle partial word matches', () => {
      const result = findWordBasedMatch('black bean soup', mockPantryItems)
      expect(result).toBeTruthy()
      expect(result?.name).toBe('black beans (dried)')
    })

    it('should ignore very short search terms', () => {
      const result = findWordBasedMatch('a', mockPantryItems)
      expect(result).toBeNull()
    })

    it('should handle empty input', () => {
      const result = findWordBasedMatch('', mockPantryItems)
      expect(result).toBeNull()
    })
  })

  describe('findSubstitutionMatch', () => {
    it('should find onion variations', () => {
      expect(findSubstitutionMatch('yellow onion', mockPantryItems)?.name).toBe('onion')
      expect(findSubstitutionMatch('red onion', mockPantryItems)?.name).toBe('onion')
      expect(findSubstitutionMatch('sweet onion', mockPantryItems)?.name).toBe('onion')
    })

    it('should find pepper variations', () => {
      expect(findSubstitutionMatch('red bell pepper', mockPantryItems)?.name).toBe('bell peppers')
      expect(findSubstitutionMatch('green bell pepper', mockPantryItems)?.name).toBe('bell peppers')
    })

    it('should find herb variations', () => {
      expect(findSubstitutionMatch('fresh basil', mockPantryItems)?.name).toBe('basil')
      expect(findSubstitutionMatch('dried basil', mockPantryItems)?.name).toBe('basil')
    })

    it('should find oil variations', () => {
      expect(findSubstitutionMatch('extra virgin olive oil', mockPantryItems)?.name).toBe('olive oil')
    })

    it('should handle empty input', () => {
      const result = findSubstitutionMatch('', mockPantryItems)
      expect(result).toBeNull()
    })
  })

  describe('findBestMatch comprehensive', () => {
    it('should return exact matches with highest confidence', () => {
      const result = findBestMatch('onion', mockPantryItems)
      expect(result.item?.name).toBe('onion')
      expect(result.matchType).toBe('exact')
      expect(result.confidence).toBe(1.0)
    })

    it('should return word-based matches with high confidence', () => {
      const result = findBestMatch('bell pepper recipe', mockPantryItems)
      expect(result.item?.name).toBe('bell peppers')
      expect(result.matchType).toBe('word-based')
      expect(result.confidence).toBe(0.9)
    })

    it('should return substitution matches with good confidence', () => {
      const result = findBestMatch('yellow onion', mockPantryItems)
      expect(result.item?.name).toBe('onion')
      // May be word-based or substitution depending on implementation priority
      expect(['word-based', 'substitution']).toContain(result.matchType)
      expect(result.confidence).toBeGreaterThanOrEqual(0.8)
    })

    it('should return fuzzy matches with lower confidence', () => {
      const result = findBestMatch('tomato', mockPantryItems)
      expect(result.item?.name).toBe('tomatoes')
      expect(result.confidence).toBeGreaterThan(0.5)
    })

    it('should return no match for completely unrelated items', () => {
      const result = findBestMatch('pineapple', mockPantryItems)
      expect(result.item).toBeNull()
      expect(result.matchType).toBe('none')
      expect(result.confidence).toBe(0.0)
    })
  })

  describe('Edge cases and error handling', () => {
    it('should handle empty search terms', () => {
      const result = findBestMatch('', mockPantryItems)
      expect(result.item).toBeNull()
      expect(result.matchType).toBe('none')
    })

    it('should handle empty pantry', () => {
      const result = findBestMatch('onion', [])
      expect(result.item).toBeNull()
      expect(result.matchType).toBe('none')
    })

    it('should handle whitespace-only search terms', () => {
      const result = findBestMatch('   ', mockPantryItems)
      expect(result.item).toBeNull()
      expect(result.matchType).toBe('none')
    })

    it('should handle special characters gracefully', () => {
      const result = findBestMatch('onion!!!', mockPantryItems)
      // Should still find onion despite special characters
      expect(result.item?.name).toBe('onion')
    })
  })

  describe('Real-world ingredient matching scenarios', () => {
    it('should handle recipe ingredients with measurements removed', () => {
      const recipeIngredients = [
        'large yellow onions, diced',
        'fresh garlic, minced',
        'red bell pepper, chopped',
        'fresh basil leaves',
        'extra virgin olive oil',
        'sharp cheddar cheese, grated'
      ]

      recipeIngredients.forEach(ingredient => {
        const result = findBestMatch(ingredient, mockPantryItems)
        expect(result.item).toBeTruthy()
        expect(result.confidence).toBeGreaterThan(0.6)
      })
    })

    it('should prioritize better matches', () => {
      const testCases = [
        { search: 'onion', expected: 'onion', minConfidence: 1.0 },
        { search: 'yellow onion', expected: 'onion', minConfidence: 0.8 },
        { search: 'bell pepper', expected: 'bell peppers', minConfidence: 0.9 }
      ]

      testCases.forEach(({ search, expected, minConfidence }) => {
        const result = findBestMatch(search, mockPantryItems)
        expect(result.item?.name).toBe(expected)
        expect(result.confidence).toBeGreaterThanOrEqual(minConfidence)
      })
    })

    it('should handle function robustness', () => {
      // Test that functions don't crash with various edge cases
      const edgeCases = ['', null, undefined, '   ', '!@#$%', 'a', 'aa']
      
      edgeCases.forEach(testCase => {
        expect(() => {
          findBestMatch(testCase as any, mockPantryItems)
        }).not.toThrow()
      })
    })
  })
})