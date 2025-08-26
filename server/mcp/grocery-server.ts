import { McpServer } from '@modelcontextprotocol/sdk/server/mcp'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio'
import { z } from 'zod'
import { prisma } from '../lib/db'
import { 
  authenticateMcpRequest, 
  checkPermission, 
  PERMISSIONS, 
  CommonSchemas,
  auditLogger,
  AuthorizationError 
} from './security-config'

/**
 * Grocery/Shopping MCP Server
 * 
 * Manages shopping lists, store integration, and grocery item management
 * through the Model Context Protocol.
 */

// Validation schemas
const AddGroceryItemSchema = z.object({
  userId: CommonSchemas.UserId,
  name: CommonSchemas.Name,
  amount: CommonSchemas.Amount.optional(),
  unit: CommonSchemas.Unit.optional(),
  category: CommonSchemas.Category.optional()
})

const UpdateGroceryItemSchema = z.object({
  itemId: z.string().cuid(),
  name: CommonSchemas.Name.optional(),
  amount: CommonSchemas.Amount.optional(),
  unit: CommonSchemas.Unit.optional(),
  category: CommonSchemas.Category.optional(),
  completed: z.boolean().optional()
})

const GenerateFromRecipeSchema = z.object({
  userId: CommonSchemas.UserId,
  recipeId: z.string().cuid(),
  servings: z.number().min(1).optional(),
  checkPantry: z.boolean().default(true)
})

const SyncWithPantrySchema = z.object({
  userId: CommonSchemas.UserId,
  includeFrequent: z.boolean().default(true),
  daysThreshold: z.number().min(1).max(30).default(7)
})

// Helper functions
async function checkUserAccess(userId: string, targetUserId: string): Promise<boolean> {
  // Users can only access their own grocery lists
  // In future, could add family/household sharing
  return userId === targetUserId
}

async function generateGroceryListFromRecipe(
  userId: string, 
  recipeId: string, 
  servings?: number,
  checkPantry: boolean = true
) {
  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    include: {
      ingredients: {
        orderBy: { order: 'asc' }
      }
    }
  })
  
  if (!recipe) {
    throw new Error('Recipe not found')
  }
  
  let availableItems: any[] = []
  if (checkPantry) {
    // Get user's pantry items to avoid duplicate purchases
    const pantryItems = await prisma.pantryItem.findMany({
      where: { userId },
      select: { name: true, amount: true, unit: true }
    })
    availableItems = pantryItems
  }
  
  // Scale ingredients if servings specified
  const scaleFactor = servings && recipe.servings ? servings / recipe.servings : 1
  
  const groceryItems = []
  
  for (const ingredient of recipe.ingredients) {
    // Check if we already have this ingredient in sufficient quantity
    const hasInPantry = availableItems.some(item => 
      item.name.toLowerCase().includes(ingredient.name.toLowerCase()) ||
      ingredient.name.toLowerCase().includes(item.name.toLowerCase())
    )
    
    if (!hasInPantry) {
      const scaledAmount = ingredient.amount && scaleFactor !== 1 ? 
        scaleIngredientAmount(ingredient.amount, scaleFactor) : ingredient.amount
      
      groceryItems.push({
        name: ingredient.name,
        amount: scaledAmount,
        unit: ingredient.unit,
        category: categorizeIngredient(ingredient.name)
      })
    }
  }
  
  return groceryItems
}

function scaleIngredientAmount(amount: string, scaleFactor: number): string {
  const numMatch = amount.match(/[\d.\/]+/)
  if (!numMatch) return amount
  
  const num = parseFloat(numMatch[0].replace('/', '/'))
  const scaled = num * scaleFactor
  return amount.replace(numMatch[0], scaled.toString())
}

