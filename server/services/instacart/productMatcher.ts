import { GroceryItem } from '../../../src/contexts/GroceryContext'

export interface InstacartProduct {
  id: string
  name: string
  brand?: string
  size?: string
  price: number // in cents
  imageUrl?: string
  available: boolean
  aisle?: string
  category?: string
}

export interface ProductMatch {
  groceryItem: GroceryItem
  matchedProduct?: InstacartProduct
  confidence: number // 0-1 score
  alternatives: InstacartProduct[]
  requiresUserConfirmation: boolean
}

export class ProductMatcher {
  /**
   * Match grocery items to Instacart products
   */
  async matchGroceryItems(items: GroceryItem[]): Promise<ProductMatch[]> {
    const matches: ProductMatch[] = []

    for (const item of items) {
      const match = await this.findBestMatch(item)
      matches.push(match)
    }

    return matches
  }

  /**
   * Find the best matching Instacart product for a grocery item
   */
  private async findBestMatch(item: GroceryItem): Promise<ProductMatch> {
    // Phase 1: Mock implementation with smart matching logic
    // Phase 2: Will use actual Instacart search API
    
    const searchQuery = this.buildSearchQuery(item)
    const mockProducts = this.generateMockProducts(searchQuery, item)
    
    if (mockProducts.length === 0) {
      return {
        groceryItem: item,
        matchedProduct: undefined,
        confidence: 0,
        alternatives: [],
        requiresUserConfirmation: true
      }
    }

    // Calculate confidence scores for each product
    const scoredProducts = mockProducts.map(product => ({
      product,
      score: this.calculateMatchScore(item, product)
    }))

    // Sort by score
    scoredProducts.sort((a, b) => b.score - a.score)
    
    const bestMatch = scoredProducts[0]
    const alternatives = scoredProducts.slice(1, 4).map(sp => sp.product)
    
    // Require user confirmation if confidence is below threshold
    const requiresConfirmation = bestMatch.score < 0.8 || alternatives.length > 0

    return {
      groceryItem: item,
      matchedProduct: bestMatch.product,
      confidence: bestMatch.score,
      alternatives,
      requiresUserConfirmation: requiresConfirmation
    }
  }

  /**
   * Build search query from grocery item
   */
  private buildSearchQuery(item: GroceryItem): string {
    const parts: string[] = []
    
    // Clean and process the item name
    const cleanedName = this.cleanItemName(item.name)
    parts.push(cleanedName)
    
    // Add quantity/size information if relevant
    if (item.amount && this.isRelevantForSearch(item.amount)) {
      parts.push(item.amount)
    }
    
    return parts.join(' ')
  }

  /**
   * Clean item name for better matching
   */
  private cleanItemName(name: string): string {
    return name
      .toLowerCase()
      // Remove common cooking preparations
      .replace(/\b(chopped|diced|sliced|minced|crushed|ground|fresh|dried|frozen)\b/gi, '')
      // Remove parenthetical notes
      .replace(/\([^)]*\)/g, '')
      // Clean up extra spaces
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Check if amount is relevant for product search
   */
  private isRelevantForSearch(amount: string): boolean {
    // Don't include generic quantities in search
    const genericQuantities = ['1', '2', '3', '4', '5', 'some', 'a few', 'several']
    return !genericQuantities.includes(amount.toLowerCase())
  }

  /**
   * Calculate match score between grocery item and product
   */
  private calculateMatchScore(item: GroceryItem, product: InstacartProduct): number {
    let score = 0
    const itemNameLower = item.name.toLowerCase()
    const productNameLower = product.name.toLowerCase()
    
    // Exact name match
    if (itemNameLower === productNameLower) {
      score += 0.5
    }
    // Partial name match
    else if (productNameLower.includes(itemNameLower) || itemNameLower.includes(productNameLower)) {
      score += 0.3
    }
    // Word overlap
    else {
      const itemWords = itemNameLower.split(/\s+/)
      const productWords = productNameLower.split(/\s+/)
      const overlap = itemWords.filter(word => productWords.includes(word)).length
      score += (overlap / Math.max(itemWords.length, productWords.length)) * 0.3
    }
    
    // Category match
    if (item.category && product.category) {
      if (this.categoriesMatch(item.category, product.category)) {
        score += 0.2
      }
    }
    
    // Size/quantity match
    if (item.amount && product.size) {
      if (this.sizesMatch(item.amount, product.size)) {
        score += 0.2
      }
    }
    
    // Availability bonus
    if (product.available) {
      score += 0.1
    }
    
    return Math.min(score, 1)
  }

  /**
   * Check if categories match
   */
  private categoriesMatch(itemCategory: string, productCategory: string): boolean {
    const categoryMap: Record<string, string[]> = {
      'vegetables': ['produce', 'vegetables', 'fresh vegetables'],
      'dairy': ['dairy', 'milk', 'cheese', 'yogurt'],
      'meat': ['meat', 'poultry', 'seafood', 'deli'],
      'grains': ['bakery', 'bread', 'grains', 'pasta'],
      'legumes': ['canned goods', 'beans', 'legumes'],
      'oils': ['oils', 'condiments', 'cooking'],
      'spices': ['spices', 'seasonings', 'baking'],
      'aromatics': ['produce', 'herbs', 'fresh herbs'],
      'desserts': ['frozen', 'desserts', 'bakery', 'snacks'],
      'canned': ['canned goods', 'pantry']
    }
    
    const itemCategories = categoryMap[itemCategory.toLowerCase()] || [itemCategory.toLowerCase()]
    return itemCategories.some(cat => 
      productCategory.toLowerCase().includes(cat) || 
      cat.includes(productCategory.toLowerCase())
    )
  }

