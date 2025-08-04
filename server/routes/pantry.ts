import { Hono } from 'hono'
import { prisma as db } from '../lib/db'

const app = new Hono()

// Helper function to check if user has access to a pantry location
async function getUserPantryPermission(userId: string, pantryLocationId: string) {
  // Check if user owns the pantry
  const ownerPantry = await db.pantryLocation.findFirst({
    where: { id: pantryLocationId, userId }
  })

  if (ownerPantry) {
    return { permission: 'MANAGE', isOwner: true }
  }

  // Check if pantry is shared with user
  const share = await db.pantryShare.findFirst({
    where: { pantryLocationId, userId }
  })

  if (share) {
    return { permission: share.permission, isOwner: false }
  }

  return { permission: null, isOwner: false }
}

// Helper function to get all pantries user has access to
async function getUserAccessiblePantries(userId: string) {
  // Get owned pantries
  const ownedPantries = await db.pantryLocation.findMany({
    where: { userId },
    include: {
      items: {
        orderBy: { addedDate: 'desc' }
      },
      user: {
        select: { id: true, name: true, email: true, avatar: true }
      }
    },
    orderBy: { order: 'asc' }
  })

  // Get shared pantries
  const sharedPantries = await db.pantryShare.findMany({
    where: { userId },
    include: {
      pantryLocation: {
        include: {
          items: {
            orderBy: { addedDate: 'desc' }
          },
          user: {
            select: { id: true, name: true, email: true, avatar: true }
          }
        }
      }
    }
  })

  // Combine and transform
  const allPantries = [
    ...ownedPantries.map(pantry => ({
      ...pantry,
      permission: 'MANAGE' as const,
      isOwner: true
    })),
    ...sharedPantries.map(share => ({
      ...share.pantryLocation,
      permission: share.permission,
      isOwner: false
    }))
  ]

  return allPantries
}

