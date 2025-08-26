/**
 * Pantry Items API Routes
 * Enhanced pantry management with expiration tracking
 */

import { Hono } from 'hono'
import { prisma } from '../lib/db'
import { addDays } from 'date-fns'

const app = new Hono()

// Get all pantry items for a user
app.get('/', async (c) => {
  try {
    const userId = c.req.query('userId')
    
    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400)
    }
    
    const items = await prisma.pantryItem.findMany({
      where: { userId },
      include: {
        ingredient: {
          select: {
            name: true,
            category: true,
            calories: true,
            protein: true,
            carbs: true,
            fat: true,
          },
        },
      },
      orderBy: [
        { location: 'asc' },
        { customName: 'asc' },
      ],
    })
    
    return c.json(items)
  } catch (error) {
    console.error('Error fetching pantry items:', error)
    return c.json({ error: 'Failed to fetch pantry items' }, 500)
  }
})

// Get expiring items
app.get('/expiring', async (c) => {
  try {
    const userId = c.req.query('userId')
    const daysAhead = parseInt(c.req.query('daysAhead') || '7')
    
    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400)
    }
    
    const cutoffDate = addDays(new Date(), daysAhead)
    
    const items = await prisma.pantryItem.findMany({
      where: {
        userId,
        expirationDate: {
          lte: cutoffDate,
        },
      },
      include: {
        ingredient: {
          select: {
            name: true,
            category: true,
          },
        },
      },
      orderBy: {
        expirationDate: 'asc',
      },
    })
    
    return c.json({ items })
  } catch (error) {
    console.error('Error fetching expiring items:', error)
    return c.json({ error: 'Failed to fetch expiring items' }, 500)
  }
})

// Add pantry item
app.post('/', async (c) => {
  try {
    const data = await c.req.json()
    const { userId, ...itemData } = data
    
    if (!userId || !itemData.customName) {
      return c.json({ error: 'Missing required fields' }, 400)
    }
    
    // Try to match with existing ingredient
    let ingredientId = null
    if (itemData.customName) {
      const ingredient = await prisma.ingredient.findFirst({
        where: {
          OR: [
            { name: { equals: itemData.customName, mode: 'insensitive' } },
            { alternativeNames: { has: itemData.customName.toLowerCase() } },
          ],
        },
      })
      ingredientId = ingredient?.id
    }
    
    // Calculate expiration date if not provided
    let expirationDate = itemData.expirationDate ? new Date(itemData.expirationDate) : null
    if (!expirationDate && ingredientId) {
      const ingredient = await prisma.ingredient.findUnique({
        where: { id: ingredientId },
      })
      
      if (ingredient) {
        const daysToAdd = itemData.location === 'FREEZER' 
          ? ingredient.shelfLifeFreezer
          : itemData.location === 'FRIDGE'
          ? ingredient.shelfLifeFridge
          : ingredient.shelfLifeCounter
        
        if (daysToAdd) {
          expirationDate = addDays(new Date(), daysToAdd)
        }
      }
    }
    
    const item = await prisma.pantryItem.create({
      data: {
        ...itemData,
        userId,
        ingredientId,
        expirationDate,
        purchaseDate: new Date(),
      },
      include: {
        ingredient: true,
      },
    })
    
    return c.json(item)
  } catch (error) {
    console.error('Error adding pantry item:', error)
    return c.json({ error: 'Failed to add pantry item' }, 500)
  }
})

// Update pantry item
app.put('/:itemId', async (c) => {
  try {
    const itemId = c.req.param('itemId')
    const { userId, ...updates } = await c.req.json()
    
    if (!userId || !itemId) {
      return c.json({ error: 'Missing required parameters' }, 400)
    }
    
    // Verify ownership
    const existingItem = await prisma.pantryItem.findFirst({
      where: { id: itemId, userId },
    })
    
    if (!existingItem) {
      return c.json({ error: 'Item not found' }, 404)
    }
    
    const updatedItem = await prisma.pantryItem.update({
      where: { id: itemId },
      data: {
        ...updates,
        expirationDate: updates.expirationDate ? new Date(updates.expirationDate) : undefined,
      },
      include: {
        ingredient: true,
      },
    })
    
    return c.json(updatedItem)
  } catch (error) {
    console.error('Error updating pantry item:', error)
    return c.json({ error: 'Failed to update pantry item' }, 500)
  }
})

// Delete pantry item
app.delete('/:itemId', async (c) => {
  try {
    const itemId = c.req.param('itemId')
    const userId = c.req.query('userId')
    
    if (!userId || !itemId) {
      return c.json({ error: 'Missing required parameters' }, 400)
    }
    
    // Verify ownership
    const existingItem = await prisma.pantryItem.findFirst({
      where: { id: itemId, userId },
    })
    
    if (!existingItem) {
      return c.json({ error: 'Item not found' }, 404)
    }
    
    await prisma.pantryItem.delete({
      where: { id: itemId },
    })
    
    return c.json({ success: true })
  } catch (error) {
    console.error('Error deleting pantry item:', error)
    return c.json({ error: 'Failed to delete pantry item' }, 500)
  }
})

export default app