/**
 * Ingredient Parser
 * Parses natural language ingredient strings into structured data
 */

import type { ParsedIngredient } from './types.js'

// Common preparation methods that should be stripped when matching
const PREPARATION_METHODS = [
  // Cutting methods
  'chopped',
  'diced',
  'sliced',
  'minced',
  'julienned',
  'cubed',
  'quartered',
  'halved',
  'crushed',
  'grated',
  'shredded',
  'ground',
  'mashed',
  'pureed',
  'whole',

  // Cooking methods
  'cooked',
  'raw',
  'roasted',
  'grilled',
  'sautéed',
  'steamed',
  'boiled',
  'fried',
  'baked',
  'toasted',
  'blanched',
  'simmered',

  // Processing methods
  'peeled',
  'unpeeled',
  'seeded',
  'deseeded',
  'skinned',
  'deboned',
  'cored',
  'trimmed',
  'rinsed',
  'drained',
  'thawed',
  'frozen',
  'fresh',
  'dried',
  'canned',

  // Size descriptors
  'large',
  'medium',
  'small',
  'extra large',
  'jumbo',
  'baby',
  'finely',
  'coarsely',
  'roughly',
  'thinly',
  'thickly',
]

// Common descriptors that should be noted but stripped for matching
const DESCRIPTORS = [
  'fresh',
  'dried',
  'frozen',
  'canned',
  'organic',
  'raw',
  'cooked',
  'ripe',
  'unripe',
  'green',
  'red',
  'yellow',
  'white',
  'black',
  'brown',
  'extra virgin',
  'virgin',
  'light',
  'dark',
  'sweet',
  'sour',
  'hot',
  'mild',
  'spicy',
  'unsalted',
  'salted',
  'sweetened',
  'unsweetened',
  'low-fat',
  'non-fat',
  'whole',
  'skim',
  '2%',
  '1%',
]

// Common units of measurement
const UNITS = [
  'cup',
  'cups',
  'c',
  'tablespoon',
  'tablespoons',
  'tbsp',
  'tbs',
  'T',
  'teaspoon',
  'teaspoons',
  'tsp',
  't',
  'ounce',
  'ounces',
  'oz',
  'pound',
  'pounds',
  'lb',
  'lbs',
  'gram',
  'grams',
  'g',
  'kilogram',
  'kilograms',
  'kg',
  'liter',
  'liters',
  'l',
  'milliliter',
  'milliliters',
  'ml',
  'pint',
  'pints',
  'pt',
  'quart',
  'quarts',
  'qt',
  'gallon',
  'gallons',
  'gal',
  'fluid ounce',
  'fluid ounces',
  'fl oz',
  'pinch',
  'dash',
  'clove',
  'cloves',
  'piece',
  'pieces',
  'slice',
  'slices',
  'can',
  'cans',
  'package',
  'packages',
  'pkg',
  'bunch',
  'head',
  'stalk',
  'stalks',
  'sprig',
  'sprigs',
]

// Fraction patterns
const FRACTION_MAP: Record<string, number> = {
  '¼': 0.25,
  '½': 0.5,
  '¾': 0.75,
  '⅓': 0.333,
  '⅔': 0.667,
  '⅛': 0.125,
  '⅜': 0.375,
  '⅝': 0.625,
  '⅞': 0.875,
  '⅕': 0.2,
  '⅖': 0.4,
  '⅗': 0.6,
  '⅘': 0.8,
  '⅙': 0.167,
  '⅚': 0.833,
  '1/4': 0.25,
  '1/2': 0.5,
  '3/4': 0.75,
  '1/3': 0.333,
  '2/3': 0.667,
  '1/8': 0.125,
  '3/8': 0.375,
  '5/8': 0.625,
  '7/8': 0.875,
  '1/5': 0.2,
  '2/5': 0.4,
  '3/5': 0.6,
  '4/5': 0.8,
  '1/6': 0.167,
  '5/6': 0.833,
}

export class IngredientParser {
  /**
   * Parse an ingredient string into structured components
   */
  parse(ingredientText: string): ParsedIngredient {
    const original = ingredientText.trim()
    let text = original.toLowerCase()
    let confidence = 1.0

    // Extract quantity
    const { quantity, remaining: afterQuantity } = this.extractQuantity(text)
    text = afterQuantity

    // Extract unit
    const { unit, remaining: afterUnit } = this.extractUnit(text)
    text = afterUnit

    // Extract preparation methods
    const preparations = this.extractPreparations(text)
    preparations.forEach((prep) => {
      text = text.replace(new RegExp(`\\b${prep}\\b`, 'gi'), ' ')
    })

    // Extract descriptors
    const descriptors = this.extractDescriptors(text)
    descriptors.forEach((desc) => {
      text = text.replace(new RegExp(`\\b${desc}\\b`, 'gi'), ' ')
    })

    // Clean up the remaining text to get the base ingredient
    const ingredient = text
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      .replace(/^[,\s]+|[,\s]+$/g, '') // Trim commas and spaces
      .replace(/\([^)]*\)/g, '') // Remove parenthetical notes
      .trim()

    // Adjust confidence based on parsing success
    if (!ingredient) {
      confidence = 0.1
    } else if (quantity === null) {
      confidence = 0.7
    } else if (!unit) {
      confidence = 0.8
    }

