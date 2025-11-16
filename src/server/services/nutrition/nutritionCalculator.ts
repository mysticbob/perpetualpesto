/**
 * Nutrition Calculator
 * Calculates recipe nutrition from ingredients by aggregating USDA nutrient data
 */

import { getUSDAClient } from './usdaClient.js'
import { getIngredientParser } from './ingredientParser.js'
import { getUnitConverter } from './unitConverter.js'
import { NUTRIENT_IDS } from './types.js'
import type {
  NutritionData,
  NutritionCalculationResult,
  ParsedIngredient,
  USDAFood,
} from './types.js'

interface IngredientWithFood {
  parsed: ParsedIngredient
  food: USDAFood
  gramsUsed: number
}

export class NutritionCalculator {
  private usdaClient = getUSDAClient()
  private parser = getIngredientParser()
  private converter = getUnitConverter()

  /**
   * Calculate nutrition for a list of ingredient strings
   */
  async calculateFromIngredients(
    ingredients: string[],
    servings: number = 1
  ): Promise<NutritionCalculationResult> {
    const warnings: string[] = []
    const unmappedIngredients: string[] = []
    const mappedData: IngredientWithFood[] = []

    // Parse all ingredients
    const parsedIngredients = ingredients.map((ing) => this.parser.parse(ing))

    // For each parsed ingredient, we need the USDA food data
    // This would normally come from the database mapping
    // For now, this is a placeholder showing the calculation logic
    for (const parsed of parsedIngredients) {
      // In production, this would query the IngredientNutritionMapping table
      // For now, we'll skip unmapped ingredients
      unmappedIngredients.push(parsed.original)
    }

    // Calculate total nutrition
    const totalNutrition = this.aggregateNutrients(mappedData)

    // Divide by servings for per-serving nutrition
    const perServingNutrition = this.divideByServings(totalNutrition, servings)

    // Calculate confidence based on how many ingredients were mapped
    const confidence =
      ingredients.length > 0
        ? mappedData.length / ingredients.length
        : 0

    return {
      nutrition: perServingNutrition,
      warnings,
      unmappedIngredients,
      confidence,
      totalIngredients: ingredients.length,
      mappedIngredients: mappedData.length,
    }
  }

  /**
   * Calculate nutrition from USDA food data with quantity
   */
  calculateFromFood(
    food: USDAFood,
    quantity: number,
    unit: string | null,
    ingredientName: string
  ): NutritionData {
    // Convert ingredient amount to grams
    const grams = this.converter.toGrams(quantity, unit, ingredientName)
    if (grams === null) {
      throw new Error(
        `Unable to convert ${quantity} ${unit || ''} to grams for ${ingredientName}`
      )
    }

    return this.calculateFromFoodGrams(food, grams)
  }

