/**
 * Type definitions for USDA FoodData Central API and nutrition services
 */

// ============================================================================
// USDA FoodData Central API Types
// ============================================================================

export interface USDANutrient {
  id: number
  number: string
  name: string
  rank: number
  unitName: string
}

export interface USDAFoodNutrient {
  nutrient: USDANutrient
  amount: number
}

export interface USDAFood {
  fdcId: number
  description: string
  dataType: 'Foundation' | 'SR Legacy' | 'Branded' | 'Survey (FNDDS)'
  foodCategory?: string
  foodCategoryId?: number
  brandOwner?: string
  gtinUpc?: string
  servingSize?: number
  servingSizeUnit?: string
  householdServingFullText?: string
  foodNutrients: USDAFoodNutrient[]
}

export interface USDASearchResult {
  totalHits: number
  currentPage: number
  totalPages: number
  foods: USDAFood[]
}

export interface USDASearchParams {
  query: string
  dataType?: Array<'Foundation' | 'SR Legacy' | 'Branded' | 'Survey (FNDDS)'>
  pageSize?: number
  pageNumber?: number
  sortBy?: 'dataType.keyword' | 'lowercaseDescription.keyword' | 'fdcId'
  sortOrder?: 'asc' | 'desc'
}

// ============================================================================
// Nutrient ID Mappings (Common USDA Nutrient IDs)
// ============================================================================

export const NUTRIENT_IDS = {
  // Energy
  CALORIES: 1008, // Energy (kcal)

  // Macronutrients
  PROTEIN: 1003, // Protein
  TOTAL_FAT: 1004, // Total lipid (fat)
  TOTAL_CARBS: 1005, // Carbohydrate, by difference

  // Fats (detailed)
  SATURATED_FAT: 1258, // Fatty acids, total saturated
  TRANS_FAT: 1257, // Fatty acids, total trans
  POLYUNSATURATED_FAT: 1293, // Fatty acids, total polyunsaturated
  MONOUNSATURATED_FAT: 1292, // Fatty acids, total monounsaturated
  CHOLESTEROL: 1253, // Cholesterol

  // Carbohydrates (detailed)
  FIBER: 1079, // Fiber, total dietary
  SUGARS_TOTAL: 2000, // Sugars, total including NLEA
  SUGARS_ADDED: 1235, // Sugars, added
  SUGAR_ALCOHOL: 1086, // Sugar alcohols

  // Minerals
  SODIUM: 1093, // Sodium, Na
  CALCIUM: 1087, // Calcium, Ca
  IRON: 1089, // Iron, Fe
  POTASSIUM: 1092, // Potassium, K
  MAGNESIUM: 1090, // Magnesium, Mg
  PHOSPHORUS: 1091, // Phosphorus, P
  ZINC: 1095, // Zinc, Zn
  COPPER: 1098, // Copper, Cu
  MANGANESE: 1101, // Manganese, Mn
  SELENIUM: 1103, // Selenium, Se
  CHROMIUM: 1096, // Chromium, Cr

  // Vitamins
  VITAMIN_A: 1106, // Vitamin A, RAE
  VITAMIN_C: 1162, // Vitamin C, total ascorbic acid
  VITAMIN_D: 1114, // Vitamin D (D2 + D3)
  VITAMIN_E: 1109, // Vitamin E (alpha-tocopherol)
  VITAMIN_K: 1185, // Vitamin K (phylloquinone)
  THIAMIN: 1165, // Thiamin
  RIBOFLAVIN: 1166, // Riboflavin
  NIACIN: 1167, // Niacin
  VITAMIN_B6: 1175, // Vitamin B-6
  FOLATE: 1177, // Folate, total
  VITAMIN_B12: 1178, // Vitamin B-12
  BIOTIN: 1176, // Biotin
  PANTOTHENIC_ACID: 1170, // Pantothenic acid
} as const

// ============================================================================
// Application Nutrition Types
// ============================================================================

export interface NutritionData {
  // Per-serving nutrition
  servingSize?: string

  // Macronutrients (required for FDA label)
  calories?: number // kcal
  totalFat?: number // grams
  saturatedFat?: number // grams
  transFat?: number // grams
  polyunsaturatedFat?: number // grams
  monounsaturatedFat?: number // grams
  cholesterol?: number // mg
  sodium?: number // mg
  totalCarbs?: number // grams
  dietaryFiber?: number // grams
  totalSugars?: number // grams
  addedSugars?: number // grams
  sugarAlcohol?: number // grams
  protein?: number // grams

