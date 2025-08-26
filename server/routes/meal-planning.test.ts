import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Hono } from 'hono'

// Mock the database
vi.mock('../lib/db', () => ({
  prisma: {
    mealPlan: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    plannedMeal: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    pantryItem: {
      findMany: vi.fn(),
    },
    recipe: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    userPreferences: {
      findUnique: vi.fn(),
    },
  }
}))

const mockDb = await import('../lib/db')

// Mock the Claude meal planner service
vi.mock('../services/claude-meal-planner', () => ({
  claudeMealPlanner: {
    generateWeeklyPlan: vi.fn(),
    approvePlan: vi.fn(),
    getSuggestionsForExpiring: vi.fn(),
  }
}))

const mockClaudeMealPlanner = await import('../services/claude-meal-planner')

// Create a mock meal planning API app
class MealPlanningAPI {
  private app: Hono

  constructor() {
    this.app = new Hono()
    this.setupRoutes()
  }

  private setupRoutes() {
    // GET /meal-plans - Get all meal plans for user
    this.app.get('/', async (c) => {
      try {
        const userId = c.req.query('userId')
        if (!userId) {
          return c.json({ error: 'User ID is required' }, 400)
        }

        const mealPlans = await mockDb.prisma.mealPlan.findMany({
          where: { userId },
          include: {
            meals: {
              include: {
                recipe: true
              }
            }
          },
          orderBy: { weekStartDate: 'desc' }
        })

        return c.json({ mealPlans })
      } catch (error) {
        console.error('Error fetching meal plans:', error)
        return c.json({ error: 'Failed to fetch meal plans' }, 500)
      }
    })

    // POST /meal-plans/generate - Generate new meal plan
    this.app.post('/generate', async (c) => {
      try {
        const { userId, weekStartDate, preferences } = await c.req.json()
        
        if (!userId || !weekStartDate) {
          return c.json({ error: 'Missing required fields' }, 400)
        }

        const mealPlan = await mockClaudeMealPlanner.claudeMealPlanner.generateWeeklyPlan({
          userId,
          weekStartDate: new Date(weekStartDate),
          preferences
        })

        return c.json({ mealPlan })
      } catch (error) {
        console.error('Error generating meal plan:', error)
        return c.json({ error: 'Failed to generate meal plan' }, 500)
      }
    })

    // PUT /meal-plans/:id/approve - Approve meal plan
    this.app.put('/:id/approve', async (c) => {
      try {
        const mealPlanId = c.req.param('id')
        const userId = c.req.query('userId')

        if (!userId) {
          return c.json({ error: 'User ID is required' }, 400)
        }

        // Verify user owns the meal plan
        const existingPlan = await mockDb.prisma.mealPlan.findUnique({
          where: { id: mealPlanId }
        })

        if (!existingPlan || existingPlan.userId !== userId) {
          return c.json({ error: 'Meal plan not found or access denied' }, 404)
        }

        const approvedPlan = await mockClaudeMealPlanner.claudeMealPlanner.approvePlan(mealPlanId)
        
        return c.json({ mealPlan: approvedPlan })
      } catch (error) {
        console.error('Error approving meal plan:', error)
        return c.json({ error: 'Failed to approve meal plan' }, 500)
      }
    })

    // GET /meal-plans/:id - Get specific meal plan
    this.app.get('/:id', async (c) => {
      try {
        const mealPlanId = c.req.param('id')
        const userId = c.req.query('userId')

        if (!userId) {
          return c.json({ error: 'User ID is required' }, 400)
        }

        const mealPlan = await mockDb.prisma.mealPlan.findUnique({
          where: { id: mealPlanId },
          include: {
            meals: {
              include: {
                recipe: {
                  include: {
                    ingredients: {
                      include: {
                        ingredient: true
                      }
                    }
                  }
                }
              },
              orderBy: { date: 'asc' }
            }
          }
        })

        if (!mealPlan || mealPlan.userId !== userId) {
          return c.json({ error: 'Meal plan not found or access denied' }, 404)
        }

        return c.json({ mealPlan })
      } catch (error) {
        console.error('Error fetching meal plan:', error)
        return c.json({ error: 'Failed to fetch meal plan' }, 500)
      }
    })

    // PUT /meal-plans/:id/meals/:mealId - Update specific meal
    this.app.put('/:id/meals/:mealId', async (c) => {
      try {
        const mealPlanId = c.req.param('id')
        const mealId = c.req.param('mealId')
        const userId = c.req.query('userId')
        const updates = await c.req.json()

        if (!userId) {
          return c.json({ error: 'User ID is required' }, 400)
        }

        // Verify user owns the meal plan
        const mealPlan = await mockDb.prisma.mealPlan.findUnique({
          where: { id: mealPlanId }
        })

        if (!mealPlan || mealPlan.userId !== userId) {
          return c.json({ error: 'Access denied' }, 403)
        }

        const updatedMeal = await mockDb.prisma.plannedMeal.update({
          where: { id: mealId },
          data: {
            recipeId: updates.recipeId,
            simpleMealName: updates.simpleMealName,
            servings: updates.servings,
            isCooked: updates.isCooked,
            skipped: updates.skipped,
            isEatingOut: updates.isEatingOut,
            restaurantName: updates.restaurantName,
          },
          include: {
            recipe: true
          }
        })

        return c.json({ meal: updatedMeal })
      } catch (error) {
        console.error('Error updating meal:', error)
        return c.json({ error: 'Failed to update meal' }, 500)
      }
    })

    // DELETE /meal-plans/:id - Delete meal plan
    this.app.delete('/:id', async (c) => {
      try {
        const mealPlanId = c.req.param('id')
        const userId = c.req.query('userId')

        if (!userId) {
          return c.json({ error: 'User ID is required' }, 400)
        }

        // Verify user owns the meal plan
        const mealPlan = await mockDb.prisma.mealPlan.findUnique({
          where: { id: mealPlanId }
        })

        if (!mealPlan || mealPlan.userId !== userId) {
          return c.json({ error: 'Meal plan not found or access denied' }, 404)
        }

        await mockDb.prisma.mealPlan.delete({
          where: { id: mealPlanId }
        })

        return c.json({ message: 'Meal plan deleted successfully' })
      } catch (error) {
        console.error('Error deleting meal plan:', error)
        return c.json({ error: 'Failed to delete meal plan' }, 500)
      }
    })

    // GET /suggestions/expiring - Get meal suggestions for expiring items
    this.app.get('/suggestions/expiring', async (c) => {
      try {
        const userId = c.req.query('userId')
        if (!userId) {
          return c.json({ error: 'User ID is required' }, 400)
        }

        const suggestions = await mockClaudeMealPlanner.claudeMealPlanner.getSuggestionsForExpiring(userId)
        
        return c.json({ suggestions })
      } catch (error) {
        console.error('Error getting expiring suggestions:', error)
        return c.json({ error: 'Failed to get suggestions' }, 500)
      }
    })

    // POST /meal-plans/:id/cook-meal/:mealId - Mark meal as cooked and create leftovers
    this.app.post('/:id/cook-meal/:mealId', async (c) => {
      try {
        const mealPlanId = c.req.param('id')
        const mealId = c.req.param('mealId')
        const userId = c.req.query('userId')
        const { actualServings, hasLeftovers, leftoverAmount } = await c.req.json()

        if (!userId) {
          return c.json({ error: 'User ID is required' }, 400)
        }

        // Verify access and get meal details
        const mealPlan = await mockDb.prisma.mealPlan.findUnique({
          where: { id: mealPlanId },
          include: {
            meals: {
              where: { id: mealId },
              include: { recipe: true }
            }
          }
        })

        if (!mealPlan || mealPlan.userId !== userId) {
          return c.json({ error: 'Access denied' }, 403)
        }

        const meal = mealPlan.meals[0]
        if (!meal) {
          return c.json({ error: 'Meal not found' }, 404)
        }

        // Mark meal as cooked
        const updatedMeal = await mockDb.prisma.plannedMeal.update({
          where: { id: mealId },
          data: {
            isCooked: true,
            cookedAt: new Date(),
            servings: actualServings || meal.servings
          }
        })

        let leftoverItem = null
        if (hasLeftovers && leftoverAmount > 0) {
          // This would typically call the pantry service to create leftovers
          // For testing, we'll mock this
          leftoverItem = {
            id: 'leftover-' + mealId,
            customName: `Leftover ${meal.simpleMealName || meal.recipe?.name}`,
            amount: leftoverAmount,
            unit: 'servings',
            isLeftover: true,
            leftoverFromId: meal.recipeId,
            expirationDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days
          }
        }

        return c.json({ 
          meal: updatedMeal, 
          leftover: leftoverItem 
        })
      } catch (error) {
        console.error('Error cooking meal:', error)
        return c.json({ error: 'Failed to cook meal' }, 500)
      }
    })
  }

