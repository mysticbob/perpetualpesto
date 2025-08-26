/**
 * React Query hooks for grocery list management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@chakra-ui/react'
import { apiClient } from '../utils/apiClient'
import { useAuth } from '../contexts/AuthContext'

export interface GroceryItem {
  id: string
  name: string
  amount?: string
  unit?: string
  category?: string
  completed: boolean
  addedDate: string
}

// Query keys
export const groceryKeys = {
  all: ['groceries'] as const,
  list: (userId: string) => [...groceryKeys.all, 'list', userId] as const,
}

// Fetch grocery list
export function useGroceryList() {
  const { currentUser } = useAuth()
  
  return useQuery({
    queryKey: groceryKeys.list(currentUser?.uid || ''),
    queryFn: () => apiClient.getGroceryList(currentUser?.uid),
    enabled: !!currentUser,
    // Refetch every 30 seconds to sync with other devices
    refetchInterval: 30000,
  })
}

// Update grocery list mutation with optimistic updates
export function useUpdateGroceryList() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const { currentUser } = useAuth()
  
  return useMutation({
    mutationFn: (items: GroceryItem[]) => 
      apiClient.updateGroceryList(currentUser!.uid, items),
    // Optimistic update
    onMutate: async (newItems) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: groceryKeys.list(currentUser!.uid) 
      })
      
      // Snapshot the previous value
      const previousItems = queryClient.getQueryData(
        groceryKeys.list(currentUser!.uid)
      )
      
      // Optimistically update to the new value
      queryClient.setQueryData(
        groceryKeys.list(currentUser!.uid), 
        { items: newItems }
      )
      
      // Return context with snapshot
      return { previousItems }
    },
    // If mutation fails, use the context to roll back
    onError: (err, newItems, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(
          groceryKeys.list(currentUser!.uid),
          context.previousItems
        )
      }
      
      toast({
        title: 'Failed to update grocery list',
        description: 'Changes will be retried',
        status: 'warning',
        duration: 3000,
      })
    },
    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({ 
        queryKey: groceryKeys.list(currentUser!.uid) 
      })
    },
  })
}

// Add grocery item
export function useAddGroceryItem() {
  const queryClient = useQueryClient()
  const { currentUser } = useAuth()
  const updateMutation = useUpdateGroceryList()
  
  return useMutation({
    mutationFn: async (newItem: Omit<GroceryItem, 'id' | 'completed' | 'addedDate'>) => {
      const currentData = queryClient.getQueryData<{ items: GroceryItem[] }>(
        groceryKeys.list(currentUser!.uid)
      )
      
      const newGroceryItem: GroceryItem = {
        ...newItem,
        id: `temp-${Date.now()}`,
        completed: false,
        addedDate: new Date().toISOString(),
      }
      
      const updatedItems = [...(currentData?.items || []), newGroceryItem]
      return updateMutation.mutateAsync(updatedItems)
    },
  })
}

// Toggle grocery item completion
export function useToggleGroceryItem() {
  const queryClient = useQueryClient()
  const { currentUser } = useAuth()
  const updateMutation = useUpdateGroceryList()
  
  return useMutation({
    mutationFn: async (itemId: string) => {
      const currentData = queryClient.getQueryData<{ items: GroceryItem[] }>(
        groceryKeys.list(currentUser!.uid)
      )
      
      const updatedItems = currentData?.items.map(item => 
        item.id === itemId 
          ? { ...item, completed: !item.completed }
          : item
      ) || []
      
      return updateMutation.mutateAsync(updatedItems)
    },
  })
}

// Remove grocery item
export function useRemoveGroceryItem() {
  const queryClient = useQueryClient()
  const { currentUser } = useAuth()
  const updateMutation = useUpdateGroceryList()
  
  return useMutation({
    mutationFn: async (itemId: string) => {
      const currentData = queryClient.getQueryData<{ items: GroceryItem[] }>(
        groceryKeys.list(currentUser!.uid)
      )
      
      const updatedItems = currentData?.items.filter(item => 
        item.id !== itemId
      ) || []
      
      return updateMutation.mutateAsync(updatedItems)
    },
  })
}

// Clear completed items
export function useClearCompletedGroceries() {
  const queryClient = useQueryClient()
  const { currentUser } = useAuth()
  const updateMutation = useUpdateGroceryList()
  const toast = useToast()
  
  return useMutation({
    mutationFn: async () => {
      const currentData = queryClient.getQueryData<{ items: GroceryItem[] }>(
        groceryKeys.list(currentUser!.uid)
      )
      
      const activeItems = currentData?.items.filter(item => 
        !item.completed
      ) || []
      
      const removedCount = (currentData?.items.length || 0) - activeItems.length
      
      await updateMutation.mutateAsync(activeItems)
      
      return removedCount
    },
    onSuccess: (removedCount) => {
      if (removedCount > 0) {
        toast({
          title: 'Completed items cleared',
          description: `Removed ${removedCount} item${removedCount > 1 ? 's' : ''}`,
          status: 'success',
          duration: 2000,
        })
      }
    },
  })
}