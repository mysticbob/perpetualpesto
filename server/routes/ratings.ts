import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { prisma as db } from '../lib/db'

const app = new Hono()

// Enable CORS
app.use('*', cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// Get user's rating for a specific recipe
app.get('/user/:userId/recipe/:recipeId', async (c) => {
  try {
    const userId = c.req.param('userId')
    const recipeId = c.req.param('recipeId')

    if (!userId || !recipeId) {
      return c.json({ error: 'Missing userId or recipeId' }, 400)
    }

    const rating = await db.recipeRating.findUnique({
      where: {
        userId_recipeId: {
          userId,
          recipeId
        }
      }
    })

    return c.json(rating)
  } catch (error) {
    console.error('Error fetching user rating:', error)
    return c.json({ error: 'Failed to fetch rating' }, 500)
  }
})

// Get recipe rating statistics (average rating, count)
app.get('/recipe/:recipeId/stats', async (c) => {
  try {
    const recipeId = c.req.param('recipeId')

    if (!recipeId) {
      return c.json({ error: 'Missing recipeId' }, 400)
    }

    const stats = await db.recipeRating.aggregate({
      where: { recipeId },
      _avg: { rating: true },
      _count: { rating: true }
    })

    const ratingDistribution = await db.recipeRating.groupBy({
      by: ['rating'],
      where: { recipeId },
      _count: { rating: true },
      orderBy: { rating: 'asc' }
    })

    return c.json({
      averageRating: stats._avg.rating || 0,
      totalRatings: stats._count.rating || 0,
      distribution: ratingDistribution.reduce((acc, item) => {
        acc[item.rating] = item._count.rating
        return acc
      }, {} as Record<number, number>)
    })
  } catch (error) {
    console.error('Error fetching recipe rating stats:', error)
    return c.json({ error: 'Failed to fetch rating statistics' }, 500)
  }
})

// Get all ratings for a recipe (with user info if needed)
app.get('/recipe/:recipeId', async (c) => {
  try {
    const recipeId = c.req.param('recipeId')
    const includeReviews = c.req.query('includeReviews') === 'true'

    if (!recipeId) {
      return c.json({ error: 'Missing recipeId' }, 400)
    }

    const ratings = await db.recipeRating.findMany({
      where: { recipeId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      },
      orderBy: [
        { rating: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    // Filter out reviews if not requested
    const result = includeReviews 
      ? ratings 
      : ratings.map(({ review, ...rating }) => rating)

    return c.json(result)
  } catch (error) {
    console.error('Error fetching recipe ratings:', error)
    return c.json({ error: 'Failed to fetch ratings' }, 500)
  }
})

// Create or update a rating
app.post('/', async (c) => {
  try {
    const body = await c.req.json()
    const { userId, recipeId, rating, review } = body

    if (!userId || !recipeId || !rating) {
      return c.json({ error: 'Missing required fields: userId, recipeId, rating' }, 400)
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return c.json({ error: 'Rating must be an integer between 1 and 5' }, 400)
    }

    // Check if user exists
    const userExists = await db.user.findUnique({
      where: { id: userId }
    })
    if (!userExists) {
      return c.json({ error: 'User not found' }, 404)
    }

    // Check if recipe exists
    const recipeExists = await db.recipe.findUnique({
      where: { id: recipeId }
    })
    if (!recipeExists) {
      return c.json({ error: 'Recipe not found' }, 404)
    }

    // Upsert rating (create or update)
    const savedRating = await db.recipeRating.upsert({
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
        review: review || null
      },
      update: {
        rating,
        review: review || null,
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        recipe: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return c.json(savedRating, 201)
  } catch (error) {
    console.error('Error creating/updating rating:', error)
    return c.json({ error: 'Failed to save rating' }, 500)
  }
})

// Delete a rating
app.delete('/user/:userId/recipe/:recipeId', async (c) => {
  try {
    const userId = c.req.param('userId')
    const recipeId = c.req.param('recipeId')

    if (!userId || !recipeId) {
      return c.json({ error: 'Missing userId or recipeId' }, 400)
    }

    const rating = await db.recipeRating.findUnique({
      where: {
        userId_recipeId: {
          userId,
          recipeId
        }
      }
    })

    if (!rating) {
      return c.json({ error: 'Rating not found' }, 404)
    }

    await db.recipeRating.delete({
      where: {
        userId_recipeId: {
          userId,
          recipeId
        }
      }
    })

    return c.json({ message: 'Rating deleted successfully' })
  } catch (error) {
    console.error('Error deleting rating:', error)
    return c.json({ error: 'Failed to delete rating' }, 500)
  }
})

// Get user's top rated recipes
app.get('/user/:userId/top-rated', async (c) => {
  try {
    const userId = c.req.param('userId')
    const limit = parseInt(c.req.query('limit') || '10')

    if (!userId) {
      return c.json({ error: 'Missing userId' }, 400)
    }

    const topRated = await db.recipeRating.findMany({
      where: { userId },
      include: {
        recipe: {
          include: {
            ingredients: {
              select: { id: true, name: true, amount: true, unit: true }
            },
            instructions: {
              select: { id: true, step: true }
            }
          }
        }
      },
      orderBy: [
        { rating: 'desc' },
        { updatedAt: 'desc' }
      ],
      take: limit
    })

    return c.json(topRated)
  } catch (error) {
    console.error('Error fetching top rated recipes:', error)
    return c.json({ error: 'Failed to fetch top rated recipes' }, 500)
  }
})

export default app