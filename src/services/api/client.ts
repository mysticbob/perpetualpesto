/**
 * Typed API client for all backend operations
 * Centralizes fetch logic and provides type-safe methods
 */

import { 
  API_CONFIG, 
  API_ENDPOINTS, 
  buildUrl, 
  getFetchOptions,
  fetchWithRetry,
  parseApiResponse,
  ApiError,
  ApiResponse
} from '../../config/api'
import type { Recipe } from '../../types/recipe'
import type { MealPlan } from '../../types/mealPlan'
import type { GroceryItem } from '../../contexts/GroceryContext'
import type { PantryItem } from '../../contexts/PantryContext'

/**
 * Recipe API methods
 */
export const recipeApi = {
  async list(): Promise<Recipe[]> {
    const response = await fetchWithRetry(
      buildUrl(API_ENDPOINTS.recipes.list),
      getFetchOptions()
    )
    const result = await parseApiResponse<Recipe[]>(response)
    if (!result.success) throw new ApiError(result.error || 'Failed to fetch recipes')
    return result.data || []
  },

  async get(id: string): Promise<Recipe> {
    const response = await fetchWithRetry(
      buildUrl(API_ENDPOINTS.recipes.get(id)),
      getFetchOptions()
    )
    const result = await parseApiResponse<Recipe>(response)
    if (!result.success) throw new ApiError(result.error || 'Failed to fetch recipe')
    return result.data!
  },

  async create(recipe: Omit<Recipe, 'id'>): Promise<Recipe> {
    const response = await fetchWithRetry(
      buildUrl(API_ENDPOINTS.recipes.create),
      getFetchOptions({
        method: 'POST',
        body: JSON.stringify(recipe)
      })
    )
    const result = await parseApiResponse<Recipe>(response)
    if (!result.success) throw new ApiError(result.error || 'Failed to create recipe')
    return result.data!
  },

  async update(id: string, recipe: Partial<Recipe>): Promise<Recipe> {
    const response = await fetchWithRetry(
      buildUrl(API_ENDPOINTS.recipes.update(id)),
      getFetchOptions({
        method: 'PUT',
        body: JSON.stringify(recipe)
      })
    )
    const result = await parseApiResponse<Recipe>(response)
    if (!result.success) throw new ApiError(result.error || 'Failed to update recipe')
    return result.data!
  },

  async delete(id: string): Promise<void> {
    const response = await fetchWithRetry(
      buildUrl(API_ENDPOINTS.recipes.delete(id)),
      getFetchOptions({ method: 'DELETE' })
    )
    const result = await parseApiResponse<void>(response)
    if (!result.success) throw new ApiError(result.error || 'Failed to delete recipe')
  },

  async extract(url: string): Promise<Recipe> {
    const response = await fetchWithRetry(
      buildUrl(API_ENDPOINTS.recipes.extract),
      getFetchOptions({
        method: 'POST',
        body: JSON.stringify({ url })
      })
    )
    const result = await parseApiResponse<Recipe>(response)
    if (!result.success) throw new ApiError(result.error || 'Failed to extract recipe')
    return result.data!
  },

  async search(query: string): Promise<Recipe[]> {
    const params = new URLSearchParams({ q: query })
    const response = await fetchWithRetry(
      buildUrl(`${API_ENDPOINTS.recipes.search}?${params}`),
      getFetchOptions()
    )
    const result = await parseApiResponse<Recipe[]>(response)
    if (!result.success) throw new ApiError(result.error || 'Failed to search recipes')
    return result.data || []
  }
}

/**
 * Meal Plan API methods
 */