function categorizeIngredient(ingredientName: string): string {
  const name = ingredientName.toLowerCase()
  
  if (name.includes('meat') || name.includes('chicken') || name.includes('beef') || name.includes('pork') || name.includes('fish') || name.includes('salmon')) {
    return 'Meat & Seafood'
  } else if (name.includes('milk') || name.includes('cheese') || name.includes('yogurt') || name.includes('butter') || name.includes('cream')) {
    return 'Dairy'
  } else if (name.includes('bread') || name.includes('flour') || name.includes('rice') || name.includes('pasta') || name.includes('cereal')) {
    return 'Grains & Bread'
  } else if (name.includes('apple') || name.includes('banana') || name.includes('berry') || name.includes('orange') || name.includes('fruit')) {
    return 'Fruits'
  } else if (name.includes('lettuce') || name.includes('spinach') || name.includes('carrot') || name.includes('onion') || name.includes('tomato') || name.includes('vegetable')) {
    return 'Vegetables'
  } else if (name.includes('oil') || name.includes('vinegar') || name.includes('spice') || name.includes('salt') || name.includes('pepper') || name.includes('herb')) {
    return 'Condiments & Spices'
  } else if (name.includes('frozen')) {
    return 'Frozen'
  } else {
    return 'Other'
  }
}

// Create MCP Server
const server = new McpServer({
  name: 'grocery-server',
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
        uri: 'grocery://list/{userId}',
        name: 'Grocery List',
        description: 'Current grocery shopping list for a user',
        mimeType: 'application/json'
      },
      {
        uri: 'grocery://stores/{userId}',
        name: 'User Stores',
        description: 'User preferred shopping stores',
        mimeType: 'application/json'
      },
      {
        uri: 'grocery://history/{userId}',
        name: 'Shopping History',
        description: 'Recent shopping history and patterns',
        mimeType: 'application/json'
      },
      {
        uri: 'grocery://categories',
        name: 'Item Categories',
        description: 'Available grocery item categories',
        mimeType: 'application/json'
      },
      {
        uri: 'grocery://suggestions/{userId}',
        name: 'Shopping Suggestions',
        description: 'Smart shopping suggestions based on patterns',
        mimeType: 'application/json'
      }
    ]
  }
})

