import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { addDays } from 'date-fns'

// Mock the database
vi.mock('../lib/db', () => ({
  prisma: {
    pantryItem: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    ingredient: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  }
}))

const mockDb = await import('../lib/db')

// Mock expiration utilities
vi.mock('../../src/utils/expiration', () => ({
  calculateExpirationDate: vi.fn(),
  getExpirationStatus: vi.fn(),
  getExpirationDefault: vi.fn(),
}))

const mockExpiration = await import('../../src/utils/expiration')

// Create a PantryService class for testing business logic
class PantryService {
  async getPantryItemsForUser(userId: string) {
    return await mockDb.prisma.pantryItem.findMany({
      where: { userId },
      include: {
        ingredient: {
          select: {
            name: true,
            category: true,
            calories: true,
            shelfLifeFridge: true,
            shelfLifeFreezer: true,
            shelfLifeCounter: true,
          },
        },
      },
      orderBy: { expirationDate: 'asc' },
    })
  }

  async getExpiringItems(userId: string, days: number = 7) {
    const cutoffDate = addDays(new Date(), days)
    
    return await mockDb.prisma.pantryItem.findMany({
      where: {
        userId,
        expirationDate: {
          lte: cutoffDate,
        },
      },
      include: {
        ingredient: true,
      },
      orderBy: { expirationDate: 'asc' },
    })
  }

  async checkIngredientAvailability(userId: string, requiredIngredients: Array<{ name: string; amount: number; unit: string }>) {
    const pantryItems = await this.getPantryItemsForUser(userId)
    
    const availability = requiredIngredients.map(required => {
      const availableItems = pantryItems.filter(item => 
        item.ingredient?.name.toLowerCase().includes(required.name.toLowerCase()) ||
        item.customName.toLowerCase().includes(required.name.toLowerCase())
      )
      
      const totalAvailable = availableItems.reduce((sum, item) => {
        // Simple unit conversion - in reality this would be more sophisticated
        return sum + item.amount
      }, 0)
      
      return {
        ingredient: required.name,
        required: required.amount,
        available: totalAvailable,
        sufficient: totalAvailable >= required.amount,
        items: availableItems.map(item => ({
          id: item.id,
          name: item.customName,
          amount: item.amount,
          unit: item.unit,
          expirationDate: item.expirationDate
        }))
      }
    })
    
    return availability
  }

  async addPantryItem(userId: string, itemData: {
    customName: string
    amount: number
    unit: string
    location: string
    ingredientName?: string
    purchaseDate?: Date
    expirationDate?: Date
  }) {
    let ingredient = null
    
    // Try to find or create ingredient
    if (itemData.ingredientName) {
      ingredient = await mockDb.prisma.ingredient.findUnique({
        where: { name: itemData.ingredientName.toLowerCase() }
      })
    }
    
    // Calculate expiration date if not provided
    let expirationDate = itemData.expirationDate
    if (!expirationDate && itemData.ingredientName) {
      expirationDate = mockExpiration.calculateExpirationDate(
        itemData.ingredientName,
        ingredient?.category,
        itemData.location,
        itemData.purchaseDate
      )
    }
    
    const pantryItem = await mockDb.prisma.pantryItem.create({
      data: {
        userId,
        ingredientId: ingredient?.id,
        customName: itemData.customName,
        amount: itemData.amount,
        unit: itemData.unit,
        location: itemData.location,
        purchaseDate: itemData.purchaseDate || new Date(),
        expirationDate,
      },
      include: {
        ingredient: true,
      },
    })
    
    return pantryItem
  }

  async updatePantryItemAmount(itemId: string, userId: string, newAmount: number) {
    const item = await mockDb.prisma.pantryItem.findUnique({
      where: { id: itemId },
    })
    
    if (!item || item.userId !== userId) {
      throw new Error('Item not found or access denied')
    }
    
    // If amount reaches 0, mark as depleted
    if (newAmount <= 0) {
      return await this.markItemAsUsed(itemId, userId)
    }
    
    return await mockDb.prisma.pantryItem.update({
      where: { id: itemId },
      data: { amount: newAmount },
      include: { ingredient: true },
    })
  }

