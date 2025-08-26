/**
 * Type definitions for billing and subscription management
 */

export type PlanTier = 'free' | 'small' | 'family'

export interface PlanLimits {
  recipes: number
  pantryItems: number
  mealPlans: number
  aiPlanning: boolean
  groceryIntegration: boolean
  seats: number
}

export interface PricingPlan {
  id: PlanTier
  name: string
  price: number
  pricePerAdditionalSeat?: number
  limits: PlanLimits
  features: string[]
  popular?: boolean
}

export interface Subscription {
  id: string
  userId: string
  planTier: PlanTier
  status: 'active' | 'canceled' | 'past_due' | 'trialing'
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  seats: number
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  createdAt: Date
  updatedAt: Date
}

export interface UsageStats {
  recipes: {
    used: number
    limit: number
  }
  pantryItems: {
    used: number
    limit: number
  }
  mealPlans: {
    used: number
    limit: number
  }
  seats: {
    used: number
    limit: number
  }
}

export interface Invoice {
  id: string
  amount: number
  currency: string
  status: 'paid' | 'open' | 'draft' | 'void'
  periodStart: Date
  periodEnd: Date
  invoiceUrl?: string
  pdfUrl?: string
  createdAt: Date
}

export interface CheckoutSession {
  sessionId: string
  url: string
}

export interface PortalSession {
  url: string
}

export interface UpdateSubscriptionRequest {
  planTier?: PlanTier
  seats?: number
  cancelAtPeriodEnd?: boolean
}

export interface ApiError {
  message: string
  code?: string
  details?: any
}