server.setRequestHandler('resources/read', async (request) => {
  const authContext = authenticateMcpRequest(request.params.headers || {})
  const uri = new URL(request.params.uri)
  const pathParts = uri.pathname.split('/').filter(p => p)
  
  try {
    switch (pathParts[0]) {
      case 'list': {
        const userId = pathParts[1]
        
        if (!checkPermission(authContext.permissions, PERMISSIONS.GROCERY_READ)) {
          throw new AuthorizationError('Permission denied for grocery list access')
        }
        
        if (!await checkUserAccess(authContext.userId, userId)) {
          throw new AuthorizationError('Access denied to this grocery list')
        }
        
        const groceryItems = await prisma.groceryItem.findMany({
          where: { userId },
          orderBy: [
            { completed: 'asc' },
            { category: 'asc' },
            { addedDate: 'desc' }
          ]
        })
        
        // Group by category
        const groupedItems = groceryItems.reduce((acc, item) => {
          const category = item.category || 'Other'
          if (!acc[category]) {
            acc[category] = []
          }
          acc[category].push({
            id: item.id,
            name: item.name,
            amount: item.amount,
            unit: item.unit,
            completed: item.completed,
            addedDate: item.addedDate.toISOString()
          })
          return acc
        }, {} as Record<string, any[]>)
        
        const stats = {
          total: groceryItems.length,
          completed: groceryItems.filter(item => item.completed).length,
          pending: groceryItems.filter(item => !item.completed).length,
          categories: Object.keys(groupedItems).length
        }
        
        return {
          contents: [{
            uri: request.params.uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              userId,
              stats,
              itemsByCategory: groupedItems,
              allItems: groceryItems.map(item => ({
                id: item.id,
                name: item.name,
                amount: item.amount,
                unit: item.unit,
                category: item.category,
                completed: item.completed,
                addedDate: item.addedDate.toISOString()
              }))
            }, null, 2)
          }]
        }
      }
      
      case 'stores': {
        const userId = pathParts[1]
        
        if (!await checkUserAccess(authContext.userId, userId)) {
          throw new AuthorizationError('Access denied to user stores')
        }
        
        const userStores = await prisma.userStore.findMany({
          where: { userId, isEnabled: true },
          orderBy: { order: 'asc' }
        })
        
        return {
          contents: [{
            uri: request.params.uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              userId,
              stores: userStores.map(store => ({
                id: store.id,
                name: store.name,
                storeType: store.storeType,
                website: store.website,
                logoUrl: store.logoUrl,
                deliveryTime: store.deliveryTime,
                minOrder: store.minOrder,
                deliveryFee: store.deliveryFee,
                order: store.order
              }))
            }, null, 2)
          }]
        }
      }
      
      case 'history': {
        const userId = pathParts[1]
        
        if (!await checkUserAccess(authContext.userId, userId)) {
          throw new AuthorizationError('Access denied to shopping history')
        }
        
        // Get recently completed grocery items as shopping history
        const recentItems = await prisma.groceryItem.findMany({
          where: { 
            userId,
            completed: true,
            updatedAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          },
          orderBy: { updatedAt: 'desc' },
          take: 100
        })
        
        // Analyze patterns
        const itemFrequency = recentItems.reduce((acc, item) => {
          acc[item.name] = (acc[item.name] || 0) + 1
          return acc
        }, {} as Record<string, number>)
        
        const topItems = Object.entries(itemFrequency)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .map(([name, count]) => ({ name, count }))
        
        return {
          contents: [{
            uri: request.params.uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              userId,
              recentItems: recentItems.map(item => ({
                name: item.name,
                category: item.category,
                completedDate: item.updatedAt.toISOString()
              })),
              frequentlyBoughtItems: topItems,
              shoppingPatterns: {
                averageItemsPerWeek: Math.round(recentItems.length / 4),
                mostFrequentCategory: Object.entries(
                  recentItems.reduce((acc, item) => {
                    const cat = item.category || 'Other'
                    acc[cat] = (acc[cat] || 0) + 1
                    return acc
                  }, {} as Record<string, number>)
                ).sort(([,a], [,b]) => b - a)[0]?.[0] || 'Other'
              }
            }, null, 2)
          }]
        }
      }
      
      case 'categories': {
        const categories = [
          'Fruits',
          'Vegetables', 
          'Meat & Seafood',
          'Dairy',
          'Grains & Bread',
          'Condiments & Spices',
          'Frozen',
          'Beverages',
          'Snacks',
          'Household',
          'Personal Care',
          'Other'
        ]
        
        return {
          contents: [{
            uri: request.params.uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              categories: categories.map(name => ({ name, id: name.toLowerCase().replace(/\s+/g, '_') }))
            }, null, 2)
          }]
        }
      }
      
      case 'suggestions': {
        const userId = pathParts[1]
        
        if (!await checkUserAccess(authContext.userId, userId)) {
          throw new AuthorizationError('Access denied to shopping suggestions')
        }
        
        // Get depleted pantry items
        const depletedItems = await prisma.depletedItem.findMany({
          where: { 
            userId,
            isFrequentlyUsed: true,
            depletedDate: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last week
            }
          },
          orderBy: { timesUsed: 'desc' },
          take: 10
        })
        
        // Get seasonal suggestions (mock implementation)
        const seasonalSuggestions = getSeasonalSuggestions()
        
        return {
          contents: [{
            uri: request.params.uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              userId,
              suggestions: {
                replenishPantry: depletedItems.map(item => ({
                  name: item.name,
                  lastAmount: item.lastAmount,
                  unit: item.unit,
                  category: item.category,
                  timesUsed: item.timesUsed,
                  reason: 'Recently depleted from pantry'
                })),
                seasonal: seasonalSuggestions,
                healthyChoices: [
                  { name: 'Fresh berries', category: 'Fruits', reason: 'High in antioxidants' },
                  { name: 'Leafy greens', category: 'Vegetables', reason: 'Rich in vitamins' },
                  { name: 'Whole grain bread', category: 'Grains & Bread', reason: 'High fiber option' }
                ]
              }
            }, null, 2)
          }]
        }
      }
      
      default:
        throw new Error(`Unknown resource path: ${pathParts[0]}`)
    }
  } catch (error) {
    auditLogger.log({
      userId: authContext.userId,
      action: 'resource_access_failed',
      resource: 'grocery',
      details: { uri: request.params.uri, error: error instanceof Error ? error.message : 'Unknown error' }
    })
    throw error
  }
})

