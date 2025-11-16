/**
 * Recipe Nutrition Service
 * Orchestrates automatic ingredient mapping and recipe nutrition calculation
 */

import { prisma } from '../../../server/lib/db.js'
import { getIngredientParser } from './ingredientParser.js'
import { getIngredientMatcher } from './ingredientMatcher.js'
import { getNutritionCalculator } from './nutritionCalculator.js'
import { getUnitConverter } from './unitConverter.js'
import { getNutritionDb } from './nutritionDb.js'
import type { NutritionData, NutritionCalculationResult } from './types.js'

export class RecipeNutritionService {
  private parser = getIngredientParser()
  private matcher = getIngredientMatcher()
  private calculator = getNutritionCalculator()
  private converter = getUnitConverter()
  private nutritionDb = getNutritionDb()

  /**
   * Auto-map all unmapped ingredients in a recipe
   * Returns count of successfully mapped ingredients
   */
  async autoMapRecipeIngredients(recipeId: string): Promise<number> {
    const unmappedIngredients =
      await this.nutritionDb.getUnmappedIngredients(recipeId)

    let mappedCount = 0

    for (const ingredient of unmappedIngredients) {
      try {
        const success = await this.autoMapIngredient(ingredient.id, ingredient.name)
        if (success) {
          mappedCount++
        }
      } catch (error) {
        console.error(
          `Failed to auto-map ingredient ${ingredient.name}:`,
          error
        )
      }
    }

    return mappedCount
  }

  /**
   * Auto-map a single ingredient
   */
  async autoMapIngredient(ingredientId: string, ingredientName: string): Promise<boolean> {
    // Parse the ingredient
    const parsed = this.parser.parse(ingredientName)

    // Find best match
    const match = await this.matcher.findBestMatch(parsed)

    if (!match) {
      console.log(`No match found for ingredient: ${ingredientName}`)
      return false
    }

    // Only auto-map if confidence is high enough
    if (!this.matcher.isAutoMatchable(match)) {
      console.log(
        `Match confidence too low for auto-mapping: ${ingredientName} (${match.confidence})`
      )
      return false
    }

    // Import the USDA food if not already in database
    const foodId = await this.nutritionDb.importUSDAFood(match.fdcId)

    // Create the mapping
    await this.nutritionDb.mapIngredientToFood(
      ingredientId,
      foodId,
      match.confidence,
      false // isManual = false for auto-mapping
    )

    console.log(
      `Auto-mapped ingredient "${ingredientName}" to "${match.description}" (confidence: ${match.confidence})`
    )

    return true
  }

