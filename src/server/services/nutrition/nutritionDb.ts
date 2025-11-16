/**
 * Nutrition Database Service
 * Handles all database operations for nutrition data using Prisma
 */

import { prisma } from '../../../server/lib/db.js'
import { getUSDAClient } from './usdaClient.js'
import { getNutritionCalculator } from './nutritionCalculator.js'
import type { USDAFood, NutritionData } from './types.js'

export class NutritionDatabaseService {
  private usdaClient = getUSDAClient()
  private calculator = getNutritionCalculator()

  // ========================================================================
  // USDA Food Management
  // ========================================================================

  /**
   * Import a USDA food into the local database
   */
  async importUSDAFood(fdcId: number): Promise<string> {
    // Check if already exists
    const existing = await prisma.nutritionFood.findUnique({
      where: { fdcId },
    })

    if (existing) {
      return existing.id
    }

    // Fetch from USDA API
    const food = await this.usdaClient.getFoodDetails(fdcId)

    // Create food record
    const nutritionFood = await prisma.nutritionFood.create({
      data: {
        fdcId: food.fdcId,
        description: food.description,
        foodCategory: food.foodCategory,
        dataType: food.dataType,
        servingSize: food.servingSize,
        servingSizeUnit: food.servingSizeUnit,
        householdServing: food.householdServingFullText,
        brandOwner: food.brandOwner,
        gtinUpc: food.gtinUpc,
      },
    })

    // Create nutrient records
    await prisma.nutritionNutrient.createMany({
      data: food.foodNutrients.map((fn) => ({
        nutritionFoodId: nutritionFood.id,
        nutrientId: fn.nutrient.id,
        nutrientName: fn.nutrient.name,
        amount: fn.amount,
        unitName: fn.nutrient.unitName,
      })),
    })

    return nutritionFood.id
  }

  /**
   * Get a USDA food from local database by FDC ID
   */
  async getUSDAFoodByFdcId(fdcId: number) {
    return await prisma.nutritionFood.findUnique({
      where: { fdcId },
      include: {
        nutrients: true,
      },
    })
  }

  /**
   * Get a USDA food from local database by internal ID
   */
  async getUSDAFoodById(id: string) {
    return await prisma.nutritionFood.findUnique({
      where: { id },
      include: {
        nutrients: true,
      },
    })
  }

  /**
   * Search for USDA foods in local database
   */
  async searchLocalFoods(query: string, limit: number = 25) {
    return await prisma.nutritionFood.findMany({
      where: {
        description: {
          contains: query,
          mode: 'insensitive',
        },
      },
      include: {
        nutrients: true,
      },
      take: limit,
      orderBy: {
        dataType: 'asc', // Prefer Foundation over SR Legacy over Branded
      },
    })
  }

  // ========================================================================
  // Ingredient Mapping Management
  // ========================================================================

  /**
   * Create or update an ingredient-to-food mapping
   */
  async mapIngredientToFood(
    ingredientId: string,
    foodId: string,
    confidence: number = 1.0,
    isManual: boolean = false,
    userId?: string
  ) {
    return await prisma.ingredientNutritionMapping.upsert({
      where: { ingredientId },
      create: {
        ingredientId,
        foodId,
        matchConfidence: confidence,
        isManual,
        verifiedBy: isManual ? userId : undefined,
        verifiedAt: isManual ? new Date() : undefined,
      },
      update: {
        foodId,
        matchConfidence: confidence,
        isManual,
        verifiedBy: isManual ? userId : undefined,
        verifiedAt: isManual ? new Date() : undefined,
      },
    })
  }

  /**
   * Get the food mapping for an ingredient
   */
  async getIngredientMapping(ingredientId: string) {
    return await prisma.ingredientNutritionMapping.findUnique({
      where: { ingredientId },
      include: {
        food: {
          include: {
            nutrients: true,
          },
        },
      },
    })
  }

  /**
   * Remove an ingredient mapping
   */
  async removeIngredientMapping(ingredientId: string) {
    await prisma.ingredientNutritionMapping.delete({
      where: { ingredientId },
    })
  }

  /**
   * Get all unmapped ingredients for a recipe
   */
  async getUnmappedIngredients(recipeId: string) {
    const ingredients = await prisma.ingredient.findMany({
      where: {
        recipeId,
        nutritionMapping: null,
      },
    })

    return ingredients
  }

  /**
   * Get mapping statistics for a recipe
   */
  async getRecipeMappingStats(recipeId: string) {
    const totalIngredients = await prisma.ingredient.count({
      where: { recipeId },
    })

    const mappedIngredients = await prisma.ingredient.count({
      where: {
        recipeId,
        nutritionMapping: {
          isNot: null,
        },
      },
    })

    const manualMappings = await prisma.ingredient.count({
      where: {
        recipeId,
        nutritionMapping: {
          isManual: true,
        },
      },
    })

    return {
      total: totalIngredients,
      mapped: mappedIngredients,
      unmapped: totalIngredients - mappedIngredients,
      manual: manualMappings,
      auto: mappedIngredients - manualMappings,
      percentMapped:
        totalIngredients > 0
          ? Math.round((mappedIngredients / totalIngredients) * 100)
          : 0,
    }
  }

  // ========================================================================
  // Recipe Nutrition Management
  // ========================================================================

