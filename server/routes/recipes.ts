import { Hono } from 'hono'
import { prisma } from '../lib/db'

const app = new Hono()

// Get all recipes with pagination and optional full data
app.get('/', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '20')
    const includeDetails = c.req.query('includeDetails') === 'true'
    const search = c.req.query('search')
    const maxTimeParam = c.req.query('maxTime')
    const maxTime = maxTimeParam ? parseInt(maxTimeParam) : undefined
    
    const skip = (page - 1) * limit
    
    // Build where clause for filtering
    const where: any = {}
    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive'
      }
    }
    if (maxTime) {
      where.totalTime = {
        lte: maxTime
      }
    }
    
    const [recipes, total] = await Promise.all([
      includeDetails ? 
        prisma.recipe.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: {
            ingredients: {
              orderBy: { order: 'asc' as const }
            },
            instructions: {
              orderBy: { order: 'asc' as const }
            }
          }
        }) :
        prisma.recipe.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          select: {
            id: true,
            name: true,
            description: true,
            prepTime: true,
            cookTime: true,
            totalTime: true,
            servings: true,
            imageUrl: true,
            createdAt: true,
            // Count ingredients and instructions for summary
            _count: {
              select: {
                ingredients: true,
                instructions: true
              }
            }
          }
        }),
      prisma.recipe.count({ where })
    ])
    
    return c.json({
      recipes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching recipes:', error)
    return c.json({ error: 'Failed to fetch recipes' }, 500)
  }
})

// Get single recipe
app.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const recipe = await prisma.recipe.findUnique({
      where: { id },
      include: {
        ingredients: {
          orderBy: { order: 'asc' as const }
        },
        instructions: {
          orderBy: { order: 'asc' as const }
        }
      }
    })
    
    if (!recipe) {
      return c.json({ error: 'Recipe not found' }, 404)
    }
    
    return c.json(recipe)
  } catch (error) {
    console.error('Error fetching recipe:', error)
    return c.json({ error: 'Failed to fetch recipe' }, 500)
  }
})

// Create new recipe
app.post('/', async (c) => {
  try {
    const body = await c.req.json()
    const { name, description, prepTime, cookTime, totalTime, servings, imageUrl, sourceUrl, ingredients, instructions } = body
    
    const recipe = await prisma.recipe.create({
      data: {
        name,
        description,
        prepTime,
        cookTime,
        totalTime,
        servings,
        imageUrl,
        sourceUrl,
        userId: 'default-user', // TODO: Replace with actual user ID from auth
        ingredients: {
          create: ingredients.map((ingredient: any, index: number) => ({
            name: ingredient.name,
            amount: ingredient.amount,
            unit: ingredient.unit,
            order: index
          }))
        },
        instructions: {
          create: instructions.map((instruction: any, index: number) => ({
            step: instruction.step,
            order: index
          }))
        }
      },
      include: {
        ingredients: {
          orderBy: { order: 'asc' as const }
        },
        instructions: {
          orderBy: { order: 'asc' as const }
        }
      }
    })
    
    return c.json(recipe, 201)
  } catch (error) {
    console.error('Error creating recipe:', error)
    return c.json({ error: 'Failed to create recipe' }, 500)
  }
})

// Update recipe with transaction for better performance
app.put('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const { name, description, prepTime, cookTime, totalTime, servings, imageUrl, ingredients, instructions } = body
    
    // Use transaction for atomic updates
    const recipe = await prisma.$transaction(async (tx) => {
      // Delete existing ingredients and instructions in parallel
      await Promise.all([
        tx.ingredient.deleteMany({ where: { recipeId: id } }),
        tx.instruction.deleteMany({ where: { recipeId: id } })
      ])
      
      // Update recipe with new data
      return await tx.recipe.update({
        where: { id },
        data: {
          name,
          description,
          prepTime,
          cookTime,
          totalTime,
          servings,
          imageUrl,
          updatedAt: new Date(),
          ingredients: {
            create: ingredients.map((ingredient: any, index: number) => ({
              name: ingredient.name,
              amount: ingredient.amount,
              unit: ingredient.unit,
              order: index
            }))
          },
          instructions: {
            create: instructions.map((instruction: any, index: number) => ({
              step: instruction.step,
              order: index
            }))
          }
        },
        include: {
          ingredients: {
            orderBy: { order: 'asc' as const }
          },
          instructions: {
            orderBy: { order: 'asc' as const }
          }
        }
      })
    })
    
    return c.json(recipe)
  } catch (error) {
    console.error('Error updating recipe:', error)
    return c.json({ error: 'Failed to update recipe' }, 500)
  }
})

// Delete recipe
app.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    await prisma.recipe.delete({ where: { id } })
    return c.json({ message: 'Recipe deleted successfully' })
  } catch (error) {
    console.error('Error deleting recipe:', error)
    return c.json({ error: 'Failed to delete recipe' }, 500)
  }
})

// Bulk delete recipes
app.delete('/bulk', async (c) => {
  try {
    const { ids } = await c.req.json()
    if (!Array.isArray(ids) || ids.length === 0) {
      return c.json({ error: 'Invalid recipe IDs provided' }, 400)
    }
    
    const result = await prisma.recipe.deleteMany({
      where: {
        id: {
          in: ids
        }
      }
    })
    
    return c.json({ 
      message: `${result.count} recipes deleted successfully`,
      deletedCount: result.count
    })
  } catch (error) {
    console.error('Error bulk deleting recipes:', error)
    return c.json({ error: 'Failed to delete recipes' }, 500)
  }
})

// Search recipes by ingredients
app.get('/search/ingredients', async (c) => {
  try {
    const ingredients = c.req.query('ingredients')?.split(',').map(i => i.trim()) || []
    const matchAll = c.req.query('matchAll') === 'true'
    
    if (ingredients.length === 0) {
      return c.json({ recipes: [] })
    }
    
    const recipes = await prisma.recipe.findMany({
      where: {
        ingredients: matchAll ? {
          every: {
            name: {
              in: ingredients,
              mode: 'insensitive'
            }
          }
        } : {
          some: {
            name: {
              in: ingredients,
              mode: 'insensitive'
            }
          }
        }
      },
      select: {
        id: true,
        name: true,
        description: true,
        totalTime: true,
        servings: true,
        imageUrl: true,
        ingredients: {
          select: {
            name: true,
            amount: true,
            unit: true
          },
          orderBy: { order: 'asc' as const }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    return c.json({ recipes })
  } catch (error) {
    console.error('Error searching recipes by ingredients:', error)
    return c.json({ error: 'Failed to search recipes' }, 500)
  }
})

// Get recipe statistics
app.get('/stats', async (c) => {
  try {
    const [totalRecipes, avgCookTime, mostUsedIngredients] = await Promise.all([
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
      })
    ])
    
    return c.json({
      totalRecipes,
      averageCookTime: Math.round(avgCookTime._avg.totalTime || 0),
      mostUsedIngredients: mostUsedIngredients.map(ing => ({
        name: ing.name,
        count: ing._count.name
      }))
    })
  } catch (error) {
    console.error('Error fetching recipe stats:', error)
    return c.json({ error: 'Failed to fetch statistics' }, 500)
  }
})

export default app