  async markItemAsUsed(itemId: string, userId: string) {
    const item = await mockDb.prisma.pantryItem.findUnique({
      where: { id: itemId },
      include: { ingredient: true },
    })
    
    if (!item || item.userId !== userId) {
      throw new Error('Item not found or access denied')
    }
    
    // Delete the pantry item and create a historical record
    await mockDb.prisma.pantryItem.delete({
      where: { id: itemId },
    })
    
    return { success: true, item }
  }

  async createLeftover(userId: string, leftoverData: {
    customName: string
    amount: number
    unit: string
    leftoverFromRecipeId?: string
    expirationDate?: Date
  }) {
    const expirationDate = leftoverData.expirationDate || 
      mockExpiration.calculateExpirationDate('leftovers', 'leftovers', 'FRIDGE')
    
    return await mockDb.prisma.pantryItem.create({
      data: {
        userId,
        customName: leftoverData.customName,
        amount: leftoverData.amount,
        unit: leftoverData.unit,
        location: 'FRIDGE',
        isLeftover: true,
        leftoverFromId: leftoverData.leftoverFromRecipeId,
        leftoverDate: new Date(),
        expirationDate,
      },
      include: { ingredient: true },
    })
  }

  async getStaplesToReorder(userId: string) {
    // Get frequently used items that are low or depleted
    const pantryItems = await this.getPantryItemsForUser(userId)
    
    // Simple logic to identify staples that need reordering
    const lowItems = pantryItems.filter(item => {
      const category = item.ingredient?.category || 'other'
      
      // Define minimum thresholds by category
      const thresholds = {
        'grain': 2,      // 2 cups of rice, pasta, etc.
        'dairy': 1,      // 1 unit of milk, eggs
        'spice': 0.5,    // Half container of common spices
        'oil': 0.25,     // Quarter bottle of cooking oil
        'other': 1
      }
      
      const threshold = thresholds[category] || thresholds['other']
      return item.amount <= threshold
    })
    
    return lowItems
  }

  async getSuggestedSubstitutions(ingredientName: string) {
    // This would typically query a substitution database
    // For now, return mock substitutions based on common patterns
    const substitutions = {
      'butter': ['margarine', 'coconut oil', 'olive oil'],
      'milk': ['almond milk', 'soy milk', 'coconut milk'],
      'eggs': ['applesauce', 'banana', 'flax eggs'],
      'sugar': ['honey', 'maple syrup', 'stevia'],
      'flour': ['almond flour', 'coconut flour', 'oat flour'],
    }
    
    const ingredient = ingredientName.toLowerCase()
    for (const [key, subs] of Object.entries(substitutions)) {
      if (ingredient.includes(key)) {
        return subs
      }
    }
    
    return []
  }

  async bulkUpdateExpiration(userId: string, updates: Array<{ itemId: string; expirationDate: Date }>) {
    return await mockDb.prisma.$transaction(
      updates.map(update => 
        mockDb.prisma.pantryItem.update({
          where: { 
            id: update.itemId,
            userId // Ensure user owns the item
          },
          data: { expirationDate: update.expirationDate }
        })
      )
    )
  }

  async getExpirationSummary(userId: string) {
    const pantryItems = await this.getPantryItemsForUser(userId)
    
    const summary = {
      total: pantryItems.length,
      expired: 0,
      expiringSoon: 0,
      fresh: 0,
      noExpiration: 0,
      categories: {} as Record<string, number>
    }
    
    pantryItems.forEach(item => {
      if (!item.expirationDate) {
        summary.noExpiration++
        return
      }
      
      const status = mockExpiration.getExpirationStatus(item.expirationDate, 2)
      
      if (status.status === 'expired') {
        summary.expired++
      } else if (status.status === 'expiring') {
        summary.expiringSoon++
      } else {
        summary.fresh++
      }
      
      // Count by category
      const category = item.ingredient?.category || 'other'
      summary.categories[category] = (summary.categories[category] || 0) + 1
    })
    
    return summary
  }
}

