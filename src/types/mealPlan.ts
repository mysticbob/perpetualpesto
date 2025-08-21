/**
 * Meal Plan type definitions
 */

import type { Recipe } from './recipe'

export interface MealSlot {
  id: string
  date: string // ISO date string
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  recipeId?: string
  recipe?: Recipe
  servings?: number
  notes?: string
}

export interface MealPlan {
  id: string
  name?: string
  startDate: string // ISO date string
  endDate: string // ISO date string
  meals: MealSlot[]
  shoppingListGenerated?: boolean
  createdAt?: string
  updatedAt?: string
  userId?: string
}