export const mealPlanApi = {
  async list(): Promise<MealPlan[]> {
    const response = await fetchWithRetry(
      buildUrl(API_ENDPOINTS.mealPlans.list),
      getFetchOptions()
    )
    const result = await parseApiResponse<MealPlan[]>(response)
    if (!result.success) throw new ApiError(result.error || 'Failed to fetch meal plans')
    return result.data || []
  },

  async get(id: string): Promise<MealPlan> {
    const response = await fetchWithRetry(
      buildUrl(API_ENDPOINTS.mealPlans.get(id)),
      getFetchOptions()
    )
    const result = await parseApiResponse<MealPlan>(response)
    if (!result.success) throw new ApiError(result.error || 'Failed to fetch meal plan')
    return result.data!
  },

  async create(mealPlan: Omit<MealPlan, 'id'>): Promise<MealPlan> {
    const response = await fetchWithRetry(
      buildUrl(API_ENDPOINTS.mealPlans.create),
      getFetchOptions({
        method: 'POST',
        body: JSON.stringify(mealPlan)
      })
    )
    const result = await parseApiResponse<MealPlan>(response)
    if (!result.success) throw new ApiError(result.error || 'Failed to create meal plan')
    return result.data!
  },

  async update(id: string, mealPlan: Partial<MealPlan>): Promise<MealPlan> {
    const response = await fetchWithRetry(
      buildUrl(API_ENDPOINTS.mealPlans.update(id)),
      getFetchOptions({
        method: 'PUT',
        body: JSON.stringify(mealPlan)
      })
    )
    const result = await parseApiResponse<MealPlan>(response)
    if (!result.success) throw new ApiError(result.error || 'Failed to update meal plan')
    return result.data!
  },

  async delete(id: string): Promise<void> {
    const response = await fetchWithRetry(
      buildUrl(API_ENDPOINTS.mealPlans.delete(id)),
      getFetchOptions({ method: 'DELETE' })
    )
    const result = await parseApiResponse<void>(response)
    if (!result.success) throw new ApiError(result.error || 'Failed to delete meal plan')
  },

  async getCurrent(): Promise<MealPlan | null> {
    const response = await fetchWithRetry(
      buildUrl(API_ENDPOINTS.mealPlans.current),
      getFetchOptions()
    )
    const result = await parseApiResponse<MealPlan>(response)
    return result.data || null
  }
}

/**
 * Grocery API methods
 */
export const groceryApi = {
  async list(): Promise<GroceryItem[]> {
    const response = await fetchWithRetry(
      buildUrl(API_ENDPOINTS.groceries.list),
      getFetchOptions()
    )
    const result = await parseApiResponse<GroceryItem[]>(response)
    if (!result.success) throw new ApiError(result.error || 'Failed to fetch groceries')
    return result.data || []
  },

  async update(items: GroceryItem[]): Promise<GroceryItem[]> {
    const response = await fetchWithRetry(
      buildUrl(API_ENDPOINTS.groceries.update),
      getFetchOptions({
        method: 'PUT',
        body: JSON.stringify({ items })
      })
    )
    const result = await parseApiResponse<GroceryItem[]>(response)
    if (!result.success) throw new ApiError(result.error || 'Failed to update groceries')
    return result.data || []
  },

  async clear(): Promise<void> {
    const response = await fetchWithRetry(
      buildUrl(API_ENDPOINTS.groceries.clear),
      getFetchOptions({ method: 'DELETE' })
    )
    const result = await parseApiResponse<void>(response)
    if (!result.success) throw new ApiError(result.error || 'Failed to clear groceries')
  },

  async consolidate(): Promise<GroceryItem[]> {
    const response = await fetchWithRetry(
      buildUrl(API_ENDPOINTS.groceries.consolidate),
      getFetchOptions({ method: 'POST' })
    )
    const result = await parseApiResponse<GroceryItem[]>(response)
    if (!result.success) throw new ApiError(result.error || 'Failed to consolidate groceries')
    return result.data || []
  }
}

/**
 * Pantry API methods
 */