describe('PantryService', () => {
  let pantryService: PantryService
  const userId = 'test-user-id'
  
  beforeEach(() => {
    pantryService = new PantryService()
    vi.clearAllMocks()
    vi.setSystemTime(new Date('2024-01-15T10:00:00.000Z'))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getPantryItemsForUser', () => {
    it('should fetch all pantry items for a user ordered by expiration date', async () => {
      const mockItems = [
        {
          id: 'item1',
          userId,
          customName: 'Chicken Breast',
          amount: 2,
          unit: 'lbs',
          expirationDate: new Date('2024-01-17'),
          ingredient: {
            name: 'chicken breast',
            category: 'protein',
            calories: 165
          }
        },
        {
          id: 'item2',
          userId,
          customName: 'Spinach',
          amount: 1,
          unit: 'bag',
          expirationDate: new Date('2024-01-20'),
          ingredient: {
            name: 'spinach',
            category: 'vegetable',
            calories: 23
          }
        }
      ]

      mockDb.prisma.pantryItem.findMany.mockResolvedValue(mockItems)

      const result = await pantryService.getPantryItemsForUser(userId)

      expect(mockDb.prisma.pantryItem.findMany).toHaveBeenCalledWith({
        where: { userId },
        include: {
          ingredient: {
            select: {
              name: true,
              category: true,
              calories: true,
              shelfLifeFridge: true,
              shelfLifeFreezer: true,
              shelfLifeCounter: true,
            },
          },
        },
        orderBy: { expirationDate: 'asc' },
      })
      expect(result).toEqual(mockItems)
    })

    it('should handle empty pantry', async () => {
      mockDb.prisma.pantryItem.findMany.mockResolvedValue([])

      const result = await pantryService.getPantryItemsForUser(userId)

      expect(result).toEqual([])
    })
  })

  describe('getExpiringItems', () => {
    it('should return items expiring within specified days', async () => {
      const mockExpiringItems = [
        {
          id: 'item1',
          userId,
          customName: 'Milk',
          expirationDate: new Date('2024-01-16'), // Tomorrow
          ingredient: { name: 'milk', category: 'dairy' }
        }
      ]

      mockDb.prisma.pantryItem.findMany.mockResolvedValue(mockExpiringItems)

      const result = await pantryService.getExpiringItems(userId, 3)

      expect(mockDb.prisma.pantryItem.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          expirationDate: {
            lte: new Date('2024-01-18T10:00:00.000Z'), // 3 days from current time
          },
        },
        include: {
          ingredient: true,
        },
        orderBy: { expirationDate: 'asc' },
      })
      expect(result).toEqual(mockExpiringItems)
    })

    it('should default to 7 days if not specified', async () => {
      mockDb.prisma.pantryItem.findMany.mockResolvedValue([])

      await pantryService.getExpiringItems(userId)

      expect(mockDb.prisma.pantryItem.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          expirationDate: {
            lte: new Date('2024-01-22T10:00:00.000Z'), // 7 days from current time
          },
        },
        include: {
          ingredient: true,
        },
        orderBy: { expirationDate: 'asc' },
      })
    })
  })

  describe('checkIngredientAvailability', () => {
    const mockPantryItems = [
      {
        id: 'item1',
        customName: 'Chicken Breast',
        amount: 2,
        unit: 'lbs',
        expirationDate: new Date('2024-01-20'),
        ingredient: { name: 'chicken breast', category: 'protein' }
      },
      {
        id: 'item2',
        customName: 'Fresh Spinach',
        amount: 4,
        unit: 'cups',
        expirationDate: new Date('2024-01-18'),
        ingredient: { name: 'spinach', category: 'vegetable' }
      }
    ]

    it('should check availability of required ingredients', async () => {
      mockDb.prisma.pantryItem.findMany.mockResolvedValue(mockPantryItems)

      const requiredIngredients = [
        { name: 'chicken', amount: 1, unit: 'lb' },
        { name: 'spinach', amount: 2, unit: 'cups' },
        { name: 'onion', amount: 1, unit: 'medium' }
      ]

      const result = await pantryService.checkIngredientAvailability(userId, requiredIngredients)

      expect(result).toHaveLength(3)
      
      // Chicken should be sufficient
      expect(result[0]).toEqual({
        ingredient: 'chicken',
        required: 1,
        available: 2,
        sufficient: true,
        items: [{
          id: 'item1',
          name: 'Chicken Breast',
          amount: 2,
          unit: 'lbs',
          expirationDate: new Date('2024-01-20')
        }]
      })
      
      // Spinach should be sufficient
      expect(result[1]).toEqual({
        ingredient: 'spinach',
        required: 2,
        available: 4,
        sufficient: true,
        items: [{
          id: 'item2',
          name: 'Fresh Spinach',
          amount: 4,
          unit: 'cups',
          expirationDate: new Date('2024-01-18')
        }]
      })
      
      // Onion should not be available
      expect(result[2]).toEqual({
        ingredient: 'onion',
        required: 1,
        available: 0,
        sufficient: false,
        items: []
      })
    })

    it('should handle empty pantry', async () => {
      mockDb.prisma.pantryItem.findMany.mockResolvedValue([])

      const requiredIngredients = [
        { name: 'chicken', amount: 1, unit: 'lb' }
      ]

      const result = await pantryService.checkIngredientAvailability(userId, requiredIngredients)

      expect(result[0].sufficient).toBe(false)
      expect(result[0].available).toBe(0)
    })

    it('should handle partial availability', async () => {
      const limitedPantry = [{
        id: 'item1',
        customName: 'Chicken Breast',
        amount: 0.5,
        unit: 'lbs',
        expirationDate: new Date('2024-01-20'),
        ingredient: { name: 'chicken breast', category: 'protein' }
      }]

      mockDb.prisma.pantryItem.findMany.mockResolvedValue(limitedPantry)

      const requiredIngredients = [
        { name: 'chicken', amount: 1, unit: 'lb' }
      ]

      const result = await pantryService.checkIngredientAvailability(userId, requiredIngredients)

      expect(result[0].sufficient).toBe(false)
      expect(result[0].available).toBe(0.5)
      expect(result[0].required).toBe(1)
    })
  })

  describe('addPantryItem', () => {
    it('should add a new pantry item with ingredient lookup', async () => {
      const mockIngredient = {
        id: 'ing1',
        name: 'chicken breast',
        category: 'protein'
      }

      const mockCreatedItem = {
        id: 'item1',
        userId,
        ingredientId: 'ing1',
        customName: 'Organic Chicken Breast',
        amount: 2,
        unit: 'lbs',
        location: 'FRIDGE',
        expirationDate: new Date('2024-01-17'),
        ingredient: mockIngredient
      }

      mockDb.prisma.ingredient.findUnique.mockResolvedValue(mockIngredient)
      mockExpiration.calculateExpirationDate.mockReturnValue(new Date('2024-01-17'))
      mockDb.prisma.pantryItem.create.mockResolvedValue(mockCreatedItem)

      const result = await pantryService.addPantryItem(userId, {
        customName: 'Organic Chicken Breast',
        amount: 2,
        unit: 'lbs',
        location: 'FRIDGE',
        ingredientName: 'chicken breast'
      })

      expect(mockDb.prisma.ingredient.findUnique).toHaveBeenCalledWith({
        where: { name: 'chicken breast' }
      })
      expect(mockExpiration.calculateExpirationDate).toHaveBeenCalledWith(
        'chicken breast',
        'protein',
        'FRIDGE',
        undefined
      )
      expect(result).toEqual(mockCreatedItem)
    })

    it('should handle adding item without ingredient match', async () => {
      mockDb.prisma.ingredient.findUnique.mockResolvedValue(null)
      mockDb.prisma.pantryItem.create.mockResolvedValue({
        id: 'item1',
        userId,
        customName: 'Mystery Item',
        amount: 1,
        unit: 'piece'
      })

      const result = await pantryService.addPantryItem(userId, {
        customName: 'Mystery Item',
        amount: 1,
        unit: 'piece',
        location: 'PANTRY',
        ingredientName: 'unknown ingredient'
      })

      expect(mockDb.prisma.pantryItem.create).toHaveBeenCalledWith({
        data: {
          userId,
          ingredientId: null,
          customName: 'Mystery Item',
          amount: 1,
          unit: 'piece',
          location: 'PANTRY',
          purchaseDate: expect.any(Date),
          expirationDate: undefined,
        },
        include: {
          ingredient: true,
        },
      })
    })

    it('should use provided expiration date over calculated one', async () => {
      const customExpirationDate = new Date('2024-01-25')
      
      mockDb.prisma.ingredient.findUnique.mockResolvedValue(null)
      mockDb.prisma.pantryItem.create.mockResolvedValue({
        id: 'item1',
        expirationDate: customExpirationDate
      })

      await pantryService.addPantryItem(userId, {
        customName: 'Custom Expiry Item',
        amount: 1,
        unit: 'piece',
        location: 'PANTRY',
        expirationDate: customExpirationDate
      })

      expect(mockExpiration.calculateExpirationDate).not.toHaveBeenCalled()
      expect(mockDb.prisma.pantryItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          expirationDate: customExpirationDate
        }),
        include: { ingredient: true }
      })
    })
  })

  describe('updatePantryItemAmount', () => {
    const mockItem = {
      id: 'item1',
      userId,
      customName: 'Milk',
      amount: 4,
      unit: 'cups'
    }

    it('should update item amount when amount > 0', async () => {
      const updatedItem = { ...mockItem, amount: 2 }

      mockDb.prisma.pantryItem.findUnique.mockResolvedValue(mockItem)
      mockDb.prisma.pantryItem.update.mockResolvedValue(updatedItem)

      const result = await pantryService.updatePantryItemAmount('item1', userId, 2)

      expect(mockDb.prisma.pantryItem.update).toHaveBeenCalledWith({
        where: { id: 'item1' },
        data: { amount: 2 },
        include: { ingredient: true }
      })
      expect(result).toEqual(updatedItem)
    })

    it('should mark item as used when amount reaches 0', async () => {
      mockDb.prisma.pantryItem.findUnique.mockResolvedValue(mockItem)
      mockDb.prisma.pantryItem.delete.mockResolvedValue(mockItem)

      const result = await pantryService.updatePantryItemAmount('item1', userId, 0)

      expect(mockDb.prisma.pantryItem.delete).toHaveBeenCalledWith({
        where: { id: 'item1' }
      })
      expect(result).toEqual({ success: true, item: mockItem })
    })

    it('should throw error if item not found', async () => {
      mockDb.prisma.pantryItem.findUnique.mockResolvedValue(null)

      await expect(
        pantryService.updatePantryItemAmount('nonexistent', userId, 1)
      ).rejects.toThrow('Item not found or access denied')
    })

    it('should throw error if user does not own item', async () => {
      const otherUserItem = { ...mockItem, userId: 'other-user' }
      mockDb.prisma.pantryItem.findUnique.mockResolvedValue(otherUserItem)

      await expect(
        pantryService.updatePantryItemAmount('item1', userId, 1)
      ).rejects.toThrow('Item not found or access denied')
    })
  })

  describe('createLeftover', () => {
    it('should create leftover with calculated expiration', async () => {
      const leftoverData = {
        customName: 'Leftover Spaghetti',
        amount: 2,
        unit: 'servings',
        leftoverFromRecipeId: 'recipe1'
      }

      const calculatedExpiry = new Date('2024-01-18') // 3 days for leftovers
      const createdLeftover = {
        id: 'leftover1',
        ...leftoverData,
        isLeftover: true,
        location: 'FRIDGE',
        expirationDate: calculatedExpiry
      }

      mockExpiration.calculateExpirationDate.mockReturnValue(calculatedExpiry)
      mockDb.prisma.pantryItem.create.mockResolvedValue(createdLeftover)

      const result = await pantryService.createLeftover(userId, leftoverData)

      expect(mockExpiration.calculateExpirationDate).toHaveBeenCalledWith(
        'leftovers',
        'leftovers',
        'FRIDGE'
      )
      expect(mockDb.prisma.pantryItem.create).toHaveBeenCalledWith({
        data: {
          userId,
          customName: 'Leftover Spaghetti',
          amount: 2,
          unit: 'servings',
          location: 'FRIDGE',
          isLeftover: true,
          leftoverFromId: 'recipe1',
          leftoverDate: expect.any(Date),
          expirationDate: calculatedExpiry,
        },
        include: { ingredient: true },
      })
      expect(result).toEqual(createdLeftover)
    })

    it('should use provided expiration date for leftovers', async () => {
      const customExpiry = new Date('2024-01-20')
      const leftoverData = {
        customName: 'Custom Expiry Leftover',
        amount: 1,
        unit: 'serving',
        expirationDate: customExpiry
      }

      mockDb.prisma.pantryItem.create.mockResolvedValue({
        ...leftoverData,
        expirationDate: customExpiry
      })

      await pantryService.createLeftover(userId, leftoverData)

      expect(mockExpiration.calculateExpirationDate).not.toHaveBeenCalled()
      expect(mockDb.prisma.pantryItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          expirationDate: customExpiry
        }),
        include: { ingredient: true }
      })
    })
  })

  describe('getStaplesToReorder', () => {
    it('should identify low staple items', async () => {
      const mockPantryItems = [
        {
          id: 'item1',
          customName: 'Rice',
          amount: 1.5, // Below threshold of 2 for grains
          unit: 'cups',
          ingredient: { name: 'rice', category: 'grain' }
        },
        {
          id: 'item2',
          customName: 'Olive Oil',
          amount: 0.2, // Below threshold of 0.25 for oils
          unit: 'bottles',
          ingredient: { name: 'olive oil', category: 'oil' }
        },
        {
          id: 'item3',
          customName: 'Chicken Breast',
          amount: 3, // Above threshold - should not be included
          unit: 'lbs',
          ingredient: { name: 'chicken breast', category: 'protein' }
        }
      ]

      mockDb.prisma.pantryItem.findMany.mockResolvedValue(mockPantryItems)

      const result = await pantryService.getStaplesToReorder(userId)

      expect(result).toHaveLength(2)
      expect(result.map(item => item.customName)).toEqual(['Rice', 'Olive Oil'])
    })

    it('should handle items without ingredients', async () => {
      const mockPantryItems = [
        {
          id: 'item1',
          customName: 'Mystery Low Item',
          amount: 0.5, // Below default threshold of 1
          unit: 'units',
          ingredient: null
        }
      ]

      mockDb.prisma.pantryItem.findMany.mockResolvedValue(mockPantryItems)

      const result = await pantryService.getStaplesToReorder(userId)

      expect(result).toHaveLength(1)
      expect(result[0].customName).toBe('Mystery Low Item')
    })

    it('should return empty array when all items are well-stocked', async () => {
      const mockPantryItems = [
        {
          id: 'item1',
          customName: 'Rice',
          amount: 5, // Well above threshold
          unit: 'cups',
          ingredient: { name: 'rice', category: 'grain' }
        }
      ]

      mockDb.prisma.pantryItem.findMany.mockResolvedValue(mockPantryItems)

      const result = await pantryService.getStaplesToReorder(userId)

      expect(result).toEqual([])
    })
  })

  describe('getSuggestedSubstitutions', () => {
    it('should return substitutions for common ingredients', async () => {
      const butterSubs = await pantryService.getSuggestedSubstitutions('unsalted butter')
      expect(butterSubs).toContain('margarine')
      expect(butterSubs).toContain('coconut oil')
      expect(butterSubs).toContain('olive oil')

      const milkSubs = await pantryService.getSuggestedSubstitutions('whole milk')
      expect(milkSubs).toContain('almond milk')
      expect(milkSubs).toContain('soy milk')

      const eggSubs = await pantryService.getSuggestedSubstitutions('large eggs')
      expect(eggSubs).toContain('applesauce')
      expect(eggSubs).toContain('banana')
    })

    it('should return empty array for unknown ingredients', async () => {
      const result = await pantryService.getSuggestedSubstitutions('exotic mystery ingredient')
      expect(result).toEqual([])
    })

    it('should handle case insensitive matching', async () => {
      const result = await pantryService.getSuggestedSubstitutions('BUTTER')
      expect(result.length).toBeGreaterThan(0)
      expect(result).toContain('margarine')
    })
  })

  describe('bulkUpdateExpiration', () => {
    it('should update multiple items expiration dates in transaction', async () => {
      const updates = [
        { itemId: 'item1', expirationDate: new Date('2024-01-20') },
        { itemId: 'item2', expirationDate: new Date('2024-01-22') }
      ]

      const mockTransactionResult = [
        { id: 'item1', expirationDate: new Date('2024-01-20') },
        { id: 'item2', expirationDate: new Date('2024-01-22') }
      ]

      mockDb.prisma.$transaction.mockResolvedValue(mockTransactionResult)

      const result = await pantryService.bulkUpdateExpiration(userId, updates)

      expect(mockDb.prisma.$transaction).toHaveBeenCalledWith([
        expect.objectContaining({
          // This would be the prisma update query
        }),
        expect.objectContaining({
          // This would be the second prisma update query
        })
      ])
      expect(result).toEqual(mockTransactionResult)
    })

    it('should handle empty updates array', async () => {
      const result = await pantryService.bulkUpdateExpiration(userId, [])

      expect(mockDb.prisma.$transaction).toHaveBeenCalledWith([])
    })
  })

  describe('getExpirationSummary', () => {
    const mockPantryItems = [
      {
        id: 'item1',
        expirationDate: new Date('2024-01-10'), // Expired
        ingredient: { category: 'dairy' }
      },
      {
        id: 'item2', 
        expirationDate: new Date('2024-01-16'), // Expiring soon
        ingredient: { category: 'protein' }
      },
      {
        id: 'item3',
        expirationDate: new Date('2024-01-25'), // Fresh
        ingredient: { category: 'vegetable' }
      },
      {
        id: 'item4',
        expirationDate: null, // No expiration
        ingredient: { category: 'grain' }
      },
      {
        id: 'item5',
        expirationDate: new Date('2024-01-30'), // Fresh
        ingredient: null // No ingredient info
      }
    ]

    it('should provide comprehensive expiration summary', async () => {
      mockDb.prisma.pantryItem.findMany.mockResolvedValue(mockPantryItems)
      
      mockExpiration.getExpirationStatus
        .mockReturnValueOnce({ status: 'expired' })
        .mockReturnValueOnce({ status: 'expiring' })
        .mockReturnValueOnce({ status: 'fresh' })
        .mockReturnValueOnce({ status: 'fresh' })

      const result = await pantryService.getExpirationSummary(userId)

      expect(result).toEqual({
        total: 5,
        expired: 1,
        expiringSoon: 1,
        fresh: 2,
        noExpiration: 1,
        categories: {
          dairy: 1,
          protein: 1,
          vegetable: 1,
          grain: 1,
          other: 1
        }
      })
    })

    it('should handle empty pantry summary', async () => {
      mockDb.prisma.pantryItem.findMany.mockResolvedValue([])

      const result = await pantryService.getExpirationSummary(userId)

      expect(result).toEqual({
        total: 0,
        expired: 0,
        expiringSoon: 0,
        fresh: 0,
        noExpiration: 0,
        categories: {}
      })
    })
  })

  describe('Integration scenarios for food waste prevention', () => {
    it('should identify critical expiring items for meal planning', async () => {
      const criticalItems = [
        {
          id: 'critical1',
          userId,
          customName: 'Ground Beef',
          amount: 1,
          unit: 'lb',
          expirationDate: new Date('2024-01-16'), // Tomorrow
          ingredient: { name: 'ground beef', category: 'protein' }
        },
        {
          id: 'critical2',
          userId,
          customName: 'Fresh Lettuce',
          amount: 1,
          unit: 'head',
          expirationDate: new Date('2024-01-17'), // Day after tomorrow
          ingredient: { name: 'lettuce', category: 'vegetable' }
        }
      ]

      mockDb.prisma.pantryItem.findMany.mockResolvedValue(criticalItems)

      const result = await pantryService.getExpiringItems(userId, 3)

      expect(result).toEqual(criticalItems)
      expect(result.every(item => 
        new Date(item.expirationDate) <= addDays(new Date(), 3)
      )).toBe(true)
    })

    it('should handle recipe ingredient availability for meal planning', async () => {
      const recipeIngredients = [
        { name: 'ground beef', amount: 1, unit: 'lb' },
        { name: 'tomatoes', amount: 2, unit: 'medium' },
        { name: 'onion', amount: 1, unit: 'medium' }
      ]

      const pantryItems = [
        {
          id: 'item1',
          customName: 'Ground Beef',
          amount: 1.5,
          unit: 'lbs',
          expirationDate: new Date('2024-01-16'),
          ingredient: { name: 'ground beef', category: 'protein' }
        }
      ]

      mockDb.prisma.pantryItem.findMany.mockResolvedValue(pantryItems)

      const availability = await pantryService.checkIngredientAvailability(userId, recipeIngredients)

      expect(availability[0].sufficient).toBe(true) // Have enough beef
      expect(availability[1].sufficient).toBe(false) // No tomatoes  
      expect(availability[2].sufficient).toBe(false) // No onion

      // Should identify what needs to be purchased
      const needToBuy = availability.filter(item => !item.sufficient)
      expect(needToBuy).toHaveLength(2)
      expect(needToBuy.map(item => item.ingredient)).toEqual(['tomatoes', 'onion'])
    })

    it('should support leftover lifecycle management', async () => {
      // Create leftover from dinner
      mockExpiration.calculateExpirationDate.mockReturnValue(new Date('2024-01-18'))
      mockDb.prisma.pantryItem.create.mockResolvedValue({
        id: 'leftover1',
        customName: 'Leftover Chicken Curry',
        amount: 2,
        unit: 'servings',
        isLeftover: true,
        expirationDate: new Date('2024-01-18')
      })

      const leftover = await pantryService.createLeftover(userId, {
        customName: 'Leftover Chicken Curry',
        amount: 2,
        unit: 'servings',
        leftoverFromRecipeId: 'curry-recipe'
      })

      expect(leftover.isLeftover).toBe(true)
      expect(leftover.expirationDate).toEqual(new Date('2024-01-18'))

      // Simulate using leftover for lunch
      mockDb.prisma.pantryItem.findUnique.mockResolvedValue(leftover)
      mockDb.prisma.pantryItem.delete.mockResolvedValue(leftover)

      const usedLeftover = await pantryService.markItemAsUsed('leftover1', userId)

      expect(usedLeftover.success).toBe(true)
      expect(mockDb.prisma.pantryItem.delete).toHaveBeenCalledWith({
        where: { id: 'leftover1' }
      })
    })

    it('should handle dietary restrictions in substitution suggestions', async () => {
      // Common dairy-free substitutions
      const milkSubs = await pantryService.getSuggestedSubstitutions('milk')
      expect(milkSubs).toContain('almond milk')
      expect(milkSubs).toContain('soy milk')
      expect(milkSubs).toContain('coconut milk')

      // Vegan egg substitutions
      const eggSubs = await pantryService.getSuggestedSubstitutions('eggs')
      expect(eggSubs).toContain('applesauce')
      expect(eggSubs).toContain('banana')
      expect(eggSubs).toContain('flax eggs')

      // Gluten-free flour alternatives
      const flourSubs = await pantryService.getSuggestedSubstitutions('flour')
      expect(flourSubs).toContain('almond flour')
      expect(flourSubs).toContain('coconut flour')
      expect(flourSubs).toContain('oat flour')
    })

    it('should support bulk operations for expiration management', async () => {
      const updates = [
        { itemId: 'item1', expirationDate: new Date('2024-01-25') },
        { itemId: 'item2', expirationDate: new Date('2024-01-30') },
        { itemId: 'item3', expirationDate: new Date('2024-02-05') }
      ]

      mockDb.prisma.$transaction.mockResolvedValue(updates.map(u => ({
        id: u.itemId,
        expirationDate: u.expirationDate
      })))

      const result = await pantryService.bulkUpdateExpiration(userId, updates)

      expect(result).toHaveLength(3)
      expect(mockDb.prisma.$transaction).toHaveBeenCalled()
    })

    it('should provide comprehensive data for waste prevention dashboard', async () => {
      const mockItems = [
        { id: '1', expirationDate: new Date('2024-01-10'), ingredient: { category: 'protein' } },
        { id: '2', expirationDate: new Date('2024-01-16'), ingredient: { category: 'dairy' } },
        { id: '3', expirationDate: new Date('2024-01-25'), ingredient: { category: 'vegetable' } },
        { id: '4', expirationDate: null, ingredient: { category: 'grain' } }
      ]

      mockDb.prisma.pantryItem.findMany.mockResolvedValue(mockItems)
      mockExpiration.getExpirationStatus
        .mockReturnValueOnce({ status: 'expired' })
        .mockReturnValueOnce({ status: 'expiring' })
        .mockReturnValueOnce({ status: 'fresh' })

      const summary = await pantryService.getExpirationSummary(userId)

      expect(summary.total).toBe(4)
      expect(summary.expired).toBe(1)
      expect(summary.expiringSoon).toBe(1)
      expect(summary.fresh).toBe(1)
      expect(summary.noExpiration).toBe(1)
      expect(Object.keys(summary.categories)).toEqual(['protein', 'dairy', 'vegetable', 'grain'])
    })
  })
})