  /**
   * Check if sizes match
   */
  private sizesMatch(itemAmount: string, productSize: string): boolean {
    // Normalize units
    const normalizeUnit = (str: string): string => {
      return str.toLowerCase()
        .replace(/\s+/g, '')
        .replace(/ounce(s)?/, 'oz')
        .replace(/pound(s)?/, 'lb')
        .replace(/gram(s)?/, 'g')
        .replace(/kilogram(s)?/, 'kg')
        .replace(/liter(s)?/, 'l')
        .replace(/milliliter(s)?/, 'ml')
    }
    
    return normalizeUnit(itemAmount) === normalizeUnit(productSize)
  }

  /**
   * Generate mock products for testing
   * Phase 1 implementation - will be replaced with actual API calls
   */
  private generateMockProducts(query: string, item: GroceryItem): InstacartProduct[] {
    const baseProducts: Record<string, InstacartProduct[]> = {
      'milk': [
        { id: 'prod_1', name: 'Organic Whole Milk', brand: 'Horizon', size: '1 gallon', price: 699, available: true, category: 'dairy', imageUrl: 'https://via.placeholder.com/150' },
        { id: 'prod_2', name: '2% Reduced Fat Milk', brand: 'Store Brand', size: '1 gallon', price: 449, available: true, category: 'dairy', imageUrl: 'https://via.placeholder.com/150' },
        { id: 'prod_3', name: 'Whole Milk', brand: 'Local Dairy', size: 'half gallon', price: 349, available: true, category: 'dairy', imageUrl: 'https://via.placeholder.com/150' }
      ],
      'chicken': [
        { id: 'prod_4', name: 'Boneless Skinless Chicken Breasts', brand: 'Foster Farms', size: '2 lbs', price: 1299, available: true, category: 'meat', imageUrl: 'https://via.placeholder.com/150' },
        { id: 'prod_5', name: 'Organic Free-Range Chicken Breasts', brand: 'Bell & Evans', size: '1.5 lbs', price: 1599, available: true, category: 'meat', imageUrl: 'https://via.placeholder.com/150' },
        { id: 'prod_6', name: 'Chicken Thighs', brand: 'Store Brand', size: '2 lbs', price: 899, available: false, category: 'meat', imageUrl: 'https://via.placeholder.com/150' }
      ],
      'tomato': [
        { id: 'prod_7', name: 'Roma Tomatoes', brand: '', size: '1 lb', price: 299, available: true, category: 'produce', imageUrl: 'https://via.placeholder.com/150' },
        { id: 'prod_8', name: 'Beefsteak Tomatoes', brand: '', size: 'each', price: 149, available: true, category: 'produce', imageUrl: 'https://via.placeholder.com/150' },
        { id: 'prod_9', name: 'Cherry Tomatoes', brand: '', size: '1 pint', price: 399, available: true, category: 'produce', imageUrl: 'https://via.placeholder.com/150' }
      ],
      'rice': [
        { id: 'prod_10', name: 'Long Grain White Rice', brand: 'Uncle Ben\'s', size: '5 lbs', price: 899, available: true, category: 'grains', imageUrl: 'https://via.placeholder.com/150' },
        { id: 'prod_11', name: 'Jasmine Rice', brand: 'Royal', size: '2 lbs', price: 699, available: true, category: 'grains', imageUrl: 'https://via.placeholder.com/150' },
        { id: 'prod_12', name: 'Brown Rice', brand: 'Lundberg', size: '2 lbs', price: 799, available: true, category: 'grains', imageUrl: 'https://via.placeholder.com/150' }
      ]
    }
    
    // Find the best matching product category
    const queryLower = query.toLowerCase()
    for (const [key, products] of Object.entries(baseProducts)) {
      if (queryLower.includes(key)) {
        return products
      }
    }
    
    // Default fallback products
    return [
      {
        id: `prod_${Date.now()}`,
        name: item.name,
        brand: 'Generic',
        size: item.amount || '1 unit',
        price: 499,
        available: true,
        category: item.category || 'other',
        imageUrl: 'https://via.placeholder.com/150'
      }
    ]
  }

  /**
   * Validate and confirm user selections
   */
  async confirmMatches(
    matches: Array<{
      groceryItemId: string
      selectedProductId: string
    }>
  ): Promise<boolean> {
    // Phase 1: Just validate that all items have selections
    // Phase 2: Will validate against actual Instacart inventory
    
    return matches.every(match => 
      match.groceryItemId && match.selectedProductId
    )
  }

  /**
   * Get product details by ID
   */
  async getProductDetails(productId: string): Promise<InstacartProduct | null> {
    // Phase 1: Return mock data
    // Phase 2: Fetch from Instacart API
    
    const mockProduct: InstacartProduct = {
      id: productId,
      name: 'Sample Product',
      brand: 'Generic Brand',
      size: '1 unit',
      price: 499,
      available: true,
      imageUrl: 'https://via.placeholder.com/150',
      category: 'grocery'
    }
    
    return mockProduct
  }
}

export const productMatcher = new ProductMatcher()