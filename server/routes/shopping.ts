/**
 * Shopping List API Routes
 * Smart shopping list management with meal plan integration
 */

import { Hono } from 'hono'
import { prisma } from '../lib/db'

const app = new Hono()

// Get current shopping list
app.get('/current', async (c) => {
  try {
    const userId = c.req.query('userId')
    
    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400)
    }
    
    // Get or create current shopping list
    let shoppingList = await prisma.shoppingList.findFirst({
      where: {
        userId,
        status: { not: 'COMPLETED' },
      },
      include: {
        items: {
          include: {
            ingredient: {
              select: {
                name: true,
                category: true,
              },
            },
          },
          orderBy: [
            { category: 'asc' },
            { name: 'asc' },
          ],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
    
    // Create new list if none exists
    if (!shoppingList) {
      shoppingList = await prisma.shoppingList.create({
        data: {
          userId,
          status: 'PENDING',
        },
        include: {
          items: true,
        },
      })
    }
    
    return c.json(shoppingList)
  } catch (error) {
    console.error('Error fetching shopping list:', error)
    return c.json({ error: 'Failed to fetch shopping list' }, 500)
  }
})

// Generate shopping list from meal plan
app.post('/generate', async (c) => {
  try {
    const { userId, mealPlanId } = await c.req.json()
    
    if (!userId || !mealPlanId) {
      return c.json({ error: 'Missing required fields' }, 400)
    }
    
    // Get meal plan with recipes
    const mealPlan = await prisma.mealPlan.findFirst({
      where: { id: mealPlanId, userId },
      include: {
        meals: {
          include: {
            recipe: {
              include: {
                ingredients: {
                  include: {
                    ingredient: true,
                  },
                },
              },
            },
          },
        },
      },
    })
    
    if (!mealPlan) {
      return c.json({ error: 'Meal plan not found' }, 404)
    }
    
    // Get current pantry items
    const pantryItems = await prisma.pantryItem.findMany({
      where: { userId },
      include: { ingredient: true },
    })
    
    // Create a map of what's in pantry
    const pantryMap = new Map()
    pantryItems.forEach(item => {
      const key = item.ingredient?.name || item.customName
      pantryMap.set(key.toLowerCase(), item.amount)
    })
    
    // Aggregate required ingredients
    const requiredIngredients = new Map()
    
    mealPlan.meals.forEach(meal => {
      if (meal.recipe && !meal.skipped) {
        meal.recipe.ingredients.forEach(recipeIngredient => {
          const name = recipeIngredient.ingredient?.name || recipeIngredient.originalText
          const key = name.toLowerCase()
          
          if (!requiredIngredients.has(key)) {
            requiredIngredients.set(key, {
              name,
              amount: 0,
              unit: recipeIngredient.unit,
              category: recipeIngredient.ingredient?.category || 'Other',
              ingredientId: recipeIngredient.ingredientId,
            })
          }
          
          const current = requiredIngredients.get(key)
          current.amount += (recipeIngredient.amount || 1) * (meal.servings / (meal.recipe.servings || 4))
        })
      }
    })
    
    // Create shopping list with items not in pantry
    const shoppingList = await prisma.shoppingList.create({
      data: {
        userId,
        mealPlanId,
        status: 'PENDING',
        items: {
          create: Array.from(requiredIngredients.entries())
            .filter(([key, item]) => {
              const inPantry = pantryMap.get(key) || 0
              return inPantry < item.amount
            })
            .map(([key, item]) => ({
              name: item.name,
              amount: item.amount - (pantryMap.get(key) || 0),
              unit: item.unit,
              category: getCategoryForStore(item.category),
              ingredientId: item.ingredientId,
              purchased: false,
              isStaple: false,
            })),
        },
      },
      include: {
        items: true,
      },
    })
    
    return c.json(shoppingList)
  } catch (error) {
    console.error('Error generating shopping list:', error)
    return c.json({ error: 'Failed to generate shopping list' }, 500)
  }
})

// Add item to shopping list
app.post('/items', async (c) => {
  try {
    const { userId, shoppingListId, ...itemData } = await c.req.json()
    
    if (!userId || !itemData.name) {
      return c.json({ error: 'Missing required fields' }, 400)
    }
    
    let listId = shoppingListId
    
    // Get or create shopping list if not provided
    if (!listId) {
      const list = await prisma.shoppingList.findFirst({
        where: {
          userId,
          status: { not: 'COMPLETED' },
        },
      })
      
      if (list) {
        listId = list.id
      } else {
        const newList = await prisma.shoppingList.create({
          data: {
            userId,
            status: 'PENDING',
          },
        })
        listId = newList.id
      }
    }
    
    const item = await prisma.shoppingItem.create({
      data: {
        ...itemData,
        shoppingListId: listId,
        category: itemData.category || 'Other',
        purchased: false,
      },
    })
    
    return c.json(item)
  } catch (error) {
    console.error('Error adding shopping item:', error)
    return c.json({ error: 'Failed to add shopping item' }, 500)
  }
})

// Update shopping item
app.put('/items/:itemId', async (c) => {
  try {
    const itemId = c.req.param('itemId')
    const { userId, ...updates } = await c.req.json()
    
    if (!userId || !itemId) {
      return c.json({ error: 'Missing required parameters' }, 400)
    }
    
    // Verify ownership through shopping list
    const item = await prisma.shoppingItem.findFirst({
      where: { id: itemId },
      include: { shoppingList: true },
    })
    
    if (!item || item.shoppingList.userId !== userId) {
      return c.json({ error: 'Item not found' }, 404)
    }
    
    const updatedItem = await prisma.shoppingItem.update({
      where: { id: itemId },
      data: updates,
    })
    
    return c.json(updatedItem)
  } catch (error) {
    console.error('Error updating shopping item:', error)
    return c.json({ error: 'Failed to update shopping item' }, 500)
  }
})

// Delete shopping item
app.delete('/items/:itemId', async (c) => {
  try {
    const itemId = c.req.param('itemId')
    const userId = c.req.query('userId')
    
    if (!userId || !itemId) {
      return c.json({ error: 'Missing required parameters' }, 400)
    }
    
    // Verify ownership through shopping list
    const item = await prisma.shoppingItem.findFirst({
      where: { id: itemId },
      include: { shoppingList: true },
    })
    
    if (!item || item.shoppingList.userId !== userId) {
      return c.json({ error: 'Item not found' }, 404)
    }
    
    await prisma.shoppingItem.delete({
      where: { id: itemId },
    })
    
    return c.json({ success: true })
  } catch (error) {
    console.error('Error deleting shopping item:', error)
    return c.json({ error: 'Failed to delete shopping item' }, 500)
  }
})

// Start shopping
app.put('/:listId/start', async (c) => {
  try {
    const listId = c.req.param('listId')
    const { userId } = await c.req.json()
    
    if (!userId || !listId) {
      return c.json({ error: 'Missing required parameters' }, 400)
    }
    
    const list = await prisma.shoppingList.findFirst({
      where: { id: listId, userId },
    })
    
    if (!list) {
      return c.json({ error: 'Shopping list not found' }, 404)
    }
    
    const updatedList = await prisma.shoppingList.update({
      where: { id: listId },
      data: { status: 'SHOPPING' },
      include: { items: true },
    })
    
    return c.json(updatedList)
  } catch (error) {
    console.error('Error starting shopping:', error)
    return c.json({ error: 'Failed to start shopping' }, 500)
  }
})

// Complete shopping
app.put('/:listId/complete', async (c) => {
  try {
    const listId = c.req.param('listId')
    const { userId } = await c.req.json()
    
    if (!userId || !listId) {
      return c.json({ error: 'Missing required parameters' }, 400)
    }
    
    const list = await prisma.shoppingList.findFirst({
      where: { id: listId, userId },
      include: { items: true },
    })
    
    if (!list) {
      return c.json({ error: 'Shopping list not found' }, 404)
    }
    
    // Add purchased items to pantry
    const purchasedItems = list.items.filter(item => item.purchased)
    
    for (const item of purchasedItems) {
      // Check if item already exists in pantry
      const existingPantryItem = await prisma.pantryItem.findFirst({
        where: {
          userId,
          customName: item.name,
        },
      })
      
      if (existingPantryItem) {
        // Update amount
        await prisma.pantryItem.update({
          where: { id: existingPantryItem.id },
          data: {
            amount: existingPantryItem.amount + (item.amount || 1),
          },
        })
      } else {
        // Create new pantry item
        await prisma.pantryItem.create({
          data: {
            userId,
            customName: item.name,
            amount: item.amount || 1,
            unit: item.unit || '',
            location: 'PANTRY',
            ingredientId: item.ingredientId,
            purchasePrice: item.price,
          },
        })
      }
    }
    
    // Mark list as completed
    const updatedList = await prisma.shoppingList.update({
      where: { id: listId },
      data: { status: 'COMPLETED' },
      include: { items: true },
    })
    
    return c.json(updatedList)
  } catch (error) {
    console.error('Error completing shopping:', error)
    return c.json({ error: 'Failed to complete shopping' }, 500)
  }
})

// Reorder staples
app.post('/reorder-staples', async (c) => {
  try {
    const { userId } = await c.req.json()
    
    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400)
    }
    
    // Get user's staple items from past lists
    const staples = await prisma.shoppingItem.findMany({
      where: {
        shoppingList: { userId },
        isStaple: true,
      },
      distinct: ['name'],
      select: {
        name: true,
        amount: true,
        unit: true,
        category: true,
        ingredientId: true,
      },
    })
    
    if (staples.length === 0) {
      return c.json({ itemsAdded: 0, message: 'No staple items found' })
    }
    
    // Get or create current shopping list
    let shoppingList = await prisma.shoppingList.findFirst({
      where: {
        userId,
        status: { not: 'COMPLETED' },
      },
    })
    
    if (!shoppingList) {
      shoppingList = await prisma.shoppingList.create({
        data: {
          userId,
          status: 'PENDING',
        },
      })
    }
    
    // Add staples to list
    const createdItems = await prisma.shoppingItem.createMany({
      data: staples.map(staple => ({
        ...staple,
        shoppingListId: shoppingList!.id,
        purchased: false,
        isStaple: true,
      })),
    })
    
    return c.json({
      itemsAdded: createdItems.count,
      message: `Added ${createdItems.count} staple items to your list`,
    })
  } catch (error) {
    console.error('Error reordering staples:', error)
    return c.json({ error: 'Failed to reorder staples' }, 500)
  }
})

// Helper function to map ingredient categories to store sections
function getCategoryForStore(ingredientCategory: string): string {
  const categoryMap: Record<string, string> = {
    'vegetable': 'Produce',
    'fruit': 'Produce',
    'dairy': 'Dairy',
    'protein': 'Meat & Seafood',
    'meat': 'Meat & Seafood',
    'seafood': 'Meat & Seafood',
    'grain': 'Bakery',
    'bread': 'Bakery',
    'frozen': 'Frozen',
    'canned': 'Canned & Packaged',
    'spice': 'Canned & Packaged',
    'beverage': 'Beverages',
    'snack': 'Snacks',
  }
  
  return categoryMap[ingredientCategory?.toLowerCase()] || 'Other'
}

export default app