// Helper function for seasonal suggestions
function getSeasonalSuggestions() {
  const month = new Date().getMonth()
  
  const seasonalItems: Record<string, string[]> = {
    winter: ['Root vegetables', 'Citrus fruits', 'Hearty soups ingredients', 'Warm spices'],
    spring: ['Fresh herbs', 'Asparagus', 'Artichokes', 'Spring greens'],
    summer: ['Berries', 'Stone fruits', 'Tomatoes', 'Corn', 'Zucchini'],
    fall: ['Squash', 'Pumpkin', 'Apples', 'Brussels sprouts', 'Sweet potatoes']
  }
  
  let season: string
  if (month >= 11 || month <= 1) season = 'winter'
  else if (month >= 2 && month <= 4) season = 'spring'
  else if (month >= 5 && month <= 7) season = 'summer'
  else season = 'fall'
  
  return seasonalItems[season].map(item => ({ name: item, season, reason: `Seasonal ${season} item` }))
}

// Register Tools
server.setRequestHandler('tools/list', async () => {
  return {
    tools: [
      {
        name: 'add_grocery_item',
        description: 'Add an item to the grocery list',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'User ID' },
            name: { type: 'string', description: 'Item name' },
            amount: { type: 'string', description: 'Amount/quantity (optional)' },
            unit: { type: 'string', description: 'Unit of measurement (optional)' },
            category: { type: 'string', description: 'Item category (optional)' }
          },
          required: ['userId', 'name']
        }
      },
      {
        name: 'update_grocery_item',
        description: 'Update an existing grocery item',
        inputSchema: {
          type: 'object',
          properties: {
            itemId: { type: 'string', description: 'Item ID' },
            name: { type: 'string', description: 'Updated name (optional)' },
            amount: { type: 'string', description: 'Updated amount (optional)' },
            unit: { type: 'string', description: 'Updated unit (optional)' },
            category: { type: 'string', description: 'Updated category (optional)' },
            completed: { type: 'boolean', description: 'Mark as completed (optional)' }
          },
          required: ['itemId']
        }
      },
      {
        name: 'generate_from_recipe',
        description: 'Generate grocery list from a recipe',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'User ID' },
            recipeId: { type: 'string', description: 'Recipe ID' },
            servings: { type: 'number', description: 'Target servings (optional)' },
            checkPantry: { type: 'boolean', description: 'Check pantry to avoid duplicates (default: true)' }
          },
          required: ['userId', 'recipeId']
        }
      },
      {
        name: 'mark_completed',
        description: 'Mark grocery items as completed/purchased',
        inputSchema: {
          type: 'object',
          properties: {
            itemIds: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'Array of item IDs to mark as completed'
            }
          },
          required: ['itemIds']
        }
      },
      {
        name: 'clear_completed',
        description: 'Remove completed items from grocery list',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'User ID' },
            olderThan: { type: 'number', description: 'Remove items completed more than X days ago (optional)' }
          },
          required: ['userId']
        }
      },
      {
        name: 'sync_with_pantry',
        description: 'Auto-generate grocery list from depleted pantry items',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'User ID' },
            includeFrequent: { type: 'boolean', description: 'Include frequently used items (default: true)' },
            daysThreshold: { type: 'number', description: 'Include items depleted within X days (default: 7)' }
          },
          required: ['userId']
        }
      }
    ]
  }
})