  /**
   * Calculate and cache nutrition for a recipe
   */
  async calculateRecipeNutrition(
    recipeId: string,
    forceRecalculate: boolean = false
  ): Promise<NutritionCalculationResult> {
    // Check if we can use cached data
    if (!forceRecalculate) {
      const isStale = await this.nutritionDb.isRecipeNutritionStale(recipeId)
      if (!isStale) {
        const cached = await this.nutritionDb.getRecipeNutrition(recipeId)
        if (cached) {
          return {
            nutrition: cached as NutritionData,
            warnings: [],
            unmappedIngredients: [],
            confidence: cached.hasUnmappedIngredients ? 0.5 : 1.0,
            totalIngredients: 0,
            mappedIngredients: 0,
          }
        }
      }
    }

    // Get recipe with ingredients
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      include: {
        ingredients: {
          include: {
            nutritionMapping: {
              include: {
                food: {
                  include: {
                    nutrients: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!recipe) {
      throw new Error(`Recipe not found: ${recipeId}`)
    }

    // Calculate nutrition from mapped ingredients
    const totalNutrition: NutritionData = {}
    const warnings: string[] = []
    const unmappedIngredients: string[] = []

    for (const ingredient of recipe.ingredients) {
      if (!ingredient.nutritionMapping) {
        unmappedIngredients.push(ingredient.name)
        continue
      }

      try {
        // Parse ingredient to get quantity
        const parsed = this.parser.parse(ingredient.name)

        // Use explicit amount/unit if available, otherwise use parsed
        const quantity = ingredient.amount
          ? parseFloat(ingredient.amount)
          : parsed.quantity || 1

        const unit = ingredient.unit || parsed.unit

        // Convert to grams
        const grams = this.converter.toGrams(
          quantity,
          unit,
          parsed.ingredient
        )

        if (grams === null) {
          warnings.push(
            `Could not convert units for ingredient: ${ingredient.name}`
          )
          continue
        }

        // Get nutrient data from database
        const food = ingredient.nutritionMapping.food
        const nutrients = food.nutrients

        // Convert database nutrients to USDA format for calculator
        const usdaFood = {
          fdcId: food.fdcId,
          description: food.description,
          dataType: food.dataType as any,
          foodNutrients: nutrients.map((n) => ({
            nutrient: {
              id: n.nutrientId,
              number: '',
              name: n.nutrientName,
              rank: 0,
              unitName: n.unitName,
            },
            amount: n.amount,
          })),
        }

        // Calculate nutrition for this ingredient
        const ingredientNutrition = this.calculator.calculateFromFoodGrams(
          usdaFood,
          grams
        )

        // Add to total
        this.addNutrition(totalNutrition, ingredientNutrition)
      } catch (error) {
        warnings.push(
          `Error calculating nutrition for ${ingredient.name}: ${error}`
        )
      }
    }

    // Divide by servings
    const servings = recipe.servings || 1
    const perServingNutrition = this.calculator.divideByServings(
      totalNutrition,
      servings
    )

    // Round for display
    const roundedNutrition = this.calculator.roundNutrition(perServingNutrition)

    // Validate and get additional warnings
    const validationWarnings =
      this.calculator.validateNutrition(roundedNutrition)
    warnings.push(...validationWarnings)

    // Save to database
    await this.nutritionDb.saveRecipeNutrition(recipeId, roundedNutrition)

    // Calculate confidence
    const totalIngredients = recipe.ingredients.length
    const mappedIngredients = totalIngredients - unmappedIngredients.length
    const confidence =
      totalIngredients > 0 ? mappedIngredients / totalIngredients : 0

    return {
      nutrition: roundedNutrition,
      warnings,
      unmappedIngredients,
      confidence,
      totalIngredients,
      mappedIngredients,
    }
  }

  /**
   * Get recipe nutrition (from cache or calculate if needed)
   */
  async getRecipeNutrition(
    recipeId: string
  ): Promise<NutritionCalculationResult> {
    // Try to get from cache first
    const cached = await this.nutritionDb.getRecipeNutrition(recipeId)

    if (cached) {
      const stats = await this.nutritionDb.getRecipeMappingStats(recipeId)

      return {
        nutrition: cached as NutritionData,
        warnings: cached.hasUnmappedIngredients
          ? [`${cached.unmappedCount} ingredients are not mapped`]
          : [],
        unmappedIngredients: [],
        confidence: stats.percentMapped / 100,
        totalIngredients: stats.total,
        mappedIngredients: stats.mapped,
      }
    }

    // Calculate if not cached
    return await this.calculateRecipeNutrition(recipeId)
  }

  /**
   * Get recipe nutrition for a specific portion size
   */
  async getRecipeNutritionForPortion(
    recipeId: string,
    portionMultiplier: number
  ): Promise<NutritionData> {
    const result = await this.getRecipeNutrition(recipeId)
    return this.calculator.calculatePortion(
      result.nutrition,
      portionMultiplier
    )
  }

  /**
   * Get recipe nutrition for custom servings
   */
  async getRecipeNutritionForServings(
    recipeId: string,
    customServings: number
  ): Promise<NutritionData> {
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      select: { servings: true },
    })

    if (!recipe) {
      throw new Error(`Recipe not found: ${recipeId}`)
    }

    const originalServings = recipe.servings || 1
    const multiplier = originalServings / customServings

    return await this.getRecipeNutritionForPortion(recipeId, multiplier)
  }

  /**
   * Process a new recipe: auto-map ingredients and calculate nutrition
   */
  async processNewRecipe(recipeId: string): Promise<void> {
    console.log(`Processing nutrition for recipe: ${recipeId}`)

    // Step 1: Auto-map ingredients
    const mappedCount = await this.autoMapRecipeIngredients(recipeId)
    console.log(`Auto-mapped ${mappedCount} ingredients`)

    // Step 2: Calculate nutrition
    const result = await this.calculateRecipeNutrition(recipeId)
    console.log(
      `Calculated nutrition (${result.mappedIngredients}/${result.totalIngredients} ingredients mapped)`
    )

    if (result.warnings.length > 0) {
      console.warn('Nutrition calculation warnings:', result.warnings)
    }
  }

  /**
   * Batch process multiple recipes
   */
  async processMultipleRecipes(
    recipeIds: string[]
  ): Promise<{ processed: number; errors: number }> {
    let processed = 0
    let errors = 0

    for (const recipeId of recipeIds) {
      try {
        await this.processNewRecipe(recipeId)
        processed++
      } catch (error) {
        console.error(`Failed to process recipe ${recipeId}:`, error)
        errors++
      }
    }

    return { processed, errors }
  }

  /**
   * Invalidate and recalculate nutrition for a recipe
   */
  async recalculateRecipeNutrition(recipeId: string): Promise<void> {
    await this.nutritionDb.deleteRecipeNutrition(recipeId)
    await this.calculateRecipeNutrition(recipeId, true)
  }

  /**
   * Helper: Add nutrition values
   */
  private addNutrition(target: NutritionData, source: NutritionData): void {
    for (const [key, value] of Object.entries(source)) {
      if (value !== undefined && value !== null) {
        const currentValue = (target[key as keyof NutritionData] as number) || 0
        ;(target[key as keyof NutritionData] as number) = currentValue + value
      }
    }
  }
}

// Singleton instance
let recipeServiceInstance: RecipeNutritionService | null = null

/**
 * Get the singleton recipe nutrition service instance
 */
export function getRecipeNutritionService(): RecipeNutritionService {
  if (!recipeServiceInstance) {
    recipeServiceInstance = new RecipeNutritionService()
  }
  return recipeServiceInstance
}
