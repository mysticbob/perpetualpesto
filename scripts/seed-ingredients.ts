/**
 * Seed common ingredients into database
 * Uses USDA data where available
 */

import { prisma } from '../server/lib/db'
import { usdaService } from '../server/services/usda-service'

// Common ingredients with estimated shelf life
const commonIngredients = [
  // Proteins
  { name: 'chicken breast', category: 'protein', shelfLife: { counter: 0, fridge: 3, freezer: 180 } },
  { name: 'ground beef', category: 'protein', shelfLife: { counter: 0, fridge: 2, freezer: 120 } },
  { name: 'eggs', category: 'protein', shelfLife: { counter: 7, fridge: 35, freezer: 365 } },
  { name: 'salmon', category: 'protein', shelfLife: { counter: 0, fridge: 2, freezer: 90 } },
  { name: 'tofu', category: 'protein', shelfLife: { counter: 0, fridge: 7, freezer: 150 } },
  
  // Vegetables
  { name: 'onion', category: 'vegetable', shelfLife: { counter: 30, fridge: 60, freezer: 240 } },
  { name: 'garlic', category: 'vegetable', shelfLife: { counter: 180, fridge: 180, freezer: 365 } },
  { name: 'tomato', category: 'vegetable', shelfLife: { counter: 7, fridge: 14, freezer: 240 } },
  { name: 'bell pepper', category: 'vegetable', shelfLife: { counter: 3, fridge: 14, freezer: 240 } },
  { name: 'carrot', category: 'vegetable', shelfLife: { counter: 5, fridge: 30, freezer: 300 } },
  { name: 'broccoli', category: 'vegetable', shelfLife: { counter: 2, fridge: 10, freezer: 300 } },
  { name: 'spinach', category: 'vegetable', shelfLife: { counter: 0, fridge: 7, freezer: 300 } },
  { name: 'potato', category: 'vegetable', shelfLife: { counter: 30, fridge: 21, freezer: 300 } },
  
  // Fruits
  { name: 'apple', category: 'fruit', shelfLife: { counter: 7, fridge: 30, freezer: 240 } },
  { name: 'banana', category: 'fruit', shelfLife: { counter: 5, fridge: 9, freezer: 90 } },
  { name: 'lemon', category: 'fruit', shelfLife: { counter: 7, fridge: 30, freezer: 120 } },
  { name: 'orange', category: 'fruit', shelfLife: { counter: 7, fridge: 21, freezer: 120 } },
  
  // Dairy
  { name: 'milk', category: 'dairy', shelfLife: { counter: 0, fridge: 7, freezer: 90 } },
  { name: 'butter', category: 'dairy', shelfLife: { counter: 7, fridge: 90, freezer: 365 } },
  { name: 'cheese', category: 'dairy', shelfLife: { counter: 0, fridge: 30, freezer: 180 } },
  { name: 'yogurt', category: 'dairy', shelfLife: { counter: 0, fridge: 14, freezer: 60 } },
  { name: 'heavy cream', category: 'dairy', shelfLife: { counter: 0, fridge: 10, freezer: 120 } },
  
  // Grains & Starches
  { name: 'rice', category: 'grain', shelfLife: { counter: 730, fridge: 730, freezer: 730 } },
  { name: 'pasta', category: 'grain', shelfLife: { counter: 730, fridge: 730, freezer: 730 } },
  { name: 'bread', category: 'grain', shelfLife: { counter: 7, fridge: 14, freezer: 90 } },
  { name: 'flour', category: 'grain', shelfLife: { counter: 365, fridge: 730, freezer: 730 } },
  { name: 'oats', category: 'grain', shelfLife: { counter: 730, fridge: 730, freezer: 730 } },
  
  // Pantry Staples
  { name: 'olive oil', category: 'fat', shelfLife: { counter: 730, fridge: 730, freezer: 730 } },
  { name: 'vegetable oil', category: 'fat', shelfLife: { counter: 730, fridge: 730, freezer: 730 } },
  { name: 'soy sauce', category: 'condiment', shelfLife: { counter: 1095, fridge: 1095, freezer: 1095 } },
  { name: 'vinegar', category: 'condiment', shelfLife: { counter: 1095, fridge: 1095, freezer: 1095 } },
  { name: 'honey', category: 'condiment', shelfLife: { counter: 9999, fridge: 9999, freezer: 9999 } },
  
  // Spices & Herbs
  { name: 'salt', category: 'spice', shelfLife: { counter: 9999, fridge: 9999, freezer: 9999 } },
  { name: 'black pepper', category: 'spice', shelfLife: { counter: 1095, fridge: 1095, freezer: 1095 } },
  { name: 'cumin', category: 'spice', shelfLife: { counter: 1095, fridge: 1095, freezer: 1095 } },
  { name: 'paprika', category: 'spice', shelfLife: { counter: 1095, fridge: 1095, freezer: 1095 } },
  { name: 'oregano', category: 'spice', shelfLife: { counter: 1095, fridge: 1095, freezer: 1095 } },
  { name: 'basil', category: 'spice', shelfLife: { counter: 7, fridge: 10, freezer: 365 } },
  { name: 'thyme', category: 'spice', shelfLife: { counter: 1095, fridge: 1095, freezer: 1095 } },
  
  // Canned Goods
  { name: 'canned tomatoes', category: 'canned', shelfLife: { counter: 730, fridge: 730, freezer: 730 } },
  { name: 'black beans', category: 'canned', shelfLife: { counter: 1095, fridge: 1095, freezer: 1095 } },
  { name: 'chickpeas', category: 'canned', shelfLife: { counter: 1095, fridge: 1095, freezer: 1095 } },
  { name: 'coconut milk', category: 'canned', shelfLife: { counter: 730, fridge: 730, freezer: 730 } },
]

