import { Hono } from 'hono'
import axios from 'axios'
import * as cheerio from 'cheerio'

const app = new Hono()

interface ExtractedRecipe {
  name: string
  description?: string
  prepTime?: number
  cookTime?: number
  totalTime?: number
  servings?: number
  imageUrl?: string
  ingredients: Array<{
    name: string
    amount?: string
    unit?: string
  }>
  instructions: Array<{
    step: string
  }>
}

app.post('/', async (c) => {
  try {
    const { url } = await c.req.json()
    
    if (!url) {
      return c.json({ error: 'URL is required' }, 400)
    }

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    })

    const $ = cheerio.load(response.data)
    
    // Try to extract JSON-LD structured data first
    let recipe = extractFromJsonLd($)
    
    // If no JSON-LD, try microdata/schema.org
    if (!recipe) {
      recipe = extractFromMicrodata($)
    }
    
    // If still no recipe, try heuristic extraction
    if (!recipe) {
      recipe = extractHeuristically($)
    }

    if (!recipe) {
      return c.json({ error: 'Could not extract recipe from URL' }, 400)
    }

    return c.json(recipe)
  } catch (error) {
    console.error('Recipe extraction error:', error)
    return c.json({ error: 'Failed to extract recipe' }, 500)
  }
})

function extractFromJsonLd($: cheerio.CheerioAPI): ExtractedRecipe | null {
  const scripts = $('script[type="application/ld+json"]')
  
  for (let i = 0; i < scripts.length; i++) {
    try {
      const jsonData = JSON.parse($(scripts[i]).html() || '')
      const recipes = Array.isArray(jsonData) ? jsonData : [jsonData]
      
      for (const item of recipes) {
        if (item['@type'] === 'Recipe' || (Array.isArray(item['@type']) && item['@type'].includes('Recipe'))) {
          return {
            name: item.name || '',
            description: item.description || '',
            prepTime: parseTime(item.prepTime),
            cookTime: parseTime(item.cookTime),
            totalTime: parseTime(item.totalTime),
            servings: parseInt(item.recipeYield) || undefined,
            imageUrl: typeof item.image === 'string' ? item.image : item.image?.url,
            ingredients: (item.recipeIngredient || []).map((ing: string) => ({
              name: ing,
              amount: extractAmount(ing),
              unit: extractUnit(ing)
            })),
            instructions: (item.recipeInstructions || []).map((inst: any) => ({
              step: typeof inst === 'string' ? inst : inst.text || inst.name || ''
            }))
          }
        }
      }
    } catch (e) {
      continue
    }
  }
  
  return null
}

function extractFromMicrodata($: cheerio.CheerioAPI): ExtractedRecipe | null {
  const recipeEl = $('[itemtype*="Recipe"]').first()
  if (!recipeEl.length) return null

  const name = recipeEl.find('[itemprop="name"]').first().text().trim()
  const description = recipeEl.find('[itemprop="description"]').first().text().trim()
  
  const ingredients = recipeEl.find('[itemprop="recipeIngredient"]').map((_, el) => {
    const text = $(el).text().trim()
    return {
      name: text,
      amount: extractAmount(text),
      unit: extractUnit(text)
    }
  }).get()

  const instructions = recipeEl.find('[itemprop="recipeInstructions"]').map((_, el) => ({
    step: $(el).text().trim()
  })).get()

  return {
    name,
    description: description || undefined,
    imageUrl: recipeEl.find('[itemprop="image"]').attr('src'),
    ingredients,
    instructions
  }
}

function extractHeuristically($: cheerio.CheerioAPI): ExtractedRecipe | null {
  // Try common selectors for recipe sites
  const name = $('h1').first().text().trim() || 
               $('.recipe-title, .entry-title, .post-title').first().text().trim()
  
  if (!name) return null

  // Look for ingredients in common containers
  const ingredientSelectors = [
    '.recipe-ingredients li',
    '.ingredients li',
    '[class*="ingredient"] li',
    '.recipe-ingredient',
    '.ingredient'
  ]
  
  let ingredients: any[] = []
  for (const selector of ingredientSelectors) {
    const found = $(selector).map((_, el) => {
      const text = $(el).text().trim()
      return text ? {
        name: text,
        amount: extractAmount(text),
        unit: extractUnit(text)
      } : null
    }).get().filter(Boolean)
    
    if (found.length > 0) {
      ingredients = found
      break
    }
  }

  // Look for instructions
  const instructionSelectors = [
    '.recipe-instructions li',
    '.instructions li',
    '.recipe-instruction',
    '.instruction',
    '.directions li',
    '.method li'
  ]
  
  let instructions: any[] = []
  for (const selector of instructionSelectors) {
    const found = $(selector).map((_, el) => ({
      step: $(el).text().trim()
    })).get().filter(inst => inst.step)
    
    if (found.length > 0) {
      instructions = found
      break
    }
  }

  return {
    name,
    ingredients,
    instructions
  }
}

function parseTime(timeStr: string): number | undefined {
  if (!timeStr) return undefined
  
  // Parse ISO 8601 duration (PT15M = 15 minutes)
  const isoMatch = timeStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
  if (isoMatch) {
    const hours = parseInt(isoMatch[1] || '0')
    const minutes = parseInt(isoMatch[2] || '0')
    return hours * 60 + minutes
  }
  
  // Parse simple number + unit
  const simpleMatch = timeStr.match(/(\d+)\s*(min|minute|hour|hr)/i)
  if (simpleMatch) {
    const num = parseInt(simpleMatch[1])
    const unit = simpleMatch[2].toLowerCase()
    return unit.startsWith('h') ? num * 60 : num
  }
  
  return undefined
}

function extractAmount(text: string): string | undefined {
  const match = text.match(/^([\d\s\/\-\.]+)/)
  return match ? match[1].trim() : undefined
}

function extractUnit(text: string): string | undefined {
  const units = ['cup', 'cups', 'tbsp', 'tsp', 'oz', 'lb', 'g', 'kg', 'ml', 'l', 'clove', 'cloves']
  const match = text.match(new RegExp(`\\b(${units.join('|')})s?\\b`, 'i'))
  return match ? match[1] : undefined
}

export default app