/**
 * Meal Planning API Routes
 * Handles meal plan generation, management, and Claude AI integration
 */

import { Hono } from 'hono'
import { prisma } from '../lib/db'
import { claudeMealPlanner } from '../services/claude-meal-planner'
import { startOfWeek } from 'date-fns'

const app = new Hono()

// Get current week's meal plan
app.get('/current', async (c) => {
  try {
    const userId = c.req.query('userId')
    const weekStartDate = c.req.query('weekStartDate')
    
    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400)
    }
    
    const weekStart = weekStartDate 
      ? new Date(weekStartDate)
      : startOfWeek(new Date())
    
    const mealPlan = await prisma.mealPlan.findFirst({
      where: {
        userId,
        weekStartDate: weekStart,
      },
      include: {
        meals: {
          include: {
            recipe: {
              select: {
                id: true,
                name: true,
                prepTime: true,
                cookTime: true,
                totalTime: true,
                imageUrl: true,
              },
            },
          },
          orderBy: [
            { date: 'asc' },
            { mealType: 'asc' },
          ],
        },
      },
    })
    
    return c.json(mealPlan || null)
  } catch (error) {
    console.error('Error fetching meal plan:', error)
    return c.json({ error: 'Failed to fetch meal plan' }, 500)
  }
})

// Generate meal plan with Claude
app.post('/generate', async (c) => {
  try {
    const { userId, weekStartDate, preferences } = await c.req.json()
    
    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400)
    }
    
    const mealPlan = await claudeMealPlanner.generateWeeklyPlan({
      userId,
      weekStartDate: new Date(weekStartDate || startOfWeek(new Date())),
      preferences,
    })
    
    return c.json(mealPlan)
  } catch (error) {
    console.error('Error generating meal plan:', error)
    return c.json({ error: 'Failed to generate meal plan' }, 500)
  }
})

// Approve meal plan
app.put('/:planId/approve', async (c) => {
  try {
    const planId = c.req.param('planId')
    const { userId } = await c.req.json()
    
    if (!userId || !planId) {
      return c.json({ error: 'Missing required parameters' }, 400)
    }
    
    // Verify ownership
    const plan = await prisma.mealPlan.findFirst({
      where: { id: planId, userId },
    })
    
    if (!plan) {
      return c.json({ error: 'Meal plan not found' }, 404)
    }
    
    const updatedPlan = await prisma.mealPlan.update({
      where: { id: planId },
      data: { status: 'APPROVED' },
      include: {
        meals: {
          include: {
            recipe: true,
          },
        },
      },
    })
    
    return c.json(updatedPlan)
  } catch (error) {
    console.error('Error approving meal plan:', error)
    return c.json({ error: 'Failed to approve meal plan' }, 500)
  }
})

// Update a meal
app.put('/meals/:mealId', async (c) => {
  try {
    const mealId = c.req.param('mealId')
    const { userId, ...updates } = await c.req.json()
    
    if (!userId || !mealId) {
      return c.json({ error: 'Missing required parameters' }, 400)
    }
    
    // Verify ownership through meal plan
    const meal = await prisma.plannedMeal.findFirst({
      where: { id: mealId },
      include: {
        mealPlan: true,
      },
    })
    
    if (!meal || meal.mealPlan.userId !== userId) {
      return c.json({ error: 'Meal not found' }, 404)
    }
    
    const updatedMeal = await prisma.plannedMeal.update({
      where: { id: mealId },
      data: updates,
      include: {
        recipe: true,
      },
    })
    
    return c.json(updatedMeal)
  } catch (error) {
    console.error('Error updating meal:', error)
    return c.json({ error: 'Failed to update meal' }, 500)
  }
})

// Mark meal as cooked
app.put('/meals/:mealId/cooked', async (c) => {
  try {
    const mealId = c.req.param('mealId')
    const { userId } = await c.req.json()
    
    if (!userId || !mealId) {
      return c.json({ error: 'Missing required parameters' }, 400)
    }
    
    // Verify ownership through meal plan
    const meal = await prisma.plannedMeal.findFirst({
      where: { id: mealId },
      include: {
        mealPlan: true,
      },
    })
    
    if (!meal || meal.mealPlan.userId !== userId) {
      return c.json({ error: 'Meal not found' }, 404)
    }
    
    const updatedMeal = await prisma.plannedMeal.update({
      where: { id: mealId },
      data: {
        isCooked: true,
        cookedAt: new Date(),
      },
      include: {
        recipe: true,
      },
    })
    
    // If meal has leftovers, create pantry items
    if (meal.expectLeftovers && meal.leftoverServings) {
      await prisma.pantryItem.create({
        data: {
          userId,
          customName: `Leftover ${meal.simpleMealName || meal.recipe?.name || 'meal'}`,
          amount: meal.leftoverServings,
          unit: 'servings',
          location: 'FRIDGE',
          isLeftover: true,
          leftoverFromId: meal.recipeId || undefined,
          leftoverDate: new Date(),
          expirationDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
        },
      })
    }
    
    return c.json(updatedMeal)
  } catch (error) {
    console.error('Error marking meal as cooked:', error)
    return c.json({ error: 'Failed to mark meal as cooked' }, 500)
  }
})

// Get Claude suggestions for expiring items
app.get('/suggestions', async (c) => {
  try {
    const userId = c.req.query('userId')
    
    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400)
    }
    
    const suggestions = await claudeMealPlanner.getSuggestionsForExpiring(userId)
    
    return c.json(suggestions)
  } catch (error) {
    console.error('Error getting suggestions:', error)
    return c.json({ error: 'Failed to get suggestions' }, 500)
  }
})

export default app