import { Hono } from 'hono'
import { prisma as db } from '../lib/db'

const app = new Hono()

// Get user's grocery items
app.get('/', async (c) => {
  try {
    const userId = c.req.query('userId')
    
    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400)
    }

    const groceryItems = await db.groceryItem.findMany({
      where: { userId },
      orderBy: { addedDate: 'desc' }
    })

    // Transform to match frontend interface
    const transformedItems = groceryItems.map(item => ({
      id: item.id,
      name: item.name,
      amount: item.amount,
      unit: item.unit,
      category: item.category,
      completed: item.completed,
      addedDate: item.addedDate.toISOString()
    }))

    return c.json({ items: transformedItems })
  } catch (error) {
    console.error('Error fetching grocery data:', error)
    return c.json({ error: 'Failed to fetch grocery data' }, 500)
  }
})

// Save user's grocery items
app.post('/', async (c) => {
  try {
    const { userId, items } = await c.req.json()
    
    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400)
    }

    // Use transaction to ensure data consistency
    await db.$transaction(async (tx) => {
      // Delete existing items
      await tx.groceryItem.deleteMany({ where: { userId } })

      // Create new items
      for (const item of items) {
        await tx.groceryItem.create({
          data: {
            id: item.id,
            userId,
            name: item.name,
            amount: item.amount,
            unit: item.unit,
            category: item.category,
            completed: item.completed,
            addedDate: new Date(item.addedDate)
          }
        })
      }
    })

    return c.json({ success: true })
  } catch (error) {
    console.error('Error saving grocery data:', error)
    return c.json({ error: 'Failed to save grocery data' }, 500)
  }
})

export default app