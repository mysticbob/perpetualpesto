import { Hono } from 'hono'
import { prisma } from '../lib/db'

const app = new Hono()

// Get user's recipes with pagination and optional full data
app.get('/', async (c) => {
  try {
    const userId = c.req.query('userId')
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '20')
    const includeDetails = c.req.query('includeDetails') === 'true'
    const search = c.req.query('search')
    const maxTimeParam = c.req.query('maxTime')
    const maxTime = maxTimeParam ? parseInt(maxTimeParam) : undefined
    
    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400)
    }
    
    const skip = (page - 1) * limit
    
    // Get user's recipes through UserRecipe junction table
    const where: any = {
      userRecipes: {
        some: {
          userId: userId
        }
      }
    }
    
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

// Create or import a recipe for a user
app.post('/', async (c) => {
  try {
    const body = await c.req.json()
    const { userId, name, description, prepTime, cookTime, totalTime, servings, imageUrl, sourceUrl, ingredients, instructions, customServings, customNotes } = body
    
    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400)
    }

    // Check for existing recipe with same name, ingredients, and instructions (deduplication)
    const existingRecipe = await findDuplicateRecipe(name, ingredients, instructions)
    
    let recipe
    let userRecipe
    
    if (existingRecipe) {
      // Use existing recipe, just create user association
      userRecipe = await prisma.userRecipe.create({
        data: {
          userId,
          recipeId: existingRecipe.id,
          customServings,
          customNotes
        }
      })
      recipe = existingRecipe
    } else {
      // Create new recipe and user association
      recipe = await prisma.$transaction(async (tx) => {
        const newRecipe = await tx.recipe.create({
          data: {
            name,
            description,
            prepTime,
            cookTime,
            totalTime,
            servings,
            imageUrl,
            sourceUrl,
            createdBy: userId,
            isPublic: true, // Make recipes public by default for sharing
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

        // Create user recipe association
        await tx.userRecipe.create({
          data: {
            userId,
            recipeId: newRecipe.id,
            customServings,
            customNotes
          }
        })

        return newRecipe
      })
    }
    
    return c.json({ recipe, userRecipe }, 201)
  } catch (error) {
    console.error('Error creating recipe:', error)
    return c.json({ error: 'Failed to create recipe' }, 500)
  }
})

// Helper function to find duplicate recipes
async function findDuplicateRecipe(name: string, ingredients: any[], instructions: any[]) {
  // Look for recipes with similar names (fuzzy matching)
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

  // Check for exact matches in ingredients and instructions
  for (const recipe of similarRecipes) {
    if (recipe.ingredients.length === ingredients.length && 
        recipe.instructions.length === instructions.length) {
      
      const ingredientsMatch = recipe.ingredients.every((ing, index) => 
        ing.name.toLowerCase() === ingredients[index]?.name?.toLowerCase() &&
        ing.amount === ingredients[index]?.amount &&
        ing.unit === ingredients[index]?.unit
      )
      
      const instructionsMatch = recipe.instructions.every((inst, index) =>
        inst.step === instructions[index]?.step
      )
      
      if (ingredientsMatch && instructionsMatch) {
        return recipe
      }
    }
  }
  
  return null
}

// Update user's custom recipe settings
app.put('/user/:userId/:recipeId', async (c) => {
  try {
    const userId = c.req.param('userId')
    const recipeId = c.req.param('recipeId')
    const { customServings, customNotes, isFavorite } = await c.req.json()
    
    const userRecipe = await prisma.userRecipe.update({
      where: {
        userId_recipeId: {
          userId,
          recipeId
        }
      },
      data: {
        customServings,
        customNotes,
        isFavorite,
        updatedAt: new Date()
      }
    })
    
    return c.json(userRecipe)
  } catch (error) {
    console.error('Error updating user recipe:', error)
    return c.json({ error: 'Failed to update user recipe' }, 500)
  }
})

// Mark recipe as cooked
app.post('/user/:userId/:recipeId/cooked', async (c) => {
  try {
    const userId = c.req.param('userId')
    const recipeId = c.req.param('recipeId')
    
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
      }
    })
    
    return c.json(userRecipe)
  } catch (error) {
    console.error('Error marking recipe as cooked:', error)
    return c.json({ error: 'Failed to update cook count' }, 500)
  }
})

// Remove recipe from user's collection
app.delete('/user/:userId/:recipeId', async (c) => {
  try {
    const userId = c.req.param('userId')
    const recipeId = c.req.param('recipeId')
    
    await prisma.userRecipe.delete({
      where: {
        userId_recipeId: {
          userId,
          recipeId
        }
      }
    })
    
    return c.json({ message: 'Recipe removed from collection' })
  } catch (error) {
    console.error('Error removing recipe from user:', error)
    return c.json({ error: 'Failed to remove recipe' }, 500)
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