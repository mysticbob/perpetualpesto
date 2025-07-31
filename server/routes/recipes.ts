import { Hono } from 'hono'
import { prisma } from '../lib/db'

const app = new Hono()

// Get all recipes
app.get('/', async (c) => {
  try {
    const recipes = await prisma.recipe.findMany({
      include: {
        ingredients: {
          orderBy: { order: 'asc' }
        },
        instructions: {
          orderBy: { order: 'asc' }
        }
      }
    })
    return c.json(recipes)
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
          orderBy: { order: 'asc' }
        },
        instructions: {
          orderBy: { order: 'asc' }
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
          orderBy: { order: 'asc' }
        },
        instructions: {
          orderBy: { order: 'asc' }
        }
      }
    })
    
    return c.json(recipe, 201)
  } catch (error) {
    console.error('Error creating recipe:', error)
    return c.json({ error: 'Failed to create recipe' }, 500)
  }
})

// Update recipe
app.put('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()
    const { name, description, prepTime, cookTime, totalTime, servings, imageUrl, ingredients, instructions } = body
    
    // Delete existing ingredients and instructions
    await prisma.ingredient.deleteMany({ where: { recipeId: id } })
    await prisma.instruction.deleteMany({ where: { recipeId: id } })
    
    const recipe = await prisma.recipe.update({
      where: { id },
      data: {
        name,
        description,
        prepTime,
        cookTime,
        totalTime,
        servings,
        imageUrl,
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
          orderBy: { order: 'asc' }
        },
        instructions: {
          orderBy: { order: 'asc' }
        }
      }
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

export default app