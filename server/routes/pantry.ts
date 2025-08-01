import { Hono } from 'hono'
import { prisma as db } from '../lib/db'

const app = new Hono()

// Get user's pantry data
app.get('/', async (c) => {
  try {
    const userId = c.req.query('userId')
    
    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400)
    }

    // Get pantry locations with items
    const locations = await db.pantryLocation.findMany({
      where: { userId },
      include: {
        items: {
          orderBy: { addedDate: 'desc' }
        }
      },
      orderBy: { order: 'asc' }
    })

    // Get depleted items
    const depletedItems = await db.depletedItem.findMany({
      where: { userId },
      orderBy: { depletedDate: 'desc' }
    })

    // Transform to match frontend interface
    const transformedLocations = locations.map(loc => ({
      id: loc.id,
      name: loc.name,
      items: loc.items.map(item => ({
        id: item.id,
        name: item.name,
        amount: item.amount,
        unit: item.unit,
        location: loc.id,
        category: item.category,
        expirationDate: item.expirationDate?.toISOString(),
        addedDate: item.addedDate.toISOString()
      }))
    }))

    const transformedDepleted = depletedItems.map(item => ({
      id: item.id,
      name: item.name,
      lastAmount: item.lastAmount,
      unit: item.unit,
      category: item.category,
      depletedDate: item.depletedDate.toISOString(),
      timesUsed: item.timesUsed,
      isFrequentlyUsed: item.isFrequentlyUsed
    }))

    return c.json({
      locations: transformedLocations,
      depletedItems: transformedDepleted
    })
  } catch (error) {
    console.error('Error fetching pantry data:', error)
    return c.json({ error: 'Failed to fetch pantry data' }, 500)
  }
})

// Save user's pantry data
app.post('/', async (c) => {
  try {
    const { userId, locations, depletedItems } = await c.req.json()
    
    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400)
    }

    // Use transaction to ensure data consistency
    await db.$transaction(async (tx) => {
      // Delete existing data
      await tx.pantryItem.deleteMany({ where: { userId } })
      await tx.pantryLocation.deleteMany({ where: { userId } })
      await tx.depletedItem.deleteMany({ where: { userId } })

      // Create pantry locations and items
      for (const [index, location] of locations.entries()) {
        const createdLocation = await tx.pantryLocation.create({
          data: {
            id: location.id,
            userId,
            name: location.name,
            order: index
          }
        })

        // Create items for this location
        for (const item of location.items) {
          await tx.pantryItem.create({
            data: {
              id: item.id,
              userId,
              locationId: createdLocation.id,
              name: item.name,
              amount: item.amount,
              unit: item.unit,
              category: item.category,
              expirationDate: item.expirationDate ? new Date(item.expirationDate) : null,
              addedDate: new Date(item.addedDate)
            }
          })
        }
      }

      // Create depleted items
      for (const item of depletedItems) {
        await tx.depletedItem.create({
          data: {
            id: item.id,
            userId,
            name: item.name,
            lastAmount: item.lastAmount,
            unit: item.unit,
            category: item.category,
            depletedDate: new Date(item.depletedDate),
            timesUsed: item.timesUsed,
            isFrequentlyUsed: item.isFrequentlyUsed
          }
        })
      }
    })

    return c.json({ success: true })
  } catch (error) {
    console.error('Error saving pantry data:', error)
    return c.json({ error: 'Failed to save pantry data' }, 500)
  }
})

export default app