    return {
      quantity,
      unit,
      preparation: preparations,
      descriptor: descriptors,
      ingredient: ingredient || original,
      original,
      confidence,
    }
  }

  /**
   * Extract quantity from ingredient text
   */
  private extractQuantity(text: string): {
    quantity: number | null
    remaining: string
  } {
    // Try to match various quantity patterns
    const patterns = [
      // "2 1/2" or "2½"
      /^(\d+)\s*([¼½¾⅓⅔⅛⅜⅝⅞⅕⅖⅗⅘⅙⅚]|1\/\d+|\d+\/\d+)/,
      // "1/2" or "½"
      /^([¼½¾⅓⅔⅛⅜⅝⅞⅕⅖⅗⅘⅙⅚]|\d+\/\d+)/,
      // "2.5" or "2"
      /^(\d+\.?\d*)/,
      // Range: "2-3" (take the lower number)
      /^(\d+)\s*-\s*\d+/,
    ]

    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match) {
        let quantity = 0

        if (match[0].includes('-')) {
          // Range: take the lower number
          quantity = parseFloat(match[1])
        } else if (match[2]) {
          // Mixed fraction: "2 1/2"
          const whole = parseFloat(match[1])
          const fraction = FRACTION_MAP[match[2]] || this.parseFraction(match[2])
          quantity = whole + (fraction || 0)
        } else if (FRACTION_MAP[match[1]]) {
          // Just a fraction: "1/2"
          quantity = FRACTION_MAP[match[1]]
        } else if (match[1].includes('/')) {
          // Fraction not in map: "3/16"
          quantity = this.parseFraction(match[1]) || 0
        } else {
          // Simple number: "2" or "2.5"
          quantity = parseFloat(match[1])
        }

        const remaining = text.substring(match[0].length).trim()
        return { quantity, remaining }
      }
    }

    return { quantity: null, remaining: text }
  }

  /**
   * Parse a fraction string like "3/4" into a decimal
   */
  private parseFraction(fraction: string): number | null {
    const parts = fraction.split('/')
    if (parts.length === 2) {
      const numerator = parseFloat(parts[0])
      const denominator = parseFloat(parts[1])
      if (denominator !== 0) {
        return numerator / denominator
      }
    }
    return null
  }

  /**
   * Extract unit from ingredient text
   */
  private extractUnit(text: string): { unit: string | null; remaining: string } {
    for (const unit of UNITS) {
      // Match unit as whole word
      const pattern = new RegExp(`^(${unit})\\b`, 'i')
      const match = text.match(pattern)
      if (match) {
        const remaining = text.substring(match[0].length).trim()
        return { unit: match[1].toLowerCase(), remaining }
      }
    }

    return { unit: null, remaining: text }
  }

  /**
   * Extract preparation methods from ingredient text
   */
  private extractPreparations(text: string): string[] {
    const found: string[] = []

    for (const prep of PREPARATION_METHODS) {
      const pattern = new RegExp(`\\b${prep}\\b`, 'i')
      if (pattern.test(text)) {
        found.push(prep)
      }
    }

    return found
  }

  /**
   * Extract descriptors from ingredient text
   */
  private extractDescriptors(text: string): string[] {
    const found: string[] = []

    for (const desc of DESCRIPTORS) {
      const pattern = new RegExp(`\\b${desc}\\b`, 'i')
      if (pattern.test(text)) {
        found.push(desc)
      }
    }

    return found
  }

  /**
   * Normalize ingredient name for matching
   * Removes preparations, descriptors, and normalizes plurals
   */
  normalizeIngredientName(ingredientName: string): string {
    let normalized = ingredientName.toLowerCase().trim()

    // Remove preparations
    for (const prep of PREPARATION_METHODS) {
      normalized = normalized.replace(new RegExp(`\\b${prep}\\b`, 'gi'), '')
    }

    // Remove descriptors
    for (const desc of DESCRIPTORS) {
      normalized = normalized.replace(new RegExp(`\\b${desc}\\b`, 'gi'), '')
    }

    // Clean up
    normalized = normalized
      .replace(/\s+/g, ' ')
      .replace(/^[,\s]+|[,\s]+$/g, '')
      .trim()

    // Normalize plurals (simple heuristic)
    if (normalized.endsWith('ies')) {
      normalized = normalized.slice(0, -3) + 'y'
    } else if (normalized.endsWith('es')) {
      // Check if it's likely a plural (tomatoes -> tomato)
      const singular = normalized.slice(0, -2)
      if (!singular.endsWith('ss')) {
        normalized = singular
      }
    } else if (normalized.endsWith('s') && !normalized.endsWith('ss')) {
      normalized = normalized.slice(0, -1)
    }

    return normalized
  }

  /**
   * Batch parse multiple ingredients
   */
  parseMany(ingredients: string[]): ParsedIngredient[] {
    return ingredients.map((ing) => this.parse(ing))
  }
}

// Singleton instance
let parserInstance: IngredientParser | null = null

/**
 * Get the singleton ingredient parser instance
 */
export function getIngredientParser(): IngredientParser {
  if (!parserInstance) {
    parserInstance = new IngredientParser()
  }
  return parserInstance
}
