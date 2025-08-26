import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ClaudeMealPlanner } from './claude-meal-planner'
import { addDays, startOfWeek, format } from 'date-fns'

// Mock Anthropic SDK
const mockAnthropicCreate = vi.fn()
vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = {
      create: mockAnthropicCreate
    }
  }
}))

// Mock the database
vi.mock('../lib/db', () => ({
  prisma: {
    pantryItem: {
      findMany: vi.fn(),
    },
    recipe: {
      findMany: vi.fn(),
    },
    userPreferences: {
      findUnique: vi.fn(),
    },
    mealPlan: {
      create: vi.fn(),
      update: vi.fn(),
    },
  }
}))

const mockDb = await import('../lib/db')

describe('ClaudeMealPlanner', () => {
  let claudeMealPlanner: ClaudeMealPlanner
  const userId = 'test-user-id'
  const weekStartDate = new Date('2024-01-15T00:00:00.000Z')

  beforeEach(() => {
    claudeMealPlanner = new ClaudeMealPlanner()
    vi.clearAllMocks()
    vi.setSystemTime(new Date('2024-01-15T10:00:00.000Z'))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('generateWeeklyPlan', () => {
    const mockPantryItems = [
      {
        id: 'pantry1',
        customName: 'Chicken Breast',
        amount: 2,
        unit: 'lbs',
        location: 'FRIDGE',
        expirationDate: new Date('2024-01-17T00:00:00.000Z'),
        ingredient: {
          name: 'chicken breast',
          category: 'protein',
          calories: 165,
        }
      },
      {
        id: 'pantry2', 
        customName: 'Fresh Spinach',
        amount: 1,
        unit: 'bag',
        location: 'FRIDGE',
        expirationDate: new Date('2024-01-20T00:00:00.000Z'),
        ingredient: {
          name: 'spinach',
          category: 'vegetable',
          calories: 23,
        }
      }
    ]

    const mockExpiringItems = [
      {
        id: 'pantry1',
        customName: 'Chicken Breast',
        amount: 2,
        unit: 'lbs',
        location: 'FRIDGE',
        expirationDate: new Date('2024-01-17T00:00:00.000Z'),
        ingredient: {
          name: 'chicken breast',
          category: 'protein',
        }
      }
    ]

    const mockRecipes = [
      {
        id: 'recipe1',
        name: 'Chicken Stir-fry',
        totalTime: 25,
        servings: 4,
        ingredients: [
          { originalText: '1 lb chicken breast, diced' },
          { originalText: '2 cups mixed vegetables' },
          { originalText: '2 tbsp soy sauce' }
        ]
      },
      {
        id: 'recipe2',
        name: 'Spinach Salad',
        totalTime: 10,
        servings: 2,
        ingredients: [
          { originalText: '4 cups fresh spinach' },
          { originalText: '1/4 cup olive oil' },
          { originalText: '2 tbsp balsamic vinegar' }
        ]
      }
    ]

    const mockPreferences = {
      id: 'pref1',
      userId,
      planningMode: 'assisted',
      servingsPerMeal: 2,
      maxCookTimeMinutes: 45,
      includeLefotvers: true,
      dietaryRestrictions: [],
      allergies: [],
      dislikedIngredients: []
    }

    it('should generate a complete weekly meal plan successfully', async () => {
      const mockClaudeResponse = {
        content: [
          {
            type: 'text',
            text: `Here's your meal plan:
            {
              "meals": [
                {
                  "date": "2024-01-15",
                  "mealType": "DINNER",
                  "recipeName": "Chicken Stir-fry",
                  "servings": 4,
                  "cookTime": 25,
                  "reason": "Uses expiring chicken breast",
                  "ingredients": ["chicken breast", "mixed vegetables"],
                  "expectLeftovers": true
                },
                {
                  "date": "2024-01-16",
                  "mealType": "LUNCH",
                  "recipeName": "Leftover Chicken Stir-fry",
                  "servings": 2,
                  "cookTime": 5,
                  "reason": "Using leftovers from yesterday",
                  "ingredients": [],
                  "expectLeftovers": false
                }
              ],
              "shoppingNeeded": ["soy sauce", "rice"],
              "wasteSaved": ["chicken breast"]
            }`
          }
        ]
      }

      const mockMealPlan = {
        id: 'meal-plan-1',
        userId,
        weekStartDate,
        status: 'DRAFT',
        meals: [
          {
            id: 'meal1',
            date: new Date('2024-01-15'),
            mealType: 'DINNER',
            simpleMealName: 'Chicken Stir-fry',
            servings: 4,
            expectLeftovers: true,
            leftoverServings: 2
          }
        ]
      }

      // Setup mocks
      mockDb.prisma.pantryItem.findMany
        .mockResolvedValueOnce(mockPantryItems) // getPantryInventory
        .mockResolvedValueOnce(mockExpiringItems) // getExpiringItems
      
      mockDb.prisma.recipe.findMany.mockResolvedValue(mockRecipes)
      mockDb.prisma.userPreferences.findUnique.mockResolvedValue(mockPreferences)
      mockAnthropicCreate.mockResolvedValue(mockClaudeResponse)
      mockDb.prisma.mealPlan.create.mockResolvedValue(mockMealPlan)

      const result = await claudeMealPlanner.generateWeeklyPlan({
        userId,
        weekStartDate,
        preferences: {
          planningMode: 'assisted',
          servingsPerMeal: 2,
          maxCookTimeMinutes: 45,
          includeLeftovers: true
        }
      })

      expect(result).toEqual(mockMealPlan)
      expect(mockDb.prisma.pantryItem.findMany).toHaveBeenCalledTimes(2)
      expect(mockDb.prisma.recipe.findMany).toHaveBeenCalledOnce()
      expect(mockDb.prisma.userPreferences.findUnique).toHaveBeenCalledWith({
        where: { userId }
      })
      expect(mockAnthropicCreate).toHaveBeenCalledWith({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2000,
        temperature: 0.5,
        system: expect.stringContaining('practical meal planner'),
        messages: [
          {
            role: 'user',
            content: expect.stringContaining('EXPIRING SOON')
          }
        ]
      })
    })

    it('should handle YOLO planning mode with higher creativity', async () => {
      const mockClaudeResponse = {
        content: [
          {
            type: 'text',
            text: `{
              "meals": [
                {
                  "date": "2024-01-15",
                  "mealType": "DINNER", 
                  "recipeName": "Experimental Chicken Fusion",
                  "servings": 2,
                  "cookTime": 30,
                  "reason": "Creative use of expiring ingredients",
                  "ingredients": ["chicken", "spinach"],
                  "expectLeftovers": false
                }
              ]
            }`
          }
        ]
      }

      mockDb.prisma.pantryItem.findMany
        .mockResolvedValueOnce(mockPantryItems)
        .mockResolvedValueOnce(mockExpiringItems)
      mockDb.prisma.recipe.findMany.mockResolvedValue(mockRecipes)
      mockDb.prisma.userPreferences.findUnique.mockResolvedValue(mockPreferences)
      mockAnthropicCreate.mockResolvedValue(mockClaudeResponse)
      mockDb.prisma.mealPlan.create.mockResolvedValue({ id: 'plan1' })

      await claudeMealPlanner.generateWeeklyPlan({
        userId,
        weekStartDate,
        preferences: { planningMode: 'yolo' }
      })

      expect(mockAnthropicCreate).toHaveBeenCalledWith({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2000,
        temperature: 0.8, // Higher temperature for creativity
        system: expect.stringContaining('spontaneous meal planner'),
        messages: expect.any(Array)
      })
    })

    it('should prioritize expiring items in meal planning context', async () => {
      const mockClaudeResponse = {
        content: [{ type: 'text', text: '{"meals": []}' }]
      }

      mockDb.prisma.pantryItem.findMany
        .mockResolvedValueOnce(mockPantryItems)
        .mockResolvedValueOnce(mockExpiringItems)
      mockDb.prisma.recipe.findMany.mockResolvedValue(mockRecipes)
      mockDb.prisma.userPreferences.findUnique.mockResolvedValue(mockPreferences)
      mockAnthropicCreate.mockResolvedValue(mockClaudeResponse)
      mockDb.prisma.mealPlan.create.mockResolvedValue({ id: 'plan1' })

      await claudeMealPlanner.generateWeeklyPlan({
        userId,
        weekStartDate
      })

      const claudeCall = mockAnthropicCreate.mock.calls[0][0]
      const context = claudeCall.messages[0].content

      expect(context).toContain('EXPIRING SOON (use these first!)')
      expect(context).toContain('Chicken Breast: expires')
      expect(context).toContain('PRIORITIZES using expiring ingredients first')
      expect(context).toContain('Minimizes food waste by planning leftovers')
    })

    it('should include user preferences in planning context', async () => {
      const customPreferences = {
        ...mockPreferences,
        dietaryRestrictions: ['vegetarian'],
        allergies: ['nuts'],
        dislikedIngredients: ['mushrooms'],
        maxCookTimeMinutes: 30
      }

      const mockClaudeResponse = {
        content: [{ type: 'text', text: '{"meals": []}' }]
      }

      mockDb.prisma.pantryItem.findMany
        .mockResolvedValueOnce(mockPantryItems)
        .mockResolvedValueOnce(mockExpiringItems)
      mockDb.prisma.recipe.findMany.mockResolvedValue(mockRecipes)
      mockDb.prisma.userPreferences.findUnique.mockResolvedValue(customPreferences)
      mockAnthropicCreate.mockResolvedValue(mockClaudeResponse)
      mockDb.prisma.mealPlan.create.mockResolvedValue({ id: 'plan1' })

      await claudeMealPlanner.generateWeeklyPlan({
        userId,
        weekStartDate
      })

      const context = mockAnthropicCreate.mock.calls[0][0].messages[0].content

      expect(context).toContain('Dietary restrictions: vegetarian')
      expect(context).toContain('Allergies: nuts')
      expect(context).toContain('Disliked ingredients: mushrooms')
      expect(context).toContain('Max cook time: 30 minutes')
    })

    it('should handle Claude API failures with fallback plan', async () => {
      mockDb.prisma.pantryItem.findMany
        .mockResolvedValueOnce(mockPantryItems)
        .mockResolvedValueOnce(mockExpiringItems)
      mockDb.prisma.recipe.findMany.mockResolvedValue(mockRecipes)
      mockDb.prisma.userPreferences.findUnique.mockResolvedValue(mockPreferences)
      mockAnthropicCreate.mockRejectedValue(new Error('API Error'))
      mockDb.prisma.mealPlan.create.mockResolvedValue({ id: 'fallback-plan' })

      const result = await claudeMealPlanner.generateWeeklyPlan({
        userId,
        weekStartDate
      })

      // Should create meal plan with fallback meals
      expect(mockDb.prisma.mealPlan.create).toHaveBeenCalledWith({
        data: {
          userId,
          weekStartDate,
          status: 'DRAFT',
          generatedBy: 'claude',
          meals: {
            create: expect.arrayContaining([
              expect.objectContaining({
                mealType: 'BREAKFAST',
                simpleMealName: 'Eggs and Toast'
              }),
              expect.objectContaining({
                mealType: 'LUNCH',
                simpleMealName: 'Sandwich'
              }),
              expect.objectContaining({
                mealType: 'DINNER',
                expectLeftovers: true,
                leftoverServings: 2
              })
            ])
          }
        },
        include: { meals: true }
      })
    })

    it('should handle malformed Claude response with fallback', async () => {
      const malformedResponse = {
        content: [{ type: 'text', text: 'This is not valid JSON' }]
      }

      mockDb.prisma.pantryItem.findMany
        .mockResolvedValueOnce(mockPantryItems)
        .mockResolvedValueOnce(mockExpiringItems)
      mockDb.prisma.recipe.findMany.mockResolvedValue(mockRecipes)
      mockDb.prisma.userPreferences.findUnique.mockResolvedValue(mockPreferences)
      mockAnthropicCreate.mockResolvedValue(malformedResponse)
      mockDb.prisma.mealPlan.create.mockResolvedValue({ id: 'fallback-plan' })

      const result = await claudeMealPlanner.generateWeeklyPlan({
        userId,
        weekStartDate
      })

      // Should use fallback plan
      expect(mockDb.prisma.mealPlan.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          meals: {
            create: expect.arrayContaining([
              expect.objectContaining({
                simpleMealName: 'Eggs and Toast'
              })
            ])
          }
        }),
        include: { meals: true }
      })
    })

    it('should handle empty pantry scenario', async () => {
      const mockClaudeResponse = {
        content: [{ type: 'text', text: '{"meals": []}' }]
      }

      mockDb.prisma.pantryItem.findMany
        .mockResolvedValueOnce([]) // Empty pantry
        .mockResolvedValueOnce([]) // No expiring items
      mockDb.prisma.recipe.findMany.mockResolvedValue(mockRecipes)
      mockDb.prisma.userPreferences.findUnique.mockResolvedValue(mockPreferences)
      mockAnthropicCreate.mockResolvedValue(mockClaudeResponse)
      mockDb.prisma.mealPlan.create.mockResolvedValue({ id: 'empty-plan' })

      await claudeMealPlanner.generateWeeklyPlan({
        userId,
        weekStartDate
      })

      const context = mockAnthropicCreate.mock.calls[0][0].messages[0].content
      expect(context).toContain('PANTRY INVENTORY:\n\nEXPIRING SOON (use these first!):\n\n')
    })

    it('should handle no available recipes scenario', async () => {
      const mockClaudeResponse = {
        content: [{ type: 'text', text: '{"meals": []}' }]
      }

      mockDb.prisma.pantryItem.findMany
        .mockResolvedValueOnce(mockPantryItems)
        .mockResolvedValueOnce(mockExpiringItems)
      mockDb.prisma.recipe.findMany.mockResolvedValue([]) // No recipes
      mockDb.prisma.userPreferences.findUnique.mockResolvedValue(mockPreferences)
      mockAnthropicCreate.mockResolvedValue(mockClaudeResponse)
      mockDb.prisma.mealPlan.create.mockResolvedValue({ id: 'no-recipe-plan' })

      await claudeMealPlanner.generateWeeklyPlan({
        userId,
        weekStartDate
      })

      const context = mockAnthropicCreate.mock.calls[0][0].messages[0].content
      expect(context).toContain('AVAILABLE RECIPES:\n\n')
    })

    it('should limit recipe context to prevent token overflow', async () => {
      // Create many recipes to test limiting
      const manyRecipes = Array.from({ length: 100 }, (_, i) => ({
        id: `recipe${i}`,
        name: `Recipe ${i}`,
        totalTime: 30,
        servings: 4,
        ingredients: [{ originalText: `ingredient${i}` }]
      }))

      const mockClaudeResponse = {
        content: [{ type: 'text', text: '{"meals": []}' }]
      }

      mockDb.prisma.pantryItem.findMany
        .mockResolvedValueOnce(mockPantryItems)
        .mockResolvedValueOnce(mockExpiringItems)
      mockDb.prisma.recipe.findMany.mockResolvedValue(manyRecipes)
      mockDb.prisma.userPreferences.findUnique.mockResolvedValue(mockPreferences)
      mockAnthropicCreate.mockResolvedValue(mockClaudeResponse)
      mockDb.prisma.mealPlan.create.mockResolvedValue({ id: 'limited-plan' })

      await claudeMealPlanner.generateWeeklyPlan({
        userId,
        weekStartDate
      })

      // Should limit to 50 recipes as specified in the code
      expect(mockDb.prisma.recipe.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { userId },
            { userId: null }
          ]
        },
        include: {
          ingredients: {
            include: {
              ingredient: true
            }
          }
        },
        take: 50
      })
    })
  })

  describe('approvePlan', () => {
    it('should update meal plan status to approved', async () => {
      const mealPlanId = 'meal-plan-1'
      const approvedPlan = {
        id: mealPlanId,
        status: 'APPROVED'
      }

      mockDb.prisma.mealPlan.update.mockResolvedValue(approvedPlan)

      const result = await claudeMealPlanner.approvePlan(mealPlanId)

      expect(mockDb.prisma.mealPlan.update).toHaveBeenCalledWith({
        where: { id: mealPlanId },
        data: { status: 'APPROVED' }
      })
      expect(result).toEqual(approvedPlan)
    })
  })

  describe('getSuggestionsForExpiring', () => {
    const mockExpiringItems = [
      {
        id: 'pantry1',
        customName: 'Chicken Breast',
        ingredient: { category: 'protein' }
      },
      {
        id: 'pantry2',
        customName: 'Spinach',
        ingredient: { category: 'vegetable' }
      }
    ]

    it('should return recipe suggestions for expiring items', async () => {
      const mockClaudeResponse = {
        content: [
          {
            type: 'text',
            text: `{
              "suggestions": [
                {
                  "name": "Quick Chicken and Spinach Stir-fry",
                  "uses": ["Chicken Breast", "Spinach"],
                  "time": 20,
                  "instructions": "Heat oil, cook chicken, add spinach, season and serve"
                },
                {
                  "name": "Chicken Spinach Salad",
                  "uses": ["Chicken Breast", "Spinach"],
                  "time": 15,
                  "instructions": "Grill chicken, toss with spinach and dressing"
                }
              ]
            }`
          }
        ]
      }

      mockDb.prisma.pantryItem.findMany.mockResolvedValue(mockExpiringItems)
      mockAnthropicCreate.mockResolvedValue(mockClaudeResponse)

      const result = await claudeMealPlanner.getSuggestionsForExpiring(userId)

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        name: 'Quick Chicken and Spinach Stir-fry',
        uses: ['Chicken Breast', 'Spinach'],
        time: 20,
        instructions: 'Heat oil, cook chicken, add spinach, season and serve'
      })

      expect(mockAnthropicCreate).toHaveBeenCalledWith({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: expect.stringContaining('Chicken Breast (protein)')
          }
        ]
      })
    })

    it('should return empty array when no expiring items', async () => {
      mockDb.prisma.pantryItem.findMany.mockResolvedValue([])

      const result = await claudeMealPlanner.getSuggestionsForExpiring(userId)

      expect(result).toEqual([])
      expect(mockAnthropicCreate).not.toHaveBeenCalled()
    })

    it('should handle Claude API errors gracefully', async () => {
      mockDb.prisma.pantryItem.findMany.mockResolvedValue(mockExpiringItems)
      mockAnthropicCreate.mockRejectedValue(new Error('API Error'))

      const result = await claudeMealPlanner.getSuggestionsForExpiring(userId)

      expect(result).toEqual([])
    })

    it('should handle malformed Claude response for suggestions', async () => {
      const malformedResponse = {
        content: [{ type: 'text', text: 'Invalid JSON response' }]
      }

      mockDb.prisma.pantryItem.findMany.mockResolvedValue(mockExpiringItems)
      mockAnthropicCreate.mockResolvedValue(malformedResponse)

      const result = await claudeMealPlanner.getSuggestionsForExpiring(userId)

      expect(result).toEqual([])
    })

    it('should handle Claude response without suggestions array', async () => {
      const responseWithoutSuggestions = {
        content: [{ type: 'text', text: '{"other": "data"}' }]
      }

      mockDb.prisma.pantryItem.findMany.mockResolvedValue(mockExpiringItems)
      mockAnthropicCreate.mockResolvedValue(responseWithoutSuggestions)

      const result = await claudeMealPlanner.getSuggestionsForExpiring(userId)

      expect(result).toEqual([])
    })
  })

  describe('Fallback meal generation', () => {
    it('should generate 7 days of meals with variety', async () => {
      const planner = new ClaudeMealPlanner()
      const fallbackMeals = planner['generateFallbackPlan']()

      expect(fallbackMeals).toHaveLength(21) // 7 days × 3 meals

      // Check that we have all meal types for each day
      const mealsByDay = fallbackMeals.reduce((acc, meal) => {
        if (!acc[meal.date]) acc[meal.date] = []
        acc[meal.date].push(meal.mealType)
        return acc
      }, {} as Record<string, string[]>)

      Object.values(mealsByDay).forEach(dayMeals => {
        expect(dayMeals).toContain('BREAKFAST')
        expect(dayMeals).toContain('LUNCH') 
        expect(dayMeals).toContain('DINNER')
      })
    })

    it('should plan leftovers for lunch from previous dinner', async () => {
      const planner = new ClaudeMealPlanner()
      const fallbackMeals = planner['generateFallbackPlan']()

      // Find all lunch meals after the first day
      const lunchMeals = fallbackMeals.filter(meal => 
        meal.mealType === 'LUNCH' && 
        !meal.date.endsWith(format(startOfWeek(new Date()), 'yyyy-MM-dd'))
      )

      // Most should be leftovers
      const leftoverLunches = lunchMeals.filter(meal => 
        meal.recipeName.includes('Leftovers') || meal.recipeName.includes('leftovers')
      )

      expect(leftoverLunches.length).toBeGreaterThanOrEqual(5) // Most days should have leftover lunches
    })

    it('should ensure dinners have leftover potential', async () => {
      const planner = new ClaudeMealPlanner()
      const fallbackMeals = planner['generateFallbackPlan']()

      const dinnerMeals = fallbackMeals.filter(meal => meal.mealType === 'DINNER')

      dinnerMeals.forEach(dinner => {
        expect(dinner.servings).toBeGreaterThanOrEqual(4) // Extra for leftovers
        expect(dinner.expectLeftovers).toBe(true)
        expect(dinner.leftoverUse).toContain('lunch')
      })
    })

    it('should provide varied dinner options across the week', async () => {
      const planner = new ClaudeMealPlanner()
      const fallbackMeals = planner['generateFallbackPlan']()

      const dinnerNames = fallbackMeals
        .filter(meal => meal.mealType === 'DINNER')
        .map(meal => meal.recipeName)

      // Should have different dinner names
      const uniqueDinners = new Set(dinnerNames)
      expect(uniqueDinners.size).toBeGreaterThanOrEqual(6) // At least 6 different dinners
    })
  })

  describe('Integration scenarios for food waste prevention', () => {
    it('should prioritize expiring ingredients in meal suggestions', async () => {
      const urgentItems = [
        {
          id: 'urgent1',
          customName: 'Ground Beef',
          expirationDate: new Date('2024-01-16T00:00:00.000Z'), // Tomorrow
          ingredient: { category: 'protein' }
        }
      ]

      const normalItems = [
        {
          id: 'normal1',
          customName: 'Rice',
          expirationDate: new Date('2024-04-15T00:00:00.000Z'), // 3 months away
          ingredient: { category: 'grain' }
        }
      ]

      mockDb.prisma.pantryItem.findMany
        .mockResolvedValueOnce([...urgentItems, ...normalItems])
        .mockResolvedValueOnce(urgentItems) // Only urgent items in expiring query

      const mockClaudeResponse = {
        content: [{ type: 'text', text: '{"meals": []}' }]
      }

      mockDb.prisma.recipe.findMany.mockResolvedValue([])
      mockDb.prisma.userPreferences.findUnique.mockResolvedValue(null)
      mockAnthropicCreate.mockResolvedValue(mockClaudeResponse)
      mockDb.prisma.mealPlan.create.mockResolvedValue({ id: 'plan1' })

      await claudeMealPlanner.generateWeeklyPlan({ userId, weekStartDate })

      const context = mockAnthropicCreate.mock.calls[0][0].messages[0].content
      
      // Should mention expiring items prominently
      expect(context).toContain('EXPIRING SOON (use these first!)')
      expect(context).toContain('Ground Beef: expires')
      expect(context).not.toContain('Rice: expires') // Rice shouldn't be in expiring section
    })

    it('should handle dietary restrictions in meal planning', async () => {
      const vegetarianPreferences = {
        id: 'pref1',
        userId,
        dietaryRestrictions: ['vegetarian'],
        allergies: ['shellfish'],
        dislikedIngredients: ['mushrooms']
      }

      const mixedRecipes = [
        {
          id: 'recipe1',
          name: 'Beef Steak',
          ingredients: [{ originalText: 'beef steak' }]
        },
        {
          id: 'recipe2', 
          name: 'Vegetarian Pasta',
          ingredients: [{ originalText: 'pasta, vegetables' }]
        }
      ]

      mockDb.prisma.pantryItem.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
      mockDb.prisma.recipe.findMany.mockResolvedValue(mixedRecipes)
      mockDb.prisma.userPreferences.findUnique.mockResolvedValue(vegetarianPreferences)
      mockAnthropicCreate.mockResolvedValue({
        content: [{ type: 'text', text: '{"meals": []}' }]
      })
      mockDb.prisma.mealPlan.create.mockResolvedValue({ id: 'plan1' })

      await claudeMealPlanner.generateWeeklyPlan({ userId, weekStartDate })

      const context = mockAnthropicCreate.mock.calls[0][0].messages[0].content

      expect(context).toContain('Dietary restrictions: vegetarian')
      expect(context).toContain('Allergies: shellfish')
      expect(context).toContain('Disliked ingredients: mushrooms')
      expect(context).toContain('Respects dietary restrictions and preferences')
    })

    it('should handle empty preferences gracefully', async () => {
      mockDb.prisma.pantryItem.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
      mockDb.prisma.recipe.findMany.mockResolvedValue([])
      mockDb.prisma.userPreferences.findUnique.mockResolvedValue(null)
      mockAnthropicCreate.mockResolvedValue({
        content: [{ type: 'text', text: '{"meals": []}' }]
      })
      mockDb.prisma.mealPlan.create.mockResolvedValue({ id: 'plan1' })

      await claudeMealPlanner.generateWeeklyPlan({ userId, weekStartDate })

      const context = mockAnthropicCreate.mock.calls[0][0].messages[0].content

      // Should use sensible defaults
      expect(context).toContain('Planning Mode: assisted')
      expect(context).toContain('Servings per meal: 2') 
      expect(context).toContain('Max cook time: 45 minutes')
      expect(context).toContain('Dietary restrictions: none')
      expect(context).toContain('Allergies: none')
    })

    it('should handle leftover planning workflow', async () => {
      const mockMeals = [
        {
          date: '2024-01-15',
          mealType: 'DINNER',
          recipeName: 'Chicken Curry',
          servings: 4,
          expectLeftovers: true,
          leftoverUse: "Tomorrow's lunch"
        },
        {
          date: '2024-01-16', 
          mealType: 'LUNCH',
          recipeName: 'Leftover Chicken Curry',
          servings: 2,
          expectLeftovers: false
        }
      ]

      const mockClaudeResponse = {
        content: [{ type: 'text', text: JSON.stringify({ meals: mockMeals }) }]
      }

      mockDb.prisma.pantryItem.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
      mockDb.prisma.recipe.findMany.mockResolvedValue([])
      mockDb.prisma.userPreferences.findUnique.mockResolvedValue({
        includeLefotvers: true
      })
      mockAnthropicCreate.mockResolvedValue(mockClaudeResponse)
      mockDb.prisma.mealPlan.create.mockResolvedValue({ id: 'leftover-plan' })

      await claudeMealPlanner.generateWeeklyPlan({ userId, weekStartDate })

      expect(mockDb.prisma.mealPlan.create).toHaveBeenCalledWith({
        data: {
          userId,
          weekStartDate,
          status: 'DRAFT',
          generatedBy: 'claude',
          meals: {
            create: [
              {
                date: new Date('2024-01-15'),
                mealType: 'DINNER',
                simpleMealName: 'Chicken Curry',
                servings: 4,
                expectLeftovers: true,
                leftoverServings: 2
              },
              {
                date: new Date('2024-01-16'),
                mealType: 'LUNCH', 
                simpleMealName: 'Leftover Chicken Curry',
                servings: 2,
                expectLeftovers: false,
                leftoverServings: 0
              }
            ]
          }
        },
        include: { meals: true }
      })
    })
  })
})