  /**
   * Save/update cached recipe nutrition
   */
  async saveRecipeNutrition(recipeId: string, nutrition: NutritionData) {
    const stats = await this.getRecipeMappingStats(recipeId)

    return await prisma.recipeNutrition.upsert({
      where: { recipeId },
      create: {
        recipeId,
        ...nutrition,
        hasUnmappedIngredients: stats.unmapped > 0,
        unmappedCount: stats.unmapped,
      },
      update: {
        ...nutrition,
        hasUnmappedIngredients: stats.unmapped > 0,
        unmappedCount: stats.unmapped,
        lastCalculated: new Date(),
      },
    })
  }

  /**
   * Get cached recipe nutrition
   */
  async getRecipeNutrition(recipeId: string) {
    return await prisma.recipeNutrition.findUnique({
      where: { recipeId },
    })
  }

  /**
   * Delete cached recipe nutrition
   */
  async deleteRecipeNutrition(recipeId: string) {
    await prisma.recipeNutrition.delete({
      where: { recipeId },
    })
  }

  /**
   * Check if recipe nutrition is stale and needs recalculation
   */
  async isRecipeNutritionStale(recipeId: string): Promise<boolean> {
    const nutrition = await prisma.recipeNutrition.findUnique({
      where: { recipeId },
      select: {
        lastCalculated: true,
        unmappedCount: true,
      },
    })

    if (!nutrition) {
      return true // No nutrition data, needs calculation
    }

    // Check if ingredients changed since last calculation
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      select: { updatedAt: true },
    })

    if (recipe && recipe.updatedAt > nutrition.lastCalculated) {
      return true // Recipe updated after nutrition was calculated
    }

    // Check if there are unmapped ingredients
    const currentStats = await this.getRecipeMappingStats(recipeId)
    if (currentStats.unmapped !== nutrition.unmappedCount) {
      return true // Mapping status changed
    }

    return false
  }

  // ========================================================================
  // Custom Nutrition Foods
  // ========================================================================

  /**
   * Create a custom nutrition food
   */
  async createCustomFood(
    userId: string,
    data: {
      name: string
      description?: string
      category?: string
      servingSize: string
      calories?: number
      protein?: number
      totalFat?: number
      saturatedFat?: number
      cholesterol?: number
      sodium?: number
      totalCarbs?: number
      dietaryFiber?: number
      totalSugars?: number
      extendedNutrients?: Record<string, number>
      isPublic?: boolean
    }
  ) {
    return await prisma.customNutritionFood.create({
      data: {
        userId,
        ...data,
      },
    })
  }

  /**
   * Get user's custom foods
   */
  async getUserCustomFoods(userId: string) {
    return await prisma.customNutritionFood.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Get public custom foods
   */
  async getPublicCustomFoods(limit: number = 100) {
    return await prisma.customNutritionFood.findMany({
      where: { isPublic: true },
      take: limit,
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Update a custom food
   */
  async updateCustomFood(
    id: string,
    userId: string,
    data: Partial<{
      name: string
      description: string
      category: string
      servingSize: string
      calories: number
      protein: number
      totalFat: number
      saturatedFat: number
      cholesterol: number
      sodium: number
      totalCarbs: number
      dietaryFiber: number
      totalSugars: number
      extendedNutrients: Record<string, number>
      isPublic: boolean
    }>
  ) {
    return await prisma.customNutritionFood.update({
      where: {
        id,
        userId, // Ensure user owns this food
      },
      data,
    })
  }

  /**
   * Delete a custom food
   */
  async deleteCustomFood(id: string, userId: string) {
    await prisma.customNutritionFood.delete({
      where: {
        id,
        userId, // Ensure user owns this food
      },
    })
  }

  // ========================================================================
  // Batch Operations
  // ========================================================================

  /**
   * Import multiple USDA foods at once
   */
  async importUSDAFoodsBatch(fdcIds: number[]): Promise<string[]> {
    const ids: string[] = []

    for (const fdcId of fdcIds) {
      try {
        const id = await this.importUSDAFood(fdcId)
        ids.push(id)
      } catch (error) {
        console.error(`Failed to import FDC ID ${fdcId}:`, error)
      }
    }

    return ids
  }

  /**
   * Get nutrition for multiple recipes
   */
  async getMultipleRecipeNutrition(recipeIds: string[]) {
    return await prisma.recipeNutrition.findMany({
      where: {
        recipeId: {
          in: recipeIds,
        },
      },
    })
  }

  // ========================================================================
  // Statistics & Analytics
  // ========================================================================

  /**
   * Get database statistics
   */
  async getStats() {
    const [totalFoods, totalNutrients, totalMappings, totalRecipeNutrition] =
      await Promise.all([
        prisma.nutritionFood.count(),
        prisma.nutritionNutrient.count(),
        prisma.ingredientNutritionMapping.count(),
        prisma.recipeNutrition.count(),
      ])

    const manualMappings = await prisma.ingredientNutritionMapping.count({
      where: { isManual: true },
    })

    const staleNutrition = await prisma.recipeNutrition.count({
      where: { hasUnmappedIngredients: true },
    })

    return {
      totalFoods,
      totalNutrients,
      totalMappings,
      manualMappings,
      autoMappings: totalMappings - manualMappings,
      totalRecipeNutrition,
      staleNutrition,
    }
  }
}

// Singleton instance
let dbServiceInstance: NutritionDatabaseService | null = null

/**
 * Get the singleton nutrition database service instance
 */
export function getNutritionDb(): NutritionDatabaseService {
  if (!dbServiceInstance) {
    dbServiceInstance = new NutritionDatabaseService()
  }
  return dbServiceInstance
}
