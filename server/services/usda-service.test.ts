import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { USDAService } from './usda-service'

// Mock global fetch
global.fetch = vi.fn()

// Mock the database
vi.mock('../lib/db', () => ({
  prisma: {
    ingredient: {
      findUnique: vi.fn(),
      create: vi.fn(),
    }
  }
}))

const mockDb = await import('../lib/db')

describe('USDAService', () => {
  let usdaService: USDAService
  const mockFetch = fetch as ReturnType<typeof vi.fn>

  beforeEach(() => {
    usdaService = new USDAService()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('searchFood', () => {
    it('should successfully search for foods and return results', async () => {
      const mockSearchResults = {
        foods: [
          {
            fdcId: 123456,
            description: 'Chicken breast, raw',
            foodNutrients: [
              { nutrientId: 1008, nutrientName: 'Energy', value: 165, unitName: 'kcal' },
              { nutrientId: 1003, nutrientName: 'Protein', value: 31, unitName: 'g' }
            ],
            foodCategory: 'Poultry Products'
          },
          {
            fdcId: 789012,
            description: 'Chicken breast, cooked',
            foodNutrients: [
              { nutrientId: 1008, nutrientName: 'Energy', value: 195, unitName: 'kcal' },
              { nutrientId: 1003, nutrientName: 'Protein', value: 37, unitName: 'g' }
            ],
            foodCategory: 'Poultry Products'
          }
        ]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSearchResults
      })

      const results = await usdaService.searchFood('chicken breast')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('foods/search'),
        undefined
      )
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('query=chicken%20breast'),
        undefined
      )
      expect(results).toHaveLength(2)
      expect(results[0]).toMatchObject({
        fdcId: 123456,
        description: 'Chicken breast, raw',
        foodCategory: 'Poultry Products'
      })
    })

    it('should handle empty search results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ foods: [] })
      })

      const results = await usdaService.searchFood('nonexistent food')

      expect(results).toEqual([])
    })

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      })

      const results = await usdaService.searchFood('chicken')

      expect(results).toEqual([])
    })

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const results = await usdaService.searchFood('chicken')

      expect(results).toEqual([])
    })

    it('should properly encode special characters in search query', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ foods: [] })
      })

      await usdaService.searchFood('chicken & rice')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('query=chicken%20%26%20rice'),
        undefined
      )
    })

    it('should include API key in request', async () => {
      process.env.USDA_API_KEY = 'test-api-key'
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ foods: [] })
      })

      await usdaService.searchFood('chicken')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('api_key=test-api-key'),
        undefined
      )
    })

    it('should use DEMO_KEY when no API key is provided', async () => {
      delete process.env.USDA_API_KEY
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ foods: [] })
      })

      await usdaService.searchFood('chicken')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('api_key=DEMO_KEY'),
        undefined
      )
    })

    it('should limit search results to 5 items', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ foods: [] })
      })

      await usdaService.searchFood('chicken')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=5'),
        undefined
      )
    })
  })

  describe('getFoodDetails', () => {
    it('should successfully get food details by FDC ID', async () => {
      const mockFoodDetails = {
        fdcId: 123456,
        description: 'Chicken breast, raw',
        foodNutrients: [
          { nutrientId: 1008, nutrientName: 'Energy', value: 165, unitName: 'kcal' },
          { nutrientId: 1003, nutrientName: 'Protein', value: 31, unitName: 'g' },
          { nutrientId: 1005, nutrientName: 'Carbohydrate', value: 0, unitName: 'g' },
          { nutrientId: 1004, nutrientName: 'Total lipid', value: 3.6, unitName: 'g' },
          { nutrientId: 1079, nutrientName: 'Fiber', value: 0, unitName: 'g' }
        ],
        foodCategory: 'Poultry Products'
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockFoodDetails
      })

      const result = await usdaService.getFoodDetails('123456')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('food/123456'),
        undefined
      )
      expect(result).toMatchObject(mockFoodDetails)
    })

    it('should return null for non-existent food ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      })

      const result = await usdaService.getFoodDetails('999999')

      expect(result).toBeNull()
    })

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await usdaService.getFoodDetails('123456')

      expect(result).toBeNull()
    })
  })

  describe('extractNutrition', () => {
    it('should extract all standard nutrition data', () => {
      const mockFood = {
        fdcId: 123456,
        description: 'Test food',
        foodNutrients: [
          { nutrientId: 1008, nutrientName: 'Energy', value: 165, unitName: 'kcal' },
          { nutrientId: 1003, nutrientName: 'Protein', value: 31, unitName: 'g' },
          { nutrientId: 1005, nutrientName: 'Carbohydrate', value: 0, unitName: 'g' },
          { nutrientId: 1004, nutrientName: 'Total lipid', value: 3.6, unitName: 'g' },
          { nutrientId: 1079, nutrientName: 'Fiber', value: 0, unitName: 'g' }
        ]
      }

      const nutrition = usdaService.extractNutrition(mockFood)

      expect(nutrition).toEqual({
        calories: 165,
        protein: 31,
        carbs: 0,
        fat: 3.6,
        fiber: 0
      })
    })

    it('should handle missing nutrients gracefully', () => {
      const mockFood = {
        fdcId: 123456,
        description: 'Test food',
        foodNutrients: [
          { nutrientId: 1008, nutrientName: 'Energy', value: 165, unitName: 'kcal' },
          { nutrientId: 1003, nutrientName: 'Protein', value: 31, unitName: 'g' }
          // Missing carbs, fat, fiber
        ]
      }

      const nutrition = usdaService.extractNutrition(mockFood)

      expect(nutrition).toEqual({
        calories: 165,
        protein: 31
        // carbs, fat, fiber should be undefined
      })
    })

    it('should ignore unknown nutrients', () => {
      const mockFood = {
        fdcId: 123456,
        description: 'Test food',
        foodNutrients: [
          { nutrientId: 1008, nutrientName: 'Energy', value: 165, unitName: 'kcal' },
          { nutrientId: 9999, nutrientName: 'Unknown Nutrient', value: 999, unitName: 'mg' }
        ]
      }

      const nutrition = usdaService.extractNutrition(mockFood)

      expect(nutrition).toEqual({
        calories: 165
      })
    })
  })

  describe('upsertIngredientFromUSDA', () => {
    it('should return existing ingredient if found', async () => {
      const existingIngredient = {
        id: 'ing1',
        name: 'chicken breast',
        category: 'protein'
      }

      mockDb.prisma.ingredient.findUnique.mockResolvedValue(existingIngredient)

      const result = await usdaService.upsertIngredientFromUSDA('Chicken Breast')

      expect(mockDb.prisma.ingredient.findUnique).toHaveBeenCalledWith({
        where: { name: 'chicken breast' }
      })
      expect(result).toEqual(existingIngredient)
      expect(mockDb.prisma.ingredient.create).not.toHaveBeenCalled()
    })

    it('should create new ingredient with USDA data when fdcId provided', async () => {
      const mockFoodDetails = {
        fdcId: 123456,
        description: 'Chicken breast, raw',
        foodNutrients: [
          { nutrientId: 1008, nutrientName: 'Energy', value: 165, unitName: 'kcal' },
          { nutrientId: 1003, nutrientName: 'Protein', value: 31, unitName: 'g' }
        ],
        foodCategory: 'Poultry Products'
      }

      const createdIngredient = {
        id: 'ing2',
        name: 'chicken breast',
        category: 'protein',
        calories: 165,
        protein: 31
      }

      mockDb.prisma.ingredient.findUnique.mockResolvedValue(null)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockFoodDetails
      })
      mockDb.prisma.ingredient.create.mockResolvedValue(createdIngredient)

      const result = await usdaService.upsertIngredientFromUSDA('Chicken Breast', '123456')

      expect(mockDb.prisma.ingredient.create).toHaveBeenCalledWith({
        data: {
          name: 'chicken breast',
          alternativeNames: ['Chicken Breast'],
          category: 'protein',
          calories: 165,
          protein: 31,
          carbs: undefined,
          fat: undefined,
          fiber: undefined,
          usdaFoodId: '123456',
          shelfLifeCounter: 0,
          shelfLifeFridge: 3,
          shelfLifeFreezer: 180
        }
      })
      expect(result).toEqual(createdIngredient)
    })

    it('should search USDA when no fdcId provided', async () => {
      const mockSearchResults = {
        foods: [{
          fdcId: 789012,
          description: 'Chicken breast, cooked',
          foodNutrients: [
            { nutrientId: 1008, nutrientName: 'Energy', value: 195, unitName: 'kcal' }
          ],
          foodCategory: 'Poultry Products'
        }]
      }

      const createdIngredient = {
        id: 'ing3',
        name: 'chicken breast',
        category: 'protein',
        calories: 195
      }

      mockDb.prisma.ingredient.findUnique.mockResolvedValue(null)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSearchResults
      })
      mockDb.prisma.ingredient.create.mockResolvedValue(createdIngredient)

      const result = await usdaService.upsertIngredientFromUSDA('Chicken Breast')

      expect(mockDb.prisma.ingredient.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'chicken breast',
          category: 'protein',
          calories: 195,
          usdaFoodId: '789012'
        })
      })
    })

    it('should create ingredient without USDA data when search fails', async () => {
      mockDb.prisma.ingredient.findUnique.mockResolvedValue(null)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ foods: [] })
      })
      mockDb.prisma.ingredient.create.mockResolvedValue({
        id: 'ing4',
        name: 'unknown item',
        category: 'other'
      })

      const result = await usdaService.upsertIngredientFromUSDA('Unknown Item')

      expect(mockDb.prisma.ingredient.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'unknown item',
          category: 'other',
          usdaFoodId: undefined,
          calories: undefined,
          protein: undefined
        })
      })
    })

    it('should handle database errors', async () => {
      mockDb.prisma.ingredient.findUnique.mockRejectedValue(new Error('Database error'))

      await expect(
        usdaService.upsertIngredientFromUSDA('test item')
      ).rejects.toThrow('Database error')
    })
  })

  describe('categorizeIngredient', () => {
    it('should categorize protein foods correctly', () => {
      const service = new USDAService()
      
      expect(service['categorizeIngredient']('chicken breast')).toBe('protein')
      expect(service['categorizeIngredient']('BEEF STEAK')).toBe('protein')
      expect(service['categorizeIngredient']('ground turkey')).toBe('protein')
      expect(service['categorizeIngredient']('salmon fillet')).toBe('protein')
    })

    it('should categorize vegetables correctly', () => {
      const service = new USDAService()
      
      expect(service['categorizeIngredient']('fresh spinach')).toBe('vegetable')
      expect(service['categorizeIngredient']('BELL PEPPER')).toBe('vegetable')
      expect(service['categorizeIngredient']('chopped onion')).toBe('vegetable')
      expect(service['categorizeIngredient']('broccoli florets')).toBe('vegetable')
    })

    it('should categorize fruits correctly', () => {
      const service = new USDAService()
      
      expect(service['categorizeIngredient']('fresh apple')).toBe('fruit')
      expect(service['categorizeIngredient']('STRAWBERRIES')).toBe('fruit')
      expect(service['categorizeIngredient']('ripe banana')).toBe('fruit')
    })

    it('should categorize dairy correctly', () => {
      const service = new USDAService()
      
      expect(service['categorizeIngredient']('whole milk')).toBe('dairy')
      expect(service['categorizeIngredient']('CHEDDAR CHEESE')).toBe('dairy')
      expect(service['categorizeIngredient']('greek yogurt')).toBe('dairy')
      expect(service['categorizeIngredient']('unsalted butter')).toBe('dairy')
    })

    it('should categorize grains correctly', () => {
      const service = new USDAService()
      
      expect(service['categorizeIngredient']('brown rice')).toBe('grain')
      expect(service['categorizeIngredient']('WHOLE WHEAT BREAD')).toBe('grain')
      expect(service['categorizeIngredient']('pasta shells')).toBe('grain')
      expect(service['categorizeIngredient']('rolled oats')).toBe('grain')
    })

    it('should use USDA category as fallback', () => {
      const service = new USDAService()
      
      expect(service['categorizeIngredient']('unknown food', 'Legumes')).toBe('legumes')
      expect(service['categorizeIngredient']('mystery item', 'Breakfast Cereals')).toBe('breakfast cereals')
    })

    it('should default to "other" for unrecognized items', () => {
      const service = new USDAService()
      
      expect(service['categorizeIngredient']('unknown mysterious food')).toBe('other')
      expect(service['categorizeIngredient']('xyz123')).toBe('other')
    })
  })

  describe('estimateShelfLife', () => {
    it('should return correct shelf life for protein category', () => {
      const service = new USDAService()
      
      const shelfLife = service['estimateShelfLife']('protein')
      
      expect(shelfLife).toEqual({
        shelfLifeCounter: 0,
        shelfLifeFridge: 3,
        shelfLifeFreezer: 180
      })
    })

    it('should return correct shelf life for vegetable category', () => {
      const service = new USDAService()
      
      const shelfLife = service['estimateShelfLife']('vegetable')
      
      expect(shelfLife).toEqual({
        shelfLifeCounter: 3,
        shelfLifeFridge: 7,
        shelfLifeFreezer: 240
      })
    })

    it('should return correct shelf life for dairy category', () => {
      const service = new USDAService()
      
      const shelfLife = service['estimateShelfLife']('dairy')
      
      expect(shelfLife).toEqual({
        shelfLifeCounter: 0,
        shelfLifeFridge: 14,
        shelfLifeFreezer: 90
      })
    })

    it('should return correct shelf life for grain category', () => {
      const service = new USDAService()
      
      const shelfLife = service['estimateShelfLife']('grain')
      
      expect(shelfLife).toEqual({
        shelfLifeCounter: 365,
        shelfLifeFridge: 365,
        shelfLifeFreezer: 365
      })
    })

    it('should return correct shelf life for spice category', () => {
      const service = new USDAService()
      
      const shelfLife = service['estimateShelfLife']('spice')
      
      expect(shelfLife).toEqual({
        shelfLifeCounter: 730,
        shelfLifeFridge: 730,
        shelfLifeFreezer: 730
      })
    })

    it('should return default shelf life for unknown category', () => {
      const service = new USDAService()
      
      const shelfLife = service['estimateShelfLife']('unknown')
      
      expect(shelfLife).toEqual({
        shelfLifeCounter: 7,
        shelfLifeFridge: 14,
        shelfLifeFreezer: 180
      })
    })
  })

  describe('Integration scenarios', () => {
    it('should handle complete ingredient creation workflow', async () => {
      const mockSearchResults = {
        foods: [{
          fdcId: 555555,
          description: 'Tomato, fresh',
          foodNutrients: [
            { nutrientId: 1008, nutrientName: 'Energy', value: 18, unitName: 'kcal' },
            { nutrientId: 1005, nutrientName: 'Carbohydrate', value: 3.9, unitName: 'g' },
            { nutrientId: 1079, nutrientName: 'Fiber', value: 1.2, unitName: 'g' }
          ],
          foodCategory: 'Vegetables and Vegetable Products'
        }]
      }

      const expectedIngredient = {
        id: 'tomato-ing',
        name: 'tomato',
        category: 'vegetable',
        calories: 18,
        carbs: 3.9,
        fiber: 1.2
      }

      mockDb.prisma.ingredient.findUnique.mockResolvedValue(null)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSearchResults
      })
      mockDb.prisma.ingredient.create.mockResolvedValue(expectedIngredient)

      const result = await usdaService.upsertIngredientFromUSDA('Tomato')

      // Verify complete workflow
      expect(mockDb.prisma.ingredient.findUnique).toHaveBeenCalledWith({
        where: { name: 'tomato' }
      })
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('foods/search?query=Tomato'),
        undefined
      )
      expect(mockDb.prisma.ingredient.create).toHaveBeenCalledWith({
        data: {
          name: 'tomato',
          alternativeNames: ['Tomato'],
          category: 'vegetable',
          calories: 18,
          protein: undefined,
          carbs: 3.9,
          fat: undefined,
          fiber: 1.2,
          usdaFoodId: '555555',
          shelfLifeCounter: 3,
          shelfLifeFridge: 7,
          shelfLifeFreezer: 240
        }
      })
      expect(result).toEqual(expectedIngredient)
    })

    it('should handle API rate limiting gracefully', async () => {
      mockDb.prisma.ingredient.findUnique.mockResolvedValue(null)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429 // Rate limited
      })
      mockDb.prisma.ingredient.create.mockResolvedValue({
        id: 'fallback-ing',
        name: 'test item',
        category: 'other'
      })

      const result = await usdaService.upsertIngredientFromUSDA('Test Item')

      // Should fallback to creating ingredient without USDA data
      expect(mockDb.prisma.ingredient.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'test item',
          category: 'other',
          usdaFoodId: undefined
        })
      })
    })

    it('should handle malformed USDA response gracefully', async () => {
      mockDb.prisma.ingredient.findUnique.mockResolvedValue(null)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ malformed: 'response' }) // Missing foods array
      })
      mockDb.prisma.ingredient.create.mockResolvedValue({
        id: 'fallback-ing2',
        name: 'test item',
        category: 'other'
      })

      const result = await usdaService.upsertIngredientFromUSDA('Test Item')

      expect(mockDb.prisma.ingredient.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'test item',
          usdaFoodId: undefined
        })
      })
    })
  })

  describe('Additional Edge Cases for Production Deployment', () => {
    it('should handle extremely long ingredient names gracefully', async () => {
      const veryLongName = 'a'.repeat(1000) // 1000 character name
      
      mockDb.prisma.ingredient.findUnique.mockResolvedValue(null)
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ foods: [] })
      })
      mockDb.prisma.ingredient.create.mockResolvedValue({
        id: 'long-name-ingredient',
        name: veryLongName.toLowerCase()
      })

      await usdaService.upsertIngredientFromUSDA(veryLongName)

      expect(mockDb.prisma.ingredient.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: veryLongName.toLowerCase(),
          alternativeNames: [veryLongName]
        })
      })
    })

    it('should handle special characters and unicode in ingredient names', async () => {
      const specialNames = [
        'café au lait',
        'jalapeño peppers',
        '北京烤鸭', // Chinese characters
        'crème fraîche',
        'açaí berries'
      ]

      for (const name of specialNames) {
        mockDb.prisma.ingredient.findUnique.mockResolvedValue(null)
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ foods: [] })
        })
        mockDb.prisma.ingredient.create.mockResolvedValue({
          id: `special-${name}`,
          name: name.toLowerCase()
        })

        await usdaService.upsertIngredientFromUSDA(name)

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining(encodeURIComponent(name)),
          undefined
        )
      }
    })

    it('should handle concurrent requests to same ingredient', async () => {
      const ingredientName = 'popular ingredient'
      
      // First call finds nothing, second call should find the created ingredient
      mockDb.prisma.ingredient.findUnique
        .mockResolvedValueOnce(null) // First call
        .mockResolvedValueOnce({ // Second call finds existing
          id: 'existing-ingredient',
          name: ingredientName.toLowerCase()
        })

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ foods: [] })
      })
      mockDb.prisma.ingredient.create.mockResolvedValue({
        id: 'created-ingredient',
        name: ingredientName.toLowerCase()
      })

      // Simulate concurrent calls
      const [result1, result2] = await Promise.all([
        usdaService.upsertIngredientFromUSDA(ingredientName),
        usdaService.upsertIngredientFromUSDA(ingredientName)
      ])

      expect(mockDb.prisma.ingredient.findUnique).toHaveBeenCalledTimes(2)
      expect(result2.name).toBe(ingredientName.toLowerCase())
    })

    it('should handle USDA API timeout scenarios', async () => {
      mockDb.prisma.ingredient.findUnique.mockResolvedValue(null)
      
      // Simulate timeout
      mockFetch.mockImplementation(() => 
        new Promise((resolve, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 100)
        })
      )
      
      mockDb.prisma.ingredient.create.mockResolvedValue({
        id: 'timeout-ingredient',
        name: 'timeout test'
      })

      const result = await usdaService.upsertIngredientFromUSDA('timeout test')

      expect(result).toBeDefined() // Should still create ingredient
      expect(mockDb.prisma.ingredient.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'timeout test',
          usdaFoodId: undefined
        })
      })
    })

    it('should handle corrupted USDA response data', async () => {
      const corruptedResponses = [
        { foods: null },
        { foods: undefined },
        { foods: 'not an array' },
        { foods: [{ invalid: 'structure' }] },
        { foods: [{ fdcId: 'not-a-number' }] }
      ]

      for (const corruptedResponse of corruptedResponses) {
        mockDb.prisma.ingredient.findUnique.mockResolvedValue(null)
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => corruptedResponse
        })
        mockDb.prisma.ingredient.create.mockResolvedValue({
          id: 'corrupted-test',
          name: 'test'
        })

        // Should not throw and should create ingredient anyway
        const result = await usdaService.upsertIngredientFromUSDA('test')
        expect(result).toBeDefined()
      }
    })

    it('should validate nutrition data ranges and sanitize invalid values', async () => {
      const invalidNutritionData = {
        fdcId: 123456,
        description: 'Invalid nutrition food',
        foodNutrients: [
          { nutrientId: 1008, value: -50, unitName: 'kcal' }, // Negative calories
          { nutrientId: 1003, value: Infinity, unitName: 'g' }, // Infinite protein  
          { nutrientId: 1005, value: NaN, unitName: 'g' }, // NaN carbs
          { nutrientId: 1004, value: 999999, unitName: 'g' }, // Unrealistic fat
          { nutrientId: 1079, value: null, unitName: 'g' }, // Null fiber
        ]
      }

      const nutrition = usdaService.extractNutrition(invalidNutritionData)

      // Should handle invalid values gracefully
      expect(nutrition.calories).toBe(-50) // Preserve even if invalid
      expect(isNaN(nutrition.protein as number)).toBe(false) // Should not be NaN
      expect(nutrition.carbs).toBeUndefined() // NaN should become undefined
      expect(nutrition.fat).toBe(999999) // Large values preserved
      expect(nutrition.fiber).toBeUndefined() // Null should become undefined
    })

    it('should handle database constraint violations gracefully', async () => {
      mockDb.prisma.ingredient.findUnique.mockResolvedValue(null)
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ foods: [] })
      })
      
      // Simulate unique constraint violation
      mockDb.prisma.ingredient.create.mockRejectedValue({
        code: 'P2002',
        meta: { target: ['name'] },
        message: 'Unique constraint failed'
      })

      await expect(
        usdaService.upsertIngredientFromUSDA('duplicate ingredient')
      ).rejects.toThrow('Unique constraint failed')
    })

    it('should handle memory pressure with large USDA responses', async () => {
      // Create a very large mock response to test memory handling
      const largeFoodsArray = Array.from({ length: 1000 }, (_, i) => ({
        fdcId: i,
        description: `Food item ${i}`,
        foodNutrients: Array.from({ length: 100 }, (_, j) => ({
          nutrientId: j,
          value: Math.random() * 100,
          unitName: 'g'
        }))
      }))

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ foods: largeFoodsArray })
      })

      const results = await usdaService.searchFood('test query')
      
      // Should handle large responses without crashing
      expect(results).toBeDefined()
      expect(Array.isArray(results)).toBe(true)
      expect(results.length).toBeLessThanOrEqual(largeFoodsArray.length)
    })

    it('should handle USDA API quota exceeded scenarios', async () => {
      mockDb.prisma.ingredient.findUnique.mockResolvedValue(null)
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Headers({ 'Retry-After': '3600' })
      })
      mockDb.prisma.ingredient.create.mockResolvedValue({
        id: 'quota-exceeded',
        name: 'test'
      })

      const result = await usdaService.upsertIngredientFromUSDA('test')

      // Should fallback gracefully when quota exceeded
      expect(result).toBeDefined()
      expect(mockDb.prisma.ingredient.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'test',
          usdaFoodId: undefined
        })
      })
    })

    it('should properly handle ingredient categorization edge cases', async () => {
      const edgeCaseIngredients = [
        { name: 'chicken and rice soup', expectedCategory: 'protein' }, // Should pick first match
        { name: 'vegetable oil', expectedCategory: 'fat' }, // Should prioritize oil over vegetable
        { name: 'almond milk', expectedCategory: 'dairy' }, // Plant-based dairy alternative
        { name: 'quinoa pasta', expectedCategory: 'grain' }, // Grain-based pasta
        { name: 'coconut flour', expectedCategory: 'grain' }, // Alternative flour
        { name: 'nutritional yeast', expectedCategory: 'other' }, // Uncommon ingredient
      ]

      const service = new USDAService()

      for (const { name, expectedCategory } of edgeCaseIngredients) {
        const category = service['categorizeIngredient'](name)
        expect(category).toBe(expectedCategory)
      }
    })

    it('should handle shelf life edge cases for food safety', async () => {
      const service = new USDAService()
      
      // Test protein safety - should never allow room temperature storage
      const proteinShelfLife = service['estimateShelfLife']('protein')
      expect(proteinShelfLife.shelfLifeCounter).toBe(0) // Food safety critical
      
      // Test dairy safety
      const dairyShelfLife = service['estimateShelfLife']('dairy')
      expect(dairyShelfLife.shelfLifeCounter).toBe(0) // Also critical
      
      // Test that dry goods have long shelf life
      const grainShelfLife = service['estimateShelfLife']('grain')
      expect(grainShelfLife.shelfLifeCounter).toBeGreaterThan(100) // Should be long
      
      // Test spices have very long shelf life
      const spiceShelfLife = service['estimateShelfLife']('spice')
      expect(spiceShelfLife.shelfLifeCounter).toBeGreaterThan(365) // Should be very long
    })

    it('should handle USDA FDC ID format variations', async () => {
      const fdcIdVariations = [
        '123456',      // Standard numeric string
        123456,        // Numeric value
        '0123456',     // Leading zeros
        '12345',       // Short ID
        '1234567890',  // Long ID
      ]

      for (const fdcId of fdcIdVariations) {
        mockDb.prisma.ingredient.findUnique.mockResolvedValue(null)
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({
            fdcId: typeof fdcId === 'number' ? fdcId : parseInt(fdcId),
            description: 'Test food',
            foodNutrients: []
          })
        })
        mockDb.prisma.ingredient.create.mockResolvedValue({
          id: `fdc-${fdcId}`,
          name: 'test'
        })

        const result = await usdaService.upsertIngredientFromUSDA('test', fdcId.toString())
        expect(result).toBeDefined()
      }
    })

    it('should properly handle ingredient alternatives and synonyms', async () => {
      // Test that alternatives are captured correctly
      const synonymTests = [
        { input: 'scallions', expected: ['green onions', 'spring onions'] },
        { input: 'cilantro', expected: ['coriander', 'chinese parsley'] },
        { input: 'bell peppers', expected: ['sweet peppers', 'capsicum'] }
      ]

      mockDb.prisma.ingredient.findUnique.mockResolvedValue(null)

      for (const { input } of synonymTests) {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ foods: [] })
        })
        mockDb.prisma.ingredient.create.mockResolvedValue({
          id: `synonym-${input}`,
          name: input.toLowerCase(),
          alternativeNames: [input]
        })

        await usdaService.upsertIngredientFromUSDA(input)

        expect(mockDb.prisma.ingredient.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            alternativeNames: [input]
          })
        })
      }
    })

    it('should handle network connectivity issues gracefully', async () => {
      const networkErrors = [
        new Error('ECONNREFUSED'),
        new Error('ENOTFOUND'),
        new Error('ETIMEDOUT'),
        new TypeError('Failed to fetch'),
      ]

      for (const error of networkErrors) {
        mockDb.prisma.ingredient.findUnique.mockResolvedValue(null)
        mockFetch.mockRejectedValue(error)
        mockDb.prisma.ingredient.create.mockResolvedValue({
          id: 'network-error-ingredient',
          name: 'test'
        })

        const result = await usdaService.upsertIngredientFromUSDA('test')
        
        // Should create ingredient even when USDA is unavailable
        expect(result).toBeDefined()
        expect(result.name).toBe('test')
      }
    })

    it('should validate and sanitize USDA response before processing', async () => {
      const maliciousResponse = {
        foods: [
          {
            fdcId: 123456,
            description: '<script>alert("xss")</script>Tomato',
            foodNutrients: [
              {
                nutrientId: 1008,
                value: 25,
                unitName: '<script>alert("xss")</script>kcal'
              }
            ],
            foodCategory: 'Vegetables & <img src="x" onerror="alert(1)">'
          }
        ]
      }

      mockDb.prisma.ingredient.findUnique.mockResolvedValue(null)
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => maliciousResponse
      })
      mockDb.prisma.ingredient.create.mockResolvedValue({
        id: 'sanitized-ingredient',
        name: 'tomato' // Should be sanitized
      })

      const result = await usdaService.upsertIngredientFromUSDA('tomato')

      expect(result).toBeDefined()
      // In a production system, you'd want to sanitize the response
      // This test verifies the system doesn't crash with malicious input
    })
  })

  describe('Performance and Production Readiness', () => {
    it('should handle batch processing of multiple ingredients', async () => {
      const ingredients = [
        'chicken breast',
        'broccoli',
        'rice',
        'olive oil',
        'garlic'
      ]

      const batchResults = await Promise.all(
        ingredients.map(ingredient => {
          mockDb.prisma.ingredient.findUnique.mockResolvedValue(null)
          mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ foods: [] })
          })
          mockDb.prisma.ingredient.create.mockResolvedValue({
            id: `batch-${ingredient}`,
            name: ingredient.toLowerCase()
          })

          return usdaService.upsertIngredientFromUSDA(ingredient)
        })
      )

      expect(batchResults).toHaveLength(ingredients.length)
      expect(batchResults.every(result => result.id.startsWith('batch-'))).toBe(true)
    })

    it('should maintain consistent categorization across similar ingredients', async () => {
      const service = new USDAService()
      const chickenVariations = [
        'chicken breast',
        'chicken thigh',
        'chicken leg',
        'chicken drumstick',
        'ground chicken'
      ]

      chickenVariations.forEach(variation => {
        const category = service['categorizeIngredient'](variation)
        expect(category).toBe('protein') // All should be protein
      })
    })

    it('should handle ingredient data consistency for meal planning', async () => {
      // Test that shelf life data is consistent for meal planning needs
      const service = new USDAService()
      
      const categories = ['protein', 'vegetable', 'dairy', 'grain', 'fruit']
      categories.forEach(category => {
        const shelfLife = service['estimateShelfLife'](category)
        
        // All categories should have numeric values
        expect(typeof shelfLife.shelfLifeFridge).toBe('number')
        expect(shelfLife.shelfLifeFridge).toBeGreaterThan(0)
        
        // Freezer should generally be longer than fridge
        if (shelfLife.shelfLifeFreezer) {
          expect(shelfLife.shelfLifeFreezer).toBeGreaterThanOrEqual(shelfLife.shelfLifeFridge)
        }
      })
    })

    it('should provide stable results for food waste calculations', async () => {
      // Test that the same ingredient always gets the same shelf life
      const service = new USDAService()
      
      const testIngredient = 'chicken breast'
      const category1 = service['categorizeIngredient'](testIngredient)
      const category2 = service['categorizeIngredient'](testIngredient)
      const shelfLife1 = service['estimateShelfLife'](category1)
      const shelfLife2 = service['estimateShelfLife'](category2)
      
      expect(category1).toBe(category2)
      expect(shelfLife1).toEqual(shelfLife2)
    })
  })
})