/**
 * useShopping Hook
 * Manages smart shopping list with meal plan integration
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import showToast from '../utils/toast'
const toast = showToast

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export interface ShoppingItem {
  id: string
  shoppingListId: string
  ingredientId?: string
  name: string
  amount?: number
  unit?: string
  category?: string
  purchased: boolean
  price?: number
  isStaple: boolean
  aisle?: string
  store?: string
}

export interface ShoppingList {
  id: string
  mealPlanId?: string
  userId: string
  status: 'PENDING' | 'SHOPPING' | 'COMPLETED'
  scheduledFor?: string
  items: ShoppingItem[]
  createdAt: string
  updatedAt: string
}

export interface AddItemInput {
  name: string
  amount?: number
  unit?: string
  category?: string
  isStaple?: boolean
}

export interface StoreSection {
  name: string
  aisle?: string
  items: ShoppingItem[]
}

export function useShopping(userId: string) {
  const queryClient = useQueryClient()
  const queryKey = ['shopping-list', userId]

  // Fetch current shopping list
  const { data: shoppingList, isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/shopping/current`, {
        params: { userId }
      })
      return response.data as ShoppingList
    },
    enabled: !!userId,
  })

  // Generate shopping list from meal plan
  const generateFromMealPlan = useMutation({
    mutationFn: async (mealPlanId: string) => {
      const response = await axios.post(`${API_URL}/api/shopping/generate`, {
        userId,
        mealPlanId,
      })
      return response.data
    },
    onSuccess: (newList) => {
      queryClient.setQueryData(queryKey, newList)
      toast({
        title: 'Shopping list generated!',
        description: `${newList.items.length} items added from your meal plan`,
        status: 'success',
        duration: 3000,
      })
    },
    onError: (err) => {
      toast({
        title: 'Error generating list',
        description: err.message,
        status: 'error',
        duration: 3000,
      })
    },
  })

  // Add item to shopping list
  const addItem = useMutation({
    mutationFn: async (item: AddItemInput) => {
      const response = await axios.post(`${API_URL}/api/shopping/items`, {
        userId,
        shoppingListId: shoppingList?.id,
        ...item,
      })
      return response.data
    },
    onMutate: async (newItem) => {
      await queryClient.cancelQueries({ queryKey })

      const previousList = queryClient.getQueryData(queryKey)

      queryClient.setQueryData(queryKey, (old: ShoppingList | undefined) => {
        if (!old) return old
        return {
          ...old,
          items: [
            ...old.items,
            {
              id: `temp-${Date.now()}`,
              shoppingListId: old.id,
              ...newItem,
              purchased: false,
              isStaple: newItem.isStaple || false,
            },
          ],
        }
      })

      return { previousList }
    },
    onError: (err, newItem, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(queryKey, context.previousList)
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
      queryClient.invalidateQueries({ queryKey })
    },
  })

  // Toggle item purchased status
  const togglePurchased = useMutation({
    mutationFn: async (itemId: string) => {
      const item = shoppingList?.items.find(i => i.id === itemId)
      const response = await axios.put(`${API_URL}/api/shopping/items/${itemId}`, {
        userId,
        purchased: !item?.purchased,
      })
      return response.data
    },
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey })

      const previousList = queryClient.getQueryData(queryKey)

      queryClient.setQueryData(queryKey, (old: ShoppingList | undefined) => {
        if (!old) return old
        return {
          ...old,
          items: old.items.map((item) =>
            item.id === itemId
              ? { ...item, purchased: !item.purchased }
              : item
          ),
        }
      })

      return { previousList }
    },
    onError: (err, itemId, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(queryKey, context.previousList)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  // Delete item from shopping list
  const deleteItem = useMutation({
    mutationFn: async (itemId: string) => {
      await axios.delete(`${API_URL}/api/shopping/items/${itemId}`, {
        params: { userId }
      })
    },
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey })

      const previousList = queryClient.getQueryData(queryKey)

      queryClient.setQueryData(queryKey, (old: ShoppingList | undefined) => {
        if (!old) return old
        return {
          ...old,
          items: old.items.filter((item) => item.id !== itemId),
        }
      })

      return { previousList }
    },
    onError: (err, itemId, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(queryKey, context.previousList)
      }
      toast({
        title: 'Error removing item',
        description: err.message,
        status: 'error',
        duration: 3000,
      })
    },
    onSuccess: () => {
      toast({
        title: 'Item removed',
        status: 'success',
        duration: 2000,
      })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  // Mark shopping as started
  const startShopping = useMutation({
    mutationFn: async () => {
      const response = await axios.put(`${API_URL}/api/shopping/${shoppingList?.id}/start`, {
        userId,
      })
      return response.data
    },
    onSuccess: () => {
      toast({
        title: 'Shopping started!',
        description: 'Good luck at the store!',
        status: 'success',
        duration: 3000,
      })
      queryClient.invalidateQueries({ queryKey })
    },
  })

  // Complete shopping
  const completeShopping = useMutation({
    mutationFn: async () => {
      const response = await axios.put(`${API_URL}/api/shopping/${shoppingList?.id}/complete`, {
        userId,
      })
      return response.data
    },
    onSuccess: () => {
      toast({
        title: 'Shopping completed!',
        description: 'Items have been added to your pantry',
        status: 'success',
        duration: 3000,
      })
      queryClient.invalidateQueries({ queryKey })
      queryClient.invalidateQueries({ queryKey: ['pantry'] })
    },
  })

  // Reorder staples
  const reorderStaples = useMutation({
    mutationFn: async () => {
      const response = await axios.post(`${API_URL}/api/shopping/reorder-staples`, {
        userId,
      })
      return response.data
    },
    onSuccess: (data) => {
      toast({
        title: 'Staples added!',
        description: `${data.itemsAdded} staple items added to your list`,
        status: 'success',
        duration: 3000,
      })
      queryClient.invalidateQueries({ queryKey })
    },
  })

  // Organize items by store section
  const itemsBySection: StoreSection[] = organizeBySection(shoppingList?.items || [])

  // Calculate statistics
  const stats = {
    totalItems: shoppingList?.items?.length || 0,
    purchasedItems: shoppingList?.items?.filter(i => i.purchased).length || 0,
    remainingItems: shoppingList?.items?.filter(i => !i.purchased).length || 0,
    estimatedCost: shoppingList?.items?.reduce((sum, item) => {
      const price = item.price || estimatePrice(item)
      return sum + price
    }, 0) || 0,
    progress: shoppingList?.items?.length 
      ? (shoppingList.items.filter(i => i.purchased).length / shoppingList.items.length) * 100
      : 0,
  }

  return {
    shoppingList,
    itemsBySection,
    stats,
    isLoading,
    error,
    generateFromMealPlan: generateFromMealPlan.mutate,
    addItem: addItem.mutate,
    togglePurchased: togglePurchased.mutate,
    deleteItem: deleteItem.mutate,
    startShopping: startShopping.mutate,
    completeShopping: completeShopping.mutate,
    reorderStaples: reorderStaples.mutate,
    isGenerating: generateFromMealPlan.isPending,
    isStarting: startShopping.isPending,
    isCompleting: completeShopping.isPending,
  }
}

function organizeBySection(items: ShoppingItem[]): StoreSection[] {
  const sections: Record<string, ShoppingItem[]> = {}
  
  // Define store layout
  const sectionOrder = [
    'Produce',
    'Dairy',
    'Meat & Seafood',
    'Bakery',
    'Frozen',
    'Canned & Packaged',
    'Snacks',
    'Beverages',
    'Other',
  ]
  
  items.forEach(item => {
    const section = item.category || 'Other'
    if (!sections[section]) {
      sections[section] = []
    }
    sections[section].push(item)
  })
  
  // Sort sections by store layout
  return sectionOrder
    .filter(section => sections[section]?.length > 0)
    .map(section => ({
      name: section,
      items: sections[section].sort((a, b) => {
        // Purchased items go to the bottom
        if (a.purchased !== b.purchased) {
          return a.purchased ? 1 : -1
        }
        return a.name.localeCompare(b.name)
      }),
    }))
}

function estimatePrice(item: ShoppingItem): number {
  // Simple price estimation based on category
  const categoryPrices: Record<string, number> = {
    'Produce': 3,
    'Dairy': 4,
    'Meat & Seafood': 8,
    'Bakery': 3,
    'Frozen': 5,
    'Canned & Packaged': 3,
    'Snacks': 4,
    'Beverages': 3,
    'Other': 5,
  }
  
  return categoryPrices[item.category || 'Other'] || 5
}