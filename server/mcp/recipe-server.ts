import { McpServer } from '@modelcontextprotocol/sdk/server/mcp'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio'
import { z } from 'zod'
import { prisma } from '../lib/db'

/**
 * Recipe MCP Server
 * 
 * Provides recipe database access, search, recommendations, and cooking instructions
 * to AI agents through the Model Context Protocol.
 */

// Validation schemas
const UserIdSchema = z.string().cuid()
const RecipeIdSchema = z.string().cuid()

const IngredientSchema = z.object({
  name: z.string().min(1),
  amount: z.string().optional(),
  unit: z.string().optional()
})

const InstructionSchema = z.object({
  step: z.string().min(1)
})

const CreateRecipeSchema = z.object({
  userId: UserIdSchema,
  name: z.string().min(1),
  description: z.string().optional(),
  prepTime: z.number().optional(),
  cookTime: z.number().optional(),
  totalTime: z.number().optional(),
  servings: z.number().optional(),
  imageUrl: z.string().url().optional(),
  sourceUrl: z.string().url().optional(),
  ingredients: z.array(IngredientSchema),
  instructions: z.array(InstructionSchema),
  customServings: z.number().optional(),
  customNotes: z.string().optional()
})

const SearchRecipesSchema = z.object({
  userId: UserIdSchema.optional(),
  query: z.string().optional(),
  ingredients: z.array(z.string()).optional(),
  maxTime: z.number().optional(),
  servings: z.number().optional(),
  page: z.number().default(1),
  limit: z.number().default(20)
})

const ScaleRecipeSchema = z.object({
  recipeId: RecipeIdSchema,
  targetServings: z.number().min(1),
  originalServings: z.number().min(1).optional()
})

// Helper functions
async function findDuplicateRecipe(name: string, ingredients: any[], instructions: any[]) {
  const similarRecipes = await prisma.recipe.findMany({
    where: {
      name: {
        contains: name,
        mode: 'insensitive'
      }
    },
    include: {
      ingredients: {
        orderBy: { order: 'asc' }
      },
      instructions: {
        orderBy: { order: 'asc' }
      }
    }
  })

  for (const recipe of similarRecipes) {
    if (recipe.ingredients.length === ingredients.length && 
        recipe.instructions.length === instructions.length) {
      
      const ingredientsMatch = recipe.ingredients.every((ing: any, index: number) => 
        ing.name.toLowerCase() === ingredients[index]?.name?.toLowerCase() &&
        ing.amount === ingredients[index]?.amount &&
        ing.unit === ingredients[index]?.unit
      )
      
      const instructionsMatch = recipe.instructions.every((inst: any, index: number) =>
        inst.step === instructions[index]?.step
      )
      
      if (ingredientsMatch && instructionsMatch) {
        return recipe
      }
    }
  }
  
  return null
}

function parseAmount(amount: string): number {
  // Handle fractions like "1/2", "2 1/4", etc.
  if (amount.includes('/')) {
    const parts = amount.split(' ')
    let total = 0
    
    for (const part of parts) {
      if (part.includes('/')) {
        const [num, den] = part.split('/')
        total += parseInt(num) / parseInt(den)
      } else {
        total += parseFloat(part)
      }
    }
    return total
  }
  
  return parseFloat(amount) || 0
}

function scaleAmount(amount: string, scaleFactor: number): string {
  if (!amount) return amount
  
  const numericAmount = parseAmount(amount)
  const scaledAmount = numericAmount * scaleFactor
  
  // Convert back to mixed number if needed
  if (scaledAmount % 1 === 0) {
    return scaledAmount.toString()
  }
  
  // Handle common fractions
  const fraction = scaledAmount % 1
  const whole = Math.floor(scaledAmount)
  
  if (Math.abs(fraction - 0.5) < 0.01) {
    return whole > 0 ? `${whole} 1/2` : '1/2'
  } else if (Math.abs(fraction - 0.25) < 0.01) {
    return whole > 0 ? `${whole} 1/4` : '1/4'
  } else if (Math.abs(fraction - 0.75) < 0.01) {
    return whole > 0 ? `${whole} 3/4` : '3/4'
  } else if (Math.abs(fraction - 0.33) < 0.01) {
    return whole > 0 ? `${whole} 1/3` : '1/3'
  } else if (Math.abs(fraction - 0.67) < 0.01) {
    return whole > 0 ? `${whole} 2/3` : '2/3'
  }
  
  // Fall back to decimal
  return scaledAmount.toFixed(2).replace(/\.?0+$/, '')
}