server.setRequestHandler('tools/call', async (request) => {
  const authContext = authenticateMcpRequest(request.params.headers || {})
  
  try {
    switch (request.params.name) {
      case 'add_grocery_item': {
        if (!checkPermission(authContext.permissions, PERMISSIONS.GROCERY_WRITE)) {
          throw new AuthorizationError('Permission denied for adding grocery items')
        }
        
        const { userId, name, amount, unit, category } = AddGroceryItemSchema.parse(request.params.arguments)
        
        if (!await checkUserAccess(authContext.userId, userId)) {
          throw new AuthorizationError('Access denied to this grocery list')
        }
        
        const groceryItem = await prisma.groceryItem.create({
          data: {
            userId,
            name,
            amount,
            unit,
            category: category || categorizeIngredient(name)
          }
        })
        
        auditLogger.log({
          userId: authContext.userId,
          action: 'add_grocery_item',
          resource: 'grocery',
          resourceId: groceryItem.id,
          details: { name, category: groceryItem.category }
        })
        
        return {
          content: [{
            type: 'text',
            text: `Successfully added "${name}" to grocery list.\n` +
                  `Category: ${groceryItem.category}\n` +
                  `Item ID: ${groceryItem.id}`
          }]
        }
      }
      
      case 'generate_from_recipe': {
        if (!checkPermission(authContext.permissions, PERMISSIONS.GROCERY_WRITE)) {
          throw new AuthorizationError('Permission denied for generating grocery items')
        }
        
        const { userId, recipeId, servings, checkPantry } = GenerateFromRecipeSchema.parse(request.params.arguments)
        
        if (!await checkUserAccess(authContext.userId, userId)) {
          throw new AuthorizationError('Access denied to this grocery list')
        }
        
        const groceryItems = await generateGroceryListFromRecipe(userId, recipeId, servings, checkPantry)
        
        // Add items to grocery list
        const createdItems = []
        for (const item of groceryItems) {
          const created = await prisma.groceryItem.create({
            data: {
              userId,
              ...item
            }
          })
          createdItems.push(created)
        }
        
        auditLogger.log({
          userId: authContext.userId,
          action: 'generate_from_recipe',
          resource: 'grocery',
          details: { recipeId, itemsCreated: createdItems.length, servings }
        })
        
        return {
          content: [{
            type: 'text',
            text: `Generated grocery list from recipe!\n\n` +
                  `Added ${createdItems.length} items:\n` +
                  createdItems.map(item => `• ${item.name} ${item.amount || ''} ${item.unit || ''} (${item.category})`).join('\n')
          }]
        }
      }
      
      case 'mark_completed': {
        if (!checkPermission(authContext.permissions, PERMISSIONS.GROCERY_WRITE)) {
          throw new AuthorizationError('Permission denied for updating grocery items')
        }
        
        const { itemIds } = z.object({
          itemIds: z.array(z.string().cuid())
        }).parse(request.params.arguments)
        
        const result = await prisma.groceryItem.updateMany({
          where: {
            id: { in: itemIds },
            userId: authContext.userId // Ensure user can only update their own items
          },
          data: {
            completed: true,
            updatedAt: new Date()
          }
        })
        
        auditLogger.log({
          userId: authContext.userId,
          action: 'mark_items_completed',
          resource: 'grocery',
          details: { itemIds, updatedCount: result.count }
        })
        
        return {
          content: [{
            type: 'text',
            text: `Marked ${result.count} items as completed!`
          }]
        }
      }
      
      case 'sync_with_pantry': {
        if (!checkPermission(authContext.permissions, PERMISSIONS.GROCERY_WRITE)) {
          throw new AuthorizationError('Permission denied for syncing with pantry')
        }
        
        const { userId, includeFrequent, daysThreshold } = SyncWithPantrySchema.parse(request.params.arguments)
        
        if (!await checkUserAccess(authContext.userId, userId)) {
          throw new AuthorizationError('Access denied to sync pantry')
        }
        
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - daysThreshold)
        
        const where: any = {
          userId,
          depletedDate: { gte: cutoffDate }
        }
        
        if (includeFrequent) {
          where.isFrequentlyUsed = true
        }
        
        const depletedItems = await prisma.depletedItem.findMany({
          where,
          orderBy: { timesUsed: 'desc' },
          take: 20
        })
        
        // Add to grocery list if not already there
        const addedItems = []
        for (const item of depletedItems) {
          const existingItem = await prisma.groceryItem.findFirst({
            where: {
              userId,
              name: item.name,
              completed: false
            }
          })
          
          if (!existingItem) {
            const groceryItem = await prisma.groceryItem.create({
              data: {
                userId,
                name: item.name,
                amount: item.lastAmount,
                unit: item.unit,
                category: item.category || categorizeIngredient(item.name)
              }
            })
            addedItems.push(groceryItem)
          }
        }
        
        auditLogger.log({
          userId: authContext.userId,
          action: 'sync_with_pantry',
          resource: 'grocery',
          details: { itemsAdded: addedItems.length, daysThreshold, includeFrequent }
        })
        
        return {
          content: [{
            type: 'text',
            text: `Synced with pantry!\n\n` +
                  `Added ${addedItems.length} items based on recently depleted pantry items:\n` +
                  addedItems.map(item => `• ${item.name} ${item.amount || ''} ${item.unit || ''}`).join('\n')
          }]
        }
      }
      
      default:
        throw new Error(`Unknown tool: ${request.params.name}`)
    }
  } catch (error) {
    auditLogger.log({
      userId: authContext.userId,
      action: 'tool_execution_failed',
      resource: 'grocery',
      details: { tool: request.params.name, error: error instanceof Error ? error.message : 'Unknown error' }
    })
    throw error
  }
})

