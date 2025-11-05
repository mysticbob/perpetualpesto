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
    it('should parse simple amounts with units', () => {
      expect(parseAmount('2 cups')).toEqual({
        value: 2,
        unit: 'cups',
        original: '2 cups'
      })

      expect(parseAmount('1 tsp')).toEqual({
        value: 1,
        unit: 'tsp',
        original: '1 tsp'
      })
    })

    it('should parse fractions', () => {
      const result = parseAmount('1/2 cup')
      expect(result.value).toBe(0.5)
      expect(result.unit).toBe('cup')
    })

    it('should parse mixed numbers', () => {
      const result = parseAmount('1 1/2 cups')
      expect(result.value).toBe(1.5)
      expect(result.unit).toBe('cups')
    })

    it('should parse ranges and return average', () => {
      const result = parseAmount('1-2 cups')
      expect(result.value).toBe(1.5) // Average of 1 and 2
      expect(result.unit).toBe('cups')
    })

    it('should handle amounts without units', () => {
      const result = parseAmount('3')
      expect(result.value).toBe(3)
      expect(result.unit).toBeUndefined()
    })

    it('should handle null or empty input', () => {
      expect(parseAmount(null)).toEqual({
        value: 1,
        unit: undefined,
        original: ''
      })

      expect(parseAmount('')).toEqual({
        value: 1,
        unit: undefined,
        original: ''
      })
    })

    it('should handle decimal amounts', () => {
      const result = parseAmount('2.5 kg')
      expect(result.value).toBe(2.5)
      expect(result.unit).toBe('kg')
    })
  })

  describe('extractAmount', () => {
    it('should extract amounts from ingredient text', () => {
      expect(extractAmount('2 cups flour')).toBe('2')
      expect(extractAmount('1/2 tsp salt')).toBe('1/2')
      expect(extractAmount('1 1/2 cups sugar')).toBe('1 1/2')
    })

    it('should extract ranges', () => {
      expect(extractAmount('2-3 cloves garlic')).toBe('2-3')
    })

    it('should return undefined for text without amounts', () => {
      expect(extractAmount('salt to taste')).toBeUndefined()
      expect(extractAmount('flour')).toBeUndefined()
    })

    it('should handle decimal amounts', () => {
      expect(extractAmount('2.5 kg chicken')).toBe('2.5')
    })
  })

  describe('extractUnit', () => {
    it('should extract common volume units', () => {
      expect(extractUnit('cups')).toBe('cups')
      expect(extractUnit('tsp')).toBe('tsp')
      expect(extractUnit('tablespoon')).toBe('tablespoon')
      expect(extractUnit('ml')).toBe('ml')
    })

    it('should extract weight units', () => {
      expect(extractUnit('grams')).toBe('grams')
      expect(extractUnit('kg')).toBe('kg')
      expect(extractUnit('pounds')).toBe('pounds')
      expect(extractUnit('lb')).toBe('lb')
    })

    it('should extract count units', () => {
      expect(extractUnit('cloves')).toBe('cloves')
      expect(extractUnit('pieces')).toBe('pieces')
      expect(extractUnit('cans')).toBe('cans')
    })

    it('should handle case insensitive', () => {
      expect(extractUnit('CUPS')).toBe('cups')
      expect(extractUnit('TbSp')).toBe('tbsp')
    })

    it('should handle plural forms', () => {
      expect(extractUnit('cup')).toBe('cup')
      expect(extractUnit('cups')).toBe('cups')
    })

    it('should return undefined for unknown units', () => {
      expect(extractUnit('foobar')).toBeUndefined()
      expect(extractUnit('')).toBeUndefined()
    })

    it('should extract unit from text with other words', () => {
      const unit = extractUnit('cups of flour')
      expect(unit).toBe('cups')
    })
  })

  describe('cleanIngredientName', () => {
    it('should remove amount and unit', () => {
      expect(cleanIngredientName('2 cups flour', '2', 'cups')).toBe('flour')
      expect(cleanIngredientName('1/2 tsp salt', '1/2', 'tsp')).toBe('salt')
    })

    it('should remove common qualifiers', () => {
      expect(cleanIngredientName('2 cups fresh basil', '2', 'cups')).toBe('basil')
      expect(cleanIngredientName('1 lb chopped chicken', '1', 'lb')).toBe('chicken')
    })

    it('should handle no amount or unit provided', () => {
      expect(cleanIngredientName('flour')).toBe('flour')
      expect(cleanIngredientName('  salt  ')).toBe('salt')
    })

    it('should return original text if cleaning results in empty string', () => {
      const text = '2 cups'
      const result = cleanIngredientName(text, '2', 'cups')
      expect(result).toBeTruthy()
    })

    it('should handle empty input', () => {
      expect(cleanIngredientName('')).toBe('')
    })
  })

  describe('formatAmount', () => {
    it('should format whole numbers', () => {
      expect(formatAmount(2, 'cups')).toBe('2 cups')
      expect(formatAmount(5)).toBe('5')
    })

    it('should format common fractions', () => {
      expect(formatAmount(0.5, 'cup')).toBe('1/2 cup')
      expect(formatAmount(0.25, 'tsp')).toBe('1/4 tsp')
      expect(formatAmount(0.75, 'cups')).toBe('3/4 cups')
    })

    it('should format mixed numbers', () => {
      expect(formatAmount(1.5, 'cups')).toBe('1 1/2 cups')
      expect(formatAmount(2.25, 'kg')).toBe('2 1/4 kg')
    })

    it('should format decimal numbers', () => {
      expect(formatAmount(2.3, 'kg')).toBe('2.3 kg')
    })

    it('should handle zero', () => {
      expect(formatAmount(0, 'cups')).toBe('cups')
      expect(formatAmount(0)).toBe('0')
    })

    it('should handle NaN', () => {
      expect(formatAmount(NaN, 'cups')).toBe('cups')
      expect(formatAmount(NaN)).toBe('0')
    })

    it('should work without unit', () => {
      expect(formatAmount(2.5)).toBe('2.5')
      expect(formatAmount(0.5)).toBe('1/2')
    })
  })

  describe('combineAmounts', () => {
    it('should combine amounts with same unit', () => {
      const result = combineAmounts(
        { value: 1, unit: 'cups', original: '1 cups' },
        { value: 2, unit: 'cups', original: '2 cups' }
      )

      expect(result.value).toBe(3)
      expect(result.unit).toBe('cups')
    })

    it('should combine amounts with different units', () => {
      const result = combineAmounts(
        { value: 1, unit: 'cups', original: '1 cups' },
        { value: 2, unit: 'tbsp', original: '2 tbsp' }
      )

      expect(result.value).toBe(3) // Just adds values, caller should handle conversion
      expect(result.unit).toBe('cups') // Takes first unit
    })

    it('should handle missing units', () => {
      const result = combineAmounts(
        { value: 1, original: '1' },
        { value: 2, unit: 'cups', original: '2 cups' }
      )

      expect(result.value).toBe(3)
      expect(result.unit).toBe('cups')
    })

    it('should combine fractional amounts', () => {
      const result = combineAmounts(
        { value: 0.5, unit: 'cups', original: '1/2 cups' },
        { value: 0.25, unit: 'cups', original: '1/4 cups' }
      )

      expect(result.value).toBe(0.75)
      expect(result.unit).toBe('cups')
    })
  })

  describe('hasAmount', () => {
    it('should detect amounts at start of text', () => {
      expect(hasAmount('2 cups')).toBe(true)
      expect(hasAmount('1/2 tsp')).toBe(true)
      expect(hasAmount('1.5 kg')).toBe(true)
    })

    it('should return false for text without amounts', () => {
      expect(hasAmount('salt')).toBe(false)
      expect(hasAmount('to taste')).toBe(false)
      expect(hasAmount('flour')).toBe(false)
    })

    it('should handle empty string', () => {
      expect(hasAmount('')).toBe(false)
    })

    it('should handle whitespace', () => {
      expect(hasAmount('  2 cups')).toBe(true)
    })
  })

  describe('COOKING_UNITS constant', () => {
    it('should contain common volume units', () => {
      expect(COOKING_UNITS).toContain('cup')
      expect(COOKING_UNITS).toContain('tsp')
      expect(COOKING_UNITS).toContain('tbsp')
      expect(COOKING_UNITS).toContain('ml')
      expect(COOKING_UNITS).toContain('liter')
    })

    it('should contain common weight units', () => {
      expect(COOKING_UNITS).toContain('g')
      expect(COOKING_UNITS).toContain('kg')
      expect(COOKING_UNITS).toContain('lb')
      expect(COOKING_UNITS).toContain('oz')
    })

    it('should contain count units', () => {
      expect(COOKING_UNITS).toContain('clove')
      expect(COOKING_UNITS).toContain('piece')
      expect(COOKING_UNITS).toContain('can')
    })
  })

  describe('Real-world ingredient parsing', () => {
    it('should parse typical recipe ingredients', () => {
      const ingredients = [
        '2 cups all-purpose flour',
        '1/2 teaspoon salt',
        '1 1/2 cups sugar',
        '3 large eggs',
        '2-3 cloves garlic, minced'
      ]

      ingredients.forEach(ing => {
        const amount = extractAmount(ing)
        expect(amount).toBeTruthy()
      })
    })

    it('should handle complete ingredient workflow', () => {
      const ingredientText = '2 1/2 cups all-purpose flour, sifted'

      // Extract amount
      const amount = extractAmount(ingredientText)
      expect(amount).toBe('2 1/2')

      // Parse full amount
      const parsed = parseAmount(amount + ' cups')
      expect(parsed.value).toBe(2.5)
      expect(parsed.unit).toBe('cups')

      // Clean ingredient name
      const name = cleanIngredientName(ingredientText, amount!, 'cups')
      expect(name).toContain('flour')

      // Format back
      const formatted = formatAmount(parsed.value, parsed.unit)
      expect(formatted).toBe('2 1/2 cups')
    })

    it('should handle ingredients without amounts', () => {
      const text = 'salt and pepper to taste'

      const amount = extractAmount(text)
      expect(amount).toBeUndefined()

      expect(hasAmount(text)).toBe(false)
    })
  })
})
