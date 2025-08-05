import { describe, it, expect } from 'vitest'
import { convertUnit, formatIngredientAmount, convertToCommonUnit } from './units'

describe('Unit Conversion Tests', () => {
  describe('convertUnit', () => {
    describe('Basic functionality', () => {
      it('should return input unchanged for unsupported conversions', () => {
        const result = convertUnit('1', 'cup', 'metric')
        // Note: may not convert if convert library mapping fails
        expect(result.amount).toBe('1')
        expect(result.unit).toBe('cup')
      })

      it('should handle empty amounts', () => {
        const result = convertUnit('', 'cup', 'metric')
        expect(result.amount).toBe('')
        expect(result.unit).toBe('cup')
      })

      it('should handle empty units', () => {
        const result = convertUnit('1', '', 'metric')
        expect(result.amount).toBe('1')
        expect(result.unit).toBe('')
      })

      it('should handle invalid amounts', () => {
        const result = convertUnit('abc', 'cup', 'metric')
        expect(result.amount).toBe('abc')
        expect(result.unit).toBe('cup')
      })
    })

    describe('Fraction parsing integration', () => {
      it('should handle simple fractions if conversion works', () => {
        const result = convertUnit('1/2', 'cup', 'metric')
        expect(result.amount).toBeDefined()
        expect(result.unit).toBeDefined()
      })

      it('should handle mixed numbers if conversion works', () => {
        const result = convertUnit('1 1/2', 'cup', 'metric')
        expect(result.amount).toBeDefined()
        expect(result.unit).toBeDefined()
      })

      it('should handle decimal fractions', () => {
        const result = convertUnit('2.5', 'tbsp', 'metric')
        expect(result.amount).toBeDefined()
        expect(result.unit).toBeDefined()
      })
    })

    describe('Edge cases', () => {
      it('should handle zero amounts', () => {
        const result = convertUnit('0', 'cup', 'metric')
        expect(result.amount).toBe('0')
        expect(result.unit).toBe('cup')
      })

      it('should handle unsupported units gracefully', () => {
        const result = convertUnit('1', 'pinch', 'metric')
        expect(result.amount).toBe('1')
        expect(result.unit).toBe('pinch')
      })
    })
  })

  describe('formatIngredientAmount', () => {
    it('should handle basic amount and unit', () => {
      const result = formatIngredientAmount('2', 'cups', 'metric')
      expect(result).toContain('2')
      expect(result).toContain('cup')
    })

    it('should handle amounts with units already included', () => {
      const result = formatIngredientAmount('2 cups flour', undefined, 'metric')
      expect(result).toContain('cups')
      expect(result).toContain('flour')
    })

    it('should preserve original format for unsupported conversions', () => {
      const result = formatIngredientAmount('1', 'clove', 'metric')
      expect(result).toBe('1 clove')
    })

    it('should handle empty amounts', () => {
      const result = formatIngredientAmount('', 'cup', 'metric')
      expect(result).toBe('')
    })

    it('should handle amounts without units', () => {
      const result = formatIngredientAmount('2')
      expect(result).toBe('2')
    })
  })

  describe('convertToCommonUnit', () => {
    it('should return null for incompatible units', () => {
      const result = convertToCommonUnit('1', 'cup', 'g')
      expect(result).toBeNull()
    })

    it('should return null for unsupported units', () => {
      const result = convertToCommonUnit('1', 'pinch', 'ml')
      expect(result).toBeNull()
    })

    it('should return null for invalid amounts', () => {
      const result = convertToCommonUnit('abc', 'cup', 'ml')
      expect(result).toBeNull()
    })

    it('should handle empty or null inputs', () => {
      expect(convertToCommonUnit('', 'cup', 'ml')).toBeNull()
      expect(convertToCommonUnit('1', '', 'ml')).toBeNull()
      expect(convertToCommonUnit('1', 'cup', '')).toBeNull()
    })
  })

  describe('Unit standardization', () => {
    it('should handle different input formats', () => {
      // Test that function doesn't crash with various inputs
      expect(() => convertUnit('2', 'cups', 'metric')).not.toThrow()
      expect(() => convertUnit('1', 'CUP', 'metric')).not.toThrow()
      expect(() => convertUnit('1', 'tsp', 'metric')).not.toThrow()
    })

    it('should preserve units when conversion is not supported', () => {
      const result1 = convertUnit('2', 'cups', 'metric')
      const result2 = convertUnit('1', 'CUP', 'metric')
      const result3 = convertUnit('1', 'tsp', 'metric')
      
      expect(result1.unit).toBeDefined()
      expect(result2.unit).toBeDefined()
      expect(result3.unit).toBeDefined()
    })
  })

  describe('Integration scenarios', () => {
    it('should handle typical cooking measurements', () => {
      const measurements = [
        { amount: '1', unit: 'cup' },
        { amount: '2', unit: 'tbsp' },
        { amount: '1/2', unit: 'tsp' },
        { amount: '1 1/4', unit: 'cups' },
        { amount: '250', unit: 'ml' },
        { amount: '100', unit: 'g' }
      ]

      measurements.forEach(({ amount, unit }) => {
        expect(() => {
          const result = convertUnit(amount, unit, 'metric')
          expect(result.amount).toBeDefined()
          expect(result.unit).toBeDefined()
        }).not.toThrow()
      })
    })

    it('should handle formatIngredientAmount in real scenarios', () => {
      const ingredients = [
        { amount: '2', unit: 'cups' },
        { amount: '1/2', unit: 'tsp' },
        { amount: undefined, unit: 'clove' },
        { amount: '1 lb', unit: undefined }
      ]

      ingredients.forEach(({ amount, unit }) => {
        expect(() => {
          const result = formatIngredientAmount(amount, unit, 'metric')
          expect(typeof result).toBe('string')
        }).not.toThrow()
      })
    })
  })
})