/**
 * USDA FoodData Central Integration Service
 * Fetches nutritional data and manages ingredient master data
 */

import { prisma } from '../lib/db'

// USDA API Configuration
const USDA_API_KEY = process.env.USDA_API_KEY || 'DEMO_KEY'
const USDA_BASE_URL = 'https://api.nal.usda.gov/fdc/v1'

interface USDAFood {
  fdcId: number
  description: string
  foodNutrients: Array<{
    nutrientId: number
    nutrientName: string
    nutrientNumber: string
    value: number
    unitName: string
  }>
  foodCategory?: string
}

interface NutritionData {
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  fiber?: number
}

export class USDAService {
  /**
   * Search USDA database for a food item
   */
  async searchFood(query: string): Promise<USDAFood[]> {
    try {
      const response = await fetch(
        `${USDA_BASE_URL}/foods/search?query=${encodeURIComponent(query)}&api_key=${USDA_API_KEY}&limit=5`
      )
      
      if (!response.ok) {
        console.warn('USDA API error:', response.status)
        return []
      }
      
      const data = await response.json()
      return data.foods || []
    } catch (error) {
      console.error('USDA search error:', error)
      return []
    }
  }

  /**
   * Get detailed nutrition data for a food
   */
  async getFoodDetails(fdcId: string): Promise<USDAFood | null> {
    try {
      const response = await fetch(
        `${USDA_BASE_URL}/food/${fdcId}?api_key=${USDA_API_KEY}`
      )
      
      if (!response.ok) {
        return null
      }
      
      return await response.json()
    } catch (error) {
      console.error('USDA food details error:', error)
      return null
    }
  }

  /**
   * Extract nutrition data from USDA response
   */
  extractNutrition(food: USDAFood): NutritionData {
    const nutrients: NutritionData = {}
    
    // Map of USDA nutrient IDs to our fields
    const nutrientMap: Record<number, keyof NutritionData> = {
      1008: 'calories',  // Energy (kcal)
      1003: 'protein',   // Protein (g)
      1005: 'carbs',     // Carbohydrate (g)
      1004: 'fat',       // Total lipid (g)
      1079: 'fiber',     // Fiber (g)
    }
    
    for (const nutrient of food.foodNutrients) {
      const field = nutrientMap[nutrient.nutrientId]
      if (field) {
        nutrients[field] = nutrient.value
      }
    }
    
    return nutrients
  }

  /**
   * Create or update ingredient with USDA data
   */
  async upsertIngredientFromUSDA(
    name: string,
    fdcId?: string
  ) {
    // First, check if ingredient exists
    const existing = await prisma.ingredient.findUnique({
      where: { name: name.toLowerCase() }
    })
    
    if (existing) {
      return existing
    }
    
    // Search USDA if no fdcId provided
    let usdaData: USDAFood | null = null
    
    if (fdcId) {
      usdaData = await this.getFoodDetails(fdcId)
    } else {
      const searchResults = await this.searchFood(name)
      if (searchResults.length > 0) {
        usdaData = searchResults[0]
        fdcId = usdaData.fdcId.toString()
      }
    }
    
    // Extract nutrition if found
    const nutrition = usdaData ? this.extractNutrition(usdaData) : {}
    
    // Determine category
    const category = this.categorizeIngredient(name, usdaData?.foodCategory)
    
    // Estimate shelf life based on category
    const shelfLife = this.estimateShelfLife(category)
    
    // Create ingredient
    return await prisma.ingredient.create({
      data: {
        name: name.toLowerCase(),
        alternativeNames: [name],
        category,
        calories: nutrition.calories,
        protein: nutrition.protein,
        carbs: nutrition.carbs,
        fat: nutrition.fat,
        fiber: nutrition.fiber,
        usdaFoodId: fdcId,
        ...shelfLife
      }
    })
  }

  /**
   * Categorize ingredient based on name and USDA category
   */
  private categorizeIngredient(name: string, usdaCategory?: string): string {
    const lowerName = name.toLowerCase()
    
    // Check common patterns
    if (/chicken|beef|pork|fish|salmon|turkey|lamb/.test(lowerName)) {
      return 'protein'
    }
    if (/lettuce|tomato|carrot|broccoli|spinach|kale|pepper|onion/.test(lowerName)) {
      return 'vegetable'
    }
    if (/apple|banana|orange|berry|grape|peach|pear/.test(lowerName)) {
      return 'fruit'
    }
    if (/milk|cheese|yogurt|butter|cream/.test(lowerName)) {
      return 'dairy'
    }
    if (/bread|rice|pasta|oat|wheat|flour/.test(lowerName)) {
      return 'grain'
    }
    if (/oil|butter|lard/.test(lowerName)) {
      return 'fat'
    }
    if (/salt|pepper|garlic|basil|oregano|cumin/.test(lowerName)) {
      return 'spice'
    }
    
    // Use USDA category as fallback
    if (usdaCategory) {
      return usdaCategory.toLowerCase()
    }
    
    return 'other'
  }

  /**
   * Estimate shelf life based on category
   */
  private estimateShelfLife(category: string) {
    const shelfLifeMap: Record<string, any> = {
      protein: {
        shelfLifeCounter: 0,    // Don't leave meat on counter
        shelfLifeFridge: 3,     // 3 days in fridge
        shelfLifeFreezer: 180   // 6 months frozen
      },
      vegetable: {
        shelfLifeCounter: 3,
        shelfLifeFridge: 7,
        shelfLifeFreezer: 240
      },
      fruit: {
        shelfLifeCounter: 5,
        shelfLifeFridge: 10,
        shelfLifeFreezer: 240
      },
      dairy: {
        shelfLifeCounter: 0,
        shelfLifeFridge: 14,
        shelfLifeFreezer: 90
      },
      grain: {
        shelfLifeCounter: 365,  // Dry goods last long
        shelfLifeFridge: 365,
        shelfLifeFreezer: 365
      },
      spice: {
        shelfLifeCounter: 730,  // 2 years
        shelfLifeFridge: 730,
        shelfLifeFreezer: 730
      }
    }
    
    return shelfLifeMap[category] || {
      shelfLifeCounter: 7,
      shelfLifeFridge: 14,
      shelfLifeFreezer: 180
    }
  }
}

// Export singleton instance
export const usdaService = new USDAService()