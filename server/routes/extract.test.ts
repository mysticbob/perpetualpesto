import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import axios from 'axios'
import extractApp from './extract'

// Mock axios
vi.mock('axios')
const mockedAxios = vi.mocked(axios)

// Mock cheerio data
const createMockHtml = (options: {
  jsonLd?: any
  microdata?: boolean
  hasIngredients?: boolean
  hasInstructions?: boolean
  title?: string
  ogImage?: string
}) => {
  let html = '<html><head>'
  
  if (options.ogImage) {
    html += `<meta property="og:image" content="${options.ogImage}">`
  }
  
  if (options.jsonLd) {
    html += `<script type="application/ld+json">${JSON.stringify(options.jsonLd)}</script>`
  }
  
  html += '</head><body>'
  
  if (options.title) {
    html += `<h1>${options.title}</h1>`
  }
  
  if (options.microdata) {
    html += '<div itemtype="http://schema.org/Recipe">'
    html += '<h2 itemprop="name">Microdata Recipe</h2>'
    html += '<p itemprop="description">Test description</p>'
    html += '<img itemprop="image" src="http://example.com/micro-image.jpg">'
    
    if (options.hasIngredients) {
      html += '<ul>'
      html += '<li itemprop="recipeIngredient">2 cups flour</li>'
      html += '<li itemprop="recipeIngredient">1 tsp salt</li>'
      html += '</ul>'
    }
    
    if (options.hasInstructions) {
      html += '<ol>'
      html += '<li itemprop="recipeInstructions">Mix ingredients</li>'
      html += '<li itemprop="recipeInstructions">Bake for 30 minutes</li>'
      html += '</ol>'
    }
    
    html += '</div>'
  } else if (options.hasIngredients || options.hasInstructions) {
    // Heuristic-based content
    if (options.hasIngredients) {
      html += '<ul class="recipe-ingredients">'
      html += '<li>2 cups all-purpose flour</li>'
      html += '<li>1/2 tsp salt</li>'
      html += '<li>1 tbsp olive oil</li>'
      html += '</ul>'
    }
    
    if (options.hasInstructions) {
      html += '<ol class="recipe-instructions">'
      html += '<li>Combine dry ingredients</li>'
      html += '<li>Add wet ingredients and mix</li>'
      html += '<li>Bake at 350°F for 25 minutes</li>'
      html += '</ol>'
    }
  }
  
  html += '</body></html>'
  return html
}

// Test data
const sampleJsonLdRecipe = {
  '@type': 'Recipe',
  name: 'Test Recipe',
  description: 'A test recipe for unit testing',
  prepTime: 'PT15M',
  cookTime: 'PT30M',
  totalTime: 'PT45M',
  recipeYield: '4',
  image: {
    url: 'http://example.com/recipe.jpg'
  },
  recipeIngredient: [
    '2 cups all-purpose flour',
    '1 teaspoon salt',
    '1/4 cup olive oil'
  ],
  recipeInstructions: [
    { text: 'Mix dry ingredients in a bowl' },
    { text: 'Add olive oil and mix until combined' },
    'Knead dough for 5 minutes'
  ]
}

