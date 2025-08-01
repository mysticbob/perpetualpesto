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
          let imageUrl = undefined
          
          // Handle various image formats in JSON-LD
          if (item.image) {
            if (typeof item.image === 'string') {
              imageUrl = item.image
            } else if (Array.isArray(item.image)) {
              imageUrl = item.image[0]?.url || item.image[0]
            } else if (item.image.url) {
              imageUrl = item.image.url
            }
          }
          
          // Fallback to comprehensive image extraction if no JSON-LD image found
          if (!imageUrl) {
            imageUrl = extractRecipeImage($, item.name || '')
          }
          
          return {
            name: item.name || '',
            description: item.description || '',
            prepTime: parseTime(item.prepTime),
            cookTime: parseTime(item.cookTime),
            totalTime: parseTime(item.totalTime),
            servings: parseInt(item.recipeYield) || undefined,
            imageUrl,
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
  
  // Enhanced image extraction for microdata
  let imageUrl = recipeEl.find('[itemprop="image"]').attr('src') || 
                 recipeEl.find('[itemprop="image"]').attr('data-src') ||
                 recipeEl.find('[itemprop="image"]').attr('content')
  
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

  // Fallback to comprehensive image extraction if no microdata image found
  if (!imageUrl) {
    imageUrl = extractRecipeImage($, name)
  }

  return {
    name,
    description: description || undefined,
    imageUrl,
    ingredients,
    instructions
  }
}

function extractHeuristically($: cheerio.CheerioAPI): ExtractedRecipe | null {
  // Try common selectors for recipe sites
  const name = $('h1').first().text().trim() || 
               $('.recipe-title, .entry-title, .post-title').first().text().trim()
  
  if (!name) return null

  // Enhanced image extraction using multiple strategies
  let imageUrl = extractRecipeImage($, name)

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
    imageUrl,
    ingredients,
    instructions
  }
}

function extractRecipeImage($: cheerio.CheerioAPI, recipeName: string): string | undefined {
  // Strategy 1: Look for Open Graph image
  let imageUrl = $('meta[property="og:image"]').attr('content')
  if (imageUrl && isValidImageUrl(imageUrl)) return imageUrl
  
  // Strategy 2: Look for Twitter Card image
  imageUrl = $('meta[name="twitter:image"]').attr('content')
  if (imageUrl && isValidImageUrl(imageUrl)) return imageUrl
  
  // Strategy 3: Look for recipe-specific image containers (enhanced for modern sites)
  const recipeImageSelectors = [
    // NY Times specific selectors
    '.recipe-photo img',
    '.recipe-image img', 
    '.nyt-recipe-image img',
    'article img:first-child',
    '.recipe-header img',
    '.recipe-top-image img',
    
    // General recipe site selectors
    '.featured-image img',
    '.recipe-card img',
    '.entry-content img:first-child',
    '.post-content img:first-child',
    '.wp-post-image',
    '[class*="recipe"] img:first-child',
    '[class*="hero"] img',
    '[class*="banner"] img',
    '.content img:first-child',
    
    // Modern lazy-loading and responsive images
    'picture img',
    'figure img',
    '.img-responsive',
    '[role="img"]'
  ]
  
  for (const selector of recipeImageSelectors) {
    const img = $(selector).first()
    if (img.length) {
      imageUrl = img.attr('src') || 
                  img.attr('data-src') || 
                  img.attr('data-lazy-src') ||
                  img.attr('data-original') ||
                  img.attr('srcset')?.split(',')[0]?.trim()?.split(' ')[0]
      if (imageUrl && isValidImageUrl(imageUrl)) return imageUrl
    }
  }
  
  // Strategy 4: Look for images with alt text containing recipe name or food keywords
  const foodKeywords = ['recipe', 'food', 'dish', 'cooking', 'meal', 'kitchen']
  const nameWords = recipeName.toLowerCase().split(' ')
  
  $('img').each((_, img) => {
    const $img = $(img)
    const alt = ($img.attr('alt') || '').toLowerCase()
    const src = $img.attr('src') || 
                $img.attr('data-src') || 
                $img.attr('data-lazy-src') ||
                $img.attr('data-original') ||
                $img.attr('srcset')?.split(',')[0]?.trim()?.split(' ')[0]
    
    if (src && isValidImageUrl(src)) {
      // Check if alt text contains recipe name words
      if (nameWords.some(word => word.length > 3 && alt.includes(word))) {
        imageUrl = src
        return false // Break out of each loop
      }
      
      // Check if alt text contains food keywords
      if (foodKeywords.some(keyword => alt.includes(keyword))) {
        imageUrl = src
        return false
      }
    }
  })
  
  if (imageUrl && isValidImageUrl(imageUrl)) return imageUrl
  
  // Strategy 5: Fall back to first reasonable-sized image
  const firstImg = $('img').filter((_, img) => {
    const $img = $(img)
    const src = $img.attr('src') || 
                $img.attr('data-src') ||
                $img.attr('srcset')?.split(',')[0]?.trim()?.split(' ')[0]
    const width = parseInt($img.attr('width') || '0')
    const height = parseInt($img.attr('height') || '0')
    
    if (!src || !isValidImageUrl(src)) return false
    
    // Skip small images (likely icons, logos, etc.)
    if ((width > 0 && width < 200) || (height > 0 && height < 150)) {
      return false
    }
    
    // Skip images with certain patterns in src that are likely not recipe images
    if (src.includes('logo') || src.includes('icon') || src.includes('avatar') || src.includes('button') || src.includes('social')) {
      return false
    }
    
    return true
  }).first()
  
  if (firstImg.length) {
    const finalUrl = firstImg.attr('src') || 
                     firstImg.attr('data-src') || 
                     firstImg.attr('data-lazy-src') ||
                     firstImg.attr('srcset')?.split(',')[0]?.trim()?.split(' ')[0]
    if (finalUrl && isValidImageUrl(finalUrl)) return finalUrl
  }
  
  return undefined
}

function isValidImageUrl(url: string): boolean {
  if (!url) return false
  
  // Remove any query parameters and fragments for extension check
  const urlWithoutParams = url.split('?')[0].split('#')[0]
  
  // Check for valid image extensions
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg']
  const hasImageExtension = imageExtensions.some(ext => urlWithoutParams.toLowerCase().endsWith(ext))
  
  // Also accept URLs that don't have extensions but are from image domains or contain image-like paths
  const isImagePath = url.includes('/images/') || 
                      url.includes('/photos/') || 
                      url.includes('/recipe') ||
                      url.includes('nyt.com') ||
                      url.includes('cloudinary') ||
                      url.includes('amazonaws.com')
  
  return hasImageExtension || isImagePath
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