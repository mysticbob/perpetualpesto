import { McpServer } from '@modelcontextprotocol/sdk/server/mcp'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio'
import { z } from 'zod'
import { prisma } from '../lib/db'

/**
 * Pantry MCP Server
 * 
 * Exposes pantry inventory, expiration tracking, and quantity management
 * to AI agents through the Model Context Protocol.
 */

// Validation schemas
const UserIdSchema = z.string().cuid()
const LocationIdSchema = z.string().cuid()
const PantryItemSchema = z.object({
  name: z.string().min(1),
  amount: z.string().min(1),
  unit: z.string().min(1),
  category: z.string().optional(),
  expirationDate: z.string().datetime().optional()
})

const AddItemSchema = z.object({
  userId: UserIdSchema,
  locationId: LocationIdSchema,
  item: PantryItemSchema
})

const UpdateInventorySchema = z.object({
  itemId: z.string().cuid(),
  amount: z.string().optional(),
  unit: z.string().optional(),
  expirationDate: z.string().datetime().optional()
})

const CheckAvailabilitySchema = z.object({
  userId: UserIdSchema,
  ingredients: z.array(z.object({
    name: z.string(),
    amount: z.string(),
    unit: z.string()
  }))
})

// Helper functions
async function getUserPantryPermission(userId: string, pantryLocationId: string) {
  const ownerPantry = await prisma.pantryLocation.findFirst({
    where: { id: pantryLocationId, userId }
  })

  if (ownerPantry) {
    return { permission: 'MANAGE', isOwner: true }
  }

  const share = await prisma.pantryShare.findFirst({
    where: { pantryLocationId, userId }
  })

  if (share) {
    return { permission: share.permission, isOwner: false }
  }

  return { permission: null, isOwner: false }
}