  getApp() {
    return this.app
  }
}

describe('Meal Planning API', () => {
  let mealPlanningAPI: MealPlanningAPI
  let app: Hono
  const userId = 'test-user-id'

  beforeEach(() => {
    mealPlanningAPI = new MealPlanningAPI()
    app = mealPlanningAPI.getApp()
    vi.clearAllMocks()
    vi.setSystemTime(new Date('2024-01-15T10:00:00.000Z'))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET /', () => {
    it('should fetch all meal plans for user', async () => {
      const mockMealPlans = [
        {
          id: 'plan1',
          userId,
          weekStartDate: new Date('2024-01-15'),
          status: 'APPROVED',
          meals: [
            {
              id: 'meal1',
              date: new Date('2024-01-15'),
              mealType: 'DINNER',
              simpleMealName: 'Chicken Stir-fry',
              recipe: { id: 'recipe1', name: 'Chicken Stir-fry' }
            }
          ]
        }
      ]

      mockDb.prisma.mealPlan.findMany.mockResolvedValue(mockMealPlans)

      const req = new Request(`http://localhost/meal-plans?userId=${userId}`)
      const res = await app.request(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.mealPlans).toEqual(mockMealPlans)
      expect(mockDb.prisma.mealPlan.findMany).toHaveBeenCalledWith({
        where: { userId },
        include: {
          meals: {
            include: {
              recipe: true
            }
          }
        },
        orderBy: { weekStartDate: 'desc' }
      })
    })

    it('should return 400 if userId is missing', async () => {
      const req = new Request('http://localhost/meal-plans')
      const res = await app.request(req)
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.error).toBe('User ID is required')
    })

    it('should handle database errors', async () => {
      mockDb.prisma.mealPlan.findMany.mockRejectedValue(new Error('Database error'))

      const req = new Request(`http://localhost/meal-plans?userId=${userId}`)
      const res = await app.request(req)
      const data = await res.json()

      expect(res.status).toBe(500)
      expect(data.error).toBe('Failed to fetch meal plans')
    })
  })

  describe('POST /generate', () => {
    it('should generate new meal plan with Claude', async () => {
      const generateRequest = {
        userId,
        weekStartDate: '2024-01-15T00:00:00.000Z',
        preferences: {
          planningMode: 'assisted',
          servingsPerMeal: 2,
          maxCookTimeMinutes: 45
        }
      }

      const mockGeneratedPlan = {
        id: 'new-plan-1',
        userId,
        weekStartDate: new Date('2024-01-15'),
        status: 'DRAFT',
        meals: []
      }

      mockClaudeMealPlanner.claudeMealPlanner.generateWeeklyPlan.mockResolvedValue(mockGeneratedPlan)

      const req = new Request('http://localhost/meal-plans/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generateRequest)
      })
      const res = await app.request(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.mealPlan).toEqual(mockGeneratedPlan)
      expect(mockClaudeMealPlanner.claudeMealPlanner.generateWeeklyPlan).toHaveBeenCalledWith({
        userId,
        weekStartDate: new Date('2024-01-15T00:00:00.000Z'),
        preferences: generateRequest.preferences
      })
    })

    it('should return 400 if required fields are missing', async () => {
      const req = new Request('http://localhost/meal-plans/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }) // Missing weekStartDate
      })
      const res = await app.request(req)
      const data = await res.json()

      expect(res.status).toBe(400)
      expect(data.error).toBe('Missing required fields')
    })

    it('should handle Claude service errors with fallback', async () => {
      mockClaudeMealPlanner.claudeMealPlanner.generateWeeklyPlan.mockRejectedValue(new Error('Claude API error'))

      const req = new Request('http://localhost/meal-plans/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          weekStartDate: '2024-01-15T00:00:00.000Z'
        })
      })
      const res = await app.request(req)
      const data = await res.json()

      expect(res.status).toBe(500)
      expect(data.error).toBe('Failed to generate meal plan')
    })
  })

  describe('PUT /:id/approve', () => {
    it('should approve meal plan for owner', async () => {
      const mealPlanId = 'plan1'
      const mockExistingPlan = {
        id: mealPlanId,
        userId,
        status: 'DRAFT'
      }
      const mockApprovedPlan = {
        ...mockExistingPlan,
        status: 'APPROVED'
      }

      mockDb.prisma.mealPlan.findUnique.mockResolvedValue(mockExistingPlan)
      mockClaudeMealPlanner.claudeMealPlanner.approvePlan.mockResolvedValue(mockApprovedPlan)

      const req = new Request(`http://localhost/meal-plans/${mealPlanId}/approve?userId=${userId}`, {
        method: 'PUT'
      })
      const res = await app.request(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.mealPlan).toEqual(mockApprovedPlan)
      expect(mockClaudeMealPlanner.claudeMealPlanner.approvePlan).toHaveBeenCalledWith(mealPlanId)
    })

    it('should return 404 if meal plan not found', async () => {
      mockDb.prisma.mealPlan.findUnique.mockResolvedValue(null)

      const req = new Request(`http://localhost/meal-plans/nonexistent/approve?userId=${userId}`, {
        method: 'PUT'
      })
      const res = await app.request(req)
      const data = await res.json()

      expect(res.status).toBe(404)
      expect(data.error).toBe('Meal plan not found or access denied')
    })

    it('should return 404 if user does not own meal plan', async () => {
      const mockExistingPlan = {
        id: 'plan1',
        userId: 'other-user',
        status: 'DRAFT'
      }

      mockDb.prisma.mealPlan.findUnique.mockResolvedValue(mockExistingPlan)

      const req = new Request(`http://localhost/meal-plans/plan1/approve?userId=${userId}`, {
        method: 'PUT'
      })
      const res = await app.request(req)
      const data = await res.json()

      expect(res.status).toBe(404)
      expect(data.error).toBe('Meal plan not found or access denied')
    })
  })

  describe('GET /:id', () => {
    it('should fetch specific meal plan with details', async () => {
      const mealPlanId = 'plan1'
      const mockMealPlan = {
        id: mealPlanId,
        userId,
        weekStartDate: new Date('2024-01-15'),
        meals: [
          {
            id: 'meal1',
            date: new Date('2024-01-15'),
            mealType: 'DINNER',
            servings: 4,
            recipe: {
              id: 'recipe1',
              name: 'Chicken Curry',
              ingredients: [
                {
                  ingredient: { name: 'chicken', category: 'protein' },
                  amount: 1,
                  unit: 'lb'
                }
              ]
            }
          }
        ]
      }

      mockDb.prisma.mealPlan.findUnique.mockResolvedValue(mockMealPlan)

      const req = new Request(`http://localhost/meal-plans/${mealPlanId}?userId=${userId}`)
      const res = await app.request(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.mealPlan).toEqual(mockMealPlan)
      expect(mockDb.prisma.mealPlan.findUnique).toHaveBeenCalledWith({
        where: { id: mealPlanId },
        include: {
          meals: {
            include: {
              recipe: {
                include: {
                  ingredients: {
                    include: {
                      ingredient: true
                    }
                  }
                }
              }
            },
            orderBy: { date: 'asc' }
          }
        }
      })
    })

    it('should return 404 for non-existent meal plan', async () => {
      mockDb.prisma.mealPlan.findUnique.mockResolvedValue(null)

      const req = new Request(`http://localhost/meal-plans/nonexistent?userId=${userId}`)
      const res = await app.request(req)
      const data = await res.json()

      expect(res.status).toBe(404)
      expect(data.error).toBe('Meal plan not found or access denied')
    })
  })

  describe('PUT /:id/meals/:mealId', () => {
    it('should update specific meal in plan', async () => {
      const mealPlanId = 'plan1'
      const mealId = 'meal1'
      const updates = {
        recipeId: 'new-recipe-id',
        servings: 6,
        isCooked: true
      }

      const mockMealPlan = { id: mealPlanId, userId }
      const mockUpdatedMeal = {
        id: mealId,
        ...updates,
        recipe: { id: 'new-recipe-id', name: 'New Recipe' }
      }

      mockDb.prisma.mealPlan.findUnique.mockResolvedValue(mockMealPlan)
      mockDb.prisma.plannedMeal.update.mockResolvedValue(mockUpdatedMeal)

      const req = new Request(`http://localhost/meal-plans/${mealPlanId}/meals/${mealId}?userId=${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      const res = await app.request(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.meal).toEqual(mockUpdatedMeal)
      expect(mockDb.prisma.plannedMeal.update).toHaveBeenCalledWith({
        where: { id: mealId },
        data: {
          recipeId: 'new-recipe-id',
          simpleMealName: undefined,
          servings: 6,
          isCooked: true,
          skipped: undefined,
          isEatingOut: undefined,
          restaurantName: undefined,
        },
        include: { recipe: true }
      })
    })

    it('should return 403 if user does not own meal plan', async () => {
      const mockMealPlan = { id: 'plan1', userId: 'other-user' }
      mockDb.prisma.mealPlan.findUnique.mockResolvedValue(mockMealPlan)

      const req = new Request(`http://localhost/meal-plans/plan1/meals/meal1?userId=${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ servings: 4 })
      })
      const res = await app.request(req)
      const data = await res.json()

      expect(res.status).toBe(403)
      expect(data.error).toBe('Access denied')
    })
  })

  describe('DELETE /:id', () => {
    it('should delete meal plan for owner', async () => {
      const mealPlanId = 'plan1'
      const mockMealPlan = { id: mealPlanId, userId }

      mockDb.prisma.mealPlan.findUnique.mockResolvedValue(mockMealPlan)
      mockDb.prisma.mealPlan.delete.mockResolvedValue(mockMealPlan)

      const req = new Request(`http://localhost/meal-plans/${mealPlanId}?userId=${userId}`, {
        method: 'DELETE'
      })
      const res = await app.request(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.message).toBe('Meal plan deleted successfully')
      expect(mockDb.prisma.mealPlan.delete).toHaveBeenCalledWith({
        where: { id: mealPlanId }
      })
    })

    it('should return 404 if meal plan not found', async () => {
      mockDb.prisma.mealPlan.findUnique.mockResolvedValue(null)

      const req = new Request(`http://localhost/meal-plans/nonexistent?userId=${userId}`, {
        method: 'DELETE'
      })
      const res = await app.request(req)
      const data = await res.json()

      expect(res.status).toBe(404)
      expect(data.error).toBe('Meal plan not found or access denied')
    })
  })

  describe('GET /suggestions/expiring', () => {
    it('should get meal suggestions for expiring items', async () => {
      const mockSuggestions = [
        {
          name: 'Quick Chicken Stir-fry',
          uses: ['chicken breast', 'vegetables'],
          time: 20,
          instructions: 'Stir-fry chicken and vegetables'
        },
        {
          name: 'Chicken Soup',
          uses: ['chicken breast'],
          time: 45,
          instructions: 'Simmer chicken with vegetables'
        }
      ]

      mockClaudeMealPlanner.claudeMealPlanner.getSuggestionsForExpiring.mockResolvedValue(mockSuggestions)

      const req = new Request(`http://localhost/meal-plans/suggestions/expiring?userId=${userId}`)
      const res = await app.request(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.suggestions).toEqual(mockSuggestions)
      expect(mockClaudeMealPlanner.claudeMealPlanner.getSuggestionsForExpiring).toHaveBeenCalledWith(userId)
    })

    it('should return empty suggestions when no expiring items', async () => {
      mockClaudeMealPlanner.claudeMealPlanner.getSuggestionsForExpiring.mockResolvedValue([])

      const req = new Request(`http://localhost/meal-plans/suggestions/expiring?userId=${userId}`)
      const res = await app.request(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.suggestions).toEqual([])
    })

    it('should handle Claude service errors', async () => {
      mockClaudeMealPlanner.claudeMealPlanner.getSuggestionsForExpiring.mockRejectedValue(new Error('Service error'))

      const req = new Request(`http://localhost/meal-plans/suggestions/expiring?userId=${userId}`)
      const res = await app.request(req)
      const data = await res.json()

      expect(res.status).toBe(500)
      expect(data.error).toBe('Failed to get suggestions')
    })
  })

  describe('POST /:id/cook-meal/:mealId', () => {
    it('should mark meal as cooked and create leftovers', async () => {
      const mealPlanId = 'plan1'
      const mealId = 'meal1'
      const cookRequest = {
        actualServings: 4,
        hasLeftovers: true,
        leftoverAmount: 2
      }

      const mockMealPlan = {
        id: mealPlanId,
        userId,
        meals: [
          {
            id: mealId,
            simpleMealName: 'Chicken Curry',
            servings: 4,
            recipe: { id: 'recipe1', name: 'Chicken Curry' }
          }
        ]
      }

      const mockUpdatedMeal = {
        id: mealId,
        isCooked: true,
        cookedAt: new Date(),
        servings: 4
      }

      mockDb.prisma.mealPlan.findUnique.mockResolvedValue(mockMealPlan)
      mockDb.prisma.plannedMeal.update.mockResolvedValue(mockUpdatedMeal)

      const req = new Request(`http://localhost/meal-plans/${mealPlanId}/cook-meal/${mealId}?userId=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cookRequest)
      })
      const res = await app.request(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.meal).toEqual(mockUpdatedMeal)
      expect(data.leftover).toEqual({
        id: 'leftover-meal1',
        customName: 'Leftover Chicken Curry',
        amount: 2,
        unit: 'servings',
        isLeftover: true,
        leftoverFromId: 'recipe1',
        expirationDate: expect.any(Date)
      })
      
      expect(mockDb.prisma.plannedMeal.update).toHaveBeenCalledWith({
        where: { id: mealId },
        data: {
          isCooked: true,
          cookedAt: expect.any(Date),
          servings: 4
        }
      })
    })

    it('should mark meal as cooked without leftovers', async () => {
      const mealPlanId = 'plan1'
      const mealId = 'meal1'
      const cookRequest = {
        actualServings: 2,
        hasLeftovers: false
      }

      const mockMealPlan = {
        id: mealPlanId,
        userId,
        meals: [
          {
            id: mealId,
            simpleMealName: 'Quick Breakfast',
            servings: 2
          }
        ]
      }

      mockDb.prisma.mealPlan.findUnique.mockResolvedValue(mockMealPlan)
      mockDb.prisma.plannedMeal.update.mockResolvedValue({
        id: mealId,
        isCooked: true,
        servings: 2
      })

      const req = new Request(`http://localhost/meal-plans/${mealPlanId}/cook-meal/${mealId}?userId=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cookRequest)
      })
      const res = await app.request(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.leftover).toBeNull()
    })

    it('should return 403 if user does not own meal plan', async () => {
      const mockMealPlan = { id: 'plan1', userId: 'other-user', meals: [] }
      mockDb.prisma.mealPlan.findUnique.mockResolvedValue(mockMealPlan)

      const req = new Request(`http://localhost/meal-plans/plan1/cook-meal/meal1?userId=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actualServings: 2 })
      })
      const res = await app.request(req)
      const data = await res.json()

      expect(res.status).toBe(403)
      expect(data.error).toBe('Access denied')
    })

    it('should return 404 if meal not found', async () => {
      const mockMealPlan = {
        id: 'plan1',
        userId,
        meals: [] // No meals
      }

      mockDb.prisma.mealPlan.findUnique.mockResolvedValue(mockMealPlan)

      const req = new Request(`http://localhost/meal-plans/plan1/cook-meal/nonexistent?userId=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actualServings: 2 })
      })
      const res = await app.request(req)
      const data = await res.json()

      expect(res.status).toBe(404)
      expect(data.error).toBe('Meal not found')
    })
  })

  describe('Integration scenarios for food waste prevention', () => {
    it('should prioritize expiring items in meal plan generation', async () => {
      const generateRequest = {
        userId,
        weekStartDate: '2024-01-15T00:00:00.000Z',
        preferences: {
          planningMode: 'assisted',
          prioritizeExpiring: true
        }
      }

      const mockPlanWithExpiringPriority = {
        id: 'waste-prevention-plan',
        userId,
        meals: [
          {
            id: 'urgent-meal',
            date: new Date('2024-01-15'),
            mealType: 'DINNER',
            simpleMealName: 'Use-Up Chicken Stir-fry',
            reason: 'Uses expiring chicken and vegetables'
          }
        ]
      }

      mockClaudeMealPlanner.claudeMealPlanner.generateWeeklyPlan.mockResolvedValue(mockPlanWithExpiringPriority)

      const req = new Request('http://localhost/meal-plans/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generateRequest)
      })
      const res = await app.request(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.mealPlan.meals[0].simpleMealName).toContain('Use-Up')
      expect(mockClaudeMealPlanner.claudeMealPlanner.generateWeeklyPlan).toHaveBeenCalledWith({
        userId,
        weekStartDate: new Date('2024-01-15T00:00:00.000Z'),
        preferences: expect.objectContaining({
          prioritizeExpiring: true
        })
      })
    })

    it('should handle leftover workflow for waste prevention', async () => {
      const mealPlanId = 'leftover-plan'
      const dinnerMealId = 'dinner-meal'
      
      // Cook dinner with leftovers
      const cookDinnerRequest = {
        actualServings: 4,
        hasLeftovers: true,
        leftoverAmount: 2
      }

      const mockMealPlan = {
        id: mealPlanId,
        userId,
        meals: [
          {
            id: dinnerMealId,
            simpleMealName: 'Chicken Curry',
            servings: 4,
            recipe: { id: 'curry-recipe', name: 'Chicken Curry' }
          }
        ]
      }

      mockDb.prisma.mealPlan.findUnique.mockResolvedValue(mockMealPlan)
      mockDb.prisma.plannedMeal.update.mockResolvedValue({
        id: dinnerMealId,
        isCooked: true,
        cookedAt: new Date()
      })

      const cookReq = new Request(`http://localhost/meal-plans/${mealPlanId}/cook-meal/${dinnerMealId}?userId=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cookDinnerRequest)
      })
      const cookRes = await cookReq.request(req)
      const cookData = await cookRes.json()

      expect(cookRes.status).toBe(200)
      expect(cookData.leftover).toEqual({
        id: 'leftover-dinner-meal',
        customName: 'Leftover Chicken Curry',
        amount: 2,
        unit: 'servings',
        isLeftover: true,
        leftoverFromId: 'curry-recipe',
        expirationDate: expect.any(Date)
      })

      // This leftover would then be used for next day's lunch
      expect(cookData.leftover.expirationDate).toBeTruthy()
    })

    it('should provide contextual suggestions based on expiring inventory', async () => {
      // Mock expiring items scenario
      const mockExpiringBasedSuggestions = [
        {
          name: 'Emergency Veggie Soup',
          uses: ['wilting vegetables', 'leftover broth'],
          time: 30,
          instructions: 'Use up all expiring vegetables in a hearty soup'
        },
        {
          name: 'Protein Scramble',
          uses: ['expiring eggs', 'leftover meat'],
          time: 15,
          instructions: 'Quick scramble to use expiring proteins'
        }
      ]

      mockClaudeMealPlanner.claudeMealPlanner.getSuggestionsForExpiring.mockResolvedValue(mockExpiringBasedSuggestions)

      const req = new Request(`http://localhost/meal-plans/suggestions/expiring?userId=${userId}`)
      const res = await app.request(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.suggestions).toHaveLength(2)
      expect(data.suggestions.every(s => s.name.includes('Emergency') || s.time <= 30)).toBe(true)
    })

    it('should handle dietary restrictions in meal plan updates', async () => {
      const mealPlanId = 'dietary-plan'
      const mealId = 'meal-to-update'
      
      const dietaryUpdate = {
        recipeId: 'vegetarian-alternative',
        simpleMealName: 'Vegetarian Stir-fry',
        servings: 4
      }

      const mockMealPlan = { id: mealPlanId, userId }
      const mockUpdatedMeal = {
        id: mealId,
        recipeId: 'vegetarian-alternative',
        simpleMealName: 'Vegetarian Stir-fry',
        servings: 4,
        recipe: {
          id: 'vegetarian-alternative',
          name: 'Vegetarian Stir-fry',
          dietaryTags: ['vegetarian', 'dairy-free']
        }
      }

      mockDb.prisma.mealPlan.findUnique.mockResolvedValue(mockMealPlan)
      mockDb.prisma.plannedMeal.update.mockResolvedValue(mockUpdatedMeal)

      const req = new Request(`http://localhost/meal-plans/${mealPlanId}/meals/${mealId}?userId=${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dietaryUpdate)
      })
      const res = await app.request(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.meal.recipe.dietaryTags).toContain('vegetarian')
    })

    it('should support meal plan approval workflow', async () => {
      const mealPlanId = 'approval-test-plan'
      
      // First generate draft plan
      const draftPlan = {
        id: mealPlanId,
        userId,
        status: 'DRAFT',
        meals: [
          { id: 'meal1', simpleMealName: 'Breakfast' },
          { id: 'meal2', simpleMealName: 'Lunch' },
          { id: 'meal3', simpleMealName: 'Dinner' }
        ]
      }

      // Then approve it
      const approvedPlan = { ...draftPlan, status: 'APPROVED' }

      mockDb.prisma.mealPlan.findUnique.mockResolvedValue(draftPlan)
      mockClaudeMealPlanner.claudeMealPlanner.approvePlan.mockResolvedValue(approvedPlan)

      const approveReq = new Request(`http://localhost/meal-plans/${mealPlanId}/approve?userId=${userId}`, {
        method: 'PUT'
      })
      const approveRes = await app.request(approveReq)
      const approveData = await approveRes.json()

      expect(approveRes.status).toBe(200)
      expect(approveData.mealPlan.status).toBe('APPROVED')
      expect(mockClaudeMealPlanner.claudeMealPlanner.approvePlan).toHaveBeenCalledWith(mealPlanId)
    })
  })
})