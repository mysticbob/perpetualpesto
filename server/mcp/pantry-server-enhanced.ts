/**
 * Enhanced Pantry MCP Server
 * Tracks inventory, expiration dates, and leftovers
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { prisma } from '../lib/db'
import { addDays, differenceInDays } from 'date-fns'

// Expiration status thresholds
const EXPIRING_SOON_DAYS = 3
const EXPIRING_WARNING_DAYS = 7

interface PantryItemWithDetails {
  id: string
  customName: string
  amount: number
  unit: string
  location: string
  expirationDate: Date | null
  daysUntilExpiration: number | null
  expirationStatus: 'expired' | 'expiring-soon' | 'expiring-warning' | 'fresh' | 'unknown'
  isLeftover: boolean
  ingredient?: {
    name: string
    category: string
    calories?: number
  }
}

class EnhancedPantryServer {
  private server: Server
  
  constructor() {
    this.server = new Server(
      {
        name: 'pantry-enhanced',
        version: '2.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    )
    
    this.setupHandlers()
  }
  
  private setupHandlers() {
    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'pantry://inventory',
          name: 'Current Pantry Inventory',
          description: 'All items in pantry with quantities and expiration dates',
          mimeType: 'application/json',
        },
        {
          uri: 'pantry://expiring',
          name: 'Expiring Items',
          description: 'Items expiring soon that need to be used',
          mimeType: 'application/json',
        },
        {
          uri: 'pantry://leftovers',
          name: 'Leftover Tracking',
          description: 'Current leftovers and their status',
          mimeType: 'application/json',
        },
        {
          uri: 'pantry://low-stock',
          name: 'Low Stock Items',
          description: 'Staple items running low',
          mimeType: 'application/json',
        },
      ],
    }))
    
    // Read resource data
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params
      const userId = 'default-user' // TODO: Get from context
      
      switch (uri) {
        case 'pantry://inventory':
          return await this.getInventory(userId)
        case 'pantry://expiring':
          return await this.getExpiringItems(userId)
        case 'pantry://leftovers':
          return await this.getLeftovers(userId)
        case 'pantry://low-stock':
          return await this.getLowStockItems(userId)
        default:
          throw new Error(`Unknown resource: ${uri}`)
      }
    })
    
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'add-pantry-item',
          description: 'Add a new item to the pantry',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Item name' },
              amount: { type: 'number', description: 'Quantity' },
              unit: { type: 'string', description: 'Unit of measurement' },
              location: { 
                type: 'string', 
                enum: ['FRIDGE', 'FREEZER', 'PANTRY', 'COUNTER', 'SPICE_RACK'],
                description: 'Storage location' 
              },
              expirationDate: { type: 'string', description: 'Expiration date (ISO format)' },
            },
            required: ['name', 'amount', 'unit'],
          },
        },
        {
          name: 'use-pantry-item',
          description: 'Use or consume an amount of a pantry item',
          inputSchema: {
            type: 'object',
            properties: {
              itemId: { type: 'string', description: 'Pantry item ID' },
              amount: { type: 'number', description: 'Amount used' },
            },
            required: ['itemId', 'amount'],
          },
        },
        {
          name: 'check-availability',
          description: 'Check if ingredients are available for a recipe',
          inputSchema: {
            type: 'object',
            properties: {
              ingredients: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    amount: { type: 'number' },
                    unit: { type: 'string' },
                  },
                },
              },
            },
            required: ['ingredients'],
          },
        },
        {
          name: 'add-leftover',
          description: 'Add leftover from a cooked recipe',
          inputSchema: {
            type: 'object',
            properties: {
              recipeName: { type: 'string' },
              servings: { type: 'number' },
              recipeId: { type: 'string' },
            },
            required: ['recipeName', 'servings'],
          },
        },
      ],
    }))
    
    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params
      const userId = 'default-user' // TODO: Get from context
      
      switch (name) {
        case 'add-pantry-item':
          return await this.addPantryItem(userId, args)
        case 'use-pantry-item':
          return await this.usePantryItem(userId, args)
        case 'check-availability':
          return await this.checkAvailability(userId, args)
        case 'add-leftover':
          return await this.addLeftover(userId, args)
        default:
          throw new Error(`Unknown tool: ${name}`)
      }
    })
  }
  
  private async getInventory(userId: string) {
    const items = await prisma.pantryItem.findMany({
      where: { userId },
      include: {
        ingredient: {
          select: {
            name: true,
            category: true,
            calories: true,
            protein: true,
          },
        },
      },
      orderBy: { expirationDate: 'asc' },
    })
    
    const inventory = items.map(item => this.enrichPantryItem(item))
    
    // Group by location
    const byLocation = inventory.reduce((acc, item) => {
      if (!acc[item.location]) acc[item.location] = []
      acc[item.location].push(item)
      return acc
    }, {} as Record<string, PantryItemWithDetails[]>)
    
    return {
      contents: [
        {
          uri: 'pantry://inventory',
          mimeType: 'application/json',
          text: JSON.stringify({
            totalItems: inventory.length,
            byLocation,
            summary: {
              expiring: inventory.filter(i => i.expirationStatus === 'expiring-soon').length,
              expired: inventory.filter(i => i.expirationStatus === 'expired').length,
              leftovers: inventory.filter(i => i.isLeftover).length,
            },
          }, null, 2),
        },
      ],
    }
  }
  
  private async getExpiringItems(userId: string) {
    const items = await prisma.pantryItem.findMany({
      where: {
        userId,
        expirationDate: {
          lte: addDays(new Date(), EXPIRING_WARNING_DAYS),
        },
      },
      include: {
        ingredient: true,
      },
      orderBy: { expirationDate: 'asc' },
    })
    
    const expiringItems = items.map(item => ({
      ...this.enrichPantryItem(item),
      suggestedUse: this.suggestUseForExpiring(item),
    }))
    
    return {
      contents: [
        {
          uri: 'pantry://expiring',
          mimeType: 'application/json',
          text: JSON.stringify({
            urgent: expiringItems.filter(i => i.expirationStatus === 'expired' || i.expirationStatus === 'expiring-soon'),
            warning: expiringItems.filter(i => i.expirationStatus === 'expiring-warning'),
            suggestions: this.generateExpirationSuggestions(expiringItems),
          }, null, 2),
        },
      ],
    }
  }
  
  private async getLeftovers(userId: string) {
    const leftovers = await prisma.pantryItem.findMany({
      where: {
        userId,
        isLeftover: true,
      },
      orderBy: { leftoverDate: 'desc' },
    })
    
    const enrichedLeftovers = leftovers.map(item => ({
      ...this.enrichPantryItem(item),
      age: item.leftoverDate ? differenceInDays(new Date(), item.leftoverDate) : null,
      shouldUseBy: item.leftoverDate ? addDays(item.leftoverDate, 3) : null,
    }))
    
    return {
      contents: [
        {
          uri: 'pantry://leftovers',
          mimeType: 'application/json',
          text: JSON.stringify({
            total: enrichedLeftovers.length,
            leftovers: enrichedLeftovers,
            suggestions: {
              forLunch: enrichedLeftovers.filter(l => l.age && l.age <= 1),
              freeze: enrichedLeftovers.filter(l => l.age && l.age > 2),
              useToday: enrichedLeftovers.filter(l => l.age && l.age >= 2),
            },
          }, null, 2),
        },
      ],
    }
  }
  
  private async getLowStockItems(userId: string) {
    // Get staple items that are low
    const staples = ['milk', 'eggs', 'bread', 'butter', 'olive oil', 'salt', 'pepper']
    
    const lowStock = []
    
    for (const stapleName of staples) {
      const ingredient = await prisma.ingredient.findUnique({
        where: { name: stapleName },
      })
      
      if (!ingredient) continue
      
      const items = await prisma.pantryItem.findMany({
        where: {
          userId,
          ingredientId: ingredient.id,
        },
      })
      
      const totalAmount = items.reduce((sum, item) => sum + item.amount, 0)
      
      if (totalAmount < 1) {
        lowStock.push({
          name: stapleName,
          currentAmount: totalAmount,
          suggestedReorder: this.getSuggestedReorderAmount(stapleName),
        })
      }
    }
    
    return {
      contents: [
        {
          uri: 'pantry://low-stock',
          mimeType: 'application/json',
          text: JSON.stringify({
            lowStock,
            reorderSuggestion: lowStock.length > 0 ? 'Add these to your shopping list' : 'All staples are well stocked',
          }, null, 2),
        },
      ],
    }
  }
  
  private async addPantryItem(userId: string, args: any) {
    // Find matching ingredient
    const ingredient = await prisma.ingredient.findFirst({
      where: {
        OR: [
          { name: args.name.toLowerCase() },
          { alternativeNames: { has: args.name.toLowerCase() } },
        ],
      },
    })
    
    // Calculate expiration date if not provided
    let expirationDate = args.expirationDate ? new Date(args.expirationDate) : null
    
    if (!expirationDate && ingredient) {
      const daysToAdd = this.getShelfLife(ingredient, args.location || 'PANTRY')
      expirationDate = addDays(new Date(), daysToAdd)
    }
    
    const item = await prisma.pantryItem.create({
      data: {
        userId,
        customName: args.name,
        amount: args.amount,
        unit: args.unit,
        location: args.location || 'PANTRY',
        expirationDate,
        ingredientId: ingredient?.id,
      },
    })
    
    return {
      content: [
        {
          type: 'text',
          text: `Added ${args.amount} ${args.unit} of ${args.name} to ${args.location || 'PANTRY'}. Expires: ${expirationDate?.toLocaleDateString() || 'Unknown'}`,
        },
      ],
    }
  }
  
  private async usePantryItem(userId: string, args: any) {
    const item = await prisma.pantryItem.findFirst({
      where: {
        id: args.itemId,
        userId,
      },
    })
    
    if (!item) {
      throw new Error('Pantry item not found')
    }
    
    const newAmount = item.amount - args.amount
    
    if (newAmount <= 0) {
      // Delete if fully used
      await prisma.pantryItem.delete({
        where: { id: args.itemId },
      })
      
      return {
        content: [
          {
            type: 'text',
            text: `Used all remaining ${item.customName}`,
          },
        ],
      }
    } else {
      // Update amount
      await prisma.pantryItem.update({
        where: { id: args.itemId },
        data: { amount: newAmount },
      })
      
      return {
        content: [
          {
            type: 'text',
            text: `Used ${args.amount} ${item.unit} of ${item.customName}. ${newAmount} ${item.unit} remaining.`,
          },
        ],
      }
    }
  }
  
  private async checkAvailability(userId: string, args: any) {
    const results = []
    
    for (const required of args.ingredients) {
      // Find matching pantry items
      const items = await prisma.pantryItem.findMany({
        where: {
          userId,
          OR: [
            { customName: { contains: required.name, mode: 'insensitive' } },
            {
              ingredient: {
                OR: [
                  { name: required.name.toLowerCase() },
                  { alternativeNames: { has: required.name.toLowerCase() } },
                ],
              },
            },
          ],
        },
      })
      
      const totalAvailable = items.reduce((sum, item) => sum + item.amount, 0)
      
      results.push({
        ingredient: required.name,
        required: `${required.amount} ${required.unit}`,
        available: totalAvailable,
        sufficient: totalAvailable >= required.amount,
        items: items.map(i => ({
          amount: i.amount,
          unit: i.unit,
          location: i.location,
          expires: i.expirationDate,
        })),
      })
    }
    
    const allAvailable = results.every(r => r.sufficient)
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            canMakeRecipe: allAvailable,
            details: results,
            missing: results.filter(r => !r.sufficient).map(r => r.ingredient),
          }, null, 2),
        },
      ],
    }
  }
  
  private async addLeftover(userId: string, args: any) {
    const leftover = await prisma.pantryItem.create({
      data: {
        userId,
        customName: `Leftover ${args.recipeName}`,
        amount: args.servings,
        unit: 'servings',
        location: 'FRIDGE',
        isLeftover: true,
        leftoverFromId: args.recipeId,
        leftoverDate: new Date(),
        expirationDate: addDays(new Date(), 3), // Leftovers last 3 days
      },
    })
    
    return {
      content: [
        {
          type: 'text',
          text: `Added ${args.servings} servings of leftover ${args.recipeName} to fridge. Use within 3 days.`,
        },
      ],
    }
  }
  
  private enrichPantryItem(item: any): PantryItemWithDetails {
    const now = new Date()
    const daysUntilExpiration = item.expirationDate 
      ? differenceInDays(item.expirationDate, now)
      : null
    
    let expirationStatus: PantryItemWithDetails['expirationStatus'] = 'unknown'
    if (daysUntilExpiration !== null) {
      if (daysUntilExpiration < 0) expirationStatus = 'expired'
      else if (daysUntilExpiration <= EXPIRING_SOON_DAYS) expirationStatus = 'expiring-soon'
      else if (daysUntilExpiration <= EXPIRING_WARNING_DAYS) expirationStatus = 'expiring-warning'
      else expirationStatus = 'fresh'
    }
    
    return {
      id: item.id,
      customName: item.customName,
      amount: item.amount,
      unit: item.unit,
      location: item.location,
      expirationDate: item.expirationDate,
      daysUntilExpiration,
      expirationStatus,
      isLeftover: item.isLeftover,
      ingredient: item.ingredient,
    }
  }
  
  private getShelfLife(ingredient: any, location: string): number {
    switch (location) {
      case 'FREEZER':
        return ingredient.shelfLifeFreezer || 180
      case 'FRIDGE':
        return ingredient.shelfLifeFridge || 14
      default:
        return ingredient.shelfLifeCounter || 7
    }
  }
  
  private suggestUseForExpiring(item: any): string {
    const category = item.ingredient?.category
    
    switch (category) {
      case 'protein':
        return 'Cook today or freeze immediately'
      case 'vegetable':
        return 'Use in stir-fry, soup, or roast'
      case 'fruit':
        return 'Eat fresh, make smoothie, or freeze'
      case 'dairy':
        return 'Use in cooking or baking today'
      default:
        return 'Use as soon as possible'
    }
  }
  
  private generateExpirationSuggestions(items: any[]): string[] {
    const suggestions = []
    
    // Group by category
    const byCategory = items.reduce((acc, item) => {
      const cat = item.ingredient?.category || 'other'
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(item)
      return acc
    }, {} as Record<string, any[]>)
    
    if (byCategory.protein?.length > 0 && byCategory.vegetable?.length > 0) {
      suggestions.push('Make a stir-fry with expiring proteins and vegetables')
    }
    
    if (byCategory.vegetable?.length > 2) {
      suggestions.push('Make a vegetable soup or roasted vegetable medley')
    }
    
    if (byCategory.fruit?.length > 0) {
      suggestions.push('Make a smoothie or fruit salad')
    }
    
    if (byCategory.dairy?.length > 0) {
      suggestions.push('Use dairy in baking or creamy pasta dishes')
    }
    
    return suggestions
  }
  
  private getSuggestedReorderAmount(item: string): string {
    const amounts: Record<string, string> = {
      milk: '1 gallon',
      eggs: '1 dozen',
      bread: '1 loaf',
      butter: '1 lb',
      'olive oil': '1 bottle',
      salt: '1 container',
      pepper: '1 container',
    }
    
    return amounts[item] || '1 unit'
  }
  
  async run() {
    const transport = new StdioServerTransport()
    await this.server.connect(transport)
    console.error('Enhanced Pantry MCP server running on stdio')
  }
}

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new EnhancedPantryServer()
  server.run()
}

export { EnhancedPantryServer }