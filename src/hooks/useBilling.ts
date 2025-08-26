/**
 * React Query hooks for billing and subscription management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@chakra-ui/react'
import { apiClient } from '../utils/apiClient'
import { useAuth } from '../contexts/AuthContext'
import type {
  Subscription,
  UsageStats,
  Invoice,
  CheckoutSession,
  PortalSession,
  UpdateSubscriptionRequest,
  PlanTier
} from '../types/billing'

// Query keys
export const billingKeys = {
  all: ['billing'] as const,
  subscription: () => [...billingKeys.all, 'subscription'] as const,
  usage: () => [...billingKeys.all, 'usage'] as const,
  invoices: () => [...billingKeys.all, 'invoices'] as const,
}

// Fetch current subscription
export function useSubscription() {
  const { currentUser } = useAuth()
  
  return useQuery({
    queryKey: billingKeys.subscription(),
    queryFn: () => apiClient.request<Subscription>('/api/billing/subscription'),
    enabled: !!currentUser,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    retry: 2,
  })
}

// Fetch usage statistics
export function useUsageStats() {
  const { currentUser } = useAuth()
  
  return useQuery({
    queryKey: billingKeys.usage(),
    queryFn: () => apiClient.request<UsageStats>('/api/billing/usage'),
    enabled: !!currentUser,
    refetchInterval: 60 * 1000, // Refetch every minute
  })
}

// Fetch billing history
export function useBillingHistory() {
  const { currentUser } = useAuth()
  
  return useQuery({
    queryKey: billingKeys.invoices(),
    queryFn: () => apiClient.request<Invoice[]>('/api/billing/invoices'),
    enabled: !!currentUser,
    staleTime: 10 * 60 * 1000, // Consider data fresh for 10 minutes
  })
}

// Create checkout session mutation
export function useCreateCheckout() {
  const toast = useToast()
  
  return useMutation({
    mutationFn: async ({ planTier, seats }: { planTier: PlanTier; seats?: number }) => {
      const response = await apiClient.request<CheckoutSession>('/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ planTier, seats })
      })
      return response
    },
    onSuccess: (data) => {
      // Redirect to Stripe checkout
      if (data.url) {
        window.location.href = data.url
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Checkout Error',
        description: error.message || 'Failed to create checkout session',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    },
  })
}

// Create customer portal session
export function useCreatePortalSession() {
  const toast = useToast()
  
  return useMutation({
    mutationFn: () => apiClient.request<PortalSession>('/api/billing/portal', {
      method: 'POST'
    }),
    onSuccess: (data) => {
      // Redirect to Stripe customer portal
      if (data.url) {
        window.location.href = data.url
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Portal Error',
        description: error.message || 'Failed to access customer portal',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    },
  })
}

// Update subscription mutation
export function useUpdateSubscription() {
  const queryClient = useQueryClient()
  const toast = useToast()
  
  return useMutation({
    mutationFn: (updates: UpdateSubscriptionRequest) => 
      apiClient.request<Subscription>('/api/billing/subscription/update', {
        method: 'POST',
        body: JSON.stringify(updates)
      }),
    onSuccess: (data) => {
      // Invalidate subscription and usage queries
      queryClient.invalidateQueries({ queryKey: billingKeys.subscription() })
      queryClient.invalidateQueries({ queryKey: billingKeys.usage() })
      
      toast({
        title: 'Subscription Updated',
        description: 'Your subscription has been updated successfully',
        status: 'success',
        duration: 5000,
        isClosable: true,
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Update Error',
        description: error.message || 'Failed to update subscription',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    },
  })
}

// Cancel subscription mutation
export function useCancelSubscription() {
  const queryClient = useQueryClient()
  const toast = useToast()
  
  return useMutation({
    mutationFn: () => 
      apiClient.request<Subscription>('/api/billing/subscription/cancel', {
        method: 'POST'
      }),
    onSuccess: () => {
      // Invalidate subscription query
      queryClient.invalidateQueries({ queryKey: billingKeys.subscription() })
      
      toast({
        title: 'Subscription Canceled',
        description: 'Your subscription will be canceled at the end of the billing period',
        status: 'info',
        duration: 5000,
        isClosable: true,
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Cancellation Error',
        description: error.message || 'Failed to cancel subscription',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    },
  })
}

// Helper hook to check if a feature is available
export function useFeatureAccess(feature: keyof UsageStats | 'aiPlanning' | 'groceryIntegration') {
  const { data: subscription } = useSubscription()
  const { data: usage } = useUsageStats()
  
  if (!subscription || !usage) {
    return { hasAccess: false, isLoading: true, reason: 'Loading...' }
  }
  
  // Check special features
  if (feature === 'aiPlanning') {
    const hasAccess = subscription.planTier !== 'free'
    return { 
      hasAccess, 
      isLoading: false,
      reason: hasAccess ? undefined : 'AI planning requires Small or Family plan'
    }
  }
  
  if (feature === 'groceryIntegration') {
    const hasAccess = subscription.planTier === 'family'
    return { 
      hasAccess, 
      isLoading: false,
      reason: hasAccess ? undefined : 'Grocery integration requires Family plan'
    }
  }
  
  // Check usage-based features
  if (feature in usage) {
    const stat = usage[feature as keyof UsageStats]
    const hasAccess = stat.used < stat.limit || stat.limit === -1 // -1 means unlimited
    return {
      hasAccess,
      isLoading: false,
      usage: stat,
      reason: hasAccess ? undefined : `You've reached your ${feature} limit`
    }
  }
  
  return { hasAccess: true, isLoading: false }
}