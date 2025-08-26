import { describe, it, expect } from 'vitest'
import {
  parseAmount,
  extractAmount,
  extractUnit,
  cleanIngredientName,
  formatAmount,
  combineAmounts,
  hasAmount,
  COOKING_UNITS
} from './amountParsing'

describe('Amount Parsing Utilities', () => {
  describe('parseAmount', () => {
    describe('Basic number parsing', () => {
      it('should parse simple whole numbers', () => {
        const result = parseAmount('2 cups')
        expect(result.value).toBe(2)
        expect(result.unit).toBe('cups')
        expect(result.original).toBe('2 cups')
      })

      it('should parse decimal numbers', () => {
        const result = parseAmount('2.5 tbsp')
        expect(result.value).toBe(2.5)
        expect(result.unit).toBe('tbsp')
      })

      it('should parse simple fractions', () => {
        const result = parseAmount('1/2 tsp')
        expect(result.value).toBe(0.5)
        expect(result.unit).toBe('tsp')
      })

      it('should parse mixed numbers', () => {
        const result = parseAmount('1 1/2 cups')
        expect(result.value).toBe(1.5)
        expect(result.unit).toBe('cups')
      })
    })

    describe('Range handling', () => {
      it('should handle simple ranges with dash', () => {
        const result = parseAmount('1-2 cups')
        expect(result.value).toBe(1.5) // Average of range
        expect(result.unit).toBe('cups')
      })

      it('should handle ranges with en-dash', () => {
        const result = parseAmount('1–2 tbsp')
        expect(result.value).toBe(1.5)
        expect(result.unit).toBe('tbsp')
      })

      it('should handle fraction ranges', () => {
        const result = parseAmount('1/2-3/4 cup')
        expect(result.value).toBe(0.625) // (0.5 + 0.75) / 2
        expect(result.unit).toBe('cup')
      })
    })

    describe('Edge cases', () => {
      it('should handle empty or null input', () => {
        expect(parseAmount('')).toEqual({
          value: 1,
          unit: undefined,
          original: ''
        })
        
        expect(parseAmount(null)).toEqual({
          value: 1,
          unit: undefined,
          original: ''
        })
      })

      it('should handle just units without numbers', () => {
        const result = parseAmount('cups')
        expect(result.value).toBe(1)
        expect(result.unit).toBe('cups')
      })

      it('should handle numbers without units', () => {
        const result = parseAmount('2')
        expect(result.value).toBe(2)
        expect(result.unit).toBeUndefined()
      })

      it('should handle whitespace properly', () => {
        const result = parseAmount('  2.5  tbsp  ')
        expect(result.value).toBe(2.5)
        expect(result.unit).toBe('tbsp')
      })
    })
  })

  describe('extractAmount', () => {
    it('should extract simple amounts', () => {
      expect(extractAmount('2 cups flour')).toBe('2')
      expect(extractAmount('1/2 tsp salt')).toBe('1/2')
      expect(extractAmount('1 1/2 cups water')).toBe('1 1/2')
    })

    it('should extract decimal amounts', () => {
      expect(extractAmount('2.5 tablespoons olive oil')).toBe('2.5')
    })

    it('should extract ranges', () => {
      expect(extractAmount('1-2 cloves garlic')).toBe('1-2')
      expect(extractAmount('2-3 cups chopped onions')).toBe('2-3')
    })

    it('should return undefined for text without amounts', () => {
      expect(extractAmount('salt to taste')).toBeUndefined()
      expect(extractAmount('fresh basil leaves')).toBeUndefined()
      expect(extractAmount('')).toBeUndefined()
    })

    it('should handle complex fraction formats', () => {
      expect(extractAmount('1/4 - 1/2 cup milk')).toBe('1/4 - 1/2')
    })
  })

  describe('extractUnit', () => {
    it('should extract common cooking units', () => {
      expect(extractUnit('cups')).toBe('cups')
      expect(extractUnit('cup')).toBe('cup')
      expect(extractUnit('tsp')).toBe('tsp')
      expect(extractUnit('tablespoon')).toBe('tablespoon')
      expect(extractUnit('oz')).toBe('oz')
    })

    it('should handle case insensitivity', () => {
      expect(extractUnit('CUPS')).toBe('cups')
      expect(extractUnit('Cup')).toBe('cup')
      expect(extractUnit('TSP')).toBe('tsp')
    })

    it('should extract units from complex text', () => {
      expect(extractUnit('large eggs')).toBeUndefined()
      expect(extractUnit('cups all-purpose flour')).toBe('cup') // returns base unit
      expect(extractUnit('fresh basil leaves')).toBeUndefined()
    })

    it('should handle plural forms', () => {
      expect(extractUnit('teaspoons')).toBe('teaspoons') // returns exact match from COOKING_UNITS
      expect(extractUnit('tablespoons')).toBe('tablespoons')
      expect(extractUnit('ounces')).toBe('ounces')
    })

    it('should return undefined for non-units', () => {
      expect(extractUnit('fresh')).toBeUndefined()
      expect(extractUnit('chopped')).toBeUndefined()
      expect(extractUnit('')).toBeUndefined()
    })
  })

  describe('cleanIngredientName', () => {
    it('should remove amount and unit from ingredient text', () => {
      expect(cleanIngredientName('2 cups all-purpose flour', '2', 'cups'))
        .toBe('all-purpose flour')
      
      expect(cleanIngredientName('1/2 tsp salt', '1/2', 'tsp'))
        .toBe('salt')
      
      expect(cleanIngredientName('1 1/2 cups water', '1 1/2', 'cups'))
        .toBe('water')
    })

    it('should handle missing amount or unit', () => {
      expect(cleanIngredientName('2 cups flour', undefined, 'cups'))
        .toBe('2 flour') // only unit is removed when amount is undefined
      
      expect(cleanIngredientName('2 cups flour', '2', undefined))
        .toBe('cups flour') // only amount is removed when unit is undefined
    })

    it('should remove common qualifiers', () => {
      expect(cleanIngredientName('2 cups of all-purpose flour', '2', 'cups'))
        .toBe('all-purpose flour')
      
      expect(cleanIngredientName('1 tsp fresh basil', '1', 'tsp'))
        .toBe('basil')
      
      expect(cleanIngredientName('2 tbsp chopped parsley', '2', 'tbsp'))
        .toBe('parsley')
    })

    it('should handle edge cases gracefully', () => {
      expect(cleanIngredientName('', '1', 'cup')).toBe('')
      expect(cleanIngredientName('salt', undefined, undefined)).toBe('salt')
    })

    it('should clean up punctuation and whitespace', () => {
      expect(cleanIngredientName('2 cups, all-purpose flour', '2', 'cups'))
        .toBe('all-purpose flour')
      
      expect(cleanIngredientName('1/2 tsp  ,  salt', '1/2', 'tsp'))
        .toBe('salt')
    })
  })

  describe('formatAmount', () => {
    it('should format whole numbers', () => {
      expect(formatAmount(2)).toBe('2')
      expect(formatAmount(10)).toBe('10')
    })

    it('should format common fractions nicely', () => {
      expect(formatAmount(0.5)).toBe('1/2')
      expect(formatAmount(0.25)).toBe('1/4')
      expect(formatAmount(0.75)).toBe('3/4')
      expect(formatAmount(0.333)).toBe('1/3')
    })

    it('should format mixed numbers', () => {
      expect(formatAmount(1.5)).toBe('1 1/2')
      expect(formatAmount(2.25)).toBe('2 1/4')
      expect(formatAmount(3.75)).toBe('3 3/4')
    })

    it('should include units when provided', () => {
      expect(formatAmount(2, 'cups')).toBe('2 cups')
      expect(formatAmount(0.5, 'tsp')).toBe('1/2 tsp')
      expect(formatAmount(1.5, 'tbsp')).toBe('1 1/2 tbsp')
    })

    it('should handle edge cases', () => {
      expect(formatAmount(0)).toBe('0')
      expect(formatAmount(0, 'cups')).toBe('cups')
      expect(formatAmount(NaN)).toBe('0')
    })

    it('should format decimal amounts for non-standard fractions', () => {
      expect(formatAmount(2.7)).toBe('2.7')
      expect(formatAmount(0.1)).toBe('0.1')
    })
  })

  describe('combineAmounts', () => {
    it('should combine amounts with same units', () => {
      const amount1 = { value: 1, unit: 'cup', original: '1 cup' }
      const amount2 = { value: 0.5, unit: 'cup', original: '1/2 cup' }
      
      const result = combineAmounts(amount1, amount2)
      expect(result.value).toBe(1.5)
      expect(result.unit).toBe('cup')
      expect(result.original).toBe('1 1/2 cup')
    })

    it('should handle different units by using first unit', () => {
      const amount1 = { value: 1, unit: 'cup', original: '1 cup' }
      const amount2 = { value: 2, unit: 'tbsp', original: '2 tbsp' }
      
      const result = combineAmounts(amount1, amount2)
      expect(result.value).toBe(3)
      expect(result.unit).toBe('cup')
    })

    it('should handle missing units', () => {
      const amount1 = { value: 1, unit: undefined, original: '1' }
      const amount2 = { value: 2, unit: 'cups', original: '2 cups' }
      
      const result = combineAmounts(amount1, amount2)
      expect(result.value).toBe(3)
      expect(result.unit).toBe('cups')
    })
  })

  describe('hasAmount', () => {
    it('should detect amounts at the beginning of text', () => {
      expect(hasAmount('2 cups flour')).toBe(true)
      expect(hasAmount('1/2 tsp salt')).toBe(true)
      expect(hasAmount('1 1/2 cups water')).toBe(true)
      expect(hasAmount('3.5 oz cheese')).toBe(true)
    })

    it('should return false for text without amounts', () => {
      expect(hasAmount('salt to taste')).toBe(false)
      expect(hasAmount('fresh basil leaves')).toBe(false)
      expect(hasAmount('large onion')).toBe(false)
      expect(hasAmount('')).toBe(false)
    })

    it('should handle whitespace correctly', () => {
      expect(hasAmount('  2 cups flour')).toBe(true)
      expect(hasAmount('  salt')).toBe(false)
    })
  })

  describe('COOKING_UNITS constant', () => {
    it('should include all major cooking units', () => {
      expect(COOKING_UNITS).toContain('cup')
      expect(COOKING_UNITS).toContain('cups')
      expect(COOKING_UNITS).toContain('tsp')
      expect(COOKING_UNITS).toContain('tbsp')
      expect(COOKING_UNITS).toContain('oz')
      expect(COOKING_UNITS).toContain('lb')
      expect(COOKING_UNITS).toContain('g')
      expect(COOKING_UNITS).toContain('ml')
      expect(COOKING_UNITS).toContain('clove')
      expect(COOKING_UNITS).toContain('pinch')
    })

    it('should include both singular and plural forms', () => {
      expect(COOKING_UNITS).toContain('cup')
      expect(COOKING_UNITS).toContain('cups')
      expect(COOKING_UNITS).toContain('teaspoon')
      expect(COOKING_UNITS).toContain('teaspoons')
    })
  })

  describe('Real-world ingredient parsing scenarios', () => {
    it('should parse complex recipe ingredients correctly', () => {
      const testCases = [
        {
          input: '2 cups all-purpose flour',
          expected: { value: 2, unit: 'cup', name: 'all-purpose flour' }
        },
        {
          input: '1/4 cup olive oil',
          expected: { value: 0.25, unit: 'cup', name: 'olive oil' }
        },
        {
          input: '1 1/2 teaspoons vanilla extract',
          expected: { value: 1.5, unit: 'teaspoon', name: 'vanilla extract' }
        },
        {
          input: '2-3 cloves garlic, minced',
          expected: { value: 2.5, unit: 'clove', name: 'garlic, minced' }
        }
      ]

      testCases.forEach(({ input, expected }) => {
        const parsed = parseAmount(input)
        const amount = extractAmount(input)
        const unit = extractUnit(input.replace(amount || '', ''))
        const name = cleanIngredientName(input, amount, unit)

        expect(parsed.value).toBeCloseTo(expected.value, 2)
        expect(parsed.unit || unit).toBe(expected.unit)
        expect(name).toContain(expected.name.split(',')[0].trim())
      })
    })

    it('should handle edge case ingredients', () => {
      const edgeCases = [
        'salt to taste',
        'fresh cracked black pepper',
        '1 large egg',
        '2 medium onions',
        '1 bunch fresh parsley'
      ]

      edgeCases.forEach(ingredient => {
        expect(() => {
          const parsed = parseAmount(ingredient)
          const amount = extractAmount(ingredient)
          const unit = extractUnit(ingredient)
          const name = cleanIngredientName(ingredient, amount, unit)
          
          expect(typeof parsed.value).toBe('number')
          expect(typeof name).toBe('string')
        }).not.toThrow()
      })
    })
  })
})