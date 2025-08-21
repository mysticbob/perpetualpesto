/**
 * Unified amount parsing utilities
 * Consolidates duplicate parsing logic from across the codebase
 */

import { parseFraction } from './fractionParser'

/**
 * Common cooking units
 */
export const COOKING_UNITS = [
  // Volume
  'tsp', 'teaspoon', 'teaspoons',
  'tbsp', 'tablespoon', 'tablespoons',
  'cup', 'cups',
  'oz', 'ounce', 'ounces',
  'fl oz', 'fluid ounce', 'fluid ounces',
  'pt', 'pint', 'pints',
  'qt', 'quart', 'quarts',
  'gal', 'gallon', 'gallons',
  'ml', 'milliliter', 'milliliters',
  'l', 'liter', 'liters',
  
  // Weight
  'g', 'gram', 'grams',
  'kg', 'kilogram', 'kilograms',
  'lb', 'lbs', 'pound', 'pounds',
  'mg', 'milligram', 'milligrams',
  
  // Count
  'clove', 'cloves',
  'piece', 'pieces',
  'slice', 'slices',
  'can', 'cans',
  'jar', 'jars',
  'package', 'packages',
  'bunch', 'bunches',
  'head', 'heads',
  'stalk', 'stalks',
  
  // Other
  'pinch', 'pinches',
  'dash', 'dashes',
  'handful', 'handfuls',
  'to taste'
] as const

export type CookingUnit = typeof COOKING_UNITS[number]

/**
 * Result of parsing an amount string
 */
export interface ParsedAmount {
  value: number
  unit?: string
  original: string
}

/**
 * Parse an amount string into value and unit
 * Handles: "2 cups", "1/2 tsp", "3.5 kg", "2-3 tablespoons", etc.
 * 
 * @param amount - String containing amount and possibly unit
 * @returns Parsed amount with numeric value and optional unit
 */
export function parseAmount(amount?: string | null): ParsedAmount {
  if (!amount || typeof amount !== 'string') {
    return { value: 1, unit: undefined, original: amount || '' }
  }
  
  const trimmed = amount.trim()
  if (!trimmed) {
    return { value: 1, unit: undefined, original: amount }
  }
  
  // Handle ranges (e.g., "1-2 cups") - take the average
  const rangeMatch = trimmed.match(/^([\d\s\/\.]+)\s*[-–]\s*([\d\s\/\.]+)\s*(.*)$/)
  if (rangeMatch) {
    const min = parseFraction(rangeMatch[1])
    const max = parseFraction(rangeMatch[2])
    const unit = rangeMatch[3]?.trim() || undefined
    return { 
      value: (min + max) / 2,
      unit: extractUnit(unit || ''),
      original: amount
    }
  }
  
  // Split amount into numeric part and unit part
  const match = trimmed.match(/^([\d\s\/\.]+)\s*(.*)$/)
  if (match) {
    const numericPart = match[1].trim()
    const unitPart = match[2]?.trim()
    
    const value = parseFraction(numericPart)
    const unit = extractUnit(unitPart || '')
    
    return { value, unit, original: amount }
  }
  
  // No numeric part found, check if it's just a unit or text
  const unit = extractUnit(trimmed)
  if (unit) {
    return { value: 1, unit, original: amount }
  }
  
  // Default fallback
  return { value: 1, unit: undefined, original: amount }
}

/**
 * Extract amount from ingredient text (simpler version for recipe extraction)
 * 
 * @param text - Raw ingredient text
 * @returns Amount string or undefined
 */
export function extractAmount(text: string): string | undefined {
  if (!text) return undefined
  
  // Match numbers, fractions, and ranges at the beginning
  const match = text.match(/^([\d\s\/\-\.]+)/)
  return match ? match[1].trim() : undefined
}

/**
 * Extract unit from text
 * 
 * @param text - Text potentially containing a unit
 * @returns Normalized unit or undefined
 */
