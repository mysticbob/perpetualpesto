/**
 * Recipe type definitions
 */

export interface Ingredient {
  name: string
  amount?: string
  unit?: string
  notes?: string
}

export interface Recipe {
  id: string
  name: string
  description?: string
  ingredients: Ingredient[]
  instructions: string[]
  prepTime?: number // in minutes
  cookTime?: number // in minutes
  servings?: number
  difficulty?: 'easy' | 'medium' | 'hard'
  cuisine?: string
  category?: string
  tags?: string[]
  imageUrl?: string
  sourceUrl?: string
  author?: string
  rating?: number
  nutrition?: {
    calories?: number
    protein?: number
    carbs?: number
    fat?: number
    fiber?: number
    sugar?: number
    sodium?: number
  }
  createdAt?: string
  updatedAt?: string
  userId?: string
}