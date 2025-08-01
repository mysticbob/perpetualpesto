// Food expiration database based on FDA, USDA, and food safety guidelines
// Times are in days from purchase/preparation date

export interface ExpirationInfo {
  name: string
  refrigeratorDays: number
  freezerDays?: number
  pantryDays?: number
  category: string
  notes?: string
}

export const EXPIRATION_DATABASE: Record<string, ExpirationInfo> = {
  // Fresh Vegetables (Refrigerator)
  'carrots': { name: 'Carrots', refrigeratorDays: 21, freezerDays: 365, category: 'vegetables' },
  'lettuce': { name: 'Lettuce', refrigeratorDays: 7, category: 'vegetables' },
  'spinach': { name: 'Spinach', refrigeratorDays: 5, freezerDays: 365, category: 'vegetables' },
  'broccoli': { name: 'Broccoli', refrigeratorDays: 7, freezerDays: 365, category: 'vegetables' },
  'celery': { name: 'Celery', refrigeratorDays: 14, category: 'vegetables' },
  'bell peppers': { name: 'Bell Peppers', refrigeratorDays: 10, freezerDays: 365, category: 'vegetables' },
  'bell pepper': { name: 'Bell Peppers', refrigeratorDays: 10, freezerDays: 365, category: 'vegetables' },
  'peppers': { name: 'Peppers', refrigeratorDays: 10, freezerDays: 365, category: 'vegetables' },
  'cucumber': { name: 'Cucumber', refrigeratorDays: 7, category: 'vegetables' },
  'onion': { name: 'Onion', pantryDays: 30, refrigeratorDays: 60, category: 'vegetables' },
  'onions': { name: 'Onions', pantryDays: 30, refrigeratorDays: 60, category: 'vegetables' },
  'garlic': { name: 'Garlic', pantryDays: 90, category: 'aromatics' },
  'tomatoes': { name: 'Tomatoes', refrigeratorDays: 7, category: 'vegetables' },
  'tomato': { name: 'Tomatoes', refrigeratorDays: 7, category: 'vegetables' },
  'potatoes': { name: 'Potatoes', pantryDays: 30, category: 'vegetables' },
  'potato': { name: 'Potatoes', pantryDays: 30, category: 'vegetables' },

  // Fresh Fruits (Refrigerator)
  'apples': { name: 'Apples', refrigeratorDays: 28, category: 'fruits' },
  'apple': { name: 'Apples', refrigeratorDays: 28, category: 'fruits' },
  'bananas': { name: 'Bananas', pantryDays: 5, refrigeratorDays: 7, category: 'fruits' },
  'banana': { name: 'Bananas', pantryDays: 5, refrigeratorDays: 7, category: 'fruits' },
  'berries': { name: 'Berries', refrigeratorDays: 5, freezerDays: 365, category: 'fruits' },
  'strawberries': { name: 'Strawberries', refrigeratorDays: 5, freezerDays: 365, category: 'fruits' },
  'blueberries': { name: 'Blueberries', refrigeratorDays: 7, freezerDays: 365, category: 'fruits' },
  'grapes': { name: 'Grapes', refrigeratorDays: 7, freezerDays: 365, category: 'fruits' },
  'oranges': { name: 'Oranges', refrigeratorDays: 21, category: 'fruits' },
  'lemons': { name: 'Lemons', refrigeratorDays: 21, category: 'fruits' },

  // Dairy Products
  'milk': { name: 'Milk', refrigeratorDays: 7, category: 'dairy', notes: 'Use-by date' },
  'yogurt': { name: 'Yogurt', refrigeratorDays: 7, category: 'dairy' },
  'cheese': { name: 'Cheese', refrigeratorDays: 21, freezerDays: 180, category: 'dairy' },
  'cheddar': { name: 'Cheddar Cheese', refrigeratorDays: 21, freezerDays: 180, category: 'dairy' },
  'mozzarella': { name: 'Mozzarella', refrigeratorDays: 14, freezerDays: 180, category: 'dairy' },
  'cream cheese': { name: 'Cream Cheese', refrigeratorDays: 14, category: 'dairy' },
  'butter': { name: 'Butter', refrigeratorDays: 30, freezerDays: 365, category: 'dairy' },
  'eggs': { name: 'Eggs', refrigeratorDays: 28, category: 'dairy' },

  // Meat & Poultry (Refrigerator/Freezer)
  'chicken breast': { name: 'Chicken Breast', refrigeratorDays: 2, freezerDays: 270, category: 'meat' },
  'chicken': { name: 'Chicken', refrigeratorDays: 2, freezerDays: 270, category: 'meat' },
  'ground beef': { name: 'Ground Beef', refrigeratorDays: 2, freezerDays: 120, category: 'meat' },
  'beef': { name: 'Beef', refrigeratorDays: 3, freezerDays: 270, category: 'meat' },
  'pork': { name: 'Pork', refrigeratorDays: 3, freezerDays: 180, category: 'meat' },
  'fish': { name: 'Fish', refrigeratorDays: 2, freezerDays: 180, category: 'meat' },
  'salmon': { name: 'Salmon', refrigeratorDays: 2, freezerDays: 180, category: 'meat' },

  // Leftovers
  'leftovers': { name: 'Leftovers', refrigeratorDays: 3, freezerDays: 90, category: 'leftovers' },
  'cooked rice': { name: 'Cooked Rice', refrigeratorDays: 4, freezerDays: 180, category: 'leftovers' },
  'cooked pasta': { name: 'Cooked Pasta', refrigeratorDays: 3, freezerDays: 90, category: 'leftovers' },
  'soup': { name: 'Soup', refrigeratorDays: 3, freezerDays: 90, category: 'leftovers' },
  'pizza': { name: 'Pizza', refrigeratorDays: 4, freezerDays: 60, category: 'leftovers' },

  // Pantry Items (Dry goods)
  'rice': { name: 'Rice', pantryDays: 1095, category: 'grains' }, // 3 years
  'pasta': { name: 'Pasta', pantryDays: 730, category: 'grains' }, // 2 years
  'flour': { name: 'Flour', pantryDays: 365, category: 'grains' }, // 1 year
  'beans': { name: 'Dried Beans', pantryDays: 1095, category: 'legumes' }, // 3 years
  'lentils': { name: 'Lentils', pantryDays: 1095, category: 'legumes' }, // 3 years
  'chickpeas': { name: 'Chickpeas', pantryDays: 1095, category: 'legumes' }, // 3 years

  // Canned Goods
  'canned tomatoes': { name: 'Canned Tomatoes', pantryDays: 730, category: 'canned' }, // 2 years
  'diced tomatoes': { name: 'Diced Tomatoes', pantryDays: 730, category: 'canned' },
  'tomato paste': { name: 'Tomato Paste', pantryDays: 730, refrigeratorDays: 5, category: 'canned' },
  'canned beans': { name: 'Canned Beans', pantryDays: 730, category: 'canned' },
  'corn': { name: 'Canned Corn', pantryDays: 730, category: 'canned' },

  // Oils & Condiments
  'olive oil': { name: 'Olive Oil', pantryDays: 730, category: 'oils' }, // 2 years
  'vegetable oil': { name: 'Vegetable Oil', pantryDays: 730, category: 'oils' },
  'canola oil': { name: 'Canola Oil', pantryDays: 730, category: 'oils' },
  'soy sauce': { name: 'Soy Sauce', pantryDays: 1095, refrigeratorDays: 1095, category: 'condiments' },
  'vinegar': { name: 'Vinegar', pantryDays: 1825, category: 'condiments' }, // 5 years

  // Spices & Seasonings
  'salt': { name: 'Salt', pantryDays: 1825, category: 'spices' }, // 5 years
  'black pepper': { name: 'Black Pepper', pantryDays: 1095, category: 'spices' }, // 3 years
  'paprika': { name: 'Paprika', pantryDays: 730, category: 'spices' }, // 2 years
  'garlic powder': { name: 'Garlic Powder', pantryDays: 1095, category: 'spices' },

  // Bread & Baked Goods
  'bread': { name: 'Bread', pantryDays: 3, refrigeratorDays: 7, freezerDays: 90, category: 'grains' },
  'bagels': { name: 'Bagels', pantryDays: 5, freezerDays: 90, category: 'grains' },

  // Default fallbacks by category
  'default_vegetables': { name: 'Fresh Vegetables', refrigeratorDays: 7, category: 'vegetables' },
  'default_fruits': { name: 'Fresh Fruits', refrigeratorDays: 7, category: 'fruits' },
  'default_dairy': { name: 'Dairy Products', refrigeratorDays: 7, category: 'dairy' },
  'default_meat': { name: 'Fresh Meat', refrigeratorDays: 2, freezerDays: 180, category: 'meat' },
  'default_leftovers': { name: 'Leftovers', refrigeratorDays: 3, freezerDays: 90, category: 'leftovers' },
  'default_grains': { name: 'Grains', pantryDays: 365, category: 'grains' },
  'default_canned': { name: 'Canned Goods', pantryDays: 730, category: 'canned' },
  'default_spices': { name: 'Spices', pantryDays: 730, category: 'spices' },
}

