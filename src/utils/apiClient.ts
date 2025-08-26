/**
 * Centralized API client utility
 * Replaces all hardcoded localhost URLs with configured endpoints
 */

import { API_CONFIG, buildUrl, getFetchOptions, parseApiResponse, ApiResponse } from '../config/api'

export class ApiClient {
  private baseUrl: string

  constructor() {
    this.baseUrl = API_CONFIG.baseUrl
  }

  /**
   * Generic fetch wrapper with error handling
   */
  async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = buildUrl(endpoint)
    const fetchOptions = getFetchOptions(options)
    
    try {
      const response = await fetch(url, fetchOptions)
      const result = await parseApiResponse<T>(response)
      
      if (!result.success) {
        throw new Error(result.error || 'Request failed')
      }
      
      return result.data as T
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error)
      throw error
    }
  }

  // Recipe methods
  async extractRecipe(url: string) {
    return this.request('/api/extract', {
      method: 'POST',
      body: JSON.stringify({ url })
    })
  }

  async getRecipes() {
    return this.request('/api/recipes')
  }

  async getRecipe(id: string) {
    return this.request(`/api/recipes/${id}`)
  }

  async createRecipe(recipe: any) {
    return this.request('/api/recipes', {
      method: 'POST',
      body: JSON.stringify(recipe)
    })
  }

  async updateRecipe(id: string, updates: any) {
    return this.request(`/api/recipes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    })
  }

  async deleteRecipe(id: string) {
    return this.request(`/api/recipes/${id}`, {
      method: 'DELETE'
    })
  }

  // Grocery methods
  async getGroceryList(userId?: string) {
    const params = userId ? `?userId=${userId}` : ''
    return this.request(`/api/grocery${params}`)
  }

  async updateGroceryList(userId: string, items: any) {
    return this.request('/api/grocery', {
      method: 'POST',
      body: JSON.stringify({ userId, items })
    })
  }

  // Pantry methods
  async getPantryItems() {
    return this.request('/api/pantry')
  }

  async addPantryItem(item: any) {
    return this.request('/api/pantry', {
      method: 'POST',
      body: JSON.stringify(item)
    })
  }

  async updatePantryItem(id: string, updates: any) {
    return this.request(`/api/pantry/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    })
  }

  async deletePantryItem(id: string) {
    return this.request(`/api/pantry/${id}`, {
      method: 'DELETE'
    })
  }

  // Preferences methods
  async getPreferences() {
    return this.request('/api/preferences')
  }

  async updatePreferences(preferences: any) {
    return this.request('/api/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences)
    })
  }

  // Rating methods
  async getRating(recipeId: string) {
    return this.request(`/api/ratings/${recipeId}`)
  }

  async updateRating(recipeId: string, rating: number) {
    return this.request(`/api/ratings/${recipeId}`, {
      method: 'PUT',
      body: JSON.stringify({ rating })
    })
  }

  // User methods
  async getUser(userId: string) {
    return this.request(`/api/users/${userId}`)
  }

  async updateUser(userId: string, updates: any) {
    return this.request(`/api/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    })
  }

  // Instacart methods
  async getInstacartStatus(userId: string) {
    return this.request(`/api/instacart/status?userId=${userId}`)
  }

  async connectInstacart(userId: string) {
    return this.request('/api/instacart/connect', {
      method: 'POST',
      body: JSON.stringify({ userId })
    })
  }

  async addToInstacartCart(userId: string, items: any[]) {
    return this.request('/api/instacart/cart/add', {
      method: 'POST',
      body: JSON.stringify({ userId, items })
    })
  }
}

// Export singleton instance
export const apiClient = new ApiClient()