// Create MCP Server
const server = new McpServer({
  name: 'recipe-server',
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
        uri: 'recipe://collection/{userId}',
        name: 'User Recipe Collection',
        description: 'Complete recipe collection for a user',
        mimeType: 'application/json'
      },
      {
        uri: 'recipe://public/search?query={terms}',
        name: 'Public Recipe Search',
        description: 'Search public recipes by name or description',
        mimeType: 'application/json'
      },
      {
        uri: 'recipe://details/{recipeId}',
        name: 'Recipe Details',
        description: 'Full recipe with ingredients and instructions',
        mimeType: 'application/json'
      },
      {
        uri: 'recipe://ingredients/{recipeId}',
        name: 'Recipe Ingredients',
        description: 'Ingredient list for a specific recipe',
        mimeType: 'application/json'
      },
      {
        uri: 'recipe://ratings/{recipeId}',
        name: 'Recipe Ratings',
        description: 'Ratings and reviews for a recipe',
        mimeType: 'application/json'
      },
      {
        uri: 'recipe://stats',
        name: 'Recipe Statistics',
        description: 'Overall recipe database statistics',
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
      case 'collection': {
        const userId = pathParts[1]
        UserIdSchema.parse(userId)
        
        const recipes = await prisma.recipe.findMany({
          where: {
            userRecipes: {
              some: {
                userId: userId
              }
            }
          },
          include: {
            ingredients: {
              orderBy: { order: 'asc' }
            },
            instructions: {
              orderBy: { order: 'asc' }
            },
            userRecipes: {
              where: { userId },
              select: {
                customServings: true,
                customNotes: true,
                isFavorite: true,
                timesCooked: true,
                lastCookedAt: true
              }
            },
            ratings: {
              select: {
                rating: true,
                review: true,
                userId: true
              }
            },
            _count: {
              select: {
                ratings: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        })
        
        return {
          contents: [{
            uri: request.params.uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              recipes: recipes.map(recipe => ({
                id: recipe.id,
                name: recipe.name,
                description: recipe.description,
                prepTime: recipe.prepTime,
                cookTime: recipe.cookTime,
                totalTime: recipe.totalTime,
                servings: recipe.servings,
                imageUrl: recipe.imageUrl,
                sourceUrl: recipe.sourceUrl,
                ingredients: recipe.ingredients,
                instructions: recipe.instructions,
                userSettings: recipe.userRecipes[0] || null,
                averageRating: recipe.ratings.length > 0 ? 
                  recipe.ratings.reduce((sum, r) => sum + r.rating, 0) / recipe.ratings.length : null,
                ratingCount: recipe._count.ratings,
                createdAt: recipe.createdAt.toISOString()
              }))
            }, null, 2)
          }]
        }
      }
      
      case 'public': {
        if (pathParts[1] === 'search') {
          const query = uri.searchParams.get('query')
          const maxTime = uri.searchParams.get('maxTime')
          
          const where: any = {
            isPublic: true
          }
          
          if (query) {
            where.OR = [
              { name: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } }
            ]
          }
          
          if (maxTime) {
            where.totalTime = { lte: parseInt(maxTime) }
          }
          
          const recipes = await prisma.recipe.findMany({
            where,
            include: {
              ingredients: {
                orderBy: { order: 'asc' }
              },
              instructions: {
                orderBy: { order: 'asc' }
              },
              ratings: {
                select: {
                  rating: true
                }
              },
              _count: {
                select: {
                  ratings: true
                }
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
                query,
                recipes: recipes.map(recipe => ({
                  id: recipe.id,
                  name: recipe.name,
                  description: recipe.description,
                  totalTime: recipe.totalTime,
                  servings: recipe.servings,
                  imageUrl: recipe.imageUrl,
                  averageRating: recipe.ratings.length > 0 ? 
                    recipe.ratings.reduce((sum, r) => sum + r.rating, 0) / recipe.ratings.length : null,
                  ratingCount: recipe._count.ratings,
                  ingredientCount: recipe.ingredients.length,
                  instructionCount: recipe.instructions.length
                }))
              }, null, 2)
            }]
          }
        }
        break
      }
      
      case 'details': {
        const recipeId = pathParts[1]
        RecipeIdSchema.parse(recipeId)
        
        const recipe = await prisma.recipe.findUnique({
          where: { id: recipeId },
          include: {
            ingredients: {
              orderBy: { order: 'asc' }
            },
            instructions: {
              orderBy: { order: 'asc' }
            },
            ratings: {
              include: {
                user: {
                  select: { id: true, name: true }
                }
              },
              orderBy: { createdAt: 'desc' }
            },
            _count: {
              select: {
                ratings: true,
                userRecipes: true
              }
            }
          }
        })
        
        if (!recipe) {
          throw new Error('Recipe not found')
        }
        
        return {
          contents: [{
            uri: request.params.uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              id: recipe.id,
              name: recipe.name,
              description: recipe.description,
              prepTime: recipe.prepTime,
              cookTime: recipe.cookTime,
              totalTime: recipe.totalTime,
              servings: recipe.servings,
              difficulty: recipe.difficulty,
              imageUrl: recipe.imageUrl,
              sourceUrl: recipe.sourceUrl,
              ingredients: recipe.ingredients,
              instructions: recipe.instructions,
              ratings: recipe.ratings.map(rating => ({
                id: rating.id,
                rating: rating.rating,
                review: rating.review,
                user: rating.user,
                createdAt: rating.createdAt.toISOString()
              })),
              averageRating: recipe.ratings.length > 0 ? 
                recipe.ratings.reduce((sum, r) => sum + r.rating, 0) / recipe.ratings.length : null,
              ratingCount: recipe._count.ratings,
              userCount: recipe._count.userRecipes,
              createdAt: recipe.createdAt.toISOString()
            }, null, 2)
          }]
        }
      }
      
      case 'ingredients': {
        const recipeId = pathParts[1]
        RecipeIdSchema.parse(recipeId)
        
        const ingredients = await prisma.ingredient.findMany({
          where: { recipeId },
          orderBy: { order: 'asc' }
        })
        
        return {
          contents: [{
            uri: request.params.uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              recipeId,
              ingredients: ingredients.map(ing => ({
                id: ing.id,
                name: ing.name,
                amount: ing.amount,
                unit: ing.unit,
                order: ing.order
              }))
            }, null, 2)
          }]
        }
      }
      
      case 'ratings': {
        const recipeId = pathParts[1]
        RecipeIdSchema.parse(recipeId)
        
        const ratings = await prisma.recipeRating.findMany({
          where: { recipeId },
          include: {
            user: {
              select: { id: true, name: true, avatar: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        })
        
        const avgRating = ratings.length > 0 ? 
          ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length : null
          
        const ratingDistribution = {
          1: ratings.filter(r => r.rating === 1).length,
          2: ratings.filter(r => r.rating === 2).length,
          3: ratings.filter(r => r.rating === 3).length,
          4: ratings.filter(r => r.rating === 4).length,
          5: ratings.filter(r => r.rating === 5).length
        }
        
        return {
          contents: [{
            uri: request.params.uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              recipeId,
              averageRating: avgRating,
              totalRatings: ratings.length,
              ratingDistribution,
              ratings: ratings.map(rating => ({
                id: rating.id,
                rating: rating.rating,
                review: rating.review,
                user: rating.user,
                createdAt: rating.createdAt.toISOString()
              }))
            }, null, 2)
          }]
        }
      }
      
      case 'stats': {
        const [totalRecipes, avgCookTime, mostUsedIngredients, topRatedRecipes] = await Promise.all([
          prisma.recipe.count(),
          prisma.recipe.aggregate({
            _avg: {
              totalTime: true
            }
          }),
          prisma.ingredient.groupBy({
            by: ['name'],
            _count: {
              name: true
            },
            orderBy: {
              _count: {
                name: 'desc'
              }
            },
            take: 10
          }),
          prisma.recipe.findMany({
            include: {
              ratings: {
                select: { rating: true }
              },
              _count: {
                select: { ratings: true }
              }
            },
            take: 100
          }).then(recipes => 
            recipes
              .filter(r => r._count.ratings >= 3)
              .map(r => ({
                id: r.id,
                name: r.name,
                averageRating: r.ratings.reduce((sum, rating) => sum + rating.rating, 0) / r.ratings.length,
                ratingCount: r._count.ratings
              }))
              .sort((a, b) => b.averageRating - a.averageRating)
              .slice(0, 10)
          )
        ])
        
        return {
          contents: [{
            uri: request.params.uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              totalRecipes,
              averageCookTime: Math.round(avgCookTime._avg.totalTime || 0),
              mostUsedIngredients: mostUsedIngredients.map((ing: any) => ({
                name: ing.name,
                count: ing._count.name
              })),
              topRatedRecipes
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
        name: 'search_recipes',
        description: 'Search recipes by various criteria',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'User ID (optional)' },
            query: { type: 'string', description: 'Search query for name/description' },
            ingredients: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'Ingredients to search for'
            },
            maxTime: { type: 'number', description: 'Maximum cooking time in minutes' },
            servings: { type: 'number', description: 'Target serving size' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            limit: { type: 'number', description: 'Results per page (default: 20)' }
          }
        }
      },
      {
        name: 'match_by_ingredients',
        description: 'Find recipes using available ingredients from pantry',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'User ID' },
            availableIngredients: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of available ingredients'
            },
            matchAll: { 
              type: 'boolean', 
              description: 'Require all ingredients to be available (default: false)'
            }
          },
          required: ['userId', 'availableIngredients']
        }
      },
      {
        name: 'add_recipe',
        description: 'Add a new recipe to user collection',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'User ID' },
            name: { type: 'string', description: 'Recipe name' },
            description: { type: 'string', description: 'Recipe description' },
            prepTime: { type: 'number', description: 'Preparation time in minutes' },
            cookTime: { type: 'number', description: 'Cooking time in minutes' },
            totalTime: { type: 'number', description: 'Total time in minutes' },
            servings: { type: 'number', description: 'Number of servings' },
            imageUrl: { type: 'string', description: 'Recipe image URL' },
            sourceUrl: { type: 'string', description: 'Source URL' },
            ingredients: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  amount: { type: 'string' },
                  unit: { type: 'string' }
                },
                required: ['name']
              }
            },
            instructions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  step: { type: 'string' }
                },
                required: ['step']
              }
            }
          },
          required: ['userId', 'name', 'ingredients', 'instructions']
        }
      },
      {
        name: 'rate_recipe',
        description: 'Add or update a recipe rating',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'User ID' },
            recipeId: { type: 'string', description: 'Recipe ID' },
            rating: { type: 'number', minimum: 1, maximum: 5, description: '1-5 star rating' },
            review: { type: 'string', description: 'Optional text review' }
          },
          required: ['userId', 'recipeId', 'rating']
        }
      },
      {
        name: 'scale_recipe',
        description: 'Scale recipe ingredients for different serving sizes',
        inputSchema: {
          type: 'object',
          properties: {
            recipeId: { type: 'string', description: 'Recipe ID' },
            targetServings: { type: 'number', minimum: 1, description: 'Target number of servings' },
            originalServings: { type: 'number', minimum: 1, description: 'Original serving size (optional)' }
          },
          required: ['recipeId', 'targetServings']
        }
      },
      {
        name: 'mark_recipe_cooked',
        description: 'Mark a recipe as cooked to track usage',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'User ID' },
            recipeId: { type: 'string', description: 'Recipe ID' }
          },
          required: ['userId', 'recipeId']
        }
      }
    ]
  }
})

