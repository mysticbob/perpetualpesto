import { Hono } from 'hono'
import {
  getUSDAClient,
  getIngredientMatcher,
  getNutritionDb,
  getRecipeNutritionService,
} from '../src/server/services/nutrition/index.js'

const app = new Hono()

// ============================================================================
// USDA Food Search & Details
// ============================================================================

/**
 * GET /api/nutrition/search
 * Search for foods in USDA database
 */
app.get('/search', async (c) => {
  try {
    const query = c.req.query('q') || c.req.query('query')
    const limit = parseInt(c.req.query('limit') || '25')
    const dataType = c.req.query('dataType') // Optional: "Foundation", "SR Legacy", "Branded"

    if (!query) {
      return c.json({ error: 'Search query is required' }, 400)
    }

    const usdaClient = getUSDAClient()

    const result = await usdaClient.searchFoods({
      query,
      pageSize: limit,
      dataType: dataType ? [dataType as any] : undefined,
    })

    return c.json({
      foods: result.foods,
      totalHits: result.totalHits,
      currentPage: result.currentPage,
    })
  } catch (error: any) {
    console.error('[Nutrition API] Search error:', error)
    return c.json({ error: error.message || 'Failed to search foods' }, 500)
  }
})

/**
 * GET /api/nutrition/foods/:fdcId
 * Get detailed food information by FDC ID
 */
app.get('/foods/:fdcId', async (c) => {
  try {
    const fdcId = parseInt(c.params.fdcId)

    if (isNaN(fdcId)) {
      return c.json({ error: 'Invalid FDC ID' }, 400)
    }

    const nutritionDb = getNutritionDb()

    // Try local database first
    let food = await nutritionDb.getUSDAFoodByFdcId(fdcId)

    if (!food) {
      // Import from USDA if not in local database
      const foodId = await nutritionDb.importUSDAFood(fdcId)
      food = await nutritionDb.getUSDAFoodById(foodId)
    }

    return c.json({ food })
  } catch (error: any) {
    console.error('[Nutrition API] Get food error:', error)
    return c.json({ error: error.message || 'Failed to get food details' }, 500)
  }
})

/**
 * POST /api/nutrition/foods/import
 * Import a USDA food into local database
 */
app.post('/foods/import', async (c) => {
  try {
    const body = await c.req.json()
    const { fdcId } = body

    if (!fdcId) {
      return c.json({ error: 'FDC ID is required' }, 400)
    }

    const nutritionDb = getNutritionDb()
    const foodId = await nutritionDb.importUSDAFood(fdcId)

    return c.json({ foodId, message: 'Food imported successfully' })
  } catch (error: any) {
    console.error('[Nutrition API] Import food error:', error)
    return c.json({ error: error.message || 'Failed to import food' }, 500)
  }
})

// ============================================================================
// Ingredient Mapping
// ============================================================================

/**
 * GET /api/nutrition/ingredients/:ingredientId/suggestions
 * Get food suggestions for an ingredient
 */
app.get('/ingredients/:ingredientId/suggestions', async (c) => {
  try {
    const ingredientId = c.params.ingredientId
    const limit = parseInt(c.req.query('limit') || '10')

    // Get ingredient from database
    const { prisma } = await import('../lib/db.js')
    const ingredient = await prisma.ingredient.findUnique({
      where: { id: ingredientId },
    })

    if (!ingredient) {
      return c.json({ error: 'Ingredient not found' }, 404)
    }

    // Parse and find matches
    const { getIngredientParser } = await import('../src/server/services/nutrition/index.js')
    const parser = getIngredientParser()
    const parsed = parser.parse(ingredient.name)

    const matcher = getIngredientMatcher()
    const matches = await matcher.findMatches(parsed, limit)

    return c.json({ matches, parsed })
  } catch (error: any) {
    console.error('[Nutrition API] Get suggestions error:', error)
    return c.json({ error: error.message || 'Failed to get suggestions' }, 500)
  }
})

/**
 * POST /api/nutrition/ingredients/:ingredientId/map
 * Map an ingredient to a USDA food
 */
app.post('/ingredients/:ingredientId/map', async (c) => {
  try {
    const ingredientId = c.params.ingredientId
    const body = await c.req.json()
    const { fdcId, isManual = false, userId } = body

    if (!fdcId) {
      return c.json({ error: 'FDC ID is required' }, 400)
    }

    const nutritionDb = getNutritionDb()

    // Import food if not already in database
    const foodId = await nutritionDb.importUSDAFood(fdcId)

    // Create mapping
    const mapping = await nutritionDb.mapIngredientToFood(
      ingredientId,
      foodId,
      isManual ? 1.0 : 0.9,
      isManual,
      userId
    )

    return c.json({ mapping, message: 'Ingredient mapped successfully' })
  } catch (error: any) {
    console.error('[Nutrition API] Map ingredient error:', error)
    return c.json({ error: error.message || 'Failed to map ingredient' }, 500)
  }
})

/**
 * DELETE /api/nutrition/ingredients/:ingredientId/map
 * Remove ingredient mapping
 */
app.delete('/ingredients/:ingredientId/map', async (c) => {
  try {
    const ingredientId = c.params.ingredientId

    const nutritionDb = getNutritionDb()
    await nutritionDb.removeIngredientMapping(ingredientId)

    return c.json({ message: 'Mapping removed successfully' })
  } catch (error: any) {
    console.error('[Nutrition API] Remove mapping error:', error)
    return c.json({ error: error.message || 'Failed to remove mapping' }, 500)
  }
})

