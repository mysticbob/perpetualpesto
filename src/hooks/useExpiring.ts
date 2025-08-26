/**
 * useExpiring Hook
 * Real-time tracking of expiring pantry items
 */

import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { differenceInDays, addDays } from 'date-fns'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export interface ExpiringItem {
  id: string
  customName: string
  amount: number
  unit: string
  location: string
  expirationDate: string
  daysUntilExpiry: number
  status: 'expired' | 'expiring-today' | 'expiring-soon' | 'fresh'
  color: string
  urgency: number // 1-5 scale
  ingredient?: {
    name: string
    category: string
  }
}

export interface ExpirationStats {
  expired: number
  expiringToday: number
  expiringSoon: number // Within 3 days
  expiringThisWeek: number // Within 7 days
  totalValue: number // Estimated value of expiring items
}

export function useExpiring(userId: string, daysAhead: number = 7) {
  const queryKey = ['expiring-items', userId, daysAhead]

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/pantry/expiring`, {
        params: { 
          userId,
          daysAhead,
        }
      })
      return response.data
    },
    enabled: !!userId,
    refetchInterval: 60000, // Refetch every minute for real-time updates
  })

  // Process and enhance expiring items
  const processedItems: ExpiringItem[] = (data?.items || []).map((item: any) => {
    const expirationDate = new Date(item.expirationDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    expirationDate.setHours(0, 0, 0, 0)
    
    const daysUntilExpiry = differenceInDays(expirationDate, today)
    
    let status: ExpiringItem['status']
    let color: string
    let urgency: number
    
    if (daysUntilExpiry < 0) {
      status = 'expired'
      color = 'red.500'
      urgency = 5
    } else if (daysUntilExpiry === 0) {
      status = 'expiring-today'
      color = 'orange.500'
      urgency = 4
    } else if (daysUntilExpiry <= 3) {
      status = 'expiring-soon'
      color = 'yellow.500'
      urgency = 3
    } else {
      status = 'fresh'
      color = 'green.500'
      urgency = 1
    }
    
    return {
      ...item,
      daysUntilExpiry,
      status,
      color,
      urgency,
    }
  })

  // Sort by urgency
  const sortedItems = processedItems.sort((a, b) => {
    // First by urgency
    if (b.urgency !== a.urgency) return b.urgency - a.urgency
    // Then by days until expiry
    return a.daysUntilExpiry - b.daysUntilExpiry
  })

  // Group items by status
  const itemsByStatus = sortedItems.reduce((acc: Record<string, ExpiringItem[]>, item) => {
    if (!acc[item.status]) {
      acc[item.status] = []
    }
    acc[item.status].push(item)
    return acc
  }, {})

  // Calculate statistics
  const stats: ExpirationStats = {
    expired: itemsByStatus['expired']?.length || 0,
    expiringToday: itemsByStatus['expiring-today']?.length || 0,
    expiringSoon: itemsByStatus['expiring-soon']?.length || 0,
    expiringThisWeek: sortedItems.filter(item => 
      item.daysUntilExpiry >= 0 && item.daysUntilExpiry <= 7
    ).length,
    totalValue: sortedItems.reduce((sum, item) => {
      // Estimate value based on item (simplified)
      const estimatedPrice = item.purchasePrice || 5 // Default $5 if no price
      return sum + estimatedPrice
    }, 0),
  }

  // Get timeline data for visualization
  const timeline = Array.from({ length: daysAhead }, (_, i) => {
    const date = addDays(new Date(), i)
    const dateStr = date.toISOString().split('T')[0]
    const items = sortedItems.filter(item => {
      const itemDate = new Date(item.expirationDate).toISOString().split('T')[0]
      return itemDate === dateStr
    })
    
    return {
      date,
      dateStr,
      dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
      items,
      count: items.length,
    }
  })

  // Get urgent notifications (items expiring in 24 hours)
  const urgentItems = sortedItems.filter(item => 
    item.daysUntilExpiry >= 0 && item.daysUntilExpiry <= 1
  )

  // Generate smart recommendations
  const recommendations = generateRecommendations(sortedItems)

  return {
    items: sortedItems,
    itemsByStatus,
    stats,
    timeline,
    urgentItems,
    recommendations,
    isLoading,
    error,
  }
}

function generateRecommendations(items: ExpiringItem[]): string[] {
  const recommendations: string[] = []
  
  // Group by category for better recommendations
  const byCategory = items.reduce((acc: Record<string, ExpiringItem[]>, item) => {
    const category = item.ingredient?.category || 'other'
    if (!acc[category]) acc[category] = []
    acc[category].push(item)
    return acc
  }, {})
  
  // Generate recommendations based on patterns
  if (byCategory['dairy']?.some(i => i.status === 'expiring-soon')) {
    recommendations.push('Consider making a creamy pasta or smoothie with your dairy items')
  }
  
  if (byCategory['vegetable']?.some(i => i.status === 'expiring-soon')) {
    recommendations.push('Perfect time for a stir-fry or vegetable soup!')
  }
  
  if (byCategory['protein']?.some(i => i.status === 'expiring-today')) {
    recommendations.push('Cook your protein today - it could be tomorrow\'s lunch!')
  }
  
  const expiringTodayCount = items.filter(i => i.status === 'expiring-today').length
  if (expiringTodayCount > 3) {
    recommendations.push(`You have ${expiringTodayCount} items expiring today - time for a creative freestyle dinner!`)
  }
  
  const expiredCount = items.filter(i => i.status === 'expired').length
  if (expiredCount > 0) {
    recommendations.push(`Remove ${expiredCount} expired item${expiredCount > 1 ? 's' : ''} from your pantry`)
  }
  
  return recommendations
}