  /**
   * Calculate nutrition from USDA food data given grams
   */
  calculateFromFoodGrams(food: USDAFood, grams: number): NutritionData {
    const nutrition: NutritionData = {}

    // USDA data is per 100g, so we need to scale
    const scaleFactor = grams / 100

    // Extract all nutrients using the nutrient ID mapping
    const extractNutrient = (nutrientId: number): number | undefined => {
      const amount = this.usdaClient.getNutrientAmount(food, nutrientId)
      return amount !== null ? amount * scaleFactor : undefined
    }

    // Macronutrients
    nutrition.calories = extractNutrient(NUTRIENT_IDS.CALORIES)
    nutrition.protein = extractNutrient(NUTRIENT_IDS.PROTEIN)
    nutrition.totalFat = extractNutrient(NUTRIENT_IDS.TOTAL_FAT)
    nutrition.totalCarbs = extractNutrient(NUTRIENT_IDS.TOTAL_CARBS)

    // Fat breakdown
    nutrition.saturatedFat = extractNutrient(NUTRIENT_IDS.SATURATED_FAT)
    nutrition.transFat = extractNutrient(NUTRIENT_IDS.TRANS_FAT)
    nutrition.polyunsaturatedFat = extractNutrient(
      NUTRIENT_IDS.POLYUNSATURATED_FAT
    )
    nutrition.monounsaturatedFat = extractNutrient(
      NUTRIENT_IDS.MONOUNSATURATED_FAT
    )
    nutrition.cholesterol = extractNutrient(NUTRIENT_IDS.CHOLESTEROL)

    // Carbohydrate breakdown
    nutrition.dietaryFiber = extractNutrient(NUTRIENT_IDS.FIBER)
    nutrition.totalSugars = extractNutrient(NUTRIENT_IDS.SUGARS_TOTAL)
    nutrition.addedSugars = extractNutrient(NUTRIENT_IDS.SUGARS_ADDED)
    nutrition.sugarAlcohol = extractNutrient(NUTRIENT_IDS.SUGAR_ALCOHOL)

    // Minerals
    nutrition.sodium = extractNutrient(NUTRIENT_IDS.SODIUM)
    nutrition.calcium = extractNutrient(NUTRIENT_IDS.CALCIUM)
    nutrition.iron = extractNutrient(NUTRIENT_IDS.IRON)
    nutrition.potassium = extractNutrient(NUTRIENT_IDS.POTASSIUM)
    nutrition.magnesium = extractNutrient(NUTRIENT_IDS.MAGNESIUM)
    nutrition.phosphorus = extractNutrient(NUTRIENT_IDS.PHOSPHORUS)
    nutrition.zinc = extractNutrient(NUTRIENT_IDS.ZINC)
    nutrition.copper = extractNutrient(NUTRIENT_IDS.COPPER)
    nutrition.manganese = extractNutrient(NUTRIENT_IDS.MANGANESE)
    nutrition.selenium = extractNutrient(NUTRIENT_IDS.SELENIUM)
    nutrition.chromium = extractNutrient(NUTRIENT_IDS.CHROMIUM)

    // Vitamins
    nutrition.vitaminA = extractNutrient(NUTRIENT_IDS.VITAMIN_A)
    nutrition.vitaminC = extractNutrient(NUTRIENT_IDS.VITAMIN_C)
    nutrition.vitaminD = extractNutrient(NUTRIENT_IDS.VITAMIN_D)
    nutrition.vitaminE = extractNutrient(NUTRIENT_IDS.VITAMIN_E)
    nutrition.vitaminK = extractNutrient(NUTRIENT_IDS.VITAMIN_K)
    nutrition.thiamin = extractNutrient(NUTRIENT_IDS.THIAMIN)
    nutrition.riboflavin = extractNutrient(NUTRIENT_IDS.RIBOFLAVIN)
    nutrition.niacin = extractNutrient(NUTRIENT_IDS.NIACIN)
    nutrition.vitaminB6 = extractNutrient(NUTRIENT_IDS.VITAMIN_B6)
    nutrition.folate = extractNutrient(NUTRIENT_IDS.FOLATE)
    nutrition.vitaminB12 = extractNutrient(NUTRIENT_IDS.VITAMIN_B12)
    nutrition.biotin = extractNutrient(NUTRIENT_IDS.BIOTIN)
    nutrition.pantothenicAcid = extractNutrient(NUTRIENT_IDS.PANTOTHENIC_ACID)

    return nutrition
  }

  /**
   * Aggregate nutrients from multiple ingredients
   */
  private aggregateNutrients(
    ingredients: IngredientWithFood[]
  ): NutritionData {
    const total: NutritionData = {}

    for (const { food, gramsUsed } of ingredients) {
      const nutrition = this.calculateFromFoodGrams(food, gramsUsed)

      // Add each nutrient to the total
      for (const [key, value] of Object.entries(nutrition)) {
        if (value !== undefined && value !== null) {
          const currentValue = total[key as keyof NutritionData] || 0
          total[key as keyof NutritionData] = currentValue + value
        }
      }
    }

    return total
  }

  /**
   * Divide all nutrients by number of servings
   */
  private divideByServings(
    nutrition: NutritionData,
    servings: number
  ): NutritionData {
    if (servings <= 0) {
      throw new Error('Servings must be greater than 0')
    }

    const perServing: NutritionData = {}

    for (const [key, value] of Object.entries(nutrition)) {
      if (value !== undefined && value !== null) {
        perServing[key as keyof NutritionData] = value / servings
      }
    }

    return perServing
  }

  /**
   * Multiply all nutrients by a portion multiplier
   */
  calculatePortion(
    nutrition: NutritionData,
    portionMultiplier: number
  ): NutritionData {
    if (portionMultiplier < 0) {
      throw new Error('Portion multiplier must be non-negative')
    }

    const portioned: NutritionData = {}

    for (const [key, value] of Object.entries(nutrition)) {
      if (value !== undefined && value !== null) {
        portioned[key as keyof NutritionData] = value * portionMultiplier
      }
    }

    return portioned
  }

