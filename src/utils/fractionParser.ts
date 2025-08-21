/**
 * Unified fraction parsing utility
 * Consolidates duplicate implementations across the codebase
 */

import { Fraction } from 'fraction.js'

/**
 * Parse various fraction formats into decimal numbers
 * Supports: "1/2", "1 1/2", "2.5", "1.5", "3/4", etc.
 * 
 * @param amount - String representation of a number or fraction
 * @returns Decimal representation of the input
 */
export function parseFraction(amount: string | number): number {
  // Handle numeric inputs directly
  if (typeof amount === 'number') {
    return isNaN(amount) ? 0 : amount
  }
  
  // Handle empty or invalid string inputs
  if (!amount || typeof amount !== 'string') {
    return 0
  }
  
  const cleanAmount = amount.trim()
  
  if (!cleanAmount) {
    return 0
  }
  
  try {
    // Use fraction.js for precise fraction handling
    // It handles: "1/2", "1 1/2", "1.5", "3/4", etc.
    const fraction = new Fraction(cleanAmount)
    return fraction.valueOf()
  } catch (error) {
    // Fallback: Try manual parsing for edge cases
    
    // Handle mixed numbers like "1 1/2" that fraction.js might miss
    const mixedMatch = cleanAmount.match(/^(\d+)\s+(\d+)\/(\d+)$/)
    if (mixedMatch) {
      const whole = parseInt(mixedMatch[1], 10)
      const numerator = parseInt(mixedMatch[2], 10)
      const denominator = parseInt(mixedMatch[3], 10)
      if (denominator !== 0) {
        return whole + (numerator / denominator)
      }
    }
    
    // Handle simple fractions like "1/2"
    const fractionMatch = cleanAmount.match(/^(\d+)\/(\d+)$/)
    if (fractionMatch) {
      const numerator = parseInt(fractionMatch[1], 10)
      const denominator = parseInt(fractionMatch[2], 10)
      if (denominator !== 0) {
        return numerator / denominator
      }
    }
    
    // Final fallback to parseFloat
    const numericValue = parseFloat(cleanAmount)
    return isNaN(numericValue) ? 0 : numericValue
  }
}

/**
 * Format a decimal number as a fraction string
 * 
 * @param value - Decimal number to format
 * @param mixed - Whether to use mixed number format (e.g., "1 1/2" vs "3/2")
 * @returns Fraction string representation
 */
export function formatAsFraction(value: number, mixed: boolean = true): string {
  if (isNaN(value) || value === 0) {
    return '0'
  }
  
  try {
    const fraction = new Fraction(value)
    
    if (mixed) {
      return fraction.toFraction(true)
    } else {
      return fraction.toFraction(false)
    }
  } catch (error) {
    // Fallback to decimal representation
    return value.toString()
  }
}

/**
 * Check if a string represents a fraction
 * 
 * @param input - String to check
 * @returns True if the string is a fraction format
 */
export function isFraction(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return false
  }
  
  const cleanInput = input.trim()
  
  // Check for fraction patterns
  const fractionPattern = /^\d+\/\d+$/
  const mixedPattern = /^\d+\s+\d+\/\d+$/
  
  return fractionPattern.test(cleanInput) || mixedPattern.test(cleanInput)
}

/**
 * Parse a range of amounts (e.g., "1-2 cups" -> { min: 1, max: 2 })
 * 
 * @param range - String representation of a range
 * @returns Object with min and max values
 */
export function parseRange(range: string): { min: number; max: number } {
  if (!range || typeof range !== 'string') {
    return { min: 0, max: 0 }
  }
  
  const rangeMatch = range.match(/^([\d\s\/\.]+)\s*[-–]\s*([\d\s\/\.]+)/)
  
  if (rangeMatch) {
    const min = parseFraction(rangeMatch[1])
    const max = parseFraction(rangeMatch[2])
    return { min, max }
  }
  
  // Not a range, return same value for min and max
  const value = parseFraction(range)
  return { min: value, max: value }
}