// Common substitutions
const substitutions = [
  { original: 'butter', substitute: 'olive oil', ratio: 0.75, notes: 'Use 3/4 cup oil for 1 cup butter' },
  { original: 'milk', substitute: 'oat milk', ratio: 1.0, notes: 'Direct substitution' },
  { original: 'eggs', substitute: 'flax eggs', ratio: 1.0, notes: '1 tbsp flax + 3 tbsp water per egg' },
  { original: 'heavy cream', substitute: 'coconut milk', ratio: 1.0, notes: 'Use full-fat coconut milk' },
  { original: 'chicken breast', substitute: 'tofu', ratio: 1.0, notes: 'For vegetarian option' },
  { original: 'ground beef', substitute: 'ground turkey', ratio: 1.0, notes: 'Leaner option' },
  { original: 'soy sauce', substitute: 'tamari', ratio: 1.0, notes: 'Gluten-free alternative' },
  { original: 'sugar', substitute: 'honey', ratio: 0.75, notes: 'Use 3/4 cup honey for 1 cup sugar' },
]

async function seedIngredients() {
  console.log('🌱 Seeding ingredients...')
  
  let createdCount = 0
  let skippedCount = 0
  
  for (const ingredient of commonIngredients) {
    try {
      // Check if exists
      const existing = await prisma.ingredient.findUnique({
        where: { name: ingredient.name }
      })
      
      if (existing) {
        skippedCount++
        console.log(`⏭️  Skipped: ${ingredient.name} (already exists)`)
        continue
      }
      
      // Try to get USDA data
      console.log(`🔍 Searching USDA for: ${ingredient.name}`)
      const usdaResults = await usdaService.searchFood(ingredient.name)
      
      let nutritionData = {}
      let usdaFoodId = null
      
      if (usdaResults.length > 0) {
        const usdaFood = usdaResults[0]
        usdaFoodId = usdaFood.fdcId.toString()
        nutritionData = usdaService.extractNutrition(usdaFood)
        console.log(`  ✅ Found USDA data: ${usdaFood.description}`)
      }
      
      // Create ingredient
      await prisma.ingredient.create({
        data: {
          name: ingredient.name,
          alternativeNames: [ingredient.name],
          category: ingredient.category,
          shelfLifeCounter: ingredient.shelfLife.counter,
          shelfLifeFridge: ingredient.shelfLife.fridge,
          shelfLifeFreezer: ingredient.shelfLife.freezer,
          usdaFoodId,
          ...nutritionData
        }
      })
      
      createdCount++
      console.log(`✅ Created: ${ingredient.name}`)
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
      
    } catch (error) {
      console.error(`❌ Error creating ${ingredient.name}:`, error)
    }
  }
  
  console.log('\n🔄 Creating substitutions...')
  
  for (const sub of substitutions) {
    try {
      const original = await prisma.ingredient.findUnique({
        where: { name: sub.original }
      })
      const substitute = await prisma.ingredient.findUnique({
        where: { name: sub.substitute }
      })
      
      if (original && substitute) {
        await prisma.ingredientSubstitution.create({
          data: {
            originalId: original.id,
            substituteId: substitute.id,
            ratio: sub.ratio,
            notes: sub.notes
          }
        })
        console.log(`✅ Substitution: ${sub.original} → ${sub.substitute}`)
      }
    } catch (error) {
      // Ignore duplicate errors
      if (error instanceof Error && !error.message.includes('Unique constraint')) {
        console.error(`Error creating substitution:`, error)
      }
    }
  }
  
  console.log(`
✨ Seeding complete!
   Created: ${createdCount} ingredients
   Skipped: ${skippedCount} ingredients
  `)
}

// Run seeding
seedIngredients()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seeding failed:', error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())