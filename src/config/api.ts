/**
 * Centralized API configuration
 * Single source of truth for all API endpoints and settings
 */

const isDevelopment = process.env.NODE_ENV === 'development'
const isTest = process.env.NODE_ENV === 'test'

export const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
} as const

export const API_ENDPOINTS = {
  // Recipe endpoints
  recipes: {
    list: '/api/recipes',
    get: (id: string) => `/api/recipes/${id}`,
    create: '/api/recipes',
    update: (id: string) => `/api/recipes/${id}`,
    delete: (id: string) => `/api/recipes/${id}`,
    extract: '/api/extract',
    search: '/api/recipes/search',
  },
  
  // Meal planning endpoints
  mealPlans: {
    list: '/api/meal-plans',
    get: (id: string) => `/api/meal-plans/${id}`,
    create: '/api/meal-plans',
    update: (id: string) => `/api/meal-plans/${id}`,
    delete: (id: string) => `/api/meal-plans/${id}`,
    current: '/api/meal-plans/current',
  },
  
  // Grocery endpoints
  groceries: {
    list: '/api/groceries',
    update: '/api/groceries',
    clear: '/api/groceries/clear',
    consolidate: '/api/groceries/consolidate',
  },
  
  // Pantry endpoints
  pantry: {
    list: '/api/pantry',
    add: '/api/pantry',
    update: (id: string) => `/api/pantry/${id}`,
    delete: (id: string) => `/api/pantry/${id}`,
    use: '/api/pantry/use',
    categories: '/api/pantry/categories',
  },
  
  // Shopping endpoints
  shopping: {
    history: '/api/shopping-history',
    complete: '/api/shopping-history',
    stores: '/api/stores',
    lists: '/api/shopping-lists',
  },
  
  // Analytics endpoints
  analytics: {
    overview: '/api/analytics/overview',
    trends: '/api/analytics/trends',
    insights: '/api/analytics/insights',
  },
  
  // AI endpoints
  ai: {
    generateRecipe: '/api/ai/generate-recipe',
    suggestRecipes: '/api/ai/suggest-recipes',
    mealPlan: '/api/ai/meal-plan',
    substitute: '/api/ai/substitute',
  },
  
  // Auth endpoints
  auth: {
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    signup: '/api/auth/signup',
    verify: '/api/auth/verify',
  },
} as const

/**
 * Build full URL for an endpoint
 */
export function buildUrl(endpoint: string): string {
  return `${API_CONFIG.baseUrl}${endpoint}`
}

/**
 * Standard fetch options
 */
export function getFetchOptions(options?: RequestInit): RequestInit {
  return {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  }
}

/**
 * Handle API errors consistently
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public details?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Retry logic for failed requests
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retries = API_CONFIG.retryAttempts
): Promise<Response> {
  try {
    const response = await fetch(url, options)
    
    if (!response.ok && retries > 0 && response.status >= 500) {
      await new Promise(resolve => setTimeout(resolve, API_CONFIG.retryDelay))
      return fetchWithRetry(url, options, retries - 1)
    }
    
    return response
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, API_CONFIG.retryDelay))
      return fetchWithRetry(url, options, retries - 1)
    }
    throw error
  }
}

/**
 * Type-safe API response wrapper
 */
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
  success: boolean
}

/**
 * Parse API response with error handling
 */
export async function parseApiResponse<T>(response: Response): Promise<ApiResponse<T>> {
  try {
    const data = await response.json()
    
    if (!response.ok) {
      return {
        success: false,
        error: data.error || data.message || 'An error occurred',
        data: undefined,
      }
    }
    
    return {
      success: true,
      data,
      error: undefined,
    }
  } catch (error) {
    return {
      success: false,
      error: 'Failed to parse response',
      data: undefined,
    }
  }
}