async function getUserAccessiblePantries(userId: string) {
  const ownedPantries = await prisma.pantryLocation.findMany({
    where: { userId },
    include: {
      items: {
        orderBy: { addedDate: 'desc' }
      },
      user: {
        select: { id: true, name: true, email: true }
      }
    },
    orderBy: { order: 'asc' }
  })

  const sharedPantries = await prisma.pantryShare.findMany({
    where: { userId },
    include: {
      pantryLocation: {
        include: {
          items: {
            orderBy: { addedDate: 'desc' }
          },
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      }
    }
  })

  return [
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
}

// Create MCP Server
const server = new McpServer({
  name: 'pantry-server',
  version: '1.0.0'
}, {
  capabilities: {
    resources: {},
    tools: {},
    prompts: {}
  }
})

// Register Resources
server.setRequestHandler('resources/list', async () => {
  return {
    resources: [
      {
        uri: 'pantry://inventory/{userId}',
        name: 'User Pantry Inventory',
        description: 'Complete pantry inventory for a user including all accessible locations',
        mimeType: 'application/json'
      },
      {
        uri: 'pantry://location/{locationId}',
        name: 'Pantry Location',
        description: 'Items in a specific pantry location',
        mimeType: 'application/json'
      },
      {
        uri: 'pantry://expiring/{userId}?days={days}',
        name: 'Expiring Items',
        description: 'Items expiring within specified number of days',
        mimeType: 'application/json'
      },
      {
        uri: 'pantry://depleted/{userId}',
        name: 'Depleted Items',
        description: 'Recently depleted items that may need restocking',
        mimeType: 'application/json'
      },
      {
        uri: 'pantry://activity/{locationId}',
        name: 'Activity Log',
        description: 'Recent activity log for a pantry location',
        mimeType: 'application/json'
      }
    ]
  }
})

server.setRequestHandler('resources/read', async (request) => {
  const uri = new URL(request.params.uri)
  const pathParts = uri.pathname.split('/').filter(p => p)
  
  try {
    switch (pathParts[0]) {
      case 'inventory': {
        const userId = pathParts[1]
        UserIdSchema.parse(userId)
        
        const locations = await getUserAccessiblePantries(userId)
        const depletedItems = await prisma.depletedItem.findMany({
          where: { userId },
          orderBy: { depletedDate: 'desc' }
        })
        
        return {
          contents: [{
            uri: request.params.uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              locations: locations.map(loc => ({
                id: loc.id,
                name: loc.name,
                owner: loc.user,
                permission: loc.permission,
                isOwner: loc.isOwner,
                items: loc.items.map(item => ({
                  id: item.id,
                  name: item.name,
                  amount: item.amount,
                  unit: item.unit,
                  category: item.category,
                  expirationDate: item.expirationDate?.toISOString(),
                  addedDate: item.addedDate.toISOString()
                }))
              })),
              depletedItems: depletedItems.map(item => ({
                id: item.id,
                name: item.name,
                lastAmount: item.lastAmount,
                unit: item.unit,
                category: item.category,
                depletedDate: item.depletedDate.toISOString(),
                timesUsed: item.timesUsed,
                isFrequentlyUsed: item.isFrequentlyUsed
              }))
            }, null, 2)
          }]
        }
      }
      
      case 'location': {
        const locationId = pathParts[1]
        LocationIdSchema.parse(locationId)
        
        const location = await prisma.pantryLocation.findUnique({
          where: { id: locationId },
          include: {
            items: {
              orderBy: { addedDate: 'desc' }
            },
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        })
        
        if (!location) {
          throw new Error('Pantry location not found')
        }
        
        return {
          contents: [{
            uri: request.params.uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              id: location.id,
              name: location.name,
              owner: location.user,
              items: location.items.map(item => ({
                id: item.id,
                name: item.name,
                amount: item.amount,
                unit: item.unit,
                category: item.category,
                expirationDate: item.expirationDate?.toISOString(),
                addedDate: item.addedDate.toISOString()
              }))
            }, null, 2)
          }]
        }
      }
      
      case 'expiring': {
        const userId = pathParts[1]
        const days = parseInt(uri.searchParams.get('days') || '7')
        UserIdSchema.parse(userId)
        
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() + days)
        
        const expiringItems = await prisma.pantryItem.findMany({
          where: {
            userId,
            expirationDate: {
              lte: cutoffDate
            }
          },
          include: {
            location: {
              select: { id: true, name: true }
            }
          },
          orderBy: { expirationDate: 'asc' }
        })
        
        return {
          contents: [{
            uri: request.params.uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              cutoffDate: cutoffDate.toISOString(),
              daysAhead: days,
              items: expiringItems.map(item => ({
                id: item.id,
                name: item.name,
                amount: item.amount,
                unit: item.unit,
                category: item.category,
                expirationDate: item.expirationDate?.toISOString(),
                location: item.location,
                daysUntilExpiration: item.expirationDate ? 
                  Math.ceil((item.expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null
              }))
            }, null, 2)
          }]
        }
      }
      
      case 'depleted': {
        const userId = pathParts[1]
        UserIdSchema.parse(userId)
        
        const depletedItems = await prisma.depletedItem.findMany({
          where: { userId },
          orderBy: { depletedDate: 'desc' },
          take: 50
        })
        
        return {
          contents: [{
            uri: request.params.uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              items: depletedItems.map(item => ({
                id: item.id,
                name: item.name,
                lastAmount: item.lastAmount,
                unit: item.unit,
                category: item.category,
                depletedDate: item.depletedDate.toISOString(),
                timesUsed: item.timesUsed,
                isFrequentlyUsed: item.isFrequentlyUsed
              }))
            }, null, 2)
          }]
        }
      }
      
      case 'activity': {
        const locationId = pathParts[1]
        LocationIdSchema.parse(locationId)
        
        const activities = await prisma.pantryActivityLog.findMany({
          where: { pantryLocationId: locationId },
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 50
        })
        
        return {
          contents: [{
            uri: request.params.uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              activities: activities.map(activity => ({
                id: activity.id,
                action: activity.action,
                itemName: activity.itemName,
                oldValue: activity.oldValue,
                newValue: activity.newValue,
                user: activity.user,
                createdAt: activity.createdAt.toISOString()
              }))
            }, null, 2)
          }]
        }
      }
      
      default:
        throw new Error(`Unknown resource path: ${pathParts[0]}`)
    }
  } catch (error) {
    throw new Error(`Failed to read resource: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
})

// Register Tools
server.setRequestHandler('tools/list', async () => {
  return {
    tools: [
      {
        name: 'add_pantry_item',
        description: 'Add a new item to the pantry',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'User ID' },
            locationId: { type: 'string', description: 'Pantry location ID' },
            item: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Item name' },
                amount: { type: 'string', description: 'Item amount' },
                unit: { type: 'string', description: 'Unit of measurement' },
                category: { type: 'string', description: 'Item category (optional)' },
                expirationDate: { type: 'string', format: 'date-time', description: 'Expiration date (optional)' }
              },
              required: ['name', 'amount', 'unit']
            }
          },
          required: ['userId', 'locationId', 'item']
        }
      },
      {
        name: 'update_inventory',
        description: 'Update an existing pantry item',
        inputSchema: {
          type: 'object',
          properties: {
            itemId: { type: 'string', description: 'Pantry item ID' },
            amount: { type: 'string', description: 'New amount (optional)' },
            unit: { type: 'string', description: 'New unit (optional)' },
            expirationDate: { type: 'string', format: 'date-time', description: 'New expiration date (optional)' }
          },
          required: ['itemId']
        }
      },
      {
        name: 'check_availability',
        description: 'Check if ingredients are available in the pantry',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'User ID' },
            ingredients: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Ingredient name' },
                  amount: { type: 'string', description: 'Required amount' },
                  unit: { type: 'string', description: 'Unit of measurement' }
                },
                required: ['name', 'amount', 'unit']
              }
            }
          },
          required: ['userId', 'ingredients']
        }
      },
      {
        name: 'track_usage',
        description: 'Record item usage/depletion',
        inputSchema: {
          type: 'object',
          properties: {
            itemId: { type: 'string', description: 'Pantry item ID' },
            amountUsed: { type: 'string', description: 'Amount used' },
            unit: { type: 'string', description: 'Unit of measurement' }
          },
          required: ['itemId', 'amountUsed', 'unit']
        }
      },
      {
        name: 'get_expiring_items',
        description: 'Get items expiring within a specified number of days',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'User ID' },
            days: { type: 'number', description: 'Number of days ahead to check', minimum: 1, maximum: 365 }
          },
          required: ['userId', 'days']
        }
      }
    ]
  }
})

server.setRequestHandler('tools/call', async (request) => {
  try {
    switch (request.params.name) {
      case 'add_pantry_item': {
        const { userId, locationId, item } = AddItemSchema.parse(request.params.arguments)
        
        // Check permissions
        const { permission } = await getUserPantryPermission(userId, locationId)
        if (!permission || permission === 'VIEW') {
          throw new Error('Insufficient permissions to add items')
        }
        
        const createdItem = await prisma.pantryItem.create({
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
        await prisma.pantryActivityLog.create({
          data: {
            pantryLocationId: locationId,
            userId,
            action: 'ITEM_ADDED',
            itemName: item.name,
            itemId: createdItem.id,
            newValue: `${item.amount} ${item.unit}`
          }
        })
        
        return {
          content: [{
            type: 'text',
            text: `Successfully added ${item.name} (${item.amount} ${item.unit}) to pantry. Item ID: ${createdItem.id}`
          }]
        }
      }
      
      case 'update_inventory': {
        const { itemId, amount, unit, expirationDate } = UpdateInventorySchema.parse(request.params.arguments)
        
        const existingItem = await prisma.pantryItem.findUnique({
          where: { id: itemId },
          include: { location: true }
        })
        
        if (!existingItem) {
          throw new Error('Item not found')
        }
        
        const oldValue = `${existingItem.amount} ${existingItem.unit}`
        const newValue = `${amount || existingItem.amount} ${unit || existingItem.unit}`
        
        const updatedItem = await prisma.pantryItem.update({
          where: { id: itemId },
          data: {
            amount: amount ?? existingItem.amount,
            unit: unit ?? existingItem.unit,
            expirationDate: expirationDate ? new Date(expirationDate) : existingItem.expirationDate
          }
        })
        
        // Log activity if amount changed
        if (oldValue !== newValue) {
          await prisma.pantryActivityLog.create({
            data: {
              pantryLocationId: existingItem.locationId,
              userId: existingItem.userId,
              action: 'ITEM_UPDATED',
              itemName: updatedItem.name,
              itemId: updatedItem.id,
              oldValue,
              newValue
            }
          })
        }
        
        return {
          content: [{
            type: 'text',
            text: `Successfully updated ${updatedItem.name}. New values: ${newValue}`
          }]
        }
      }
      
      case 'check_availability': {
        const { userId, ingredients } = CheckAvailabilitySchema.parse(request.params.arguments)
        
        const locations = await getUserAccessiblePantries(userId)
        const allItems = locations.flatMap(loc => loc.items)
        
        const availability = ingredients.map(ingredient => {
          const matchingItems = allItems.filter(item => 
            item.name.toLowerCase().includes(ingredient.name.toLowerCase())
          )
          
          return {
            ingredient,
            available: matchingItems.length > 0,
            matchingItems: matchingItems.map(item => ({
              id: item.id,
              name: item.name,
              amount: item.amount,
              unit: item.unit,
              location: locations.find(loc => loc.id === item.locationId)?.name
            }))
          }
        })
        
        const availableCount = availability.filter(a => a.available).length
        
        return {
          content: [{
            type: 'text',
            text: `Availability check: ${availableCount}/${ingredients.length} ingredients available.\n\n` +
                  availability.map(a => 
                    `${a.ingredient.name} (${a.ingredient.amount} ${a.ingredient.unit}): ` +
                    (a.available ? 
                      `✅ Available (${a.matchingItems.length} matches)` : 
                      '❌ Not available'
                    )
                  ).join('\n')
          }]
        }
      }
      
      case 'get_expiring_items': {
        const { userId, days } = z.object({
          userId: UserIdSchema,
          days: z.number().min(1).max(365)
        }).parse(request.params.arguments)
        
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() + days)
        
        const expiringItems = await prisma.pantryItem.findMany({
          where: {
            userId,
            expirationDate: {
              lte: cutoffDate
            }
          },
          include: {
            location: {
              select: { id: true, name: true }
            }
          },
          orderBy: { expirationDate: 'asc' }
        })
        
        return {
          content: [{
            type: 'text',
            text: expiringItems.length > 0 ?
              `Found ${expiringItems.length} items expiring within ${days} days:\n\n` +
              expiringItems.map(item => {
                const daysUntil = item.expirationDate ? 
                  Math.ceil((item.expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null
                return `• ${item.name} (${item.amount} ${item.unit}) - expires in ${daysUntil} days (${item.location.name})`
              }).join('\n') :
              `No items expiring within ${days} days.`
          }]
        }
      }
      
      default:
        throw new Error(`Unknown tool: ${request.params.name}`)
    }
  } catch (error) {
    throw new Error(`Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
})

