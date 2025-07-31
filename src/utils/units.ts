export type UnitSystem = 'metric' | 'imperial'

interface UnitConversion {
  metric: string
  imperial: string
  ratio?: number // metric to imperial ratio
}

const unitConversions: Record<string, UnitConversion> = {
  // Weight
  'g': { metric: 'g', imperial: 'oz', ratio: 0.035274 },
  'gram': { metric: 'g', imperial: 'oz', ratio: 0.035274 },
  'grams': { metric: 'g', imperial: 'oz', ratio: 0.035274 },
  'kg': { metric: 'kg', imperial: 'lb', ratio: 2.20462 },
  'kilogram': { metric: 'kg', imperial: 'lb', ratio: 2.20462 },
  'kilograms': { metric: 'kg', imperial: 'lb', ratio: 2.20462 },
  'oz': { metric: 'g', imperial: 'oz', ratio: 1/0.035274 },
  'ounce': { metric: 'g', imperial: 'oz', ratio: 1/0.035274 },
  'ounces': { metric: 'g', imperial: 'oz', ratio: 1/0.035274 },
  'lb': { metric: 'kg', imperial: 'lb', ratio: 1/2.20462 },
  'pound': { metric: 'kg', imperial: 'lb', ratio: 1/2.20462 },
  'pounds': { metric: 'kg', imperial: 'lb', ratio: 1/2.20462 },
  
  // Volume
  'ml': { metric: 'ml', imperial: 'fl oz', ratio: 0.033814 },
  'milliliter': { metric: 'ml', imperial: 'fl oz', ratio: 0.033814 },
  'milliliters': { metric: 'ml', imperial: 'fl oz', ratio: 0.033814 },
  'l': { metric: 'l', imperial: 'qt', ratio: 1.05669 },
  'liter': { metric: 'l', imperial: 'qt', ratio: 1.05669 },
  'liters': { metric: 'l', imperial: 'qt', ratio: 1.05669 },
  'cup': { metric: 'ml', imperial: 'cup', ratio: 1/0.004227 },
  'cups': { metric: 'ml', imperial: 'cup', ratio: 1/0.004227 },
  
  // Temperature
  'c': { metric: '°C', imperial: '°F' },
  'celsius': { metric: '°C', imperial: '°F' },
  'f': { metric: '°C', imperial: '°F' },
  'fahrenheit': { metric: '°C', imperial: '°F' },
  
  // Common cooking units (no conversion needed)
  'tbsp': { metric: 'tbsp', imperial: 'tbsp' },
  'tablespoon': { metric: 'tbsp', imperial: 'tbsp' },
  'tablespoons': { metric: 'tbsp', imperial: 'tbsp' },
  'tsp': { metric: 'tsp', imperial: 'tsp' },
  'teaspoon': { metric: 'tsp', imperial: 'tsp' },
  'teaspoons': { metric: 'tsp', imperial: 'tsp' },
  'clove': { metric: 'clove', imperial: 'clove' },
  'cloves': { metric: 'cloves', imperial: 'cloves' },
  'can': { metric: 'can', imperial: 'can' },
  'cans': { metric: 'cans', imperial: 'cans' },
  'piece': { metric: 'piece', imperial: 'piece' },
  'pieces': { metric: 'pieces', imperial: 'pieces' }
}

export function convertUnit(amount: string, unit: string, targetSystem: UnitSystem): { amount: string, unit: string } {
  if (!amount || !unit) {
    return { amount, unit }
  }

  const normalizedUnit = unit.toLowerCase().trim()
  const conversion = unitConversions[normalizedUnit]
  
  if (!conversion) {
    // If we don't know how to convert this unit, return as-is
    return { amount, unit }
  }

  // If already in target system, return as-is
  const currentUnit = targetSystem === 'metric' ? conversion.metric : conversion.imperial
  if (normalizedUnit === currentUnit.toLowerCase()) {
    return { amount, unit: currentUnit }
  }

  // Handle temperature conversion separately
  if (normalizedUnit === 'c' || normalizedUnit === 'celsius' || normalizedUnit === 'f' || normalizedUnit === 'fahrenheit') {
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount)) return { amount, unit }
    
    if (targetSystem === 'imperial' && (normalizedUnit === 'c' || normalizedUnit === 'celsius')) {
      const fahrenheit = (numAmount * 9/5) + 32
      return { amount: Math.round(fahrenheit).toString(), unit: '°F' }
    } else if (targetSystem === 'metric' && (normalizedUnit === 'f' || normalizedUnit === 'fahrenheit')) {
      const celsius = (numAmount - 32) * 5/9
      return { amount: Math.round(celsius).toString(), unit: '°C' }
    }
  }

  // Handle weight/volume conversions
  if (conversion.ratio) {
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount)) return { amount, unit }
    
    let convertedAmount: number
    const targetUnit = targetSystem === 'metric' ? conversion.metric : conversion.imperial
    
    // Determine if we're converting to or from metric
    const isCurrentlyMetric = normalizedUnit === conversion.metric.toLowerCase()
    
    if (targetSystem === 'imperial' && isCurrentlyMetric) {
      convertedAmount = numAmount * conversion.ratio
    } else if (targetSystem === 'metric' && !isCurrentlyMetric) {
      convertedAmount = numAmount / conversion.ratio
    } else {
      return { amount, unit: targetUnit }
    }
    
    // Format the converted amount nicely
    let formattedAmount: string
    if (convertedAmount < 1) {
      formattedAmount = convertedAmount.toFixed(2)
    } else if (convertedAmount < 10) {
      formattedAmount = convertedAmount.toFixed(1)
    } else {
      formattedAmount = Math.round(convertedAmount).toString()
    }
    
    return { amount: formattedAmount, unit: targetUnit }
  }

  // For units without conversion ratios, just return the appropriate unit name
  const targetUnit = targetSystem === 'metric' ? conversion.metric : conversion.imperial
  return { amount, unit: targetUnit }
}

export function formatIngredientAmount(amount?: string, unit?: string, unitSystem: UnitSystem = 'metric'): string {
  if (!amount) return ''
  
  if (!unit) return amount
  
  const converted = convertUnit(amount, unit, unitSystem)
  console.log(`Converting: ${amount} ${unit} (${unitSystem}) -> ${converted.amount} ${converted.unit}`)
  return `${converted.amount} ${converted.unit}`.trim()
}