// Register Prompts
server.setRequestHandler('prompts/list', async () => {
  return {
    prompts: [
      {
        name: 'shopping_preparation',
        description: 'Prepare an optimized shopping list with store recommendations',
        arguments: [
          {
            name: 'userId',
            description: 'User ID to prepare shopping list for',
            required: true
          },
          {
            name: 'storeType',
            description: 'Preferred store type (grocery, specialty, online)',
            required: false
          }
        ]
      },
      {
        name: 'budget_planning',
        description: 'Estimate shopping costs and suggest budget-friendly alternatives',
        arguments: [
          {
            name: 'userId',
            description: 'User ID to plan budget for',
            required: true
          },
          {
            name: 'maxBudget',
            description: 'Maximum budget for shopping trip',
            required: false
          }
        ]
      },
      {
        name: 'store_recommendations',
        description: 'Suggest best stores for current shopping list',
        arguments: [
          {
            name: 'userId',
            description: 'User ID to recommend stores for',
            required: true
          },
          {
            name: 'prioritizeCost',
            description: 'Whether to prioritize cost savings over convenience',
            required: false
          }
        ]
      }
    ]
  }
})

server.setRequestHandler('prompts/get', async (request) => {
  const authContext = authenticateMcpRequest(request.params.headers || {})
  const args = request.params.arguments || {}
  
  switch (request.params.name) {
    case 'shopping_preparation': {
      const userId = z.string().parse(args.userId)
      const storeType = z.string().optional().parse(args.storeType)
      
      if (!await checkUserAccess(authContext.userId, userId)) {
        throw new AuthorizationError('Access denied for shopping preparation')
      }
      
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Prepare an optimized shopping list for user ${userId}. ` +
                   `Organize items by store layout, suggest the most efficient shopping route, ` +
                   (storeType ? `focus on ${storeType} stores, ` : '') +
                   `and provide tips to save time and money. Include estimated shopping time ` +
                   `and any special considerations for the items on the list.`
            }
          }
        ]
      }
    }
    
    case 'budget_planning': {
      const userId = z.string().parse(args.userId)
      const maxBudget = z.number().optional().parse(args.maxBudget)
      
      if (!await checkUserAccess(authContext.userId, userId)) {
        throw new AuthorizationError('Access denied for budget planning')
      }
      
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Create a budget plan for user ${userId}'s shopping list. ` +
                   `Estimate costs for all items, suggest money-saving alternatives, ` +
                   (maxBudget ? `keep within budget of $${maxBudget}, ` : '') +
                   `recommend store brands where appropriate, and identify items that ` +
                   `could be bought in bulk for savings. Prioritize essential items.`
            }
          }
        ]
      }
    }
    
    case 'store_recommendations': {
      const userId = z.string().parse(args.userId)
      const prioritizeCost = z.boolean().optional().parse(args.prioritizeCost)
      
      if (!await checkUserAccess(authContext.userId, userId)) {
        throw new AuthorizationError('Access denied for store recommendations')
      }
      
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Recommend the best stores for user ${userId} to shop at based on their ` +
                   `current grocery list and preferred stores. Consider item availability, ` +
                   `prices, location convenience, and quality. ` +
                   (prioritizeCost ? 
                     'Prioritize cost savings and recommend discount stores where appropriate.' : 
                     'Balance cost, convenience, and quality in recommendations.'
                   ) +
                   ` Suggest whether to shop at one store or split the list across multiple stores.`
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
  
  console.error('Grocery MCP Server started successfully')
}

// Handle process termination
process.on('SIGINT', async () => {
  console.error('Shutting down Grocery MCP Server...')
  await server.close()
  process.exit(0)
})

if (require.main === module) {
  main().catch(console.error)
}

export { server as groceryMcpServer }