export function getExpirationDefault(itemName: string, category?: string, location?: string): number {
  const normalizedName = itemName.toLowerCase().trim()
  
  // First try exact match
  let expiration = EXPIRATION_DATABASE[normalizedName]
  
  // Try partial matches
  if (!expiration) {
    const partialMatch = Object.keys(EXPIRATION_DATABASE).find(key => 
      normalizedName.includes(key) || key.includes(normalizedName)
    )
    if (partialMatch) {
      expiration = EXPIRATION_DATABASE[partialMatch]
    }
  }
  
  // Try category fallback
  if (!expiration && category) {
    expiration = EXPIRATION_DATABASE[`default_${category}`]
  }
  
  // Use location-appropriate duration
  if (expiration) {
    if (location?.toLowerCase().includes('freezer') && expiration.freezerDays) {
      return expiration.freezerDays
    } else if (location?.toLowerCase().includes('refrigerator') && expiration.refrigeratorDays) {
      return expiration.refrigeratorDays
    } else if (location?.toLowerCase().includes('pantry') && expiration.pantryDays) {
      return expiration.pantryDays
    } else {
      // Default priority: refrigerator > pantry > freezer
      return expiration.refrigeratorDays || expiration.pantryDays || expiration.freezerDays || 7
    }
  }
  
  // Ultimate fallback
  return 7 // 1 week default
}