describe('Recipe Extraction API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('POST / - Recipe extraction endpoint', () => {
    it('should return error when URL is missing', async () => {
      const mockContext = {
        req: {
          json: vi.fn().mockResolvedValue({})
        },
        json: vi.fn().mockReturnValue({ error: 'URL is required' })
      }

      const response = await extractApp.request(
        new Request('http://localhost/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        })
      )

      expect(response.status).toBe(400)
      const result = await response.json()
      expect(result.error).toBe('URL is required')
    })

    it('should successfully extract recipe from JSON-LD', async () => {
      const mockHtml = createMockHtml({ 
        jsonLd: sampleJsonLdRecipe,
        ogImage: 'http://example.com/og-image.jpg'
      })
      
      mockedAxios.get.mockResolvedValue({ data: mockHtml })

      const response = await extractApp.request(
        new Request('http://localhost/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: 'http://example.com/recipe' })
        })
      )

      expect(response.status).toBe(200)
      const result = await response.json()
      
      expect(result.name).toBe('Test Recipe')
      expect(result.description).toBe('A test recipe for unit testing')
      expect(result.prepTime).toBe(15)
      expect(result.cookTime).toBe(30)
      expect(result.totalTime).toBe(45)
      expect(result.servings).toBe(4)
      expect(result.ingredients).toHaveLength(3)
      expect(result.instructions).toHaveLength(3)
      expect(result.imageUrl).toBe('http://example.com/recipe.jpg')
    })

    it('should handle JSON-LD with array format', async () => {
      const mockHtml = createMockHtml({ 
        jsonLd: [
          { '@type': 'WebPage' },
          sampleJsonLdRecipe,
          { '@type': 'Organization' }
        ]
      })
      
      mockedAxios.get.mockResolvedValue({ data: mockHtml })

      const response = await extractApp.request(
        new Request('http://localhost/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: 'http://example.com/recipe' })
        })
      )

      expect(response.status).toBe(200)
      const result = await response.json()
      expect(result.name).toBe('Test Recipe')
    })

    it('should fall back to microdata when JSON-LD is not available', async () => {
      const mockHtml = createMockHtml({ 
        microdata: true,
        hasIngredients: true,
        hasInstructions: true
      })
      
      mockedAxios.get.mockResolvedValue({ data: mockHtml })

      const response = await extractApp.request(
        new Request('http://localhost/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: 'http://example.com/recipe' })
        })
      )

      expect(response.status).toBe(200)
      const result = await response.json()
      
      expect(result.name).toBe('Microdata Recipe')
      expect(result.description).toBe('Test description')
      expect(result.ingredients).toHaveLength(2)
      expect(result.instructions).toHaveLength(2)
      expect(result.imageUrl).toBe('http://example.com/micro-image.jpg')
    })

    it('should fall back to heuristic extraction when structured data is not available', async () => {
      const mockHtml = createMockHtml({ 
        title: 'Heuristic Recipe Title',
        hasIngredients: true,
        hasInstructions: true,
        ogImage: 'http://example.com/og-image.jpg'
      })
      
      mockedAxios.get.mockResolvedValue({ data: mockHtml })

      const response = await extractApp.request(
        new Request('http://localhost/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: 'http://example.com/recipe' })
        })
      )

      expect(response.status).toBe(200)
      const result = await response.json()
      
      expect(result.name).toBe('Heuristic Recipe Title')
      expect(result.ingredients).toHaveLength(3)
      expect(result.instructions).toHaveLength(3)
      expect(result.imageUrl).toBe('http://example.com/og-image.jpg')
    })

    it('should return error when no recipe can be extracted', async () => {
      const mockHtml = createMockHtml({ title: undefined })
      
      mockedAxios.get.mockResolvedValue({ data: mockHtml })

      const response = await extractApp.request(
        new Request('http://localhost/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: 'http://example.com/no-recipe' })
        })
      )

      expect(response.status).toBe(400)
      const result = await response.json()
      expect(result.error).toBe('Could not extract recipe from URL')
    })

    it('should handle network errors gracefully', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'))

      const response = await extractApp.request(
        new Request('http://localhost/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: 'http://example.com/recipe' })
        })
      )

      expect(response.status).toBe(500)
      const result = await response.json()
      expect(result.error).toBe('Failed to extract recipe')
    })

    it('should set proper user agent header', async () => {
      const mockHtml = createMockHtml({ jsonLd: sampleJsonLdRecipe })
      mockedAxios.get.mockResolvedValue({ data: mockHtml })

      await extractApp.request(
        new Request('http://localhost/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: 'http://example.com/recipe' })
        })
      )

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://example.com/recipe',
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          }
        }
      )
    })
  })

  describe('JSON-LD parsing', () => {
    it('should handle various JSON-LD image formats', async () => {
      const testCases = [
        // String image URL
        { 
          image: 'http://example.com/image1.jpg',
          expected: 'http://example.com/image1.jpg'
        },
        // Array of URLs
        {
          image: ['http://example.com/image2.jpg', 'http://example.com/image3.jpg'],
          expected: 'http://example.com/image2.jpg'
        },
        // Array of objects
        {
          image: [{ url: 'http://example.com/image4.jpg' }, { url: 'http://example.com/image5.jpg' }],
          expected: 'http://example.com/image4.jpg'
        },
        // Object with url property
        {
          image: { url: 'http://example.com/image6.jpg' },
          expected: 'http://example.com/image6.jpg'
        }
      ]

      for (const testCase of testCases) {
        const recipe = { ...sampleJsonLdRecipe, image: testCase.image }
        const mockHtml = createMockHtml({ jsonLd: recipe })
        mockedAxios.get.mockResolvedValue({ data: mockHtml })

        const response = await extractApp.request(
          new Request('http://localhost/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: 'http://example.com/recipe' })
          })
        )

        const result = await response.json()
        expect(result.imageUrl).toBe(testCase.expected)
      }
    })

    it('should handle Recipe with @type array', async () => {
      const recipe = {
        ...sampleJsonLdRecipe,
        '@type': ['Recipe', 'Food']
      }
      const mockHtml = createMockHtml({ jsonLd: recipe })
      mockedAxios.get.mockResolvedValue({ data: mockHtml })

      const response = await extractApp.request(
        new Request('http://localhost/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: 'http://example.com/recipe' })
        })
      )

      expect(response.status).toBe(200)
      const result = await response.json()
      expect(result.name).toBe('Test Recipe')
    })

    it('should handle malformed JSON-LD gracefully', async () => {
      const mockHtml = '<html><head><script type="application/ld+json">{ malformed json }</script></head></html>'
      mockedAxios.get.mockResolvedValue({ data: mockHtml })

      const response = await extractApp.request(
        new Request('http://localhost/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: 'http://example.com/recipe' })
        })
      )

      expect(response.status).toBe(400)
      const result = await response.json()
      expect(result.error).toBe('Could not extract recipe from URL')
    })
  })

  describe('Time parsing', () => {
    it('should parse ISO 8601 duration formats', async () => {
      const recipe = {
        ...sampleJsonLdRecipe,
        prepTime: 'PT15M',      // 15 minutes
        cookTime: 'PT1H30M',    // 1 hour 30 minutes
        totalTime: 'PT2H'       // 2 hours
      }
      const mockHtml = createMockHtml({ jsonLd: recipe })
      mockedAxios.get.mockResolvedValue({ data: mockHtml })

      const response = await extractApp.request(
        new Request('http://localhost/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: 'http://example.com/recipe' })
        })
      )

      const result = await response.json()
      expect(result.prepTime).toBe(15)
      expect(result.cookTime).toBe(90)  // 1 hour 30 minutes = 90 minutes
      expect(result.totalTime).toBe(120) // 2 hours = 120 minutes
    })

    it('should parse simple time formats', async () => {
      const recipe = {
        ...sampleJsonLdRecipe,
        prepTime: '15 minutes',
        cookTime: '1 hour',
        totalTime: '2 hr'
      }
      const mockHtml = createMockHtml({ jsonLd: recipe })
      mockedAxios.get.mockResolvedValue({ data: mockHtml })

      const response = await extractApp.request(
        new Request('http://localhost/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: 'http://example.com/recipe' })
        })
      )

      const result = await response.json()
      expect(result.prepTime).toBe(15)
      expect(result.cookTime).toBe(60)
      expect(result.totalTime).toBe(120)
    })

    it('should handle invalid time formats', async () => {
      const recipe = {
        ...sampleJsonLdRecipe,
        prepTime: 'invalid time',
        cookTime: '',
        totalTime: null
      }
      const mockHtml = createMockHtml({ jsonLd: recipe })
      mockedAxios.get.mockResolvedValue({ data: mockHtml })

      const response = await extractApp.request(
        new Request('http://localhost/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: 'http://example.com/recipe' })
        })
      )

      const result = await response.json()
      expect(result.prepTime).toBeUndefined()
      expect(result.cookTime).toBeUndefined()
      expect(result.totalTime).toBeUndefined()
    })
  })

  describe('Image extraction', () => {
    it('should prioritize JSON-LD image over other sources', async () => {
      const mockHtml = `
        <html>
          <head>
            <meta property="og:image" content="http://example.com/og-image.jpg">
            <script type="application/ld+json">
              ${JSON.stringify({ ...sampleJsonLdRecipe, image: 'http://example.com/json-ld-image.jpg' })}
            </script>
          </head>
        </html>
      `
      mockedAxios.get.mockResolvedValue({ data: mockHtml })

      const response = await extractApp.request(
        new Request('http://localhost/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: 'http://example.com/recipe' })
        })
      )

      const result = await response.json()
      expect(result.imageUrl).toBe('http://example.com/json-ld-image.jpg')
    })

    it('should fall back to Open Graph image', async () => {
      const mockHtml = `
        <html>
          <head>
            <meta property="og:image" content="http://example.com/og-image.jpg">
            <script type="application/ld+json">
              ${JSON.stringify({ ...sampleJsonLdRecipe, image: undefined })}
            </script>
          </head>
        </html>
      `
      mockedAxios.get.mockResolvedValue({ data: mockHtml })

      const response = await extractApp.request(
        new Request('http://localhost/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: 'http://example.com/recipe' })
        })
      )

      const result = await response.json()
      expect(result.imageUrl).toBe('http://example.com/og-image.jpg')
    })

    it('should validate image URLs', async () => {
      const testCases = [
        { url: 'http://example.com/image.jpg', valid: true },
        { url: 'http://example.com/image.png', valid: true },
        { url: 'http://example.com/image.webp', valid: true },
        { url: 'http://example.com/images/photo.jpg', valid: true },
        { url: 'http://amazonaws.com/bucket/image', valid: true },
        { url: 'http://example.com/script.js', valid: false },
        { url: '', valid: false },
        { url: null, valid: false }
      ]

      for (const testCase of testCases) {
        const mockHtml = `<html><head><meta property="og:image" content="${testCase.url}"></head></html>`
        mockedAxios.get.mockResolvedValue({ data: mockHtml })

        const response = await extractApp.request(
          new Request('http://localhost/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: 'http://example.com/recipe' })
          })
        )

        const result = await response.json()
        if (testCase.valid) {
          expect(result.imageUrl).toBe(testCase.url)
        } else {
          expect(result.imageUrl).toBeUndefined()
        }
      }
    })
  })

  describe('Ingredient parsing integration', () => {
    it('should properly parse and structure ingredients', async () => {
      const recipe = {
        ...sampleJsonLdRecipe,
        recipeIngredient: [
          '2 cups all-purpose flour',
          '1/2 teaspoon salt',
          '1 large egg',
          '2-3 cloves garlic, minced'
        ]
      }
      const mockHtml = createMockHtml({ jsonLd: recipe })
      mockedAxios.get.mockResolvedValue({ data: mockHtml })

      const response = await extractApp.request(
        new Request('http://localhost/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: 'http://example.com/recipe' })
        })
      )

      const result = await response.json()
      
      expect(result.ingredients).toHaveLength(4)
      expect(result.ingredients[0]).toEqual({
        name: 'all-purpose flour',
        amount: '2',
        unit: 'cups'
      })
      expect(result.ingredients[1]).toEqual({
        name: 'salt',
        amount: '1/2',
        unit: 'teaspoon'
      })
    })
  })

  describe('Heuristic extraction edge cases', () => {
    it('should try multiple selectors for ingredients and instructions', async () => {
      const mockHtml = `
        <html>
          <body>
            <h1>Test Recipe</h1>
            <div class="ingredients">
              <li>2 cups flour</li>
              <li>1 tsp salt</li>
            </div>
            <div class="method">
              <li>Mix ingredients</li>
              <li>Bake for 30 minutes</li>
            </div>
          </body>
        </html>
      `
      mockedAxios.get.mockResolvedValue({ data: mockHtml })

      const response = await extractApp.request(
        new Request('http://localhost/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: 'http://example.com/recipe' })
        })
      )

      const result = await response.json()
      expect(result.ingredients).toHaveLength(2)
      expect(result.instructions).toHaveLength(2)
    })

    it('should handle empty ingredient and instruction lists', async () => {
      const mockHtml = createMockHtml({ 
        title: 'Test Recipe',
        hasIngredients: false,
        hasInstructions: false
      })
      mockedAxios.get.mockResolvedValue({ data: mockHtml })

      const response = await extractApp.request(
        new Request('http://localhost/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: 'http://example.com/recipe' })
        })
      )

      const result = await response.json()
      expect(result.ingredients).toEqual([])
      expect(result.instructions).toEqual([])
    })
  })
})

