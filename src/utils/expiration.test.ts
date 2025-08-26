import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getExpirationDefault,
  calculateExpirationDate,
  getExpirationStatus,
  formatExpirationDate,
  EXPIRATION_DATABASE
} from './expiration'

describe('Expiration Utilities', () => {
  beforeEach(() => {
    // Mock the current date to ensure consistent test results
    vi.setSystemTime(new Date('2024-01-15T10:00:00.000Z'))
  })

  describe('getExpirationDefault', () => {
    it('should return correct days for exact match items', () => {
      expect(getExpirationDefault('chicken', undefined, 'refrigerator')).toBe(2)
      expect(getExpirationDefault('chicken', undefined, 'freezer')).toBe(270)
      expect(getExpirationDefault('milk', undefined, 'refrigerator')).toBe(7)
      expect(getExpirationDefault('rice', undefined, 'pantry')).toBe(1095)
    })

    it('should handle case insensitive matching', () => {
      expect(getExpirationDefault('CHICKEN BREAST', undefined, 'refrigerator')).toBe(2)
      expect(getExpirationDefault('Bell Peppers', undefined, 'refrigerator')).toBe(10)
      expect(getExpirationDefault('APPLES', undefined, 'refrigerator')).toBe(28)
    })

    it('should find partial matches', () => {
      expect(getExpirationDefault('fresh chicken breast', undefined, 'refrigerator')).toBe(2)
      expect(getExpirationDefault('organic bell pepper', undefined, 'refrigerator')).toBe(10)
      expect(getExpirationDefault('whole milk', undefined, 'refrigerator')).toBe(7)
    })

    it('should use category fallback when item not found', () => {
      expect(getExpirationDefault('unknown vegetable', 'vegetables', 'refrigerator')).toBe(7)
      expect(getExpirationDefault('mysterious meat', 'meat', 'refrigerator')).toBe(2)
      expect(getExpirationDefault('weird grain', 'grains', 'pantry')).toBe(365)
    })

    it('should prioritize location-appropriate storage', () => {
      // Bread has different shelf lives by location
      expect(getExpirationDefault('bread', undefined, 'pantry')).toBe(3)
      expect(getExpirationDefault('bread', undefined, 'refrigerator')).toBe(7)
      expect(getExpirationDefault('bread', undefined, 'freezer')).toBe(90)
    })

    it('should handle items with no freezer option', () => {
      expect(getExpirationDefault('lettuce', undefined, 'refrigerator')).toBe(7)
      expect(getExpirationDefault('lettuce', undefined, 'freezer')).toBe(7) // Falls back to refrigerator
    })

    it('should handle items with no pantry option', () => {
      expect(getExpirationDefault('fish', undefined, 'pantry')).toBe(2) // Falls back to refrigerator
      expect(getExpirationDefault('fish', undefined, 'refrigerator')).toBe(2)
    })

    it('should return default value for completely unknown items', () => {
      expect(getExpirationDefault('completely unknown item')).toBe(7)
      expect(getExpirationDefault('xyz123', 'unknown_category')).toBe(7)
    })

    it('should handle edge cases with whitespace and special characters', () => {
      expect(getExpirationDefault('  chicken breast  ', undefined, 'refrigerator')).toBe(2)
      expect(getExpirationDefault('bell-pepper', undefined, 'refrigerator')).toBe(10)
    })

    it('should handle protein storage rules correctly', () => {
      // Protein should have 0 days counter shelf life (unsafe at room temperature)
      expect(getExpirationDefault('ground beef', undefined, 'counter')).toBe(2) // Falls back to refrigerator since counter is 0
      expect(getExpirationDefault('chicken', undefined, 'refrigerator')).toBe(2)
      expect(getExpirationDefault('salmon', undefined, 'freezer')).toBe(180)
    })

    it('should handle dairy storage correctly', () => {
      expect(getExpirationDefault('milk', undefined, 'refrigerator')).toBe(7)
      expect(getExpirationDefault('cheese', undefined, 'freezer')).toBe(180)
      expect(getExpirationDefault('yogurt', undefined, 'refrigerator')).toBe(7)
    })

    it('should handle long-term pantry items', () => {
      expect(getExpirationDefault('rice', undefined, 'pantry')).toBe(1095) // 3 years
      expect(getExpirationDefault('salt', undefined, 'pantry')).toBe(1825) // 5 years
      expect(getExpirationDefault('vinegar', undefined, 'pantry')).toBe(1825) // 5 years
    })

    it('should prioritize storage locations correctly', () => {
      const item = 'potatoes'
      expect(getExpirationDefault(item, undefined, 'pantry')).toBe(30)
      expect(getExpirationDefault(item, undefined, 'refrigerator')).toBe(14)
      // No freezer option, should fall back to refrigerator
      expect(getExpirationDefault(item, undefined, 'freezer')).toBe(14)
    })
  })

  describe('calculateExpirationDate', () => {
    it('should calculate expiration date from current date', () => {
      const result = calculateExpirationDate('chicken')
      const expected = new Date('2024-01-17T10:00:00.000Z') // 2 days from mocked current date
      expect(result).toEqual(expected)
    })

    it('should calculate expiration date from custom purchase date', () => {
      const purchaseDate = new Date('2024-01-10T10:00:00.000Z')
      const result = calculateExpirationDate('chicken', undefined, 'refrigerator', purchaseDate)
      const expected = new Date('2024-01-12T10:00:00.000Z') // 2 days from purchase date
      expect(result).toEqual(expected)
    })

    it('should handle different storage locations', () => {
      const purchaseDate = new Date('2024-01-10T10:00:00.000Z')
      
      const fridgeExpiry = calculateExpirationDate('bread', undefined, 'refrigerator', purchaseDate)
      expect(fridgeExpiry).toEqual(new Date('2024-01-17T10:00:00.000Z')) // 7 days
      
      const pantryExpiry = calculateExpirationDate('bread', undefined, 'pantry', purchaseDate)
      expect(pantryExpiry).toEqual(new Date('2024-01-13T10:00:00.000Z')) // 3 days
      
      const freezerExpiry = calculateExpirationDate('bread', undefined, 'freezer', purchaseDate)
      expect(freezerExpiry).toEqual(new Date('2024-04-09T10:00:00.000Z')) // 90 days
    })

    it('should work with category fallback', () => {
      const result = calculateExpirationDate('unknown vegetable', 'vegetables', 'refrigerator')
      const expected = new Date('2024-01-22T10:00:00.000Z') // 7 days from current date
      expect(result).toEqual(expected)
    })

    it('should handle leap years correctly', () => {
      vi.setSystemTime(new Date('2024-02-28T10:00:00.000Z')) // 2024 is a leap year
      const result = calculateExpirationDate('rice', undefined, 'pantry') // 1095 days = 3 years
      expect(result.getFullYear()).toBe(2027)
      expect(result.getMonth()).toBe(1) // February (0-indexed)
      expect(result.getDate()).toBe(28)
    })

    it('should handle end-of-month dates correctly', () => {
      vi.setSystemTime(new Date('2024-01-31T10:00:00.000Z'))
      const result = calculateExpirationDate('chicken') // 2 days
      expect(result).toEqual(new Date('2024-02-02T10:00:00.000Z'))
    })
  })

  describe('getExpirationStatus', () => {
    it('should return "fresh" for items expiring in more than warning days', () => {
      const futureDate = new Date('2024-01-20T10:00:00.000Z') // 5 days from mocked current date
      const result = getExpirationStatus(futureDate, 2)
      
      expect(result.status).toBe('fresh')
      expect(result.daysUntilExpiration).toBe(5)
      expect(result.color).toBe('#008060')
    })

    it('should return "expiring" for items expiring within warning days', () => {
      const soonDate = new Date('2024-01-16T10:00:00.000Z') // 1 day from mocked current date
      const result = getExpirationStatus(soonDate, 2)
      
      expect(result.status).toBe('expiring')
      expect(result.daysUntilExpiration).toBe(1)
      expect(result.color).toBe('#ffb503')
    })

    it('should return "expiring" for items expiring today', () => {
      const todayDate = new Date('2024-01-15T23:59:59.999Z') // Same day as mocked current date
      const result = getExpirationStatus(todayDate, 2)
      
      expect(result.status).toBe('expiring')
      expect(result.daysUntilExpiration).toBe(0)
      expect(result.color).toBe('#ffb503')
    })

    it('should return "expired" for items past expiration', () => {
      const pastDate = new Date('2024-01-10T10:00:00.000Z') // 5 days before mocked current date
      const result = getExpirationStatus(pastDate, 2)
      
      expect(result.status).toBe('expired')
      expect(result.daysUntilExpiration).toBe(-5)
      expect(result.color).toBe('#d72c0d')
    })

    it('should handle custom warning days', () => {
      const futureDate = new Date('2024-01-18T10:00:00.000Z') // 3 days from mocked current date
      
      // With 2 day warning - should be fresh
      const result1 = getExpirationStatus(futureDate, 2)
      expect(result1.status).toBe('fresh')
      
      // With 5 day warning - should be expiring
      const result2 = getExpirationStatus(futureDate, 5)
      expect(result2.status).toBe('expiring')
    })

    it('should handle timezone edge cases', () => {
      // Test with different times of day
      const morningExpiry = new Date('2024-01-16T06:00:00.000Z')
      const eveningExpiry = new Date('2024-01-16T18:00:00.000Z')
      
      const morningResult = getExpirationStatus(morningExpiry, 2)
      const eveningResult = getExpirationStatus(eveningExpiry, 2)
      
      expect(morningResult.daysUntilExpiration).toBe(1)
      expect(eveningResult.daysUntilExpiration).toBe(1)
      expect(morningResult.status).toBe('expiring')
      expect(eveningResult.status).toBe('expiring')
    })

    it('should round up days until expiration correctly', () => {
      // 1.5 days should round up to 2
      const futureDate = new Date('2024-01-16T22:00:00.000Z')
      const result = getExpirationStatus(futureDate, 1)
      
      expect(result.daysUntilExpiration).toBe(2) // Should round up
      expect(result.status).toBe('fresh')
    })

    it('should handle very long expiration periods', () => {
      const farFutureDate = new Date('2025-01-15T10:00:00.000Z') // 1 year from mocked current date
      const result = getExpirationStatus(farFutureDate, 2)
      
      expect(result.status).toBe('fresh')
      expect(result.daysUntilExpiration).toBe(365)
      expect(result.color).toBe('#008060')
    })
  })

  describe('formatExpirationDate', () => {
    it('should format dates expiring today', () => {
      const todayDate = new Date('2024-01-15T15:30:00.000Z')
      const result = formatExpirationDate(todayDate)
      expect(result).toBe('Expires today')
    })

    it('should format dates expiring tomorrow', () => {
      const tomorrowDate = new Date('2024-01-16T08:00:00.000Z')
      const result = formatExpirationDate(tomorrowDate)
      expect(result).toBe('Expires tomorrow')
    })

    it('should format future expiration dates', () => {
      const futureDate = new Date('2024-01-18T10:00:00.000Z') // 3 days from current
      const result = formatExpirationDate(futureDate)
      expect(result).toBe('Expires in 3 days')
      
      const singleDayFuture = new Date('2024-01-17T10:00:00.000Z') // 2 days from current
      const singleResult = formatExpirationDate(singleDayFuture)
      expect(singleResult).toBe('Expires in 2 days')
    })

    it('should format past expiration dates', () => {
      const pastDate = new Date('2024-01-12T10:00:00.000Z') // 3 days ago
      const result = formatExpirationDate(pastDate)
      expect(result).toBe('Expired 3 days ago')
      
      const singleDayPast = new Date('2024-01-14T10:00:00.000Z') // 1 day ago
      const singleResult = formatExpirationDate(singleDayPast)
      expect(singleResult).toBe('Expired 1 day ago')
    })

    it('should handle singular vs plural correctly', () => {
      const oneDayFuture = new Date('2024-01-16T23:59:59.999Z')
      const threeDaysFuture = new Date('2024-01-18T10:00:00.000Z')
      const oneDayPast = new Date('2024-01-14T00:00:00.000Z')
      const threeDaysPast = new Date('2024-01-12T10:00:00.000Z')
      
      expect(formatExpirationDate(oneDayFuture)).toBe('Expires tomorrow')
      expect(formatExpirationDate(threeDaysFuture)).toBe('Expires in 3 days')
      expect(formatExpirationDate(oneDayPast)).toBe('Expired 1 day ago')
      expect(formatExpirationDate(threeDaysPast)).toBe('Expired 3 days ago')
    })

    it('should handle time zone edge cases', () => {
      // Test at different times of day to ensure consistent date comparison
      const earlyMorningToday = new Date('2024-01-15T01:00:00.000Z')
      const lateMorningToday = new Date('2024-01-15T23:59:59.999Z')
      
      expect(formatExpirationDate(earlyMorningToday)).toBe('Expires today')
      expect(formatExpirationDate(lateMorningToday)).toBe('Expires today')
    })

    it('should handle month boundaries correctly', () => {
      vi.setSystemTime(new Date('2024-01-31T10:00:00.000Z'))
      
      const tomorrowDate = new Date('2024-02-01T10:00:00.000Z')
      const result = formatExpirationDate(tomorrowDate)
      expect(result).toBe('Expires tomorrow')
    })

    it('should handle year boundaries correctly', () => {
      vi.setSystemTime(new Date('2024-12-31T10:00:00.000Z'))
      
      const tomorrowDate = new Date('2025-01-01T10:00:00.000Z')
      const result = formatExpirationDate(tomorrowDate)
      expect(result).toBe('Expires tomorrow')
    })
  })

  describe('EXPIRATION_DATABASE validation', () => {
    it('should contain all required default categories', () => {
      expect(EXPIRATION_DATABASE['default_vegetables']).toBeDefined()
      expect(EXPIRATION_DATABASE['default_fruits']).toBeDefined()
      expect(EXPIRATION_DATABASE['default_dairy']).toBeDefined()
      expect(EXPIRATION_DATABASE['default_meat']).toBeDefined()
      expect(EXPIRATION_DATABASE['default_leftovers']).toBeDefined()
      expect(EXPIRATION_DATABASE['default_grains']).toBeDefined()
      expect(EXPIRATION_DATABASE['default_canned']).toBeDefined()
      expect(EXPIRATION_DATABASE['default_spices']).toBeDefined()
    })

    it('should have consistent data structure', () => {
      Object.entries(EXPIRATION_DATABASE).forEach(([key, info]) => {
        expect(info.name).toBeTruthy()
        expect(typeof info.name).toBe('string')
        expect(info.category).toBeTruthy()
        expect(typeof info.category).toBe('string')
        
        // Should have at least one storage duration
        const hasStorage = info.refrigeratorDays || info.freezerDays || info.pantryDays
        expect(hasStorage).toBeTruthy()
        
        // All durations should be positive numbers if present
        if (info.refrigeratorDays) expect(info.refrigeratorDays).toBeGreaterThan(0)
        if (info.freezerDays) expect(info.freezerDays).toBeGreaterThan(0)
        if (info.pantryDays) expect(info.pantryDays).toBeGreaterThan(0)
      })
    })

    it('should have logical storage duration relationships', () => {
      // Freezer should generally be longer than refrigerator
      const chickenInfo = EXPIRATION_DATABASE['chicken']
      if (chickenInfo.freezerDays && chickenInfo.refrigeratorDays) {
        expect(chickenInfo.freezerDays).toBeGreaterThan(chickenInfo.refrigeratorDays)
      }
      
      // Dry goods should last longer in pantry
      const riceInfo = EXPIRATION_DATABASE['rice']
      if (riceInfo.pantryDays && riceInfo.refrigeratorDays) {
        expect(riceInfo.pantryDays).toBeGreaterThan(riceInfo.refrigeratorDays)
      }
    })

    it('should have appropriate durations for food safety', () => {
      // Fresh meat should have short refrigerator life (food safety)
      expect(EXPIRATION_DATABASE['chicken'].refrigeratorDays).toBeLessThanOrEqual(3)
      expect(EXPIRATION_DATABASE['ground beef'].refrigeratorDays).toBeLessThanOrEqual(2)
      expect(EXPIRATION_DATABASE['fish'].refrigeratorDays).toBeLessThanOrEqual(2)
      
      // Leftovers should have short life
      expect(EXPIRATION_DATABASE['leftovers'].refrigeratorDays).toBeLessThanOrEqual(4)
      
      // Dairy products should be reasonable
      expect(EXPIRATION_DATABASE['milk'].refrigeratorDays).toBeLessThanOrEqual(14)
    })
  })

  describe('Integration scenarios for food waste prevention', () => {
    it('should properly categorize items for meal planning priority', () => {
      // Items expiring soon should be identified correctly
      const expiringChicken = new Date('2024-01-16T10:00:00.000Z') // Tomorrow
      const freshRice = new Date('2024-04-15T10:00:00.000Z') // 3 months

      const chickenStatus = getExpirationStatus(expiringChicken, 2)
      const riceStatus = getExpirationStatus(freshRice, 2)

      expect(chickenStatus.status).toBe('expiring')
      expect(riceStatus.status).toBe('fresh')
    })

    it('should handle leftover lifecycle correctly', () => {
      // Leftovers should have shorter life than original ingredients
      const leftoverDays = getExpirationDefault('leftovers', undefined, 'refrigerator')
      const chickenDays = getExpirationDefault('chicken', undefined, 'refrigerator')
      
      expect(leftoverDays).toBeLessThanOrEqual(chickenDays + 1) // Should not be much longer
    })

    it('should prioritize by expiration urgency', () => {
      const items = [
        { name: 'chicken', date: new Date('2024-01-16T10:00:00.000Z') }, // 1 day
        { name: 'rice', date: new Date('2024-04-15T10:00:00.000Z') }, // 3 months
        { name: 'milk', date: new Date('2024-01-17T10:00:00.000Z') }, // 2 days
        { name: 'leftovers', date: new Date('2024-01-15T10:00:00.000Z') }, // Today
      ]

      const withStatus = items.map(item => ({
        ...item,
        status: getExpirationStatus(item.date, 2)
      }))

      // Sort by urgency (expired first, then expiring, then fresh)
      const sorted = withStatus.sort((a, b) => {
        const urgencyOrder = { expired: 0, expiring: 1, fresh: 2 }
        const aUrgency = urgencyOrder[a.status.status]
        const bUrgency = urgencyOrder[b.status.status]
        
        if (aUrgency !== bUrgency) return aUrgency - bUrgency
        return a.status.daysUntilExpiration - b.status.daysUntilExpiration
      })

      expect(sorted[0].name).toBe('leftovers') // Expiring today
      expect(sorted[1].name).toBe('chicken') // 1 day
      expect(sorted[2].name).toBe('milk') // 2 days
      expect(sorted[3].name).toBe('rice') // 3 months
    })

    it('should handle empty pantry scenario', () => {
      // Should provide reasonable defaults even for unknown items
      const unknownItem = getExpirationDefault('mystery food item')
      expect(unknownItem).toBe(7) // Safe 1-week default
      
      const mysteryDate = calculateExpirationDate('mystery food item')
      const expectedDate = new Date('2024-01-22T10:00:00.000Z')
      expect(mysteryDate).toEqual(expectedDate)
    })

    it('should handle storage location changes correctly', () => {
      // Moving items between locations should update expiration appropriately
      const bread = 'bread'
      
      const pantryLife = getExpirationDefault(bread, undefined, 'pantry') // 3 days
      const fridgeLife = getExpirationDefault(bread, undefined, 'refrigerator') // 7 days  
      const freezerLife = getExpirationDefault(bread, undefined, 'freezer') // 90 days
      
      expect(freezerLife).toBeGreaterThan(fridgeLife)
      expect(fridgeLife).toBeGreaterThan(pantryLife)
    })
  })
})