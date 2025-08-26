/**
 * Check database statistics to verify test data seeding
 */

import { prisma } from '../server/lib/db'

async function checkStats() {
  console.log('📊 Database Statistics:\n')
  
  const stats = await Promise.all([
    prisma.user.count(),
    prisma.recipe.count(),
    prisma.pantryItem.count(),
    prisma.mealPlan.count(),
    prisma.ingredient.count(),
    prisma.plannedMeal.count(),
    prisma.userPreferences.count(),
  ])
  
  console.log(`  • Users: ${stats[0]}`)
  console.log(`  • Recipes: ${stats[1]}`)
  console.log(`  • Pantry Items: ${stats[2]}`)
  console.log(`  • Meal Plans: ${stats[3]}`)
  console.log(`  • Ingredients: ${stats[4]}`)
  console.log(`  • Planned Meals: ${stats[5]}`)
  console.log(`  • User Preferences: ${stats[6]}`)
  
  // Check test user details
  const testUser = await prisma.user.findUnique({
    where: { email: 'test@nochickenleftbehind.com' },
    include: {
      preferences: true,
      pantryItems: {
        take: 5,
        orderBy: { expirationDate: 'asc' }
      },
      recipes: {
        take: 5,
      },
      mealPlans: {
        include: {
          meals: {
            take: 5,
            include: {
              recipe: true
            }
          }
        }
      }
    }
  })
  
  if (testUser) {
    console.log('\n✅ Test User Details:')
    console.log(`  • Email: ${testUser.email}`)
    console.log(`  • Has Preferences: ${testUser.preferences ? 'Yes' : 'No'}`)
    if (testUser.preferences) {
      console.log(`    - Allergies: ${testUser.preferences.allergies.join(', ')}`)
      console.log(`    - Dietary: ${testUser.preferences.dietaryRestrictions.join(', ')}`)
    }
    console.log(`  • Pantry Items: ${testUser.pantryItems.length} (showing items expiring soon)`)
    console.log(`  • Recipes: ${testUser.recipes.length}`)
    console.log(`  • Meal Plans: ${testUser.mealPlans.length}`)
    
    if (testUser.pantryItems.length > 0) {
      console.log('\n  📦 Items Expiring Soon:')
      testUser.pantryItems.forEach(item => {
        const daysUntilExpiry = item.expirationDate ? 
          Math.ceil((item.expirationDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 
          null
        console.log(`    - ${item.customName}: expires in ${daysUntilExpiry} days`)
      })
    }
    
    if (testUser.mealPlans.length > 0 && testUser.mealPlans[0].meals.length > 0) {
      console.log('\n  📅 Upcoming Meals:')
      testUser.mealPlans[0].meals.forEach(meal => {
        const mealName = meal.recipe?.name || meal.simpleMealName || meal.restaurantName || 'Unknown'
        console.log(`    - ${meal.mealType}: ${mealName}`)
      })
    }
  }
  
  console.log('\n✨ Database check complete!')
}

checkStats()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error checking stats:', error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())