/**
 * React Query hooks for recipe management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@chakra-ui/react'
import { apiClient } from '../utils/apiClient'
import { useAuth } from '../contexts/AuthContext'

// Query keys
export const recipeKeys = {
  all: ['recipes'] as const,
  lists: () => [...recipeKeys.all, 'list'] as const,
  list: (filters: string) => [...recipeKeys.lists(), { filters }] as const,
  details: () => [...recipeKeys.all, 'detail'] as const,
  detail: (id: string) => [...recipeKeys.details(), id] as const,
}

// Fetch all recipes
export function useRecipes() {
  const { currentUser } = useAuth()
  
  return useQuery({
    queryKey: recipeKeys.lists(),
    queryFn: () => apiClient.getRecipes(),
    enabled: !!currentUser,
  })
}

// Fetch single recipe
export function useRecipe(id: string) {
  return useQuery({
    queryKey: recipeKeys.detail(id),
    queryFn: () => apiClient.getRecipe(id),
    enabled: !!id,
  })
}

// Create recipe mutation
export function useCreateRecipe() {
  const queryClient = useQueryClient()
  const toast = useToast()
  
  return useMutation({
    mutationFn: (recipe: any) => apiClient.createRecipe(recipe),
    onSuccess: (data) => {
      // Invalidate and refetch recipes list
      queryClient.invalidateQueries({ queryKey: recipeKeys.lists() })
      
      toast({
        title: 'Recipe created',
        description: `Successfully added "${data.name}"`,
        status: 'success',
        duration: 3000,
      })
    },
    onError: (error) => {
      toast({
        title: 'Failed to create recipe',
        description: error.message,
        status: 'error',
        duration: 5000,
      })
    },
  })
}

// Update recipe mutation
export function useUpdateRecipe() {
  const queryClient = useQueryClient()
  const toast = useToast()
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => 
      apiClient.updateRecipe(id, updates),
    onSuccess: (data, variables) => {
      // Update cache for this specific recipe
      queryClient.setQueryData(recipeKeys.detail(variables.id), data)
      // Invalidate list to refetch
      queryClient.invalidateQueries({ queryKey: recipeKeys.lists() })
      
      toast({
        title: 'Recipe updated',
        status: 'success',
        duration: 2000,
      })
    },
    onError: (error) => {
      toast({
        title: 'Failed to update recipe',
        description: error.message,
        status: 'error',
        duration: 5000,
      })
    },
  })
}

// Delete recipe mutation
export function useDeleteRecipe() {
  const queryClient = useQueryClient()
  const toast = useToast()
  
  return useMutation({
    mutationFn: (id: string) => apiClient.deleteRecipe(id),
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: recipeKeys.detail(id) })
      // Invalidate list
      queryClient.invalidateQueries({ queryKey: recipeKeys.lists() })
      
      toast({
        title: 'Recipe deleted',
        status: 'success',
        duration: 2000,
      })
    },
    onError: (error) => {
      toast({
        title: 'Failed to delete recipe',
        description: error.message,
        status: 'error',
        duration: 5000,
      })
    },
  })
}

// Extract recipe mutation
export function useExtractRecipe() {
  const toast = useToast()
  
  return useMutation({
    mutationFn: (url: string) => apiClient.extractRecipe(url),
    onError: (error) => {
      toast({
        title: 'Failed to extract recipe',
        description: error.message,
        status: 'error',
        duration: 5000,
      })
    },
  })
}