export const pantryApi = {
  async list(): Promise<PantryItem[]> {
    const response = await fetchWithRetry(
      buildUrl(API_ENDPOINTS.pantry.list),
      getFetchOptions()
    )
    const result = await parseApiResponse<PantryItem[]>(response)
    if (!result.success) throw new ApiError(result.error || 'Failed to fetch pantry items')
    return result.data || []
  },

  async add(item: Omit<PantryItem, 'id'>): Promise<PantryItem> {
    const response = await fetchWithRetry(
      buildUrl(API_ENDPOINTS.pantry.add),
      getFetchOptions({
        method: 'POST',
        body: JSON.stringify(item)
      })
    )
    const result = await parseApiResponse<PantryItem>(response)
    if (!result.success) throw new ApiError(result.error || 'Failed to add pantry item')
    return result.data!
  },

  async update(id: string, item: Partial<PantryItem>): Promise<PantryItem> {
    const response = await fetchWithRetry(
      buildUrl(API_ENDPOINTS.pantry.update(id)),
      getFetchOptions({
        method: 'PUT',
        body: JSON.stringify(item)
      })
    )
    const result = await parseApiResponse<PantryItem>(response)
    if (!result.success) throw new ApiError(result.error || 'Failed to update pantry item')
    return result.data!
  },

  async delete(id: string): Promise<void> {
    const response = await fetchWithRetry(
      buildUrl(API_ENDPOINTS.pantry.delete(id)),
      getFetchOptions({ method: 'DELETE' })
    )
    const result = await parseApiResponse<void>(response)
    if (!result.success) throw new ApiError(result.error || 'Failed to delete pantry item')
  },

  async use(items: Array<{ id: string; amount: string }>): Promise<void> {
    const response = await fetchWithRetry(
      buildUrl(API_ENDPOINTS.pantry.use),
      getFetchOptions({
        method: 'POST',
        body: JSON.stringify({ items })
      })
    )
    const result = await parseApiResponse<void>(response)
    if (!result.success) throw new ApiError(result.error || 'Failed to use pantry items')
  },

  async getCategories(): Promise<string[]> {
    const response = await fetchWithRetry(
      buildUrl(API_ENDPOINTS.pantry.categories),
      getFetchOptions()
    )
    const result = await parseApiResponse<string[]>(response)
    if (!result.success) throw new ApiError(result.error || 'Failed to fetch categories')
    return result.data || []
  }
}

/**
 * AI API methods
 */
export const aiApi = {
  async generateRecipe(prompt: string): Promise<Recipe> {
    const response = await fetchWithRetry(
      buildUrl(API_ENDPOINTS.ai.generateRecipe),
      getFetchOptions({
        method: 'POST',
        body: JSON.stringify({ prompt })
      })
    )
    const result = await parseApiResponse<Recipe>(response)
    if (!result.success) throw new ApiError(result.error || 'Failed to generate recipe')
    return result.data!
  },

  async suggestRecipes(preferences: any): Promise<Recipe[]> {
    const response = await fetchWithRetry(
      buildUrl(API_ENDPOINTS.ai.suggestRecipes),
      getFetchOptions({
        method: 'POST',
        body: JSON.stringify(preferences)
      })
    )
    const result = await parseApiResponse<Recipe[]>(response)
    if (!result.success) throw new ApiError(result.error || 'Failed to suggest recipes')
    return result.data || []
  },

  async generateMealPlan(options: {
    days: number
    dietary?: string[]
    cuisine?: string[]
  }): Promise<MealPlan> {
    const response = await fetchWithRetry(
      buildUrl(API_ENDPOINTS.ai.mealPlan),
      getFetchOptions({
        method: 'POST',
        body: JSON.stringify(options)
      })
    )
    const result = await parseApiResponse<MealPlan>(response)
    if (!result.success) throw new ApiError(result.error || 'Failed to generate meal plan')
    return result.data!
  },

  async findSubstitute(ingredient: string, context?: string): Promise<string[]> {
    const response = await fetchWithRetry(
      buildUrl(API_ENDPOINTS.ai.substitute),
      getFetchOptions({
        method: 'POST',
        body: JSON.stringify({ ingredient, context })
      })
    )
    const result = await parseApiResponse<string[]>(response)
    if (!result.success) throw new ApiError(result.error || 'Failed to find substitutes')
    return result.data || []
  }
}

/**
 * Main API client export
 */
export const apiClient = {
  recipes: recipeApi,
  mealPlans: mealPlanApi,
  groceries: groceryApi,
  pantry: pantryApi,
  ai: aiApi
}

export default apiClient