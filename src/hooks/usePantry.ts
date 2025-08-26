/**
 * usePantry Hook
 * Manages pantry CRUD operations with optimistic updates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import showToast from '../utils/toast'
const toast = showToast

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export interface PantryItem {
  id: string
  userId: string
  ingredientId?: string
  customName: string
  amount: number
  unit: string
  location: 'FRIDGE' | 'FREEZER' | 'PANTRY' | 'COUNTER' | 'SPICE_RACK'
  container?: string
  purchaseDate: string
  expirationDate?: string
  openedDate?: string
  isLeftover: boolean
  leftoverFromId?: string
  leftoverDate?: string
  purchasePrice?: number
  createdAt: string
  updatedAt: string
}

export interface CreatePantryItemInput {
  customName: string
  amount: number
  unit: string
  location: PantryItem['location']
  container?: string
  expirationDate?: string
  isLeftover?: boolean
  leftoverFromId?: string
  purchasePrice?: number
}

export interface UpdatePantryItemInput extends Partial<CreatePantryItemInput> {
  id: string
}

export function usePantry(userId: string) {
  const queryClient = useQueryClient()
  const queryKey = ['pantry', userId]

  // Fetch pantry items
  const { data: pantryItems = [], isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/pantry/items`, {
        params: { userId }
      })
      return response.data
    },
    enabled: !!userId,
  })

  // Add pantry item
  const addItem = useMutation({
    mutationFn: async (item: CreatePantryItemInput) => {
      const response = await axios.post(`${API_URL}/api/pantry/items`, {
        userId,
        ...item,
      })
      return response.data
    },
    onMutate: async (newItem) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey })

      // Snapshot the previous value
      const previousItems = queryClient.getQueryData(queryKey)

      // Optimistically update to the new value
      queryClient.setQueryData(queryKey, (old: PantryItem[] = []) => [
        ...old,
        {
          id: `temp-${Date.now()}`,
          userId,
          ...newItem,
          purchaseDate: new Date().toISOString(),
          isLeftover: newItem.isLeftover || false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ])

      // Return a context with the previous and new data
      return { previousItems }
    },
    onError: (err, newItem, context) => {
      // If the mutation fails, use the context to roll back
      if (context?.previousItems) {
        queryClient.setQueryData(queryKey, context.previousItems)
      }
      toast({
        title: 'Error adding item',
        description: err.message,
        status: 'error',
        duration: 3000,
      })
    },
    onSuccess: () => {
      toast({
        title: 'Item added',
        status: 'success',
        duration: 2000,
      })
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey })
    },
  })

  // Update pantry item
  const updateItem = useMutation({
    mutationFn: async ({ id, ...updates }: UpdatePantryItemInput) => {
      const response = await axios.put(`${API_URL}/api/pantry/items/${id}`, {
        userId,
        ...updates,
      })
      return response.data
    },
    onMutate: async (updatedItem) => {
      await queryClient.cancelQueries({ queryKey })

      const previousItems = queryClient.getQueryData(queryKey)

      queryClient.setQueryData(queryKey, (old: PantryItem[] = []) =>
        old.map((item) =>
          item.id === updatedItem.id
            ? { ...item, ...updatedItem, updatedAt: new Date().toISOString() }
            : item
        )
      )

      return { previousItems }
    },
    onError: (err, updatedItem, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(queryKey, context.previousItems)
      }
      toast({
        title: 'Error updating item',
        description: err.message,
        status: 'error',
        duration: 3000,
      })
    },
    onSuccess: () => {
      toast({
        title: 'Item updated',
        status: 'success',
        duration: 2000,
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  // Delete pantry item
  const deleteItem = useMutation({
    mutationFn: async (itemId: string) => {
      await axios.delete(`${API_URL}/api/pantry/items/${itemId}`, {
        params: { userId }
      })
    },
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey })

      const previousItems = queryClient.getQueryData(queryKey)

      queryClient.setQueryData(queryKey, (old: PantryItem[] = []) =>
        old.filter((item) => item.id !== itemId)
      )

      return { previousItems }
    },
    onError: (err, itemId, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(queryKey, context.previousItems)
      }
      toast({
        title: 'Error deleting item',
        description: err.message,
        status: 'error',
        duration: 3000,
      })
    },
    onSuccess: () => {
      toast({
        title: 'Item deleted',
        status: 'success',
        duration: 2000,
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  // Move item between locations
  const moveItem = useMutation({
    mutationFn: async ({ itemId, newLocation }: { itemId: string; newLocation: PantryItem['location'] }) => {
      const response = await axios.put(`${API_URL}/api/pantry/items/${itemId}`, {
        userId,
        location: newLocation,
      })
      return response.data
    },
    onMutate: async ({ itemId, newLocation }) => {
      await queryClient.cancelQueries({ queryKey })

      const previousItems = queryClient.getQueryData(queryKey)

      queryClient.setQueryData(queryKey, (old: PantryItem[] = []) =>
        old.map((item) =>
          item.id === itemId
            ? { ...item, location: newLocation, updatedAt: new Date().toISOString() }
            : item
        )
      )

      return { previousItems }
    },
    onError: (err, variables, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(queryKey, context.previousItems)
      }
      toast({
        title: 'Error moving item',
        description: err.message,
        status: 'error',
        duration: 3000,
      })
    },
    onSuccess: () => {
      toast({
        title: 'Item moved',
        status: 'success',
        duration: 2000,
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  // Group items by location
  const itemsByLocation = pantryItems.reduce((acc: Record<string, PantryItem[]>, item: PantryItem) => {
    if (!acc[item.location]) {
      acc[item.location] = []
    }
    acc[item.location].push(item)
    return acc
  }, {})

  // Calculate statistics
  const stats = {
    totalItems: pantryItems.length,
    expiringCount: pantryItems.filter((item: PantryItem) => {
      if (!item.expirationDate) return false
      const daysUntilExpiry = Math.ceil(
        (new Date(item.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
      return daysUntilExpiry <= 3 && daysUntilExpiry >= 0
    }).length,
    expiredCount: pantryItems.filter((item: PantryItem) => {
      if (!item.expirationDate) return false
      return new Date(item.expirationDate) < new Date()
    }).length,
    leftoverCount: pantryItems.filter((item: PantryItem) => item.isLeftover).length,
  }

  return {
    pantryItems,
    itemsByLocation,
    stats,
    isLoading,
    error,
    addItem: addItem.mutate,
    updateItem: updateItem.mutate,
    deleteItem: deleteItem.mutate,
    moveItem: moveItem.mutate,
    isAdding: addItem.isPending,
    isUpdating: updateItem.isPending,
    isDeleting: deleteItem.isPending,
    isMoving: moveItem.isPending,
  }
}