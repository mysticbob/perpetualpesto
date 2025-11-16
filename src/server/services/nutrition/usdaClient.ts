/**
 * USDA FoodData Central API Client
 * Documentation: https://fdc.nal.usda.gov/api-guide.html
 */

import axios, { AxiosInstance } from 'axios'
import type {
  USDAFood,
  USDASearchParams,
  USDASearchResult,
  NUTRIENT_IDS,
} from './types.js'

const USDA_API_BASE_URL = 'https://api.nal.usda.gov/fdc/v1'

export class USDAClient {
  private client: AxiosInstance
  private apiKey: string

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.USDA_API_KEY || ''

    if (!this.apiKey) {
      console.warn(
        '[USDA Client] No API key provided. Some features may be limited. Get a free key at: https://fdc.nal.usda.gov/api-key-signup.html'
      )
    }

    this.client = axios.create({
      baseURL: USDA_API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  /**
   * Search for foods in the USDA database
   */
  async searchFoods(params: USDASearchParams): Promise<USDASearchResult> {
    try {
      const response = await this.client.get('/foods/search', {
        params: {
          api_key: this.apiKey,
          query: params.query,
          dataType: params.dataType?.join(','),
          pageSize: params.pageSize || 25,
          pageNumber: params.pageNumber || 1,
          sortBy: params.sortBy,
          sortOrder: params.sortOrder,
        },
      })

      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `USDA API search error: ${error.response?.data?.message || error.message}`
        )
      }
      throw error
    }
  }

  /**
   * Get detailed food information by FDC ID
   */
  async getFoodDetails(fdcId: number): Promise<USDAFood> {
    try {
      const response = await this.client.get(`/food/${fdcId}`, {
        params: {
          api_key: this.apiKey,
        },
      })

      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `USDA API food details error: ${error.response?.data?.message || error.message}`
        )
      }
      throw error
    }
  }

  /**
   * Get multiple foods by their FDC IDs
   */
  async getFoodsByIds(fdcIds: number[]): Promise<USDAFood[]> {
    try {
      const response = await this.client.post(
        '/foods',
        {
          fdcIds,
        },
        {
          params: {
            api_key: this.apiKey,
          },
        }
      )

      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `USDA API batch foods error: ${error.response?.data?.message || error.message}`
        )
      }
      throw error
    }
  }

  /**
   * Search for a specific ingredient (convenience method)
   * Returns the best matches from Foundation and SR Legacy databases
   */
  async searchIngredient(
    ingredientName: string,
    limit: number = 10
  ): Promise<USDAFood[]> {
    const result = await this.searchFoods({
      query: ingredientName,
      dataType: ['Foundation', 'SR Legacy'], // Prefer high-quality data
      pageSize: limit,
      sortBy: 'dataType.keyword',
      sortOrder: 'asc',
    })

    return result.foods
  }

  /**
   * Get nutrient amount from food by nutrient ID
   */
  getNutrientAmount(food: USDAFood, nutrientId: number): number | null {
    const nutrient = food.foodNutrients.find(
      (fn) => fn.nutrient.id === nutrientId
    )
    return nutrient?.amount ?? null
  }

  /**
   * Extract all common nutrients from a food item
   */
  extractNutrients(food: USDAFood, nutrientIds: typeof NUTRIENT_IDS) {
    const nutrients: Record<string, number | null> = {}

    for (const [key, id] of Object.entries(nutrientIds)) {
      nutrients[key] = this.getNutrientAmount(food, id)
    }

    return nutrients
  }

  /**
   * Test the API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      // Search for a common food to test the API
      await this.searchFoods({
        query: 'apple',
        pageSize: 1,
      })
      return true
    } catch (error) {
      console.error('[USDA Client] Connection test failed:', error)
      return false
    }
  }
}

// Singleton instance
let usdaClientInstance: USDAClient | null = null

/**
 * Get the singleton USDA client instance
 */
export function getUSDAClient(): USDAClient {
  if (!usdaClientInstance) {
    usdaClientInstance = new USDAClient()
  }
  return usdaClientInstance
}

/**
 * Initialize a new USDA client with a specific API key
 */
export function initializeUSDAClient(apiKey: string): USDAClient {
  usdaClientInstance = new USDAClient(apiKey)
  return usdaClientInstance
}
