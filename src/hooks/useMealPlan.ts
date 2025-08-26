/**
 * useMealPlan Hook
 * Manages meal planning with Claude AI integration
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import showToast from '../utils/toast'
const toast = showToast
import { startOfWeek } from 'date-fns'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export interface PlannedMeal {
  id: string
  mealPlanId: string
  recipeId?: string
  date: string
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'
  servings: number
  isCooked: boolean
  cookedAt?: string
  skipped: boolean
  isEatingOut: boolean
  restaurantName?: string
  simpleMealName?: string
  expectLeftovers: boolean
  leftoverServings?: number
  recipe?: {
    id: string
    name: string
    prepTime?: number
    cookTime?: number
    totalTime?: number
    imageUrl?: string
  }
}

export interface MealPlan {
  id: string
  userId: string
  weekStartDate: string
  status: 'DRAFT' | 'APPROVED' | 'ACTIVE' | 'COMPLETED'
  generatedBy?: string
  constraints?: any
  meals: PlannedMeal[]
  createdAt: string
  updatedAt: string
}

export interface GeneratePlanInput {
  weekStartDate?: Date
  planningMode?: 'assisted' | 'yolo' | 'manual'
  servingsPerMeal?: number
  maxCookTimeMinutes?: number
  includeLeftovers?: boolean
}

export interface UpdateMealInput {
  mealId: string
  updates: Partial<PlannedMeal>
}

export interface ClaudeSuggestion {
  name: string
  uses: string[]
  time: number
  instructions: string
}

export function useMealPlan(userId: string) {
  const queryClient = useQueryClient()
  const currentWeek = startOfWeek(new Date())
  const queryKey = ['mealPlan', userId, currentWeek.toISOString()]

  // Fetch current week's meal plan
  const { data: mealPlan, isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/meal-plans/current`, {
        params: { userId, weekStartDate: currentWeek.toISOString() }
      })
      return response.data
    },
    enabled: !!userId,
  })

  // Generate meal plan with Claude
  const generatePlan = useMutation({
    mutationFn: async (input: GeneratePlanInput = {}) => {
      const response = await axios.post(`${API_URL}/api/meal-plans/generate`, {
        userId,
        weekStartDate: input.weekStartDate || currentWeek,
        preferences: {
          planningMode: input.planningMode || 'assisted',
          servingsPerMeal: input.servingsPerMeal || 2,
          maxCookTimeMinutes: input.maxCookTimeMinutes || 45,
          includeLeftovers: input.includeLeftovers !== false,
        },
      })
      return response.data
    },
    onMutate: () => {
      toast({
        title: 'Generating meal plan...',
        description: 'Claude is analyzing your pantry and creating a personalized plan',
        status: 'info',
        duration: 5000,
      })
    },
    onSuccess: (newPlan) => {
      queryClient.setQueryData(queryKey, newPlan)
      toast({
        title: 'Meal plan generated!',
        description: 'Review and approve your new meal plan',
        status: 'success',
        duration: 3000,
      })
    },
    onError: (err) => {
      toast({
        title: 'Error generating plan',
        description: err.message || 'Failed to generate meal plan',
        status: 'error',
        duration: 5000,
      })
    },
  })

  // Approve meal plan
  const approvePlan = useMutation({
    mutationFn: async (planId: string) => {
      const response = await axios.put(`${API_URL}/api/meal-plans/${planId}/approve`, {
        userId,
      })
      return response.data
    },
    onMutate: (planId) => {
      // Optimistically update status
      queryClient.setQueryData(queryKey, (old: MealPlan | undefined) => {
        if (!old || old.id !== planId) return old
        return { ...old, status: 'APPROVED' }
      })
    },
    onSuccess: () => {
      toast({
        title: 'Plan approved!',
        description: 'Your meal plan is now active',
        status: 'success',
        duration: 3000,
      })
      queryClient.invalidateQueries({ queryKey: ['mealPlan'] })
    },
    onError: (err) => {
      toast({
        title: 'Error approving plan',
        description: err.message,
        status: 'error',
        duration: 3000,
      })
      queryClient.invalidateQueries({ queryKey })
    },
  })

  // Update a meal in the plan
  const updateMeal = useMutation({
    mutationFn: async ({ mealId, updates }: UpdateMealInput) => {
      const response = await axios.put(`${API_URL}/api/meal-plans/meals/${mealId}`, {
        userId,
        ...updates,
      })
      return response.data
    },
    onMutate: async ({ mealId, updates }) => {
      await queryClient.cancelQueries({ queryKey })

      const previousPlan = queryClient.getQueryData(queryKey)

      queryClient.setQueryData(queryKey, (old: MealPlan | undefined) => {
        if (!old) return old
        return {
          ...old,
          meals: old.meals.map((meal) =>
            meal.id === mealId ? { ...meal, ...updates } : meal
          ),
        }
      })

      return { previousPlan }
    },
    onError: (err, variables, context) => {
      if (context?.previousPlan) {
        queryClient.setQueryData(queryKey, context.previousPlan)
      }
      toast({
        title: 'Error updating meal',
        description: err.message,
        status: 'error',
        duration: 3000,
      })
    },
    onSuccess: () => {
      toast({
        title: 'Meal updated',
        status: 'success',
        duration: 2000,
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  // Mark meal as cooked
  const markAsCooked = useMutation({
    mutationFn: async (mealId: string) => {
      const response = await axios.put(`${API_URL}/api/meal-plans/meals/${mealId}/cooked`, {
        userId,
      })
      return response.data
    },
    onMutate: async (mealId) => {
      await queryClient.cancelQueries({ queryKey })

      const previousPlan = queryClient.getQueryData(queryKey)

      queryClient.setQueryData(queryKey, (old: MealPlan | undefined) => {
        if (!old) return old
        return {
          ...old,
          meals: old.meals.map((meal) =>
            meal.id === mealId 
              ? { ...meal, isCooked: true, cookedAt: new Date().toISOString() }
              : meal
          ),
        }
      })

      return { previousPlan }
    },
    onError: (err, mealId, context) => {
      if (context?.previousPlan) {
        queryClient.setQueryData(queryKey, context.previousPlan)
      }
      toast({
        title: 'Error marking meal as cooked',
        description: err.message,
        status: 'error',
        duration: 3000,
      })
    },
    onSuccess: () => {
      toast({
        title: 'Meal marked as cooked!',
        status: 'success',
        duration: 2000,
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  // Get Claude suggestions for expiring items
  const { data: suggestions = [], isLoading: loadingSuggestions } = useQuery({
    queryKey: ['claude-suggestions', userId],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/meal-plans/suggestions`, {
        params: { userId }
      })
      return response.data as ClaudeSuggestion[]
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  // Group meals by date
  const mealsByDate = mealPlan?.meals?.reduce((acc: Record<string, PlannedMeal[]>, meal: PlannedMeal) => {
    const dateKey = meal.date.split('T')[0]
    if (!acc[dateKey]) {
      acc[dateKey] = []
    }
    acc[dateKey].push(meal)
    return acc
  }, {}) || {}

  // Calculate statistics
  const stats = {
    totalMeals: mealPlan?.meals?.length || 0,
    cookedMeals: mealPlan?.meals?.filter((m: PlannedMeal) => m.isCooked).length || 0,
    skippedMeals: mealPlan?.meals?.filter((m: PlannedMeal) => m.skipped).length || 0,
    leftoverMeals: mealPlan?.meals?.filter((m: PlannedMeal) => m.expectLeftovers).length || 0,
  }

  return {
    mealPlan,
    mealsByDate,
    suggestions,
    stats,
    isLoading,
    loadingSuggestions,
    error,
    generatePlan: generatePlan.mutate,
    approvePlan: approvePlan.mutate,
    updateMeal: updateMeal.mutate,
    markAsCooked: markAsCooked.mutate,
    isGenerating: generatePlan.isPending,
    isApproving: approvePlan.isPending,
    isUpdating: updateMeal.isPending,
  }
}