// ============================================================================
// Recipe Nutrition
// ============================================================================

/**
 * GET /api/nutrition/recipes/:recipeId
 * Get nutrition for a recipe
 */
app.get('/recipes/:recipeId', async (c) => {
  try {
    const recipeId = c.params.recipeId
    const servings = c.req.query('servings')
      ? parseInt(c.req.query('servings')!)
      : undefined
    const portions = c.req.query('portions')
      ? parseFloat(c.req.query('portions')!)
      : undefined

    const recipeService = getRecipeNutritionService()

    let nutrition
    if (servings) {
      nutrition = await recipeService.getRecipeNutritionForServings(
        recipeId,
        servings
      )
    } else if (portions) {
      nutrition = await recipeService.getRecipeNutritionForPortion(
        recipeId,
        portions
      )
    } else {
      const result = await recipeService.getRecipeNutrition(recipeId)
      nutrition = result.nutrition
    }

    return c.json({ nutrition })
  } catch (error: any) {
    console.error('[Nutrition API] Get recipe nutrition error:', error)
    return c.json({ error: error.message || 'Failed to get recipe nutrition' }, 500)
  }
})

/**
 * POST /api/nutrition/recipes/:recipeId/calculate
 * Force recalculation of recipe nutrition
 */
app.post('/recipes/:recipeId/calculate', async (c) => {
  try {
    const recipeId = c.params.recipeId

    const recipeService = getRecipeNutritionService()
    const result = await recipeService.calculateRecipeNutrition(recipeId, true)

    return c.json(result)
  } catch (error: any) {
    console.error('[Nutrition API] Calculate nutrition error:', error)
    return c.json({ error: error.message || 'Failed to calculate nutrition' }, 500)
  }
})

/**
 * POST /api/nutrition/recipes/:recipeId/auto-map
 * Auto-map all unmapped ingredients in a recipe
 */
app.post('/recipes/:recipeId/auto-map', async (c) => {
  try {
    const recipeId = c.params.recipeId

    const recipeService = getRecipeNutritionService()
    const mappedCount = await recipeService.autoMapRecipeIngredients(recipeId)

    return c.json({
      mappedCount,
      message: `Auto-mapped ${mappedCount} ingredients`,
    })
  } catch (error: any) {
    console.error('[Nutrition API] Auto-map error:', error)
    return c.json({ error: error.message || 'Failed to auto-map ingredients' }, 500)
  }
})

/**
 * GET /api/nutrition/recipes/:recipeId/unmapped
 * Get list of unmapped ingredients for a recipe
 */
app.get('/recipes/:recipeId/unmapped', async (c) => {
  try {
    const recipeId = c.params.recipeId

    const nutritionDb = getNutritionDb()
    const unmapped = await nutritionDb.getUnmappedIngredients(recipeId)

    return c.json({ unmapped })
  } catch (error: any) {
    console.error('[Nutrition API] Get unmapped error:', error)
    return c.json({ error: error.message || 'Failed to get unmapped ingredients' }, 500)
  }
})

/**
 * GET /api/nutrition/recipes/:recipeId/stats
 * Get mapping statistics for a recipe
 */
app.get('/recipes/:recipeId/stats', async (c) => {
  try {
    const recipeId = c.params.recipeId

    const nutritionDb = getNutritionDb()
    const stats = await nutritionDb.getRecipeMappingStats(recipeId)

    return c.json({ stats })
  } catch (error: any) {
    console.error('[Nutrition API] Get stats error:', error)
    return c.json({ error: error.message || 'Failed to get recipe stats' }, 500)
  }
})

// ============================================================================
// Custom Foods
// ============================================================================

/**
 * GET /api/nutrition/custom-foods
 * Get user's custom foods
 */
app.get('/custom-foods', async (c) => {
  try {
    const userId = c.req.query('userId')

    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400)
    }

    const nutritionDb = getNutritionDb()
    const customFoods = await nutritionDb.getUserCustomFoods(userId)

    return c.json({ customFoods })
  } catch (error: any) {
    console.error('[Nutrition API] Get custom foods error:', error)
    return c.json({ error: error.message || 'Failed to get custom foods' }, 500)
  }
})

/**
 * POST /api/nutrition/custom-foods
 * Create a custom food
 */
app.post('/custom-foods', async (c) => {
  try {
    const body = await c.req.json()
    const { userId, ...foodData } = body

    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400)
    }

    const nutritionDb = getNutritionDb()
    const customFood = await nutritionDb.createCustomFood(userId, foodData)

    return c.json({ customFood, message: 'Custom food created successfully' })
  } catch (error: any) {
    console.error('[Nutrition API] Create custom food error:', error)
    return c.json({ error: error.message || 'Failed to create custom food' }, 500)
  }
})

// ============================================================================
// Statistics
// ============================================================================

/**
 * GET /api/nutrition/stats
 * Get database statistics
 */
app.get('/stats', async (c) => {
  try {
    const nutritionDb = getNutritionDb()
    const stats = await nutritionDb.getStats()

    return c.json({ stats })
  } catch (error: any) {
    console.error('[Nutrition API] Get stats error:', error)
    return c.json({ error: error.message || 'Failed to get statistics' }, 500)
  }
})

export default app
