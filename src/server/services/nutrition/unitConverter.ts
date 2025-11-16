/**
 * Unit Converter
 * Converts between different measurement units and handles volume-to-weight conversions
 */

import {
  VOLUME_TO_ML,
  WEIGHT_TO_GRAMS,
  INGREDIENT_DENSITIES,
} from './types.js'

export class UnitConverter {
  /**
   * Convert any unit to grams (USDA uses grams as base unit)
   * Handles both weight and volume units
   */
  toGrams(
    amount: number,
    unit: string | null,
    ingredientName?: string
  ): number | null {
    if (!unit) {
      // No unit specified, assume grams
      return amount
    }

    const normalizedUnit = unit.toLowerCase().trim()

    // Try direct weight conversion
    const weightConversion = this.convertWeight(amount, normalizedUnit)
    if (weightConversion !== null) {
      return weightConversion
    }

    // Try volume to weight conversion (requires ingredient name for density)
    if (ingredientName) {
      const volumeConversion = this.convertVolumeToWeight(
        amount,
        normalizedUnit,
        ingredientName
      )
      if (volumeConversion !== null) {
        return volumeConversion
      }
    }

    // Try common count-based conversions
    const countConversion = this.convertCountToGrams(
      amount,
      normalizedUnit,
      ingredientName
    )
    if (countConversion !== null) {
      return countConversion
    }

    console.warn(
      `[Unit Converter] Unable to convert "${normalizedUnit}" to grams for ingredient "${ingredientName || 'unknown'}"`
    )
    return null
  }

  /**
   * Convert weight units to grams
   */
  private convertWeight(amount: number, unit: string): number | null {
    const conversion = WEIGHT_TO_GRAMS[unit as keyof typeof WEIGHT_TO_GRAMS]
    return conversion !== undefined ? amount * conversion : null
  }

  /**
   * Convert volume to weight using ingredient density
   */
  private convertVolumeToWeight(
    amount: number,
    unit: string,
    ingredientName: string
  ): number | null {
    // Convert to ml first
    const mlConversion = VOLUME_TO_ML[unit as keyof typeof VOLUME_TO_ML]
    if (mlConversion === undefined) {
      return null
    }

    const volumeInMl = amount * mlConversion

    // Get density for this ingredient
    const density = this.getIngredientDensity(ingredientName)
    if (density === null) {
      return null
    }

    // Convert volume to weight: mass = volume × density
    return volumeInMl * density
  }

  /**
   * Get density for an ingredient (g/ml)
   */
  private getIngredientDensity(ingredientName: string): number | null {
    const normalized = ingredientName.toLowerCase().trim()

    // Try exact match
    if (INGREDIENT_DENSITIES[normalized]) {
      return INGREDIENT_DENSITIES[normalized]
    }

    // Try partial match
    for (const [key, density] of Object.entries(INGREDIENT_DENSITIES)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return density
      }
    }

    // Default to water density for liquids
    if (this.isLiquid(ingredientName)) {
      return 1.0
    }