export function calculateExpirationDate(itemName: string, category?: string, location?: string, purchaseDate?: Date): Date {
  const days = getExpirationDefault(itemName, category, location)
  const startDate = purchaseDate || new Date()
  const expirationDate = new Date(startDate)
  expirationDate.setDate(expirationDate.getDate() + days)
  return expirationDate
}

export function getExpirationStatus(expirationDate: Date): {
  status: 'fresh' | 'expiring' | 'expired'
  daysUntilExpiration: number
  color: string
} {
  const now = new Date()
  const timeDiff = expirationDate.getTime() - now.getTime()
  const daysUntilExpiration = Math.ceil(timeDiff / (1000 * 3600 * 24))
  
  if (daysUntilExpiration < 0) {
    return { status: 'expired', daysUntilExpiration, color: '#d72c0d' } // Ovie critical red
  } else if (daysUntilExpiration <= 2) {
    return { status: 'expiring', daysUntilExpiration, color: '#ffb503' } // Ovie warning yellow
  } else {
    return { status: 'fresh', daysUntilExpiration, color: '#008060' } // Ovie success green
  }
}

export function formatExpirationDate(date: Date): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  
  if (targetDate.getTime() === today.getTime()) {
    return 'Expires today'
  } else if (targetDate.getTime() === tomorrow.getTime()) {
    return 'Expires tomorrow'
  } else if (targetDate < today) {
    const daysAgo = Math.floor((today.getTime() - targetDate.getTime()) / (1000 * 3600 * 24))
    return `Expired ${daysAgo} day${daysAgo === 1 ? '' : 's'} ago`
  } else {
    const daysUntil = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 3600 * 24))
    return `Expires in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`
  }
}