// Helper functions for testing specific extraction functions
// Note: These would normally be exported from the main file for testing
describe('Extraction utility functions', () => {
  describe('parseTime function', () => {
    // Testing the parseTime function indirectly through the API
    // In a real scenario, you'd extract this to a separate utility module
    const testTimeFormats = [
      { input: 'PT15M', expected: 15 },
      { input: 'PT1H', expected: 60 },
      { input: 'PT1H30M', expected: 90 },
      { input: '15 minutes', expected: 15 },
      { input: '1 hour', expected: 60 },
      { input: '2 hr', expected: 120 },
      { input: 'invalid', expected: undefined },
      { input: '', expected: undefined },
      { input: null, expected: undefined }
    ]

    testTimeFormats.forEach(({ input, expected }) => {
      it(`should parse "${input}" as ${expected}`, async () => {
        const recipe = { ...sampleJsonLdRecipe, prepTime: input }
        const mockHtml = createMockHtml({ jsonLd: recipe })
        mockedAxios.get.mockResolvedValue({ data: mockHtml })

        const response = await extractApp.request(
          new Request('http://localhost/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: 'http://example.com/recipe' })
          })
        )

        const result = await response.json()
        expect(result.prepTime).toBe(expected)
      })
    })
  })

  describe('isValidImageUrl function', () => {
    const imageUrlTests = [
      { url: 'http://example.com/image.jpg', valid: true },
      { url: 'https://example.com/photo.jpeg', valid: true },
      { url: 'http://example.com/pic.png', valid: true },
      { url: 'http://example.com/image.gif', valid: true },
      { url: 'http://example.com/modern.webp', valid: true },
      { url: 'http://example.com/vector.svg', valid: true },
      { url: 'http://example.com/images/photo.jpg', valid: true },
      { url: 'http://cloudinary.com/transform/image', valid: true },
      { url: 'http://amazonaws.com/bucket/image?w=200', valid: true },
      { url: 'http://example.com/script.js', valid: false },
      { url: 'http://example.com/page.html', valid: false },
      { url: '', valid: false },
    ]

    imageUrlTests.forEach(({ url, valid }) => {
      it(`should ${valid ? 'accept' : 'reject'} URL: ${url}`, async () => {
        const mockHtml = `<html><head><meta property="og:image" content="${url}"></head></html>`
        mockedAxios.get.mockResolvedValue({ data: mockHtml })

        const response = await extractApp.request(
          new Request('http://localhost/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: 'http://example.com/recipe' })
          })
        )

        const result = await response.json()
        if (valid && url) {
          expect(result.imageUrl).toBe(url)
        } else {
          expect(result.imageUrl).toBeUndefined()
        }
      })
    })
  })
})