    return null
  }

  /**
   * Check if an ingredient is likely a liquid
   */
  private isLiquid(ingredientName: string): boolean {
    const liquidKeywords = [
      'juice',
      'broth',
      'stock',
      'sauce',
      'liquid',
      'water',
      'milk',
      'cream',
      'oil',
      'vinegar',
      'wine',
      'beer',
      'alcohol',
      'syrup',
    ]

    const normalized = ingredientName.toLowerCase()
    return liquidKeywords.some((keyword) => normalized.includes(keyword))
  }

  /**
   * Convert count-based units to grams (e.g., "1 medium onion" → ~150g)
   */
  private convertCountToGrams(
    amount: number,
    unit: string,
    ingredientName?: string
  ): number | null {
    // Common count-based conversions
    const countConversions: Record<string, number> = {
      // Garlic
      'clove': ingredientName?.includes('garlic') ? 3 : null,
      'cloves': ingredientName?.includes('garlic') ? 3 : null,

      // Eggs
      'egg': 50,
      'eggs': 50,
      'large egg': 50,
      'medium egg': 44,
      'small egg': 38,

      // General size descriptors (very approximate)
      'small': 50,
      'medium': 150,
      'large': 250,
      'extra large': 350,
    }

    const conversion = countConversions[unit]
    return conversion !== null && conversion !== undefined
      ? amount * conversion
      : null
  }

  /**
   * Convert between any two units
   */
  convert(
    amount: number,
    fromUnit: string,
    toUnit: string,
    ingredientName?: string
  ): number | null {
    // Convert to grams first
    const grams = this.toGrams(amount, fromUnit, ingredientName)
    if (grams === null) {
      return null
    }

    // If target is grams, we're done
    const normalizedToUnit = toUnit.toLowerCase().trim()
    if (
      normalizedToUnit === 'g' ||
      normalizedToUnit === 'gram' ||
      normalizedToUnit === 'grams'
    ) {
      return grams
    }

    // Convert from grams to target unit
    return this.fromGrams(grams, toUnit, ingredientName)
  }

  /**
   * Convert grams to another unit
   */
  private fromGrams(
    grams: number,
    unit: string,
    ingredientName?: string
  ): number | null {
    const normalizedUnit = unit.toLowerCase().trim()

    // Weight conversions
    const weightConversion =
      WEIGHT_TO_GRAMS[normalizedUnit as keyof typeof WEIGHT_TO_GRAMS]
    if (weightConversion !== undefined) {
      return grams / weightConversion
    }

    // Volume conversions (requires density)
    if (ingredientName) {
      const volumeConversion =
        VOLUME_TO_ML[normalizedUnit as keyof typeof VOLUME_TO_ML]
      if (volumeConversion !== undefined) {
        const density = this.getIngredientDensity(ingredientName)
        if (density !== null) {
          const ml = grams / density
          return ml / volumeConversion
        }
      }
    }

    return null
  }

  /**
   * Normalize a unit to its standard form
   */
  normalizeUnit(unit: string): string {
    const normalized = unit.toLowerCase().trim()

    // Weight units
    if (['g', 'gram', 'grams'].includes(normalized)) return 'g'
    if (['kg', 'kilogram', 'kilograms'].includes(normalized)) return 'kg'
    if (['oz', 'ounce', 'ounces'].includes(normalized)) return 'oz'
    if (['lb', 'lbs', 'pound', 'pounds'].includes(normalized)) return 'lb'

    // Volume units
    if (['c', 'cup', 'cups'].includes(normalized)) return 'cup'
    if (['tbsp', 'tbs', 'T', 'tablespoon', 'tablespoons'].includes(normalized))
      return 'tbsp'
    if (['tsp', 't', 'teaspoon', 'teaspoons'].includes(normalized)) return 'tsp'
    if (['ml', 'milliliter', 'milliliters'].includes(normalized)) return 'ml'
    if (['l', 'liter', 'liters'].includes(normalized)) return 'l'

    return normalized
  }

  /**
   * Get a human-readable string for a measurement
   */
  formatMeasurement(amount: number, unit: string | null): string {
    if (!unit) {
      return `${amount}g`
    }

    const normalized = this.normalizeUnit(unit)
    return `${amount} ${normalized}`
  }

  /**
   * Convert cups to grams for a specific ingredient
   */
  cupsToGrams(ingredient: string, cups: number = 1): number | null {
    return this.toGrams(cups, 'cup', ingredient)
  }

  /**
   * Convert tablespoons to grams for a specific ingredient
   */
  tablespoonsToGrams(ingredient: string, tbsp: number = 1): number | null {
    return this.toGrams(tbsp, 'tbsp', ingredient)
  }

  /**
   * Convert teaspoons to grams for a specific ingredient
   */
  teaspoonsToGrams(ingredient: string, tsp: number = 1): number | null {
    return this.toGrams(tsp, 'tsp', ingredient)
  }

  /**
   * Estimate grams when no unit is provided based on ingredient type
   */
  estimateGrams(ingredientName: string, amount: number): number {
    // If amount is very small, assume it's a count (like "2 onions")
    if (amount <= 10) {
      // Rough size estimate
      if (ingredientName.includes('clove') && ingredientName.includes('garlic')) {
        return amount * 3 // ~3g per garlic clove
      } else if (ingredientName.includes('egg')) {
        return amount * 50 // ~50g per egg
      } else {
        return amount * 150 // Assume "medium" size (~150g)
      }
    }

    // Otherwise, assume grams
    return amount
  }
}

// Singleton instance
let converterInstance: UnitConverter | null = null

/**
 * Get the singleton unit converter instance
 */
export function getUnitConverter(): UnitConverter {
  if (!converterInstance) {
    converterInstance = new UnitConverter()
  }
  return converterInstance
}