// Get user's pantry data (including shared pantries)
app.get('/', async (c) => {
  try {
    const userId = c.req.query('userId')
    
    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400)
    }

    // Get all pantries user has access to
    const locations = await getUserAccessiblePantries(userId)

    // Get depleted items from all accessible pantries
    const depletedItems = await db.depletedItem.findMany({
      where: { userId },
      orderBy: { depletedDate: 'desc' }
    })

    // Transform to match frontend interface
    const transformedLocations = locations.map((loc: any) => ({
      id: loc.id,
      name: loc.name,
      owner: loc.user,
      permission: loc.permission,
      isOwner: loc.isOwner,
      items: loc.items.map((item: any) => ({
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

    const transformedDepleted = depletedItems.map((item: any) => ({
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
    await db.$transaction(async (tx: any) => {
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

// Add item to pantry (with permission checking)
app.post('/items', async (c) => {
  try {
    const { userId, locationId, item } = await c.req.json()
    
    if (!userId || !locationId || !item) {
      return c.json({ error: 'Missing required fields' }, 400)
    }

    // Check if user has edit permission
    const { permission } = await getUserPantryPermission(userId, locationId)
    
    if (!permission || permission === 'VIEW') {
      return c.json({ error: 'Insufficient permissions to add items' }, 403)
    }

    const createdItem = await db.pantryItem.create({
      data: {
        userId,
        locationId,
        name: item.name,
        amount: item.amount,
        unit: item.unit,
        category: item.category,
        expirationDate: item.expirationDate ? new Date(item.expirationDate) : null
      }
    })

    // Log activity
    await db.pantryActivityLog.create({
      data: {
        pantryLocationId: locationId,
        userId,
        action: 'ITEM_ADDED',
        itemName: item.name,
        itemId: createdItem.id,
        newValue: `${item.amount} ${item.unit}`
      }
    })

    return c.json({
      id: createdItem.id,
      name: createdItem.name,
      amount: createdItem.amount,
      unit: createdItem.unit,
      location: createdItem.locationId,
      category: createdItem.category,
      expirationDate: createdItem.expirationDate?.toISOString(),
      addedDate: createdItem.addedDate.toISOString()
    })
  } catch (error) {
    console.error('Error adding item:', error)
    return c.json({ error: 'Failed to add item' }, 500)
  }
})

// Update item in pantry (with permission checking)
app.put('/items/:itemId', async (c) => {
  try {
    const userId = c.req.query('userId')
    const itemId = c.req.param('itemId')
    const updates = await c.req.json()
    
    if (!userId || !itemId) {
      return c.json({ error: 'Missing required parameters' }, 400)
    }

    // Get the item to check permissions
    const existingItem = await db.pantryItem.findUnique({
      where: { id: itemId },
      include: { location: true }
    })

    if (!existingItem) {
      return c.json({ error: 'Item not found' }, 404)
    }

    // Check if user has edit permission
    const { permission } = await getUserPantryPermission(userId, existingItem.locationId)
    
    if (!permission || permission === 'VIEW') {
      return c.json({ error: 'Insufficient permissions to edit items' }, 403)
    }

    const oldValue = `${existingItem.amount} ${existingItem.unit}`
    const newValue = `${updates.amount || existingItem.amount} ${updates.unit || existingItem.unit}`

    const updatedItem = await db.pantryItem.update({
      where: { id: itemId },
      data: {
        name: updates.name ?? existingItem.name,
        amount: updates.amount ?? existingItem.amount,
        unit: updates.unit ?? existingItem.unit,
        category: updates.category ?? existingItem.category,
        expirationDate: updates.expirationDate ? new Date(updates.expirationDate) : existingItem.expirationDate
      }
    })

    // Log activity if amount changed
    if (oldValue !== newValue) {
      await db.pantryActivityLog.create({
        data: {
          pantryLocationId: existingItem.locationId,
          userId,
          action: 'ITEM_UPDATED',
          itemName: updatedItem.name,
          itemId: updatedItem.id,
          oldValue,
          newValue
        }
      })
    }

    return c.json({
      id: updatedItem.id,
      name: updatedItem.name,
      amount: updatedItem.amount,
      unit: updatedItem.unit,
      location: updatedItem.locationId,
      category: updatedItem.category,
      expirationDate: updatedItem.expirationDate?.toISOString(),
      addedDate: updatedItem.addedDate.toISOString()
    })
  } catch (error) {
    console.error('Error updating item:', error)
    return c.json({ error: 'Failed to update item' }, 500)
  }
})

// Delete item from pantry (with permission checking)
app.delete('/items/:itemId', async (c) => {
  try {
    const userId = c.req.query('userId')
    const itemId = c.req.param('itemId')
    
    if (!userId || !itemId) {
      return c.json({ error: 'Missing required parameters' }, 400)
    }

    // Get the item to check permissions
    const existingItem = await db.pantryItem.findUnique({
      where: { id: itemId },
      include: { location: true }
    })

    if (!existingItem) {
      return c.json({ error: 'Item not found' }, 404)
    }

    // Check if user has edit permission
    const { permission } = await getUserPantryPermission(userId, existingItem.locationId)
    
    if (!permission || permission === 'VIEW') {
      return c.json({ error: 'Insufficient permissions to delete items' }, 403)
    }

    await db.pantryItem.delete({
      where: { id: itemId }
    })

    // Log activity
    await db.pantryActivityLog.create({
      data: {
        pantryLocationId: existingItem.locationId,
        userId,
        action: 'ITEM_DELETED',
        itemName: existingItem.name,
        itemId: existingItem.id,
        oldValue: `${existingItem.amount} ${existingItem.unit}`
      }
    })

    return c.json({ message: 'Item deleted successfully' })
  } catch (error) {
    console.error('Error deleting item:', error)
    return c.json({ error: 'Failed to delete item' }, 500)
  }
})

// Get activity log for a pantry
app.get('/activity/:pantryLocationId', async (c) => {
  try {
    const userId = c.req.query('userId')
    const pantryLocationId = c.req.param('pantryLocationId')
    
    if (!userId || !pantryLocationId) {
      return c.json({ error: 'Missing required parameters' }, 400)
    }

    // Check if user has access to this pantry
    const { permission } = await getUserPantryPermission(userId, pantryLocationId)
    
    if (!permission) {
      return c.json({ error: 'Access denied' }, 403)
    }

    const activities = await db.pantryActivityLog.findMany({
      where: { pantryLocationId },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50 // Limit to recent activities
    })

    return c.json({
      activities: activities.map(activity => ({
        id: activity.id,
        action: activity.action,
        itemName: activity.itemName,
        oldValue: activity.oldValue,
        newValue: activity.newValue,
        user: activity.user,
        createdAt: activity.createdAt.toISOString()
      }))
    })
  } catch (error) {
    console.error('Error fetching activity log:', error)
    return c.json({ error: 'Failed to fetch activity log' }, 500)
  }
})

export default app