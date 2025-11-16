/**
 * Nutrition Services - Main Export
 */

// Core Services
export * from './types.js'
export * from './usdaClient.js'
export * from './ingredientParser.js'
export * from './ingredientMatcher.js'
export * from './unitConverter.js'
export * from './nutritionCalculator.js'
export * from './nutritionDb.js'
export * from './recipeNutritionService.js'

// Convenience getters
export {
  getUSDAClient,
  initializeUSDAClient,
} from './usdaClient.js'
export { getIngredientParser } from './ingredientParser.js'
export { getIngredientMatcher } from './ingredientMatcher.js'
export { getUnitConverter } from './unitConverter.js'
export { getNutritionCalculator } from './nutritionCalculator.js'
export { getNutritionDb } from './nutritionDb.js'
export { getRecipeNutritionService } from './recipeNutritionService.js'
