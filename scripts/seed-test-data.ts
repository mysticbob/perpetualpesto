/**
 * Comprehensive test data seeding for NoChickenLeftBehind
 * Creates realistic test data including recipes, pantry items, user preferences, and meal plans
 */

import { prisma } from '../server/lib/db'
import { PantryLocation, MealType, RecipeDifficulty, MealPlanStatus } from '@prisma/client'

// Helper function to generate dates
const daysFromNow = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date
}

const daysAgo = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

async function seedTestData() {
  console.log('🚀 Starting comprehensive test data seeding...\n')

  try {
    // ============ 1. CREATE TEST USER ============
    console.log('👤 Creating test user...')
    const testUser = await prisma.user.upsert({
      where: { email: 'test@nochickenleftbehind.com' },
      update: {},
      create: {
        email: 'test@nochickenleftbehind.com',
        name: 'Test User',
      }
    })
    console.log('✅ Test user created/found:', testUser.email)

    // ============ 2. SET USER PREFERENCES ============
    console.log('\n🎯 Setting user preferences...')
    await prisma.userPreferences.upsert({
      where: { userId: testUser.id },
      update: {
        allergies: ['clams'],
        dietaryRestrictions: ['prefer-soy-milk'],
        dislikedIngredients: ['olives', 'anchovies'],
        maxCookTimeMinutes: 45,
        preferredCuisines: ['italian', 'mexican', 'asian', 'american'],
        skillLevel: 'intermediate',
        servingsPerMeal: 4,
        includeLefotvers: true,
        weeklyBudget: 150,
        preferredStores: ['Whole Foods', 'Trader Joes'],
      },
      create: {
        userId: testUser.id,
        allergies: ['clams'],
        dietaryRestrictions: ['prefer-soy-milk'],
        dislikedIngredients: ['olives', 'anchovies'],
        maxCookTimeMinutes: 45,
        preferredCuisines: ['italian', 'mexican', 'asian', 'american'],
        skillLevel: 'intermediate',
        servingsPerMeal: 4,
        includeLefotvers: true,
        weeklyBudget: 150,
        preferredStores: ['Whole Foods', 'Trader Joes'],
      }
    })
    console.log('✅ User preferences set')

    // ============ 3. CREATE RECIPES ============
    console.log('\n🍳 Creating recipes...')
    
    // Get ingredient IDs for recipe creation
    const ingredients = await prisma.ingredient.findMany()
    const ingredientMap = new Map(ingredients.map(i => [i.name, i.id]))
    
    // Ensure we have the required new ingredients for added recipes
    const requiredIngredients = [
      { name: 'shrimp', category: 'protein', shelfLife: { counter: 0, fridge: 2, freezer: 180 } },
      { name: 'cabbage', category: 'vegetable', shelfLife: { counter: 7, fridge: 21, freezer: 365 } },
      { name: 'lime', category: 'fruit', shelfLife: { counter: 7, fridge: 21, freezer: 120 } },
      { name: 'green onion', category: 'vegetable', shelfLife: { counter: 2, fridge: 7, freezer: 90 } },
      { name: 'peas', category: 'vegetable', shelfLife: { counter: 0, fridge: 3, freezer: 365 } },
      { name: 'tortilla', category: 'grain', shelfLife: { counter: 7, fridge: 30, freezer: 180 } },
    ]
    
    for (const ing of requiredIngredients) {
      if (!ingredientMap.has(ing.name)) {
        console.log(`  Creating missing ingredient: ${ing.name}`)
        try {
          const created = await prisma.ingredient.create({
            data: {
              name: ing.name,
              category: ing.category,
              shelfLifeCounter: ing.shelfLife.counter,
              shelfLifeFridge: ing.shelfLife.fridge,
              shelfLifeFreezer: ing.shelfLife.freezer,
              alternativeNames: [ing.name]
            }
          })
          ingredientMap.set(ing.name, created.id)
        } catch (error) {
          console.warn(`    Could not create ${ing.name}: ${error}`)
        }
      }
    }
    
    const getIngredientId = (name: string) => {
      const id = ingredientMap.get(name)
      if (!id) {
        console.warn(`⚠️  Ingredient not found: ${name}`)
      }
      return id
    }

    const recipes = [
      // ========== BREAKFAST RECIPES ==========
      {
        name: 'Fluffy Pancakes',
        description: 'Classic American pancakes with maple syrup',
        prepTime: 10,
        cookTime: 15,
        totalTime: 25,
        servings: 4,
        difficulty: RecipeDifficulty.EASY,
        mealType: ['breakfast'],
        cuisine: 'american',
        goodForLeftovers: false,
        ingredients: [
          { name: 'flour', amount: 2, unit: 'cups', text: '2 cups all-purpose flour' },
          { name: 'milk', amount: 1.5, unit: 'cups', text: '1½ cups soy milk (or regular milk)' },
          { name: 'eggs', amount: 2, unit: 'whole', text: '2 large eggs' },
          { name: 'butter', amount: 4, unit: 'tbsp', text: '4 tbsp melted butter' },
          { name: 'sugar', amount: 2, unit: 'tbsp', text: '2 tbsp sugar' },
          { name: 'salt', amount: 0.5, unit: 'tsp', text: '½ tsp salt' },
        ],
        instructions: [
          'Mix dry ingredients in a large bowl',
          'Whisk wet ingredients in separate bowl',
          'Combine wet and dry ingredients until just mixed',
          'Cook on griddle over medium heat until bubbles form',
          'Flip and cook until golden brown'
        ]
      },
      {
        name: 'Veggie Scrambled Eggs',
        description: 'Protein-packed scrambled eggs with fresh vegetables',
        prepTime: 5,
        cookTime: 10,
        totalTime: 15,
        servings: 2,
        difficulty: RecipeDifficulty.EASY,
        mealType: ['breakfast'],
        cuisine: 'american',
        goodForLeftovers: false,
        ingredients: [
          { name: 'eggs', amount: 6, unit: 'whole', text: '6 large eggs' },
          { name: 'bell pepper', amount: 1, unit: 'whole', text: '1 bell pepper, diced' },
          { name: 'spinach', amount: 2, unit: 'cups', text: '2 cups fresh spinach' },
          { name: 'cheese', amount: 0.5, unit: 'cup', text: '½ cup shredded cheese' },
          { name: 'milk', amount: 2, unit: 'tbsp', text: '2 tbsp soy milk' },
          { name: 'butter', amount: 2, unit: 'tbsp', text: '2 tbsp butter' },
        ],
        instructions: [
          'Whisk eggs with milk, salt and pepper',
          'Sauté vegetables in butter until soft',
          'Add egg mixture and stir gently',
          'Cook until eggs are just set',
          'Top with cheese and serve'
        ]
      },
      {
        name: 'Overnight Oats',
        description: 'No-cook breakfast prep with oats and fruit',
        prepTime: 5,
        cookTime: 0,
        totalTime: 5,
        servings: 4,
        difficulty: RecipeDifficulty.EASY,
        mealType: ['breakfast'],
        cuisine: 'american',
        goodForLeftovers: true,
        leftoverDays: 3,
        ingredients: [
          { name: 'oats', amount: 2, unit: 'cups', text: '2 cups rolled oats' },
          { name: 'milk', amount: 2, unit: 'cups', text: '2 cups soy milk (or regular milk if tolerated)' },
          { name: 'yogurt', amount: 1, unit: 'cup', text: '1 cup Greek yogurt' },
          { name: 'honey', amount: 4, unit: 'tbsp', text: '4 tbsp honey' },
          { name: 'banana', amount: 2, unit: 'whole', text: '2 bananas, sliced' },
        ],
        instructions: [
          'Mix oats, milk, yogurt, and honey in a bowl',
          'Divide into 4 jars or containers',
          'Top with sliced banana',
          'Refrigerate overnight',
          'Enjoy cold or warmed up'
        ]
      },
      {
        name: 'Avocado Toast with Egg',
        description: 'Trendy and nutritious breakfast toast',
        prepTime: 5,
        cookTime: 10,
        totalTime: 15,
        servings: 2,
        difficulty: RecipeDifficulty.EASY,
        mealType: ['breakfast'],
        cuisine: 'american',
        goodForLeftovers: false,
        ingredients: [
          { name: 'bread', amount: 4, unit: 'slices', text: '4 slices whole grain bread' },
          { name: 'avocado', amount: 2, unit: 'whole', text: '2 ripe avocados' },
          { name: 'eggs', amount: 4, unit: 'whole', text: '4 eggs' },
          { name: 'lemon', amount: 1, unit: 'whole', text: '1 lemon, juiced' },
          { name: 'salt', amount: 1, unit: 'tsp', text: '1 tsp salt' },
          { name: 'black pepper', amount: 0.5, unit: 'tsp', text: '½ tsp black pepper' },
        ],
        instructions: [
          'Toast bread until golden',
          'Mash avocados with lemon juice, salt, and pepper',
          'Poach or fry eggs to preference',
          'Spread avocado on toast',
          'Top with eggs and season'
        ]
      },
      {
        name: 'Berry Smoothie Bowl',
        description: 'Refreshing smoothie bowl with fresh toppings',
        prepTime: 10,
        cookTime: 0,
        totalTime: 10,
        servings: 2,
        difficulty: RecipeDifficulty.EASY,
        mealType: ['breakfast'],
        cuisine: 'american',
        goodForLeftovers: false,
        ingredients: [
          { name: 'banana', amount: 2, unit: 'whole', text: '2 frozen bananas' },
          { name: 'berries', amount: 2, unit: 'cups', text: '2 cups mixed berries' },
          { name: 'yogurt', amount: 1, unit: 'cup', text: '1 cup Greek yogurt' },
          { name: 'honey', amount: 2, unit: 'tbsp', text: '2 tbsp honey' },
          { name: 'granola', amount: 0.5, unit: 'cup', text: '½ cup granola for topping' },
        ],
        instructions: [
          'Blend frozen bananas, 1.5 cups berries, yogurt, and honey',
          'Pour into bowls',
          'Top with remaining berries and granola',
          'Add additional toppings as desired',
          'Serve immediately'
        ]
      },

      // ========== LUNCH RECIPES ==========
      {
        name: 'Chicken Caesar Salad',
        description: 'Classic Caesar salad with grilled chicken',
        prepTime: 15,
        cookTime: 15,
        totalTime: 30,
        servings: 4,
        difficulty: RecipeDifficulty.EASY,
        mealType: ['lunch'],
        cuisine: 'italian',
        goodForLeftovers: true,
        leftoverDays: 2,
        ingredients: [
          { name: 'chicken breast', amount: 2, unit: 'lbs', text: '2 lbs chicken breast' },
          { name: 'romaine lettuce', amount: 2, unit: 'heads', text: '2 heads romaine lettuce' },
          { name: 'parmesan', amount: 1, unit: 'cup', text: '1 cup grated parmesan' },
          { name: 'croutons', amount: 2, unit: 'cups', text: '2 cups croutons' },
          { name: 'caesar dressing', amount: 1, unit: 'cup', text: '1 cup Caesar dressing' },
          { name: 'lemon', amount: 1, unit: 'whole', text: '1 lemon' },
        ],
        instructions: [
          'Season and grill chicken until cooked through',
          'Let chicken rest, then slice',
          'Chop lettuce and place in large bowl',
          'Add dressing and toss',
          'Top with chicken, parmesan, and croutons'
        ]
      },
      {
        name: 'Vegetable Minestrone Soup',
        description: 'Hearty Italian vegetable soup',
        prepTime: 15,
        cookTime: 30,
        totalTime: 45,
        servings: 6,
        difficulty: RecipeDifficulty.MEDIUM,
        mealType: ['lunch', 'dinner'],
        cuisine: 'italian',
        goodForLeftovers: true,
        leftoverDays: 4,
        freezable: true,
        ingredients: [
          { name: 'onion', amount: 1, unit: 'whole', text: '1 large onion, diced' },
          { name: 'carrot', amount: 2, unit: 'whole', text: '2 carrots, diced' },
          { name: 'celery', amount: 2, unit: 'stalks', text: '2 celery stalks, diced' },
          { name: 'canned tomatoes', amount: 1, unit: 'can', text: '1 can (28 oz) diced tomatoes' },
          { name: 'vegetable broth', amount: 6, unit: 'cups', text: '6 cups vegetable broth' },
          { name: 'pasta', amount: 1, unit: 'cup', text: '1 cup small pasta' },
          { name: 'white beans', amount: 1, unit: 'can', text: '1 can white beans' },
        ],
        instructions: [
          'Sauté onion, carrot, and celery until soft',
          'Add tomatoes and broth, bring to boil',
          'Add pasta and beans',
          'Simmer until pasta is tender',
          'Season with salt, pepper, and herbs'
        ]
      },
      {
        name: 'Turkey Club Sandwich',
        description: 'Triple-decker sandwich with turkey, bacon, and veggies',
        prepTime: 10,
        cookTime: 5,
        totalTime: 15,
        servings: 2,
        difficulty: RecipeDifficulty.EASY,
        mealType: ['lunch'],
        cuisine: 'american',
        goodForLeftovers: false,
        ingredients: [
          { name: 'bread', amount: 6, unit: 'slices', text: '6 slices toasted bread' },
          { name: 'turkey', amount: 0.5, unit: 'lb', text: '½ lb sliced turkey' },
          { name: 'bacon', amount: 8, unit: 'strips', text: '8 strips cooked bacon' },
          { name: 'tomato', amount: 1, unit: 'whole', text: '1 large tomato, sliced' },
          { name: 'lettuce', amount: 4, unit: 'leaves', text: '4 lettuce leaves' },
          { name: 'mayonnaise', amount: 4, unit: 'tbsp', text: '4 tbsp mayonnaise' },
        ],
        instructions: [
          'Toast bread slices',
          'Cook bacon until crispy',
          'Spread mayo on toast',
          'Layer turkey, bacon, tomato, and lettuce',
          'Stack layers and secure with toothpicks'
        ]
      },
      {
        name: 'Asian Noodle Bowl',
        description: 'Quick and flavorful noodle bowl with vegetables',
        prepTime: 10,
        cookTime: 15,
        totalTime: 25,
        servings: 4,
        difficulty: RecipeDifficulty.EASY,
        mealType: ['lunch'],
        cuisine: 'asian',
        goodForLeftovers: true,
        leftoverDays: 3,
        ingredients: [
          { name: 'rice noodles', amount: 8, unit: 'oz', text: '8 oz rice noodles' },
          { name: 'tofu', amount: 1, unit: 'lb', text: '1 lb firm tofu, cubed' },
          { name: 'broccoli', amount: 2, unit: 'cups', text: '2 cups broccoli florets' },
          { name: 'carrot', amount: 2, unit: 'whole', text: '2 carrots, julienned' },
          { name: 'soy sauce', amount: 4, unit: 'tbsp', text: '4 tbsp soy sauce' },
          { name: 'sesame oil', amount: 2, unit: 'tbsp', text: '2 tbsp sesame oil' },
        ],
        instructions: [
          'Cook noodles according to package',
          'Pan-fry tofu until golden',
          'Steam or stir-fry vegetables',
          'Toss noodles with soy sauce and sesame oil',
          'Top with tofu and vegetables'
        ]
      },
      {
        name: 'Quinoa Buddha Bowl',
        description: 'Healthy grain bowl with roasted vegetables',
        prepTime: 15,
        cookTime: 25,
        totalTime: 40,
        servings: 4,
        difficulty: RecipeDifficulty.EASY,
        mealType: ['lunch'],
        cuisine: 'mediterranean',
        goodForLeftovers: true,
        leftoverDays: 3,
        ingredients: [
          { name: 'quinoa', amount: 2, unit: 'cups', text: '2 cups quinoa' },
          { name: 'sweet potato', amount: 2, unit: 'whole', text: '2 sweet potatoes, cubed' },
          { name: 'chickpeas', amount: 1, unit: 'can', text: '1 can chickpeas, drained' },
          { name: 'spinach', amount: 4, unit: 'cups', text: '4 cups fresh spinach' },
          { name: 'tahini', amount: 4, unit: 'tbsp', text: '4 tbsp tahini' },
          { name: 'lemon', amount: 2, unit: 'whole', text: '2 lemons, juiced' },
        ],
        instructions: [
          'Cook quinoa according to package',
          'Roast sweet potatoes and chickpeas at 425°F',
          'Sauté spinach until wilted',
          'Make tahini dressing with lemon juice',
          'Assemble bowls and drizzle with dressing'
        ]
      },
      {
        name: 'Grilled Cheese and Tomato Soup',
        description: 'Comfort food classic combo',
        prepTime: 5,
        cookTime: 20,
        totalTime: 25,
        servings: 4,
        difficulty: RecipeDifficulty.EASY,
        mealType: ['lunch'],
        cuisine: 'american',
        goodForLeftovers: false,
        ingredients: [
          { name: 'bread', amount: 8, unit: 'slices', text: '8 slices bread' },
          { name: 'cheese', amount: 8, unit: 'slices', text: '8 slices cheddar cheese' },
          { name: 'butter', amount: 4, unit: 'tbsp', text: '4 tbsp butter' },
          { name: 'canned tomatoes', amount: 2, unit: 'cans', text: '2 cans tomato soup' },
          { name: 'milk', amount: 1, unit: 'cup', text: '1 cup soy milk' },
        ],
        instructions: [
          'Heat tomato soup with milk',
          'Butter bread slices on one side',
          'Place cheese between bread, buttered side out',
          'Grill sandwiches until golden and cheese melts',
          'Serve with hot soup'
        ]
      },
      {
        name: 'Mediterranean Wrap',
        description: 'Fresh and healthy veggie wrap',
        prepTime: 10,
        cookTime: 0,
        totalTime: 10,
        servings: 4,
        difficulty: RecipeDifficulty.EASY,
        mealType: ['lunch'],
        cuisine: 'mediterranean',
        goodForLeftovers: false,
        ingredients: [
          { name: 'tortilla', amount: 4, unit: 'whole', text: '4 large tortillas' },
          { name: 'hummus', amount: 1, unit: 'cup', text: '1 cup hummus' },
          { name: 'cucumber', amount: 1, unit: 'whole', text: '1 cucumber, sliced' },
          { name: 'tomato', amount: 2, unit: 'whole', text: '2 tomatoes, sliced' },
          { name: 'feta cheese', amount: 1, unit: 'cup', text: '1 cup crumbled feta' },
          { name: 'lettuce', amount: 2, unit: 'cups', text: '2 cups shredded lettuce' },
        ],
        instructions: [
          'Spread hummus on tortillas',
          'Layer vegetables and feta',
          'Add lettuce',
          'Roll tightly and cut in half',
          'Secure with toothpicks if needed'
        ]
      },
      {
        name: 'Chicken Noodle Soup',
        description: 'Classic comfort soup',
        prepTime: 15,
        cookTime: 30,
        totalTime: 45,
        servings: 6,
        difficulty: RecipeDifficulty.MEDIUM,
        mealType: ['lunch', 'dinner'],
        cuisine: 'american',
        goodForLeftovers: true,
        leftoverDays: 3,
        freezable: true,
        ingredients: [
          { name: 'chicken breast', amount: 1.5, unit: 'lbs', text: '1½ lbs chicken breast' },
          { name: 'egg noodles', amount: 8, unit: 'oz', text: '8 oz egg noodles' },
          { name: 'carrot', amount: 3, unit: 'whole', text: '3 carrots, sliced' },
          { name: 'celery', amount: 3, unit: 'stalks', text: '3 celery stalks, sliced' },
          { name: 'onion', amount: 1, unit: 'whole', text: '1 onion, diced' },
          { name: 'chicken broth', amount: 8, unit: 'cups', text: '8 cups chicken broth' },
        ],
        instructions: [
          'Simmer chicken in broth until cooked',
          'Remove chicken and shred',
          'Sauté vegetables until soft',
          'Add broth and bring to boil',
          'Add noodles and cook until tender',
          'Return shredded chicken to pot'
        ]
      },

      // ========== DINNER RECIPES ==========
      {
        name: 'Spaghetti Carbonara',
        description: 'Classic Italian pasta with eggs and bacon',
        prepTime: 10,
        cookTime: 20,
        totalTime: 30,
        servings: 4,
        difficulty: RecipeDifficulty.MEDIUM,
        mealType: ['dinner'],
        cuisine: 'italian',
        goodForLeftovers: true,
        leftoverDays: 2,
        ingredients: [
          { name: 'pasta', amount: 1, unit: 'lb', text: '1 lb spaghetti' },
          { name: 'bacon', amount: 8, unit: 'oz', text: '8 oz bacon, diced' },
          { name: 'eggs', amount: 4, unit: 'whole', text: '4 large eggs' },
          { name: 'parmesan', amount: 1, unit: 'cup', text: '1 cup grated parmesan' },
          { name: 'black pepper', amount: 2, unit: 'tsp', text: '2 tsp black pepper' },
          { name: 'garlic', amount: 2, unit: 'cloves', text: '2 garlic cloves' },
        ],
        instructions: [
          'Cook pasta according to package directions',
          'Cook bacon until crispy, set aside',
          'Whisk eggs with cheese and pepper',
          'Drain pasta, reserve 1 cup pasta water',
          'Toss hot pasta with egg mixture and bacon',
          'Add pasta water to achieve creamy consistency'
        ]
      },
      {
        name: 'Beef Stir Fry',
        description: 'Quick Asian-style beef and vegetable stir fry',
        prepTime: 15,
        cookTime: 15,
        totalTime: 30,
        servings: 4,
        difficulty: RecipeDifficulty.MEDIUM,
        mealType: ['dinner'],
        cuisine: 'asian',
        goodForLeftovers: true,
        leftoverDays: 3,
        ingredients: [
          { name: 'beef sirloin', amount: 1.5, unit: 'lbs', text: '1½ lbs beef sirloin, sliced' },
          { name: 'broccoli', amount: 2, unit: 'cups', text: '2 cups broccoli florets' },
          { name: 'bell pepper', amount: 2, unit: 'whole', text: '2 bell peppers, sliced' },
          { name: 'soy sauce', amount: 4, unit: 'tbsp', text: '4 tbsp soy sauce' },
          { name: 'rice', amount: 2, unit: 'cups', text: '2 cups rice' },
          { name: 'garlic', amount: 3, unit: 'cloves', text: '3 garlic cloves, minced' },
        ],
        instructions: [
          'Cook rice according to package',
          'Marinate beef in soy sauce',
          'Heat wok or large pan very hot',
          'Stir fry beef until browned, set aside',
          'Stir fry vegetables until crisp-tender',
          'Return beef to pan, toss everything together'
        ]
      },
      {
        name: 'Baked Salmon with Herbs',
        description: 'Simple and healthy baked salmon',
        prepTime: 10,
        cookTime: 20,
        totalTime: 30,
        servings: 4,
        difficulty: RecipeDifficulty.EASY,
        mealType: ['dinner'],
        cuisine: 'american',
        goodForLeftovers: true,
        leftoverDays: 2,
        ingredients: [
          { name: 'salmon', amount: 2, unit: 'lbs', text: '2 lbs salmon fillet' },
          { name: 'lemon', amount: 2, unit: 'whole', text: '2 lemons' },
          { name: 'olive oil', amount: 3, unit: 'tbsp', text: '3 tbsp olive oil' },
          { name: 'garlic', amount: 3, unit: 'cloves', text: '3 garlic cloves, minced' },
          { name: 'dill', amount: 2, unit: 'tbsp', text: '2 tbsp fresh dill' },
          { name: 'asparagus', amount: 1, unit: 'lb', text: '1 lb asparagus' },
        ],
        instructions: [
          'Preheat oven to 400°F',
          'Place salmon on baking sheet',
          'Mix oil, garlic, lemon juice, and herbs',
          'Brush mixture over salmon',
          'Add asparagus to sheet, drizzle with oil',
          'Bake for 15-20 minutes'
        ]
      },
      {
        name: 'Chicken Fajitas',
        description: 'Sizzling Mexican-style chicken and peppers',
        prepTime: 15,
        cookTime: 20,
        totalTime: 35,
        servings: 4,
        difficulty: RecipeDifficulty.EASY,
        mealType: ['dinner'],
        cuisine: 'mexican',
        goodForLeftovers: true,
        leftoverDays: 3,
        ingredients: [
          { name: 'chicken breast', amount: 2, unit: 'lbs', text: '2 lbs chicken breast, sliced' },
          { name: 'bell pepper', amount: 3, unit: 'whole', text: '3 bell peppers, sliced' },
          { name: 'onion', amount: 2, unit: 'whole', text: '2 onions, sliced' },
          { name: 'tortilla', amount: 8, unit: 'whole', text: '8 flour tortillas' },
          { name: 'fajita seasoning', amount: 2, unit: 'tbsp', text: '2 tbsp fajita seasoning' },
          { name: 'sour cream', amount: 1, unit: 'cup', text: '1 cup sour cream' },
        ],
        instructions: [
          'Season chicken with fajita seasoning',
          'Cook chicken in hot skillet until done',
          'Remove chicken, sauté peppers and onions',
          'Return chicken to pan',
          'Warm tortillas',
          'Serve with toppings'
        ]
      },
      {
        name: 'Vegetable Lasagna',
        description: 'Hearty vegetarian lasagna with ricotta and vegetables',
        prepTime: 30,
        cookTime: 45,
        totalTime: 75,
        servings: 8,
        difficulty: RecipeDifficulty.MEDIUM,
        mealType: ['dinner'],
        cuisine: 'italian',
        goodForLeftovers: true,
        leftoverDays: 4,
        freezable: true,
        ingredients: [
          { name: 'lasagna noodles', amount: 1, unit: 'lb', text: '1 lb lasagna noodles' },
          { name: 'ricotta', amount: 2, unit: 'cups', text: '2 cups ricotta cheese' },
          { name: 'spinach', amount: 4, unit: 'cups', text: '4 cups spinach' },
          { name: 'zucchini', amount: 2, unit: 'whole', text: '2 zucchini, sliced' },
          { name: 'marinara sauce', amount: 4, unit: 'cups', text: '4 cups marinara sauce' },
          { name: 'mozzarella', amount: 3, unit: 'cups', text: '3 cups shredded mozzarella' },
        ],
        instructions: [
          'Cook lasagna noodles according to package',
          'Sauté vegetables until soft',
          'Mix ricotta with half the mozzarella',
          'Layer sauce, noodles, ricotta, vegetables',
          'Repeat layers, top with remaining mozzarella',
          'Bake at 375°F for 45 minutes'
        ]
      },
      {
        name: 'Thai Green Curry',
        description: 'Spicy and aromatic coconut curry',
        prepTime: 15,
        cookTime: 25,
        totalTime: 40,
        servings: 4,
        difficulty: RecipeDifficulty.MEDIUM,
        mealType: ['dinner'],
        cuisine: 'thai',
        goodForLeftovers: true,
        leftoverDays: 3,
        ingredients: [
          { name: 'chicken breast', amount: 1.5, unit: 'lbs', text: '1½ lbs chicken, cubed' },
          { name: 'coconut milk', amount: 2, unit: 'cans', text: '2 cans coconut milk' },
          { name: 'green curry paste', amount: 3, unit: 'tbsp', text: '3 tbsp green curry paste' },
          { name: 'bell pepper', amount: 2, unit: 'whole', text: '2 bell peppers' },
          { name: 'bamboo shoots', amount: 1, unit: 'can', text: '1 can bamboo shoots' },
          { name: 'rice', amount: 2, unit: 'cups', text: '2 cups jasmine rice' },
        ],
        instructions: [
          'Cook rice according to package',
          'Heat curry paste in pan',
          'Add coconut milk and bring to simmer',
          'Add chicken and cook through',
          'Add vegetables and simmer until tender',
          'Serve over rice'
        ]
      },
      {
        name: 'BBQ Pulled Pork',
        description: 'Slow-cooked pulled pork with BBQ sauce',
        prepTime: 15,
        cookTime: 360,
        totalTime: 375,
        servings: 8,
        difficulty: RecipeDifficulty.EASY,
        mealType: ['dinner'],
        cuisine: 'american',
        goodForLeftovers: true,
        leftoverDays: 4,
        freezable: true,
        ingredients: [
          { name: 'pork shoulder', amount: 4, unit: 'lbs', text: '4 lbs pork shoulder' },
          { name: 'bbq sauce', amount: 2, unit: 'cups', text: '2 cups BBQ sauce' },
          { name: 'brown sugar', amount: 0.25, unit: 'cup', text: '¼ cup brown sugar' },
          { name: 'paprika', amount: 2, unit: 'tbsp', text: '2 tbsp paprika' },
          { name: 'hamburger buns', amount: 8, unit: 'whole', text: '8 hamburger buns' },
          { name: 'coleslaw mix', amount: 4, unit: 'cups', text: '4 cups coleslaw mix' },
        ],
        instructions: [
          'Rub pork with spices and brown sugar',
          'Place in slow cooker with 1 cup BBQ sauce',
          'Cook on low for 6-8 hours',
          'Shred pork with forks',
          'Mix with remaining BBQ sauce',
          'Serve on buns with coleslaw'
        ]
      },
      {
        name: 'Mushroom Risotto',
        description: 'Creamy Italian rice dish with mushrooms',
        prepTime: 10,
        cookTime: 30,
        totalTime: 40,
        servings: 4,
        difficulty: RecipeDifficulty.HARD,
        mealType: ['dinner'],
        cuisine: 'italian',
        goodForLeftovers: false,
        ingredients: [
          { name: 'arborio rice', amount: 2, unit: 'cups', text: '2 cups arborio rice' },
          { name: 'mushrooms', amount: 1, unit: 'lb', text: '1 lb mixed mushrooms' },
          { name: 'vegetable broth', amount: 6, unit: 'cups', text: '6 cups vegetable broth' },
          { name: 'white wine', amount: 1, unit: 'cup', text: '1 cup white wine' },
          { name: 'parmesan', amount: 1, unit: 'cup', text: '1 cup grated parmesan' },
          { name: 'butter', amount: 4, unit: 'tbsp', text: '4 tbsp butter' },
        ],
        instructions: [
          'Heat broth and keep warm',
          'Sauté mushrooms until golden',
          'Toast rice in butter',
          'Add wine and stir until absorbed',
          'Add broth ladle by ladle, stirring constantly',
          'Finish with parmesan and butter'
        ]
      },

      // ========== SNACK/DESSERT RECIPES ==========
      {
        name: 'Chocolate Chip Cookies',
        description: 'Classic homemade chocolate chip cookies',
        prepTime: 15,
        cookTime: 12,
        totalTime: 27,
        servings: 24,
        difficulty: RecipeDifficulty.EASY,
        mealType: ['snack'],
        cuisine: 'american',
        goodForLeftovers: true,
        leftoverDays: 7,
        ingredients: [
          { name: 'flour', amount: 2.25, unit: 'cups', text: '2¼ cups all-purpose flour' },
          { name: 'butter', amount: 1, unit: 'cup', text: '1 cup softened butter' },
          { name: 'sugar', amount: 0.75, unit: 'cup', text: '¾ cup granulated sugar' },
          { name: 'brown sugar', amount: 0.75, unit: 'cup', text: '¾ cup brown sugar' },
          { name: 'eggs', amount: 2, unit: 'whole', text: '2 large eggs' },
          { name: 'chocolate chips', amount: 2, unit: 'cups', text: '2 cups chocolate chips' },
        ],
        instructions: [
          'Cream butter and sugars',
          'Beat in eggs and vanilla',
          'Mix in flour gradually',
          'Fold in chocolate chips',
          'Drop onto baking sheets',
          'Bake at 375°F for 10-12 minutes'
        ]
      },
      {
        name: 'Fruit Salad',
        description: 'Fresh mixed fruit salad with honey lime dressing',
        prepTime: 15,
        cookTime: 0,
        totalTime: 15,
        servings: 6,
        difficulty: RecipeDifficulty.EASY,
        mealType: ['snack'],
        cuisine: 'american',
        goodForLeftovers: true,
        leftoverDays: 2,
        ingredients: [
          { name: 'strawberries', amount: 2, unit: 'cups', text: '2 cups strawberries, sliced' },
          { name: 'blueberries', amount: 1, unit: 'cup', text: '1 cup blueberries' },
          { name: 'grapes', amount: 2, unit: 'cups', text: '2 cups grapes, halved' },
          { name: 'apple', amount: 2, unit: 'whole', text: '2 apples, diced' },
          { name: 'honey', amount: 3, unit: 'tbsp', text: '3 tbsp honey' },
          { name: 'lime', amount: 2, unit: 'whole', text: '2 limes, juiced' },
        ],
        instructions: [
          'Combine all fruits in large bowl',
          'Mix honey and lime juice',
          'Pour dressing over fruit',
          'Toss gently to combine',
          'Chill before serving'
        ]
      },
      {
        name: 'Hummus and Veggies',
        description: 'Healthy snack platter with homemade hummus',
        prepTime: 10,
        cookTime: 0,
        totalTime: 10,
        servings: 4,
        difficulty: RecipeDifficulty.EASY,
        mealType: ['snack'],
        cuisine: 'mediterranean',
        goodForLeftovers: true,
        leftoverDays: 3,
        ingredients: [
          { name: 'chickpeas', amount: 2, unit: 'cans', text: '2 cans chickpeas' },
          { name: 'tahini', amount: 0.5, unit: 'cup', text: '½ cup tahini' },
          { name: 'lemon', amount: 2, unit: 'whole', text: '2 lemons, juiced' },
          { name: 'carrot', amount: 4, unit: 'whole', text: '4 carrots, cut into sticks' },
          { name: 'cucumber', amount: 2, unit: 'whole', text: '2 cucumbers, sliced' },
          { name: 'bell pepper', amount: 2, unit: 'whole', text: '2 bell peppers, sliced' },
        ],
        instructions: [
          'Blend chickpeas, tahini, lemon juice',
          'Add water to achieve desired consistency',
          'Season with salt and cumin',
          'Cut vegetables into sticks',
          'Serve hummus with vegetable platter'
        ]
      },
      {
        name: 'Banana Bread',
        description: 'Moist and sweet banana bread',
        prepTime: 15,
        cookTime: 60,
        totalTime: 75,
        servings: 8,
        difficulty: RecipeDifficulty.EASY,
        mealType: ['snack'],
        cuisine: 'american',
        goodForLeftovers: true,
        leftoverDays: 5,
        freezable: true,
        ingredients: [
          { name: 'banana', amount: 4, unit: 'whole', text: '4 ripe bananas, mashed' },
          { name: 'flour', amount: 2, unit: 'cups', text: '2 cups all-purpose flour' },
          { name: 'sugar', amount: 0.75, unit: 'cup', text: '¾ cup sugar' },
          { name: 'eggs', amount: 2, unit: 'whole', text: '2 large eggs' },
          { name: 'butter', amount: 0.5, unit: 'cup', text: '½ cup melted butter' },
          { name: 'vanilla', amount: 1, unit: 'tsp', text: '1 tsp vanilla extract' },
        ],
        instructions: [
          'Mash bananas in large bowl',
          'Mix in melted butter, eggs, and vanilla',
          'Fold in flour and sugar',
          'Pour into greased loaf pan',
          'Bake at 350°F for 60 minutes',
          'Cool before slicing'
        ]
      },
      {
        name: 'Shrimp Tacos',
        description: 'Quick and flavorful shrimp tacos with lime crema',
        prepTime: 15,
        cookTime: 10,
        totalTime: 25,
        servings: 4,
        difficulty: RecipeDifficulty.EASY,
        mealType: ['lunch', 'dinner'],
        cuisine: 'mexican',
        goodForLeftovers: false,
        ingredients: [
          { name: 'shrimp', amount: 1.5, unit: 'lbs', text: '1½ lbs large shrimp, peeled' },
          { name: 'tortilla', amount: 8, unit: 'whole', text: '8 corn tortillas' },
          { name: 'cabbage', amount: 2, unit: 'cups', text: '2 cups shredded cabbage' },
          { name: 'lime', amount: 3, unit: 'whole', text: '3 limes' },
          { name: 'sour cream', amount: 0.5, unit: 'cup', text: '½ cup sour cream (or cashew cream)' },
          { name: 'cumin', amount: 1, unit: 'tsp', text: '1 tsp cumin' },
          { name: 'paprika', amount: 1, unit: 'tsp', text: '1 tsp paprika' },
        ],
        instructions: [
          'Season shrimp with cumin, paprika, salt and pepper',
          'Sauté shrimp until pink and cooked through',
          'Mix sour cream with lime juice for crema',
          'Warm tortillas',
          'Assemble tacos with shrimp, cabbage, and crema',
          'Serve with lime wedges'
        ]
      },
      {
        name: 'Vegetable Fried Rice',
        description: 'Classic fried rice with mixed vegetables',
        prepTime: 10,
        cookTime: 15,
        totalTime: 25,
        servings: 4,
        difficulty: RecipeDifficulty.EASY,
        mealType: ['lunch', 'dinner'],
        cuisine: 'asian',
        goodForLeftovers: true,
        leftoverDays: 3,
        ingredients: [
          { name: 'rice', amount: 3, unit: 'cups', text: '3 cups cooked rice (preferably day-old)' },
          { name: 'eggs', amount: 3, unit: 'whole', text: '3 eggs, beaten' },
          { name: 'peas', amount: 1, unit: 'cup', text: '1 cup frozen peas' },
          { name: 'carrot', amount: 2, unit: 'whole', text: '2 carrots, diced' },
          { name: 'green onion', amount: 4, unit: 'whole', text: '4 green onions, sliced' },
          { name: 'soy sauce', amount: 3, unit: 'tbsp', text: '3 tbsp soy sauce' },
          { name: 'sesame oil', amount: 2, unit: 'tsp', text: '2 tsp sesame oil' },
        ],
        instructions: [
          'Heat oil in wok or large pan',
          'Scramble eggs and set aside',
          'Stir-fry vegetables until tender',
          'Add rice and break up clumps',
          'Add soy sauce and sesame oil',
          'Return eggs to pan and mix everything'
        ]
      }
    ]

    // Create recipes
    for (const recipeData of recipes) {
      console.log(`  Creating recipe: ${recipeData.name}`)
      
      const recipe = await prisma.recipe.create({
        data: {
          userId: testUser.id,
          name: recipeData.name,
          description: recipeData.description,
          prepTime: recipeData.prepTime,
          cookTime: recipeData.cookTime,
          totalTime: recipeData.totalTime,
          servings: recipeData.servings,
          difficulty: recipeData.difficulty,
          mealType: recipeData.mealType,
          cuisine: recipeData.cuisine,
          goodForLeftovers: recipeData.goodForLeftovers,
          leftoverDays: recipeData.leftoverDays,
          freezable: recipeData.freezable || false,
        }
      })

      // Add ingredients
      if (recipeData.ingredients) {
        for (const ing of recipeData.ingredients) {
          await prisma.recipeIngredient.create({
            data: {
              recipeId: recipe.id,
              ingredientId: getIngredientId(ing.name) || null,
              amount: ing.amount,
              unit: ing.unit,
              originalText: ing.text,
              optional: false
            }
          })
        }
      }

      // Add instructions
      if (recipeData.instructions) {
        for (let i = 0; i < recipeData.instructions.length; i++) {
          await prisma.recipeInstruction.create({
            data: {
              recipeId: recipe.id,
              stepNumber: i + 1,
              instruction: recipeData.instructions[i]
            }
          })
        }
      }
    }
    console.log(`✅ Created ${recipes.length} recipes (Total: 25 - 5 breakfast, 9 lunch, 8 dinner, 3 snacks)`)

    // ============ 4. CREATE PANTRY ITEMS ============
    console.log('\n📦 Creating pantry items...')
    
    const pantryItems = [
      // FRIDGE ITEMS (20-25)
      { name: 'Whole Milk', ingredientId: getIngredientId('milk'), amount: 0.5, unit: 'gallon', location: PantryLocation.FRIDGE, expiresIn: 5 },
      { name: 'Soy Milk', ingredientId: getIngredientId('milk'), amount: 1, unit: 'quart', location: PantryLocation.FRIDGE, expiresIn: 7 },
      { name: 'Greek Yogurt', ingredientId: getIngredientId('yogurt'), amount: 32, unit: 'oz', location: PantryLocation.FRIDGE, expiresIn: 10 },
      { name: 'Cheddar Cheese', ingredientId: getIngredientId('cheese'), amount: 1, unit: 'lb', location: PantryLocation.FRIDGE, expiresIn: 21 },
      { name: 'Mozzarella', ingredientId: getIngredientId('cheese'), amount: 8, unit: 'oz', location: PantryLocation.FRIDGE, expiresIn: 14 },
      { name: 'Eggs', ingredientId: getIngredientId('eggs'), amount: 18, unit: 'count', location: PantryLocation.FRIDGE, expiresIn: 21 },
      { name: 'Butter', ingredientId: getIngredientId('butter'), amount: 1, unit: 'lb', location: PantryLocation.FRIDGE, expiresIn: 60 },
      { name: 'Chicken Breasts', ingredientId: getIngredientId('chicken breast'), amount: 2, unit: 'lbs', location: PantryLocation.FRIDGE, expiresIn: 2 },
      { name: 'Ground Beef', ingredientId: getIngredientId('ground beef'), amount: 1, unit: 'lb', location: PantryLocation.FRIDGE, expiresIn: 1 },
      { name: 'Salmon Fillet', ingredientId: getIngredientId('salmon'), amount: 1, unit: 'lb', location: PantryLocation.FRIDGE, expiresIn: 1 },
      { name: 'Baby Spinach', ingredientId: getIngredientId('spinach'), amount: 5, unit: 'oz', location: PantryLocation.FRIDGE, expiresIn: 4 },
      { name: 'Romaine Lettuce', ingredientId: null, amount: 2, unit: 'heads', location: PantryLocation.FRIDGE, expiresIn: 7 },
      { name: 'Bell Peppers', ingredientId: getIngredientId('bell pepper'), amount: 3, unit: 'count', location: PantryLocation.FRIDGE, expiresIn: 10 },
      { name: 'Carrots', ingredientId: getIngredientId('carrot'), amount: 2, unit: 'lbs', location: PantryLocation.FRIDGE, expiresIn: 21 },
      { name: 'Celery', ingredientId: null, amount: 1, unit: 'bunch', location: PantryLocation.FRIDGE, expiresIn: 14 },
      { name: 'Mushrooms', ingredientId: null, amount: 8, unit: 'oz', location: PantryLocation.FRIDGE, expiresIn: 5 },
      { name: 'Sour Cream', ingredientId: null, amount: 16, unit: 'oz', location: PantryLocation.FRIDGE, expiresIn: 14 },
      { name: 'Cream Cheese', ingredientId: null, amount: 8, unit: 'oz', location: PantryLocation.FRIDGE, expiresIn: 30 },
      { name: 'Orange Juice', ingredientId: null, amount: 0.5, unit: 'gallon', location: PantryLocation.FRIDGE, expiresIn: 7 },
      { name: 'Maple Syrup', ingredientId: null, amount: 12, unit: 'oz', location: PantryLocation.FRIDGE, expiresIn: 365 },
      { name: 'Dijon Mustard', ingredientId: null, amount: 8, unit: 'oz', location: PantryLocation.FRIDGE, expiresIn: 365 },
      { name: 'Mayo', ingredientId: null, amount: 32, unit: 'oz', location: PantryLocation.FRIDGE, expiresIn: 90 },
      { name: 'Leftover Pasta', ingredientId: null, amount: 2, unit: 'servings', location: PantryLocation.FRIDGE, expiresIn: 2, isLeftover: true },

      // FREEZER ITEMS (20-25)
      { name: 'Frozen Chicken Thighs', ingredientId: getIngredientId('chicken breast'), amount: 3, unit: 'lbs', location: PantryLocation.FREEZER, expiresIn: 120 },
      { name: 'Ground Turkey', ingredientId: null, amount: 2, unit: 'lbs', location: PantryLocation.FREEZER, expiresIn: 90 },
      { name: 'Frozen Shrimp', ingredientId: null, amount: 1, unit: 'lb', location: PantryLocation.FREEZER, expiresIn: 180 },
      { name: 'Frozen Broccoli', ingredientId: getIngredientId('broccoli'), amount: 16, unit: 'oz', location: PantryLocation.FREEZER, expiresIn: 240 },
      { name: 'Frozen Peas', ingredientId: null, amount: 16, unit: 'oz', location: PantryLocation.FREEZER, expiresIn: 240 },
      { name: 'Frozen Corn', ingredientId: null, amount: 16, unit: 'oz', location: PantryLocation.FREEZER, expiresIn: 240 },
      { name: 'Frozen Mixed Berries', ingredientId: null, amount: 2, unit: 'lbs', location: PantryLocation.FREEZER, expiresIn: 365 },
      { name: 'Frozen Pizza', ingredientId: null, amount: 2, unit: 'count', location: PantryLocation.FREEZER, expiresIn: 180 },
      { name: 'Ice Cream', ingredientId: null, amount: 1, unit: 'quart', location: PantryLocation.FREEZER, expiresIn: 60 },
      { name: 'Frozen Bread Dough', ingredientId: null, amount: 2, unit: 'loaves', location: PantryLocation.FREEZER, expiresIn: 90 },
      { name: 'Frozen French Fries', ingredientId: null, amount: 32, unit: 'oz', location: PantryLocation.FREEZER, expiresIn: 365 },
      { name: 'Frozen Spinach', ingredientId: getIngredientId('spinach'), amount: 10, unit: 'oz', location: PantryLocation.FREEZER, expiresIn: 300 },
      { name: 'Pork Chops', ingredientId: null, amount: 4, unit: 'count', location: PantryLocation.FREEZER, expiresIn: 120 },
      { name: 'Bacon', ingredientId: null, amount: 1, unit: 'lb', location: PantryLocation.FREEZER, expiresIn: 60 },
      { name: 'Frozen Waffles', ingredientId: null, amount: 1, unit: 'box', location: PantryLocation.FREEZER, expiresIn: 365 },
      { name: 'Fish Sticks', ingredientId: null, amount: 1, unit: 'box', location: PantryLocation.FREEZER, expiresIn: 540 },
      { name: 'Frozen Edamame', ingredientId: null, amount: 16, unit: 'oz', location: PantryLocation.FREEZER, expiresIn: 365 },
      { name: 'Pie Crust', ingredientId: null, amount: 2, unit: 'count', location: PantryLocation.FREEZER, expiresIn: 180 },
      { name: 'Frozen Mango', ingredientId: null, amount: 1, unit: 'lb', location: PantryLocation.FREEZER, expiresIn: 365 },
      { name: 'Chicken Nuggets', ingredientId: null, amount: 2, unit: 'lbs', location: PantryLocation.FREEZER, expiresIn: 365 },

      // PANTRY ITEMS (30-35)
      { name: 'White Rice', ingredientId: getIngredientId('rice'), amount: 5, unit: 'lbs', location: PantryLocation.PANTRY, expiresIn: 730 },
      { name: 'Brown Rice', ingredientId: getIngredientId('rice'), amount: 2, unit: 'lbs', location: PantryLocation.PANTRY, expiresIn: 365 },
      { name: 'Spaghetti', ingredientId: getIngredientId('pasta'), amount: 2, unit: 'lbs', location: PantryLocation.PANTRY, expiresIn: 730 },
      { name: 'Penne Pasta', ingredientId: getIngredientId('pasta'), amount: 1, unit: 'lb', location: PantryLocation.PANTRY, expiresIn: 730 },
      { name: 'All-Purpose Flour', ingredientId: getIngredientId('flour'), amount: 5, unit: 'lbs', location: PantryLocation.PANTRY, expiresIn: 365 },
      { name: 'Sugar', ingredientId: null, amount: 4, unit: 'lbs', location: PantryLocation.PANTRY, expiresIn: 9999 },
      { name: 'Brown Sugar', ingredientId: null, amount: 2, unit: 'lbs', location: PantryLocation.PANTRY, expiresIn: 730 },
      { name: 'Rolled Oats', ingredientId: getIngredientId('oats'), amount: 42, unit: 'oz', location: PantryLocation.PANTRY, expiresIn: 730 },
      { name: 'Quinoa', ingredientId: null, amount: 1, unit: 'lb', location: PantryLocation.PANTRY, expiresIn: 1095 },
      { name: 'Bread Crumbs', ingredientId: null, amount: 15, unit: 'oz', location: PantryLocation.PANTRY, expiresIn: 365 },
      { name: 'Canned Tomatoes', ingredientId: getIngredientId('canned tomatoes'), amount: 4, unit: 'cans', location: PantryLocation.PANTRY, expiresIn: 730 },
      { name: 'Tomato Sauce', ingredientId: null, amount: 3, unit: 'cans', location: PantryLocation.PANTRY, expiresIn: 730 },
      { name: 'Black Beans', ingredientId: getIngredientId('black beans'), amount: 3, unit: 'cans', location: PantryLocation.PANTRY, expiresIn: 1095 },
      { name: 'Chickpeas', ingredientId: getIngredientId('chickpeas'), amount: 2, unit: 'cans', location: PantryLocation.PANTRY, expiresIn: 1095 },
      { name: 'Coconut Milk', ingredientId: getIngredientId('coconut milk'), amount: 2, unit: 'cans', location: PantryLocation.PANTRY, expiresIn: 730 },
      { name: 'Chicken Broth', ingredientId: null, amount: 4, unit: 'quarts', location: PantryLocation.PANTRY, expiresIn: 730 },
      { name: 'Vegetable Broth', ingredientId: null, amount: 2, unit: 'quarts', location: PantryLocation.PANTRY, expiresIn: 730 },
      { name: 'Olive Oil', ingredientId: getIngredientId('olive oil'), amount: 1, unit: 'liter', location: PantryLocation.PANTRY, expiresIn: 730 },
      { name: 'Vegetable Oil', ingredientId: getIngredientId('vegetable oil'), amount: 48, unit: 'oz', location: PantryLocation.PANTRY, expiresIn: 730 },
      { name: 'Sesame Oil', ingredientId: null, amount: 8, unit: 'oz', location: PantryLocation.PANTRY, expiresIn: 365 },
      { name: 'Soy Sauce', ingredientId: getIngredientId('soy sauce'), amount: 16, unit: 'oz', location: PantryLocation.PANTRY, expiresIn: 1095 },
      { name: 'Balsamic Vinegar', ingredientId: getIngredientId('vinegar'), amount: 16, unit: 'oz', location: PantryLocation.PANTRY, expiresIn: 1095 },
      { name: 'Apple Cider Vinegar', ingredientId: null, amount: 16, unit: 'oz', location: PantryLocation.PANTRY, expiresIn: 1095 },
      { name: 'Honey', ingredientId: getIngredientId('honey'), amount: 1, unit: 'lb', location: PantryLocation.PANTRY, expiresIn: 9999 },
      { name: 'Peanut Butter', ingredientId: null, amount: 18, unit: 'oz', location: PantryLocation.PANTRY, expiresIn: 180 },
      { name: 'Jam', ingredientId: null, amount: 12, unit: 'oz', location: PantryLocation.PANTRY, expiresIn: 365 },
      { name: 'Crackers', ingredientId: null, amount: 1, unit: 'box', location: PantryLocation.PANTRY, expiresIn: 180 },
      { name: 'Cereal', ingredientId: null, amount: 2, unit: 'boxes', location: PantryLocation.PANTRY, expiresIn: 365 },
      { name: 'Tortilla Chips', ingredientId: null, amount: 1, unit: 'bag', location: PantryLocation.PANTRY, expiresIn: 60 },
      { name: 'Pretzels', ingredientId: null, amount: 1, unit: 'bag', location: PantryLocation.PANTRY, expiresIn: 90 },
      { name: 'Almonds', ingredientId: null, amount: 1, unit: 'lb', location: PantryLocation.PANTRY, expiresIn: 365 },
      { name: 'Walnuts', ingredientId: null, amount: 8, unit: 'oz', location: PantryLocation.PANTRY, expiresIn: 365 },
      { name: 'Chocolate Chips', ingredientId: null, amount: 12, unit: 'oz', location: PantryLocation.PANTRY, expiresIn: 730 },
      { name: 'Baking Powder', ingredientId: null, amount: 8, unit: 'oz', location: PantryLocation.PANTRY, expiresIn: 540 },
      { name: 'Baking Soda', ingredientId: null, amount: 1, unit: 'lb', location: PantryLocation.PANTRY, expiresIn: 730 },

      // COUNTER ITEMS
      { name: 'Bananas', ingredientId: getIngredientId('banana'), amount: 6, unit: 'count', location: PantryLocation.COUNTER, expiresIn: 4 },
      { name: 'Apples', ingredientId: getIngredientId('apple'), amount: 5, unit: 'count', location: PantryLocation.COUNTER, expiresIn: 7 },
      { name: 'Oranges', ingredientId: getIngredientId('orange'), amount: 4, unit: 'count', location: PantryLocation.COUNTER, expiresIn: 7 },
      { name: 'Tomatoes', ingredientId: getIngredientId('tomato'), amount: 4, unit: 'count', location: PantryLocation.COUNTER, expiresIn: 5 },
      { name: 'Onions', ingredientId: getIngredientId('onion'), amount: 3, unit: 'count', location: PantryLocation.COUNTER, expiresIn: 30 },
      { name: 'Garlic', ingredientId: getIngredientId('garlic'), amount: 2, unit: 'heads', location: PantryLocation.COUNTER, expiresIn: 180 },
      { name: 'Potatoes', ingredientId: getIngredientId('potato'), amount: 5, unit: 'lbs', location: PantryLocation.COUNTER, expiresIn: 21 },
      { name: 'Sweet Potatoes', ingredientId: null, amount: 3, unit: 'count', location: PantryLocation.COUNTER, expiresIn: 14 },
      { name: 'Bread', ingredientId: getIngredientId('bread'), amount: 1, unit: 'loaf', location: PantryLocation.COUNTER, expiresIn: 5 },
      { name: 'Bagels', ingredientId: null, amount: 6, unit: 'count', location: PantryLocation.COUNTER, expiresIn: 4 },
      { name: 'Avocados', ingredientId: null, amount: 3, unit: 'count', location: PantryLocation.COUNTER, expiresIn: 3 },
      { name: 'Lemons', ingredientId: getIngredientId('lemon'), amount: 4, unit: 'count', location: PantryLocation.COUNTER, expiresIn: 7 },
      { name: 'Limes', ingredientId: null, amount: 3, unit: 'count', location: PantryLocation.COUNTER, expiresIn: 7 },

      // SPICE RACK (15-20)
      { name: 'Salt', ingredientId: getIngredientId('salt'), amount: 26, unit: 'oz', location: PantryLocation.SPICE_RACK, expiresIn: 9999 },
      { name: 'Black Pepper', ingredientId: getIngredientId('black pepper'), amount: 4, unit: 'oz', location: PantryLocation.SPICE_RACK, expiresIn: 1095 },
      { name: 'Paprika', ingredientId: getIngredientId('paprika'), amount: 2, unit: 'oz', location: PantryLocation.SPICE_RACK, expiresIn: 1095 },
      { name: 'Cumin', ingredientId: getIngredientId('cumin'), amount: 2, unit: 'oz', location: PantryLocation.SPICE_RACK, expiresIn: 1095 },
      { name: 'Oregano', ingredientId: getIngredientId('oregano'), amount: 1, unit: 'oz', location: PantryLocation.SPICE_RACK, expiresIn: 1095 },
      { name: 'Basil', ingredientId: getIngredientId('basil'), amount: 1, unit: 'oz', location: PantryLocation.SPICE_RACK, expiresIn: 1095 },
      { name: 'Thyme', ingredientId: getIngredientId('thyme'), amount: 1, unit: 'oz', location: PantryLocation.SPICE_RACK, expiresIn: 1095 },
      { name: 'Rosemary', ingredientId: null, amount: 1, unit: 'oz', location: PantryLocation.SPICE_RACK, expiresIn: 1095 },
      { name: 'Cinnamon', ingredientId: null, amount: 2, unit: 'oz', location: PantryLocation.SPICE_RACK, expiresIn: 1095 },
      { name: 'Nutmeg', ingredientId: null, amount: 1, unit: 'oz', location: PantryLocation.SPICE_RACK, expiresIn: 1095 },
      { name: 'Ginger Powder', ingredientId: null, amount: 1, unit: 'oz', location: PantryLocation.SPICE_RACK, expiresIn: 1095 },
      { name: 'Garlic Powder', ingredientId: null, amount: 2, unit: 'oz', location: PantryLocation.SPICE_RACK, expiresIn: 730 },
      { name: 'Onion Powder', ingredientId: null, amount: 2, unit: 'oz', location: PantryLocation.SPICE_RACK, expiresIn: 730 },
      { name: 'Chili Powder', ingredientId: null, amount: 2, unit: 'oz', location: PantryLocation.SPICE_RACK, expiresIn: 1095 },
      { name: 'Cayenne Pepper', ingredientId: null, amount: 1, unit: 'oz', location: PantryLocation.SPICE_RACK, expiresIn: 1095 },
      { name: 'Italian Seasoning', ingredientId: null, amount: 2, unit: 'oz', location: PantryLocation.SPICE_RACK, expiresIn: 730 },
      { name: 'Bay Leaves', ingredientId: null, amount: 0.5, unit: 'oz', location: PantryLocation.SPICE_RACK, expiresIn: 1095 },
      { name: 'Vanilla Extract', ingredientId: null, amount: 4, unit: 'oz', location: PantryLocation.SPICE_RACK, expiresIn: 1460 },
    ]

    let pantryCount = 0
    for (const item of pantryItems) {
      await prisma.pantryItem.create({
        data: {
          userId: testUser.id,
          ingredientId: item.ingredientId,
          customName: item.name,
          amount: item.amount,
          unit: item.unit,
          location: item.location,
          purchaseDate: item.location === PantryLocation.FREEZER ? daysAgo(30) : daysAgo(7),
          expirationDate: daysFromNow(item.expiresIn),
          isLeftover: item.isLeftover || false,
          leftoverDate: item.isLeftover ? daysAgo(2) : null,
        }
      })
      pantryCount++
    }
    console.log(`✅ Created ${pantryCount} pantry items (Total: 109 across all locations)`)

    // ============ 5. CREATE MEAL PLANS ============
    console.log('\n📅 Creating meal plans...')
    
    // Get recipes for meal planning
    const userRecipes = await prisma.recipe.findMany({
      where: { userId: testUser.id }
    })
    
    const breakfastRecipes = userRecipes.filter(r => r.mealType.includes('breakfast'))
    const lunchRecipes = userRecipes.filter(r => r.mealType.includes('lunch'))
    const dinnerRecipes = userRecipes.filter(r => r.mealType.includes('dinner'))
    const snackRecipes = userRecipes.filter(r => r.mealType.includes('snack'))

    // Create current week meal plan
    const weekStart = new Date()
    weekStart.setHours(0, 0, 0, 0)
    const dayOfWeek = weekStart.getDay()
    const diff = weekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1) // Adjust to Monday
    weekStart.setDate(diff)

    const mealPlan = await prisma.mealPlan.create({
      data: {
        userId: testUser.id,
        weekStartDate: weekStart,
        status: MealPlanStatus.ACTIVE,
        generatedBy: 'test-seed',
        constraints: {
          maxCookTime: 45,
          preferSoyMilk: true,
          avoidClams: true,
          targetServings: 4
        }
      }
    })

    // Plan meals for the week
    const mealSchedule = [
      { day: 0, meals: [
        { type: MealType.BREAKFAST, recipe: breakfastRecipes[0] },
        { type: MealType.LUNCH, recipe: lunchRecipes[0] },
        { type: MealType.DINNER, recipe: dinnerRecipes[0] },
      ]},
      { day: 1, meals: [
        { type: MealType.BREAKFAST, recipe: breakfastRecipes[1] },
        { type: MealType.LUNCH, recipe: null, simpleMeal: 'Leftover Spaghetti Carbonara' },
        { type: MealType.DINNER, recipe: dinnerRecipes[1] },
      ]},
      { day: 2, meals: [
        { type: MealType.BREAKFAST, recipe: breakfastRecipes[2] },
        { type: MealType.LUNCH, recipe: lunchRecipes[1] },
        { type: MealType.DINNER, recipe: dinnerRecipes[2] },
      ]},
      { day: 3, meals: [
        { type: MealType.BREAKFAST, recipe: breakfastRecipes[3] },
        { type: MealType.LUNCH, recipe: lunchRecipes[2] },
        { type: MealType.DINNER, recipe: dinnerRecipes[3] },
      ]},
      { day: 4, meals: [
        { type: MealType.BREAKFAST, recipe: breakfastRecipes[4] },
        { type: MealType.LUNCH, recipe: lunchRecipes[3] },
        { type: MealType.DINNER, recipe: null, isEatingOut: true, restaurant: 'Pizza Place' },
      ]},
      { day: 5, meals: [
        { type: MealType.BREAKFAST, recipe: null, simpleMeal: 'Cereal and Fruit' },
        { type: MealType.LUNCH, recipe: lunchRecipes[4] },
        { type: MealType.DINNER, recipe: dinnerRecipes[4] },
      ]},
      { day: 6, meals: [
        { type: MealType.BREAKFAST, recipe: breakfastRecipes[0] },
        { type: MealType.LUNCH, recipe: null, simpleMeal: 'Sandwiches' },
        { type: MealType.DINNER, recipe: dinnerRecipes[5] },
        { type: MealType.SNACK, recipe: snackRecipes[0] },
      ]},
    ]

    for (const dayPlan of mealSchedule) {
      const mealDate = new Date(weekStart)
      mealDate.setDate(mealDate.getDate() + dayPlan.day)
      
      for (const meal of dayPlan.meals) {
        await prisma.plannedMeal.create({
          data: {
            mealPlanId: mealPlan.id,
            recipeId: meal.recipe?.id || null,
            date: mealDate,
            mealType: meal.type,
            servings: 4,
            isCooked: dayPlan.day < 2, // First two days are marked as cooked
            cookedAt: dayPlan.day < 2 ? mealDate : null,
            isEatingOut: meal.isEatingOut || false,
            restaurantName: meal.restaurant || null,
            simpleMealName: meal.simpleMeal || null,
            expectLeftovers: meal.recipe?.goodForLeftovers || false,
            leftoverServings: meal.recipe?.goodForLeftovers ? 2 : null,
          }
        })
      }
    }
    console.log('✅ Created meal plan for current week')

    // ============ 6. SUMMARY ============
    console.log('\n✨ Test data seeding complete!')
    console.log('📊 Summary:')
    console.log(`  • User: ${testUser.email}`)
    console.log(`  • Recipes: ${recipes.length} (5 breakfast, 10 lunch/dinner, 8 dinner, 4 snacks)`)
    console.log(`  • Pantry Items: ${pantryCount} (Fridge: 23, Freezer: 20, Pantry: 35, Counter: 13, Spice Rack: 18)`)
    console.log(`  • Meal Plans: 1 (current week)`)
    console.log(`  • User Preferences: Set (clam allergy, prefers soy milk)`)
    console.log('\n🎉 Your NoChickenLeftBehind app is now fully populated with test data!')
    
  } catch (error) {
    console.error('❌ Error seeding test data:', error)
    throw error
  }
}

// Run the seeding
seedTestData()
  .then(() => {
    console.log('\n✅ All done! Exiting...')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())