  /**
   * Round all nutrition values to reasonable precision
   */
  roundNutrition(nutrition: NutritionData): NutritionData {
    const rounded: NutritionData = {}

    for (const [key, value] of Object.entries(nutrition)) {
      if (value !== undefined && value !== null) {
        // Round to 1 decimal place for most nutrients
        // Round to whole numbers for calories
        if (key === 'calories') {
          rounded[key as keyof NutritionData] = Math.round(value)
        } else {
          rounded[key as keyof NutritionData] =
            Math.round(value * 10) / 10
        }
      }
    }

    return rounded
  }

  /**
   * Validate nutrition data for suspicious values
   */
  validateNutrition(nutrition: NutritionData): string[] {
    const warnings: string[] = []

    // Check for negative values
    for (const [key, value] of Object.entries(nutrition)) {
      if (value !== undefined && value !== null && value < 0) {
        warnings.push(`Negative value detected for ${key}: ${value}`)
      }
    }

    // Check for unreasonably high values
    if (nutrition.calories && nutrition.calories > 10000) {
      warnings.push(
        `Unusually high calorie count: ${nutrition.calories} kcal`
      )
    }

    if (nutrition.protein && nutrition.protein > 500) {
      warnings.push(`Unusually high protein: ${nutrition.protein}g`)
    }

    if (nutrition.sodium && nutrition.sodium > 50000) {
      warnings.push(`Unusually high sodium: ${nutrition.sodium}mg`)
    }

    // Check macronutrient balance
    if (
      nutrition.calories &&
      nutrition.protein &&
      nutrition.totalFat &&
      nutrition.totalCarbs
    ) {
      // Calculate calories from macros (4 cal/g protein, 4 cal/g carbs, 9 cal/g fat)
      const calculatedCalories =
        nutrition.protein * 4 +
        nutrition.totalCarbs * 4 +
        nutrition.totalFat * 9

      const difference = Math.abs(nutrition.calories - calculatedCalories)
      const percentDiff = (difference / nutrition.calories) * 100

      // If difference is more than 20%, flag it
      if (percentDiff > 20) {
        warnings.push(
          `Calorie discrepancy: ${nutrition.calories} kcal reported vs ${Math.round(calculatedCalories)} kcal calculated from macros (${Math.round(percentDiff)}% difference)`
        )
      }
    }

    return warnings
  }

  /**
   * Format nutrition data for display
   */
  formatNutritionLabel(nutrition: NutritionData): Record<string, string> {
    const formatted: Record<string, string> = {}

    if (nutrition.calories !== undefined)
      formatted.Calories = `${Math.round(nutrition.calories)} kcal`
    if (nutrition.totalFat !== undefined)
      formatted['Total Fat'] = `${nutrition.totalFat.toFixed(1)}g`
    if (nutrition.saturatedFat !== undefined)
      formatted['Saturated Fat'] = `${nutrition.saturatedFat.toFixed(1)}g`
    if (nutrition.transFat !== undefined)
      formatted['Trans Fat'] = `${nutrition.transFat.toFixed(1)}g`
    if (nutrition.cholesterol !== undefined)
      formatted.Cholesterol = `${nutrition.cholesterol.toFixed(0)}mg`
    if (nutrition.sodium !== undefined)
      formatted.Sodium = `${nutrition.sodium.toFixed(0)}mg`
    if (nutrition.totalCarbs !== undefined)
      formatted['Total Carbohydrates'] = `${nutrition.totalCarbs.toFixed(1)}g`
    if (nutrition.dietaryFiber !== undefined)
      formatted['Dietary Fiber'] = `${nutrition.dietaryFiber.toFixed(1)}g`
    if (nutrition.totalSugars !== undefined)
      formatted['Total Sugars'] = `${nutrition.totalSugars.toFixed(1)}g`
    if (nutrition.protein !== undefined)
      formatted.Protein = `${nutrition.protein.toFixed(1)}g`

    return formatted
  }
}

// Singleton instance
let calculatorInstance: NutritionCalculator | null = null

/**
 * Get the singleton nutrition calculator instance
 */
export function getNutritionCalculator(): NutritionCalculator {
  if (!calculatorInstance) {
    calculatorInstance = new NutritionCalculator()
  }
  return calculatorInstance
}
