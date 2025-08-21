import convert from 'convert'
import culinaryUnitAbbreviation from 'culinary-unit-abbreviation'
import { parseFraction } from './fractionParser'

export type UnitSystem = "metric" | "imperial"

// Standardize unit names using culinary-unit-abbreviation
function standardizeUnit(unit: string): string {
  if (!unit) return ''
  
  try {
    // Use the culinary unit abbreviation library to standardize
    return culinaryUnitAbbreviation(unit) || unit.toLowerCase().trim()
  } catch (error) {
    return unit.toLowerCase().trim()
  }
}

// Map standardized cooking units to convert library format
function mapToConvertFormat(unit: string): string | null {
  if (!unit) return null
  
  const standardUnit = standardizeUnit(unit)
  
  // Volume conversions for convert library
  const volumeMap: Record<string, string> = {
    'tsp': 'teaspoon',
    'tbsp': 'tablespoon',
    'cup': 'cup',
    'fl oz': 'fluid-ounce',
    'pt': 'pint',
    'qt': 'quart', 
    'gal': 'gallon',
    'ml': 'millilitre',
    'l': 'litre'
  }
  
  // Weight conversions for convert library  
  const weightMap: Record<string, string> = {
    'oz': 'ounce',
    'lb': 'pound',
    'g': 'gram',
    'kg': 'kilogram'
  }
  
  // Check mappings
  if (volumeMap[standardUnit]) return volumeMap[standardUnit]
  if (weightMap[standardUnit]) return weightMap[standardUnit]
  
  return null
}

// Determine preferred unit for metric/imperial system
function getPreferredUnit(measure: string, targetSystem: UnitSystem): string {
  if (measure === 'volume') {
    if (targetSystem === 'metric') {
      return 'millilitre' // Prefer ml for cooking
    } else {
      return 'cup' // Prefer cups for imperial cooking
    }
  }
  
  if (measure === 'mass') {
    if (targetSystem === 'metric') {
      return 'gram' // Prefer grams for cooking
    } else {
      return 'ounce' // Prefer ounces for imperial
    }
  }
  
  return 'gram' // fallback
}

export function convertUnit(
  amount: string,
  unit: string,
  targetSystem: UnitSystem
): { amount: string; unit: string } {
  
  if (!amount || !unit) {
    return { amount: amount || '', unit: unit || '' }
  }

  // Parse the amount (including fractions)
  const numericAmount = parseFraction(amount)
  if (numericAmount === 0 && amount !== '0') {
    return { amount, unit } // Return original if parsing failed
  }

  // Map to convert library format
  const convertUnitFormat = mapToConvertFormat(unit)
  if (!convertUnitFormat) {
    // Unit not supported, return as-is
    return { amount, unit }
  }

  try {
    // Create converter instance
    const converter = convert(numericAmount, convertUnitFormat as any)
    
    // Determine what type of measurement this is
    const measure = (converter as any).measure
    
    // Determine target unit based on system preference
    const preferredUnit = getPreferredUnit(measure, targetSystem)
    
    // Convert to preferred unit
    const converted = (converter as any).to(preferredUnit)
    
    // Format the result nicely
    const formattedAmount = formatNumber(converted as number)
    const displayUnit = getDisplayUnit(preferredUnit)
    
    return { amount: formattedAmount, unit: displayUnit }
    
  } catch (error) {
    console.warn(`Conversion failed for ${amount} ${unit}:`, error)
  }

  // Fallback: return original
  return { amount, unit }
}

// Format numbers nicely for display  
function formatNumber(num: number): string {
  if (num === 0) return '0'
  if (num < 0.01) return num.toFixed(3)
  if (num < 1) return num.toFixed(2)
  if (num < 10) return num.toFixed(1)
  if (num < 100) return Math.round(num * 10) / 10 + '' // One decimal if needed
  return Math.round(num).toString()
}

// Convert library format back to display format
function getDisplayUnit(convertUnit: string): string {
  const displayMap: Record<string, string> = {
    'teaspoon': 'tsp',
    'tablespoon': 'tbsp',
    'cup': 'cup',
    'fluid-ounce': 'fl oz',
    'pint': 'pint',
    'quart': 'qt',
    'gallon': 'gal',
    'millilitre': 'ml',
    'litre': 'l',
    'ounce': 'oz',
    'pound': 'lb',
    'gram': 'g',
    'kilogram': 'kg'
  }
  
  return displayMap[convertUnit] || convertUnit
}

export function formatIngredientAmount(
  amount?: string,
  unit?: string,
  unitSystem: UnitSystem = "metric"
): string {
  if (!amount) return ""

  // Check if amount already contains a unit (e.g., "1/2 teaspoon", "2 cups")
  const amountWithUnitPattern = /^(.+?)\s+(teaspoons?|tsp|tablespoons?|tbsp|cups?|ounces?|oz|pounds?|lbs?|grams?|g|kilograms?|kg|milliliters?|ml|liters?|l|cloves?|cans?|pieces?)$/i
  const match = amount.match(amountWithUnitPattern)

  if (match) {
    // Amount already includes the unit, just format the number part
    const [, amountPart, unitPart] = match
    const converted = convertUnit(amountPart, unitPart, unitSystem)
    return `${converted.amount} ${converted.unit}`.trim()
  }

  // Check if the provided unit is already contained in the amount string
  if (unit && amount.toLowerCase().includes(unit.toLowerCase())) {
    return amount.trim()
  }

  if (!unit) return amount

  const converted = convertUnit(amount, unit, unitSystem)
  return `${converted.amount} ${converted.unit}`.trim()
}

// Helper function for comparing amounts in different units (for availability checking)
export function convertToCommonUnit(amount: string, fromUnit: string, toUnit: string): number | null {
  if (!amount || !fromUnit || !toUnit) return null
  
  const numericAmount = parseFraction(amount)
  if (numericAmount === 0 && amount !== '0') return null
  
  const fromConvertUnit = mapToConvertFormat(fromUnit)
  const toConvertUnit = mapToConvertFormat(toUnit)
  
  if (!fromConvertUnit || !toConvertUnit) return null
  
  try {
    // Convert from source unit to target unit
    const converter = convert(numericAmount, fromConvertUnit as any)
    const converted = (converter as any).to(toConvertUnit)
    return converted as number
  } catch (error) {
    console.warn(`Unit conversion failed: ${amount} ${fromUnit} -> ${toUnit}`, error)
    return null
  }
}