server.setRequestHandler('tools/call', async (request) => {
  try {
    switch (request.params.name) {
      case 'search_recipes': {
        const { userId, query, ingredients, maxTime, servings, page, limit } = 
          SearchRecipesSchema.parse(request.params.arguments)
        
        const where: any = {
          isPublic: true
        }
        
        // Add user-specific recipes if userId provided
        if (userId) {
          where.OR = [
            { isPublic: true },
            { userRecipes: { some: { userId } } }
          ]
        }
        
        if (query) {
          where.AND = where.AND || []
          where.AND.push({
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } }
            ]
          })
        }
        
        if (ingredients && ingredients.length > 0) {
          where.AND = where.AND || []
          where.AND.push({
            ingredients: {
              some: {
                name: {
                  in: ingredients,
                  mode: 'insensitive'
                }
              }
            }
          })
        }
        
        if (maxTime) {
          where.totalTime = { lte: maxTime }
        }
        
        if (servings) {
          where.servings = servings
        }
        
        const skip = (page - 1) * limit
        
        const [recipes, total] = await Promise.all([
          prisma.recipe.findMany({
            where,
            include: {
              ingredients: {
                orderBy: { order: 'asc' }
              },
              ratings: {
                select: { rating: true }
              },
              _count: {
                select: { ratings: true }
              }
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit
          }),
          prisma.recipe.count({ where })
        ])
        
        return {
          content: [{
            type: 'text',
            text: `Found ${total} recipes matching criteria:\n\n` +
                  recipes.map(recipe => {
                    const avgRating = recipe.ratings.length > 0 ? 
                      recipe.ratings.reduce((sum, r) => sum + r.rating, 0) / recipe.ratings.length : null
                    return `• ${recipe.name} (${recipe.totalTime || 'N/A'} mins, ${recipe.servings || 'N/A'} servings)` +
                           (avgRating ? ` - ⭐ ${avgRating.toFixed(1)} (${recipe._count.ratings} ratings)` : '')
                  }).join('\n') +
                  `\n\nPage ${page} of ${Math.ceil(total / limit)}`
          }]
        }
      }
      
      case 'match_by_ingredients': {
        const { userId, availableIngredients, matchAll = false } = 
          z.object({
            userId: UserIdSchema,
            availableIngredients: z.array(z.string()),
            matchAll: z.boolean().optional()
          }).parse(request.params.arguments)
        
        const recipes = await prisma.recipe.findMany({
          where: {
            OR: [
              { isPublic: true },
              { userRecipes: { some: { userId } } }
            ],
            ingredients: matchAll ? {
              every: {
                name: {
                  in: availableIngredients,
                  mode: 'insensitive'
                }
              }
            } : {
              some: {
                name: {
                  in: availableIngredients,
                  mode: 'insensitive'
                }
              }
            }
          },
          include: {
            ingredients: {
              orderBy: { order: 'asc' }
            },
            ratings: {
              select: { rating: true }
            }
          },
          take: 20
        })
        
        const recipesWithMatchInfo = recipes.map(recipe => {
          const matchingIngredients = recipe.ingredients.filter(ing =>
            availableIngredients.some(avail => 
              avail.toLowerCase().includes(ing.name.toLowerCase()) ||
              ing.name.toLowerCase().includes(avail.toLowerCase())
            )
          )
          
          const missingIngredients = recipe.ingredients.filter(ing =>
            !availableIngredients.some(avail => 
              avail.toLowerCase().includes(ing.name.toLowerCase()) ||
              ing.name.toLowerCase().includes(avail.toLowerCase())
            )
          )
          
          const matchPercentage = (matchingIngredients.length / recipe.ingredients.length) * 100
          const avgRating = recipe.ratings.length > 0 ? 
            recipe.ratings.reduce((sum, r) => sum + r.rating, 0) / recipe.ratings.length : null
          
          return {
            recipe,
            matchingIngredients,
            missingIngredients,
            matchPercentage,
            avgRating
          }
        })
        
        // Sort by match percentage and rating
        recipesWithMatchInfo.sort((a, b) => {
          if (a.matchPercentage !== b.matchPercentage) {
            return b.matchPercentage - a.matchPercentage
          }
          return (b.avgRating || 0) - (a.avgRating || 0)
        })
        
        return {
          content: [{
            type: 'text',
            text: `Found ${recipes.length} recipes using available ingredients:\n\n` +
                  recipesWithMatchInfo.slice(0, 10).map((item, index) => 
                    `${index + 1}. ${item.recipe.name} (${item.matchPercentage.toFixed(0)}% match)\n` +
                    `   ✅ Have: ${item.matchingIngredients.map(i => i.name).join(', ')}\n` +
                    (item.missingIngredients.length > 0 ? 
                      `   ❌ Need: ${item.missingIngredients.map(i => i.name).join(', ')}\n` : '') +
                    (item.avgRating ? `   ⭐ Rating: ${item.avgRating.toFixed(1)}\n` : '')
                  ).join('\n')
          }]
        }
      }
      
      case 'add_recipe': {
        const recipeData = CreateRecipeSchema.parse(request.params.arguments)
        
        // Check for existing recipe
        const existingRecipe = await findDuplicateRecipe(
          recipeData.name, 
          recipeData.ingredients, 
          recipeData.instructions
        )
        
        let recipe
        let userRecipe
        
        if (existingRecipe) {
          // Use existing recipe, just create user association
          userRecipe = await prisma.userRecipe.create({
            data: {
              userId: recipeData.userId,
              recipeId: existingRecipe.id,
              customServings: recipeData.customServings,
              customNotes: recipeData.customNotes
            }
          })
          recipe = existingRecipe
        } else {
          // Create new recipe and user association
          recipe = await prisma.$transaction(async (tx: any) => {
            const newRecipe = await tx.recipe.create({
              data: {
                name: recipeData.name,
                description: recipeData.description,
                prepTime: recipeData.prepTime,
                cookTime: recipeData.cookTime,
                totalTime: recipeData.totalTime,
                servings: recipeData.servings,
                imageUrl: recipeData.imageUrl,
                sourceUrl: recipeData.sourceUrl,
                createdBy: recipeData.userId,
                isPublic: true,
                ingredients: {
                  create: recipeData.ingredients.map((ing: any, index: number) => ({
                    name: ing.name,
                    amount: ing.amount,
                    unit: ing.unit,
                    order: index
                  }))
                },
                instructions: {
                  create: recipeData.instructions.map((inst: any, index: number) => ({
                    step: inst.step,
                    order: index
                  }))
                }
              },
              include: {
                ingredients: {
                  orderBy: { order: 'asc' }
                },
                instructions: {
                  orderBy: { order: 'asc' }
                }
              }
            })
            
            await tx.userRecipe.create({
              data: {
                userId: recipeData.userId,
                recipeId: newRecipe.id,
                customServings: recipeData.customServings,
                customNotes: recipeData.customNotes
              }
            })
            
            return newRecipe
          })
        }
        
        return {
          content: [{
            type: 'text',
            text: `Successfully added recipe "${recipe.name}" to your collection!\n\n` +
                  `Recipe ID: ${recipe.id}\n` +
                  `Ingredients: ${recipe.ingredients?.length || recipeData.ingredients.length}\n` +
                  `Instructions: ${recipe.instructions?.length || recipeData.instructions.length}\n` +
                  (recipe.totalTime ? `Total Time: ${recipe.totalTime} minutes\n` : '') +
                  (recipe.servings ? `Servings: ${recipe.servings}\n` : '') +
                  (existingRecipe ? 'Note: This recipe already existed and was added to your collection.' : '')
          }]
        }
      }
      
      case 'rate_recipe': {
        const { userId, recipeId, rating, review } = z.object({
          userId: UserIdSchema,
          recipeId: RecipeIdSchema,
          rating: z.number().min(1).max(5),
          review: z.string().optional()
        }).parse(request.params.arguments)
        
        const recipeRating = await prisma.recipeRating.upsert({
          where: {
            userId_recipeId: {
              userId,
              recipeId
            }
          },
          create: {
            userId,
            recipeId,
            rating,
            review
          },
          update: {
            rating,
            review,
            updatedAt: new Date()
          }
        })
        
        // Get updated average rating
        const allRatings = await prisma.recipeRating.findMany({
          where: { recipeId },
          select: { rating: true }
        })
        
        const avgRating = allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length
        
        return {
          content: [{
            type: 'text',
            text: `Successfully rated recipe ${rating}/5 stars!\n\n` +
                  `Your review: ${review || 'No review provided'}\n` +
                  `Average rating: ${avgRating.toFixed(1)}/5 (${allRatings.length} ratings)`
          }]
        }
      }
      
      case 'scale_recipe': {
        const { recipeId, targetServings, originalServings } = 
          ScaleRecipeSchema.parse(request.params.arguments)
        
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
        
        const baseServings = originalServings || recipe.servings || 4
        const scaleFactor = targetServings / baseServings
        
        const scaledIngredients = recipe.ingredients.map(ingredient => ({
          ...ingredient,
          amount: ingredient.amount ? scaleAmount(ingredient.amount, scaleFactor) : ingredient.amount
        }))
        
        return {
          content: [{
            type: 'text',
            text: `Scaled "${recipe.name}" from ${baseServings} to ${targetServings} servings (${scaleFactor.toFixed(2)}x):\n\n` +
                  'Ingredients:\n' +
                  scaledIngredients.map(ing => 
                    `• ${ing.amount || ''} ${ing.unit || ''} ${ing.name}`.trim()
                  ).join('\n') +
                  `\n\nPrep time: ${recipe.prepTime || 'N/A'} minutes\n` +
                  `Cook time: ${recipe.cookTime || 'N/A'} minutes\n` +
                  `Total time: ${recipe.totalTime || 'N/A'} minutes`
          }]
        }
      }
      
      case 'mark_recipe_cooked': {
        const { userId, recipeId } = z.object({
          userId: UserIdSchema,
          recipeId: RecipeIdSchema
        }).parse(request.params.arguments)
        
        const userRecipe = await prisma.userRecipe.update({
          where: {
            userId_recipeId: {
              userId,
              recipeId
            }
          },
          data: {
            timesCooked: {
              increment: 1
            },
            lastCookedAt: new Date(),
            updatedAt: new Date()
          },
          include: {
            recipe: {
              select: { name: true }
            }
          }
        })
        
        return {
          content: [{
            type: 'text',
            text: `Marked "${userRecipe.recipe.name}" as cooked!\n\n` +
                  `Times cooked: ${userRecipe.timesCooked}\n` +
                  `Last cooked: ${userRecipe.lastCookedAt?.toLocaleDateString()}`
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
        name: 'recipe_suggestion',
        description: 'Suggest recipes based on available pantry contents',
        arguments: [
          {
            name: 'userId',
            description: 'User ID to get pantry contents and preferences for',
            required: true
          },
          {
            name: 'mealType',
            description: 'Type of meal (breakfast, lunch, dinner, snack)',
            required: false
          },
          {
            name: 'maxTime',
            description: 'Maximum cooking time in minutes',
            required: false
          }
        ]
      },
      {
        name: 'cooking_guidance',
        description: 'Provide step-by-step cooking instructions and tips',
        arguments: [
          {
            name: 'recipeId',
            description: 'Recipe ID to provide guidance for',
            required: true
          },
          {
            name: 'servings',
            description: 'Number of servings to prepare (for scaling)',
            required: false
          },
          {
            name: 'skillLevel',
            description: 'Cooking skill level (beginner, intermediate, advanced)',
            required: false
          }
        ]
      },
      {
        name: 'meal_planning',
        description: 'Generate meal plans based on preferences and constraints',
        arguments: [
          {
            name: 'userId',
            description: 'User ID to generate meal plan for',
            required: true
          },
          {
            name: 'days',
            description: 'Number of days to plan (default: 7)',
            required: false
          },
          {
            name: 'dietaryRestrictions',
            description: 'Any dietary restrictions or preferences',
            required: false
          }
        ]
      }
    ]
  }
})

server.setRequestHandler('prompts/get', async (request) => {
  const args = request.params.arguments || {}
  
  switch (request.params.name) {
    case 'recipe_suggestion': {
      const userId = z.string().parse(args.userId)
      const mealType = z.string().optional().parse(args.mealType)
      const maxTime = z.number().optional().parse(args.maxTime)
      
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Suggest recipes for user ${userId} based on their available pantry contents. ` +
                   (mealType ? `Focus on ${mealType} recipes. ` : '') +
                   (maxTime ? `Recipes should take no more than ${maxTime} minutes. ` : '') +
                   'Consider their past preferences, dietary restrictions, and ingredient availability. ' +
                   'Provide 3-5 specific recipe suggestions with explanations of why they are good matches.'
            }
          }
        ]
      }
    }
    
    case 'cooking_guidance': {
      const recipeId = z.string().parse(args.recipeId)
      const servings = z.number().optional().parse(args.servings)
      const skillLevel = z.string().optional().parse(args.skillLevel) || 'intermediate'
      
      const recipe = await prisma.recipe.findUnique({
        where: { id: recipeId },
        include: {
          ingredients: { orderBy: { order: 'asc' } },
          instructions: { orderBy: { order: 'asc' } }
        }
      })
      
      if (!recipe) {
        throw new Error('Recipe not found')
      }
      
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Provide detailed cooking guidance for "${recipe.name}". ` +
                   `The cook's skill level is ${skillLevel}. ` +
                   (servings ? `Scale the recipe for ${servings} servings. ` : '') +
                   'Include preparation tips, timing advice, common mistakes to avoid, and ' +
                   'visual cues to look for during cooking. Make it encouraging and educational.'
            }
          }
        ]
      }
    }
    
    case 'meal_planning': {
      const userId = z.string().parse(args.userId)
      const days = z.number().optional().parse(args.days) || 7
      const dietaryRestrictions = z.string().optional().parse(args.dietaryRestrictions)
      
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Create a ${days}-day meal plan for user ${userId}. ` +
                   'Consider their recipe collection, pantry contents, and past cooking patterns. ' +
                   (dietaryRestrictions ? `Account for these dietary restrictions: ${dietaryRestrictions}. ` : '') +
                   'Include breakfast, lunch, and dinner for each day. Provide variety while ' +
                   'minimizing food waste and balancing nutritional needs. Include a shopping list ' +
                   'for any additional ingredients needed.'
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
  
  console.error('Recipe MCP Server started successfully')
}

// Handle process termination
process.on('SIGINT', async () => {
  console.error('Shutting down Recipe MCP Server...')
  await server.close()
  process.exit(0)
})

if (require.main === module) {
  main().catch(console.error)
}

export { server as recipeMcpServer }