export function extractUnit(text: string): string | undefined {
  if (!text) return undefined
  
  const lowered = text.toLowerCase().trim()
  
  // Check for exact match first
  if (COOKING_UNITS.includes(lowered as CookingUnit)) {
    return lowered
  }
  
  // Check for unit at the beginning of the text
  for (const unit of COOKING_UNITS) {
    const regex = new RegExp(`^${unit}s?\\b`, 'i')
    if (regex.test(lowered)) {
      return unit
    }
  }
  
  // Check for unit anywhere in the text (less strict)
  for (const unit of COOKING_UNITS) {
    const regex = new RegExp(`\\b${unit}s?\\b`, 'i')
    if (regex.test(lowered)) {
      return unit
    }
  }
  
  return undefined
}

/**
 * Clean ingredient name by removing amount and unit
 * 
 * @param text - Full ingredient text
 * @param amount - Amount to remove
 * @param unit - Unit to remove
 * @returns Cleaned ingredient name
 */
export function cleanIngredientName(
  text: string,
  amount?: string,
  unit?: string
): string {
  if (!text) return ''
  
  let cleaned = text.trim()
  
  // Remove the amount from the beginning
  if (amount) {
    const amountRegex = new RegExp(
      `^\\s*${amount.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`,
      'i'
    )
    cleaned = cleaned.replace(amountRegex, '')
  }
  
  // Remove the unit
  if (unit) {
    const unitRegex = new RegExp(
      `^\\s*${unit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}s?\\s*`,
      'i'
    )
    cleaned = cleaned.replace(unitRegex, '')
  }
  
  // Clean up any remaining whitespace and punctuation
  cleaned = cleaned.replace(/^[\s,]+|[\s,]+$/g, '')
  
  // Remove common qualifiers at the beginning
  cleaned = cleaned.replace(/^(of|fresh|dried|chopped|minced|diced|sliced)\s+/i, '')
  
  return cleaned || text // Return original if cleaning resulted in empty string
}

/**
 * Format a numeric amount back to a display string
 * 
 * @param value - Numeric value
 * @param unit - Optional unit to append
 * @returns Formatted string
 */
export function formatAmount(value: number, unit?: string): string {
  if (isNaN(value) || value === 0) {
    return unit || '0'
  }
  
  let formatted: string
  
  // Check for common fractions
  const fractionMap: Record<number, string> = {
    0.25: '1/4',
    0.33: '1/3',
    0.333: '1/3',
    0.5: '1/2',
    0.66: '2/3',
    0.667: '2/3',
    0.75: '3/4',
  }
  
  const decimal = value % 1
  const whole = Math.floor(value)
  
  if (decimal === 0) {
    formatted = whole.toString()
  } else if (fractionMap[parseFloat(decimal.toFixed(3))]) {
    const fraction = fractionMap[parseFloat(decimal.toFixed(3))]
    formatted = whole > 0 ? `${whole} ${fraction}` : fraction
  } else if (value < 1) {
    formatted = value.toFixed(2).replace(/\.?0+$/, '')
  } else {
    formatted = value.toFixed(2).replace(/\.?0+$/, '')
  }
  
  return unit ? `${formatted} ${unit}` : formatted
}

/**
 * Combine two amounts with the same unit
 * 
 * @param amount1 - First amount
 * @param amount2 - Second amount
 * @returns Combined amount
 */
export function combineAmounts(
  amount1: ParsedAmount,
  amount2: ParsedAmount
): ParsedAmount {
  // If units don't match, just add values (caller should handle conversion)
  const value = amount1.value + amount2.value
  const unit = amount1.unit || amount2.unit
  const formatted = formatAmount(value, unit)
  
  return {
    value,
    unit,
    original: formatted
  }
}

/**
 * Check if a string contains an amount
 * 
 * @param text - Text to check
 * @returns True if text starts with a number or fraction
 */
export function hasAmount(text: string): boolean {
  if (!text) return false
  return /^[\d\s\/\.]/.test(text.trim())
}