// Register Prompts
server.setRequestHandler('prompts/list', async () => {
  return {
    prompts: [
      {
        name: 'pantry_status',
        description: 'Get comprehensive pantry status overview',
        arguments: [
          {
            name: 'userId',
            description: 'User ID to get pantry status for',
            required: true
          }
        ]
      },
      {
        name: 'expiration_report',
        description: 'Generate expiration alerts and recommendations',
        arguments: [
          {
            name: 'userId',
            description: 'User ID to generate report for',
            required: true
          },
          {
            name: 'days',
            description: 'Number of days ahead to check (default: 7)',
            required: false
          }
        ]
      },
      {
        name: 'inventory_suggestions',
        description: 'Suggest restocking items based on depletion patterns',
        arguments: [
          {
            name: 'userId',
            description: 'User ID to generate suggestions for',
            required: true
          }
        ]
      }
    ]
  }
})

server.setRequestHandler('prompts/get', async (request) => {
  const args = request.params.arguments || {}
  
  switch (request.params.name) {
    case 'pantry_status': {
      const userId = z.string().parse(args.userId)
      const locations = await getUserAccessiblePantries(userId)
      const totalItems = locations.reduce((sum, loc) => sum + loc.items.length, 0)
      
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please provide a comprehensive pantry status overview for user ${userId}. ` +
                   `They have ${locations.length} pantry locations with ${totalItems} total items. ` +
                   `Include information about item distribution, expiring items, and overall pantry health.`
            }
          }
        ]
      }
    }
    
    case 'expiration_report': {
      const userId = z.string().parse(args.userId)
      const days = z.number().optional().parse(args.days) || 7
      
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Generate an expiration report for user ${userId} looking ${days} days ahead. ` +
                   `Include items that are expiring, prioritized by urgency, and provide recommendations ` +
                   `for how to use expiring items or extend their shelf life.`
            }
          }
        ]
      }
    }
    
    case 'inventory_suggestions': {
      const userId = z.string().parse(args.userId)
      
      const depletedItems = await prisma.depletedItem.findMany({
        where: { userId },
        orderBy: { timesUsed: 'desc' },
        take: 20
      })
      
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Based on the user's depletion patterns, suggest items they should restock. ` +
                   `The user has ${depletedItems.length} recently depleted items. ` +
                   `Focus on frequently used items and seasonal considerations. ` +
                   `Provide specific quantities and prioritize by usage frequency.`
            }
          }
        ]
      }
    }
    
    default:
      throw new Error(`Unknown prompt: ${request.params.name}`)
  }
})

// Create and start server
async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  
  console.error('Pantry MCP Server started successfully')
}

// Handle process termination
process.on('SIGINT', async () => {
  console.error('Shutting down Pantry MCP Server...')
  await server.close()
  process.exit(0)
})

if (require.main === module) {
  main().catch(console.error)
}

export { server as pantryMcpServer }