  // Vitamins (absolute amounts)
  vitaminD?: number // mcg
  vitaminA?: number // mcg
  vitaminC?: number // mg
  vitaminE?: number // mg
  vitaminK?: number // mcg
  thiamin?: number // mg
  riboflavin?: number // mg
  niacin?: number // mg
  vitaminB6?: number // mg
  folate?: number // mcg
  vitaminB12?: number // mcg
  biotin?: number // mcg
  pantothenicAcid?: number // mg

  // Minerals
  calcium?: number // mg
  iron?: number // mg
  magnesium?: number // mg
  phosphorus?: number // mg
  potassium?: number // mg
  zinc?: number // mg
  copper?: number // mg
  manganese?: number // mg
  selenium?: number // mcg
  chromium?: number // mcg
}

export interface ParsedIngredient {
  quantity: number | null
  unit: string | null
  preparation: string[]
  descriptor: string[]
  ingredient: string
  original: string
  confidence: number
}

export interface IngredientMatch {
  foodId: string
  fdcId: number
  description: string
  confidence: number
  matchType: 'exact' | 'fuzzy' | 'synonym' | 'partial'
}

export interface NutritionCalculationResult {
  nutrition: NutritionData
  warnings: string[]
  unmappedIngredients: string[]
  confidence: number
  totalIngredients: number
  mappedIngredients: number
}

// ============================================================================
// Conversion Constants
// ============================================================================

export const VOLUME_TO_ML = {
  'cup': 236.588,
  'cups': 236.588,
  'c': 236.588,
  'tablespoon': 14.7868,
  'tablespoons': 14.7868,
  'tbsp': 14.7868,
  'tbs': 14.7868,
  'T': 14.7868,
  'teaspoon': 4.92892,
  'teaspoons': 4.92892,
  'tsp': 4.92892,
  't': 4.92892,
  'fluid ounce': 29.5735,
  'fluid ounces': 29.5735,
  'fl oz': 29.5735,
  'pint': 473.176,
  'pints': 473.176,
  'pt': 473.176,
  'quart': 946.353,
  'quarts': 946.353,
  'qt': 946.353,
  'gallon': 3785.41,
  'gallons': 3785.41,
  'gal': 3785.41,
  'liter': 1000,
  'liters': 1000,
  'l': 1000,
  'milliliter': 1,
  'milliliters': 1,
  'ml': 1,
} as const

export const WEIGHT_TO_GRAMS = {
  'gram': 1,
  'grams': 1,
  'g': 1,
  'kilogram': 1000,
  'kilograms': 1000,
  'kg': 1000,
  'ounce': 28.3495,
  'ounces': 28.3495,
  'oz': 28.3495,
  'pound': 453.592,
  'pounds': 453.592,
  'lb': 453.592,
  'lbs': 453.592,
  'milligram': 0.001,
  'milligrams': 0.001,
  'mg': 0.001,
} as const

// Common ingredient densities (g/ml) for volume-to-weight conversion
export const INGREDIENT_DENSITIES: Record<string, number> = {
  // Liquids
  'water': 1.0,
  'milk': 1.03,
  'cream': 1.01,
  'oil': 0.92,
  'olive oil': 0.92,
  'vegetable oil': 0.92,
  'honey': 1.42,
  'maple syrup': 1.32,
  'molasses': 1.4,

  // Dry goods
  'flour': 0.5,
  'all-purpose flour': 0.5,
  'bread flour': 0.53,
  'cake flour': 0.47,
  'sugar': 0.85,
  'granulated sugar': 0.85,
  'brown sugar': 0.9,
  'powdered sugar': 0.56,
  'confectioners sugar': 0.56,
  'salt': 1.22,
  'table salt': 1.22,
  'kosher salt': 0.86,
  'rice': 0.75,
  'white rice': 0.75,
  'brown rice': 0.77,
  'oats': 0.43,
  'rolled oats': 0.43,

  // Semi-solids
  'butter': 0.96,
  'margarine': 0.96,
  'peanut butter': 1.08,
  'yogurt': 1.04,
  'sour cream': 0.96,
  'cream cheese': 1.04,

  // Common produce (approximate)
  'onion': 0.96,
  'tomato': 0.96,
  'potato': 0.74,
  'carrot': 0.87,
}
