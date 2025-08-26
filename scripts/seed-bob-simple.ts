import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedBobData() {
  console.log('🌱 Seeding data for bobkuehne@gmail.com...');
  
  try {
    // Create or update Bob's user account
    const bob = await prisma.user.upsert({
      where: { email: 'bobkuehne@gmail.com' },
      update: {
        name: 'Bob Kuehne'
      },
      create: {
        email: 'bobkuehne@gmail.com',
        name: 'Bob Kuehne'
      }
    });
    
    console.log('✅ User created/updated:', bob.email);
    
    // Create or update user preferences
    await prisma.userPreferences.upsert({
      where: { userId: bob.id },
      update: {
        dietaryRestrictions: ['no-shellfish', 'no-clams'],
        allergies: ['clams', 'shellfish'],
        dislikedIngredients: ['raw fish', 'oysters'],
        preferredCuisines: ['Italian', 'Mexican', 'American', 'Asian', 'Mediterranean'],
        skillLevel: 'intermediate',
        maxCookTimeMinutes: 60,
        servingsPerMeal: 4,
        planningMode: 'assisted',
        weeklyBudget: 200
      },
      create: {
        userId: bob.id,
        dietaryRestrictions: ['no-shellfish', 'no-clams'],
        allergies: ['clams', 'shellfish'],
        dislikedIngredients: ['raw fish', 'oysters'],
        preferredCuisines: ['Italian', 'Mexican', 'American', 'Asian', 'Mediterranean'],
        skillLevel: 'intermediate',
        maxCookTimeMinutes: 60,
        servingsPerMeal: 4,
        planningMode: 'assisted',
        weeklyBudget: 200
      }
    });
    
    console.log('✅ User preferences set');

    // Clear existing data for Bob
    await prisma.pantryItem.deleteMany({ where: { userId: bob.id } });
    await prisma.recipe.deleteMany({ where: { userId: bob.id } });
    await prisma.mealPlan.deleteMany({ where: { userId: bob.id } });
    await prisma.groceryItem.deleteMany({ where: { userId: bob.id } });
    
    console.log('✅ Cleared existing data');

    // Create 250 pantry items with proper categories
    const pantryCategories = {
      FRIDGE: ['Soy Milk', 'Almond Milk', 'Greek Yogurt', 'Eggs', 'Butter', 'Cheese', 'Chicken Breast', 'Ground Beef', 'Salmon', 'Tofu'],
      FREEZER: ['Frozen Berries', 'Ice Cream', 'Frozen Pizza', 'Frozen Vegetables', 'Ground Turkey'],
      PANTRY: ['Rice', 'Pasta', 'Flour', 'Sugar', 'Olive Oil', 'Canned Tomatoes', 'Beans', 'Quinoa', 'Oats', 'Bread'],
      COUNTER: ['Bananas', 'Apples', 'Oranges', 'Tomatoes', 'Onions', 'Potatoes', 'Avocados']
    };

    let itemCount = 0;
    const allItems = [];

    // Generate items for each location
    for (const [location, items] of Object.entries(pantryCategories)) {
      for (const baseItem of items) {
        // Create multiple variations to reach 250 items
        for (let i = 0; i < 5; i++) {
          const expirationDate = new Date();
          const daysToExpire = location === 'FREEZER' ? 180 : location === 'PANTRY' ? 365 : location === 'COUNTER' ? 7 : 14;
          expirationDate.setDate(expirationDate.getDate() + Math.floor(Math.random() * daysToExpire) + 1);
          
          const item = {
            userId: bob.id,
            customName: i === 0 ? baseItem : `${baseItem} (${['Organic', 'Premium', 'Store Brand', 'Bulk', 'Fresh'][i]})`,
            amount: Math.floor(Math.random() * 3) + 1,
            unit: ['lbs', 'oz', 'pieces', 'bottles', 'cans', 'packages'][Math.floor(Math.random() * 6)],
            location: location as any,
            expirationDate,
            purchaseDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
            isLeftover: false,
            purchasePrice: Math.random() * 20 + 1
          };
          
          allItems.push(item);
          itemCount++;
          
          if (itemCount >= 250) break;
        }
        if (itemCount >= 250) break;
      }
      if (itemCount >= 250) break;
    }

    // Add remaining items to reach exactly 250
    while (allItems.length < 250) {
      const randomLocation = ['FRIDGE', 'FREEZER', 'PANTRY', 'COUNTER'][Math.floor(Math.random() * 4)];
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + Math.floor(Math.random() * 30) + 1);
      
      allItems.push({
        userId: bob.id,
        customName: `Special Item ${allItems.length + 1}`,
        amount: Math.floor(Math.random() * 5) + 1,
        unit: 'pieces',
        location: randomLocation as any,
        expirationDate,
        purchaseDate: new Date(),
        isLeftover: false,
        purchasePrice: Math.random() * 15 + 1
      });
    }

    // Create all pantry items
    for (const item of allItems) {
      await prisma.pantryItem.create({ data: item });
    }

    console.log(`✅ Created ${allItems.length} pantry items`);

    // Create 25 recipes
    const recipeData = [
      'Spaghetti Carbonara', 'Thai Green Curry', 'Mediterranean Quinoa Bowl', 'Beef Tacos', 'Grilled Salmon',
      'Chicken Stir Fry', 'Margherita Pizza', 'Greek Salad', 'Beef and Broccoli', 'Caesar Salad',
      'Vegetable Curry', 'Shrimp Scampi', 'Turkey Chili', 'Caprese Sandwich', 'Teriyaki Chicken Bowl',
      'Stuffed Bell Peppers', 'Pad Thai', 'BBQ Pulled Pork', 'Mushroom Risotto', 'Fish Tacos',
      'Breakfast Burrito', 'Lemon Herb Chicken', 'Veggie Burger', 'Chicken Fajitas', 'Tofu Stir Fry'
    ];

    const createdRecipes = [];
    for (const recipeName of recipeData) {
      const recipe = await prisma.recipe.create({
        data: {
          userId: bob.id,
          name: recipeName,
          description: `Delicious ${recipeName} recipe`,
          prepTime: Math.floor(Math.random() * 20) + 10,
          cookTime: Math.floor(Math.random() * 40) + 10,
          totalTime: Math.floor(Math.random() * 60) + 20,
          servings: 4,
          difficulty: ['EASY', 'MEDIUM', 'HARD'][Math.floor(Math.random() * 3)] as any,
          mealType: ['breakfast', 'lunch', 'dinner'],
          cuisine: ['Italian', 'Asian', 'American', 'Mexican', 'Mediterranean'][Math.floor(Math.random() * 5)]
        }
      });

      // Add 5-8 ingredients per recipe
      const numIngredients = Math.floor(Math.random() * 4) + 5;
      for (let i = 0; i < numIngredients; i++) {
        await prisma.recipeIngredient.create({
          data: {
            recipeId: recipe.id,
            originalText: `Ingredient ${i + 1} for ${recipeName}`,
            amount: Math.floor(Math.random() * 3) + 1,
            unit: ['cups', 'tbsp', 'tsp', 'oz', 'lbs'][Math.floor(Math.random() * 5)],
            optional: Math.random() > 0.8
          }
        });
      }

      // Add 3-6 instructions per recipe
      const numInstructions = Math.floor(Math.random() * 4) + 3;
      for (let i = 0; i < numInstructions; i++) {
        await prisma.recipeInstruction.create({
          data: {
            recipeId: recipe.id,
            stepNumber: i + 1,
            instruction: `Step ${i + 1}: Prepare and cook the ingredients for ${recipeName}`,
            timeMinutes: Math.floor(Math.random() * 10) + 5
          }
        });
      }

      createdRecipes.push(recipe);
    }

    console.log(`✅ Created ${createdRecipes.length} recipes with ingredients and instructions`);

    // Create an active meal plan for the current week
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const mealPlan = await prisma.mealPlan.create({
      data: {
        userId: bob.id,
        weekStartDate: startOfWeek,
        status: 'ACTIVE',
        generatedBy: 'manual'
      }
    });

    // Add planned meals for each day
    const daysOfWeek = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const mealTypes = ['BREAKFAST', 'LUNCH', 'DINNER'];
    
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      for (const mealType of mealTypes) {
        const randomRecipe = createdRecipes[Math.floor(Math.random() * createdRecipes.length)];
        const mealDate = new Date(startOfWeek);
        mealDate.setDate(mealDate.getDate() + dayIndex);
        
        await prisma.plannedMeal.create({
          data: {
            mealPlanId: mealPlan.id,
            recipeId: randomRecipe.id,
            date: mealDate,
            mealType: mealType as any,
            servings: 4,
            isCooked: dayIndex < today.getDay()
          }
        });
      }
    }

    console.log('✅ Created meal plan for current week');

    // Add items to grocery list
    const groceryItems = [
      { name: 'Soy Milk (Silk brand preferred)', amount: '2', unit: 'cartons', category: 'Dairy' },
      { name: 'Free-range Eggs', amount: '2', unit: 'dozen', category: 'Proteins' },
      { name: 'Whole Wheat Bread', amount: '1', unit: 'loaf', category: 'Bakery' },
      { name: 'Organic Bananas', amount: '2', unit: 'bunches', category: 'Produce' },
      { name: 'Baby Spinach', amount: '1', unit: 'bag', category: 'Produce' },
      { name: 'Chicken Breast (no antibiotics)', amount: '3', unit: 'lbs', category: 'Meat' },
      { name: 'Brown Rice', amount: '1', unit: 'bag', category: 'Grains' },
      { name: 'Ripe Avocados', amount: '6', unit: 'pieces', category: 'Produce' },
      { name: 'Greek Yogurt', amount: '1', unit: 'container', category: 'Dairy' },
      { name: 'Quinoa', amount: '1', unit: 'box', category: 'Grains' },
      { name: 'Extra Virgin Olive Oil', amount: '1', unit: 'bottle', category: 'Oils' },
      { name: 'Fresh Basil', amount: '1', unit: 'bunch', category: 'Herbs' },
      { name: 'Cherry Tomatoes', amount: '2', unit: 'pints', category: 'Produce' },
      { name: 'Almond Butter', amount: '1', unit: 'jar', category: 'Condiments' },
      { name: 'Coconut Milk', amount: '2', unit: 'cans', category: 'International' }
    ];

    for (const item of groceryItems) {
      await prisma.groceryItem.create({
        data: {
          userId: bob.id,
          name: item.name,
          amount: item.amount,
          unit: item.unit,
          category: item.category,
          completed: false
        }
      });
    }

    console.log(`✅ Added ${groceryItems.length} items to grocery list`);

    console.log('\n🎉 Successfully seeded data for bobkuehne@gmail.com!');
    console.log(`
Summary:
- User: ${bob.email}
- Pantry Items: ${allItems.length}
- Recipes: ${createdRecipes.length} (with ingredients and instructions)
- Meal Plan: Active for current week with all meals planned
- Grocery Items: ${groceryItems.length}
- User Preferences: No clams/shellfish, prefers soy milk
- Dietary Restrictions: Set
- Weekly Budget: $200
`);
  } catch (error) {
    console.error('Error seeding data:', error);
    throw error;
  }
}

seedBobData()
  .catch((e) => {
    console.error('Failed to seed data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });