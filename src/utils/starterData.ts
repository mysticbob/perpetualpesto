import { PantryItem } from '../contexts/PantryContext'
import { GroceryItem } from '../contexts/GroceryContext'

// Sample pantry data for new users
export const generateSamplePantryData = () => {
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  
  // Helper to create expiration dates
  const addDays = (date: Date, days: number) => {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result.toISOString()
  }

  const pantryItems: PantryItem[] = [
    // Refrigerator items
    {
      id: 'pantry-1',
      name: 'Milk',
      amount: '1',
      unit: 'gallon',
      location: 'refrigerator',
      category: 'dairy',
      addedDate: twoDaysAgo.toISOString(),
      expirationDate: addDays(now, 5)
    },
    {
      id: 'pantry-2',
      name: 'Eggs',
      amount: '12',
      unit: 'pieces',
      location: 'refrigerator',
      category: 'dairy',
      addedDate: threeDaysAgo.toISOString(),
      expirationDate: addDays(now, 14)
    },
    {
      id: 'pantry-3',
      name: 'Cheddar Cheese',
      amount: '8',
      unit: 'oz',
      location: 'refrigerator',
      category: 'dairy',
      addedDate: yesterday.toISOString(),
      expirationDate: addDays(now, 21)
    },
    {
      id: 'pantry-4',
      name: 'Carrots',
      amount: '2',
      unit: 'lb',
      location: 'refrigerator',
      category: 'vegetables',
      addedDate: twoDaysAgo.toISOString(),
      expirationDate: addDays(now, 10)
    },
    {
      id: 'pantry-5',
      name: 'Bell Peppers',
      amount: '3',
      unit: 'pieces',
      location: 'refrigerator',
      category: 'vegetables',
      addedDate: yesterday.toISOString(),
      expirationDate: addDays(now, 7)
    },
    {
      id: 'pantry-6',
      name: 'Spinach',
      amount: '5',
      unit: 'oz',
      location: 'refrigerator',
      category: 'vegetables',
      addedDate: now.toISOString(),
      expirationDate: addDays(now, 5)
    },
    {
      id: 'pantry-7',
      name: 'Ground Beef',
      amount: '1',
      unit: 'lb',
      location: 'refrigerator',
      category: 'meat',
      addedDate: yesterday.toISOString(),
      expirationDate: addDays(now, 3)
    },
    {
      id: 'pantry-8',
      name: 'Chicken Breast',
      amount: '2',
      unit: 'lb',
      location: 'refrigerator',
      category: 'meat',
      addedDate: now.toISOString(),
      expirationDate: addDays(now, 4)
    },

    // Pantry items
    {
      id: 'pantry-9',
      name: 'Rice',
      amount: '2',
      unit: 'lb',
      location: 'pantry',
      category: 'grains',
      addedDate: oneWeekAgo.toISOString(),
      expirationDate: addDays(now, 365)
    },
    {
      id: 'pantry-10',
      name: 'Pasta',
      amount: '1',
      unit: 'lb',
      location: 'pantry',
      category: 'grains',
      addedDate: threeDaysAgo.toISOString(),
      expirationDate: addDays(now, 730)
    },
    {
      id: 'pantry-11',
      name: 'Black Beans',
      amount: '2',
      unit: 'cans',
      location: 'pantry',
      category: 'legumes',
      addedDate: twoDaysAgo.toISOString(),
      expirationDate: addDays(now, 730)
    },
    {
      id: 'pantry-12',
      name: 'Diced Tomatoes',
      amount: '3',
      unit: 'cans',
      location: 'pantry',
      category: 'canned',
      addedDate: yesterday.toISOString(),
      expirationDate: addDays(now, 730)
    },
    {
      id: 'pantry-13',
      name: 'Olive Oil',
      amount: '500',
      unit: 'ml',
      location: 'pantry',
      category: 'oils',
      addedDate: oneWeekAgo.toISOString(),
      expirationDate: addDays(now, 730)
    },
    {
      id: 'pantry-14',
      name: 'Salt',
      amount: '1',
      unit: 'container',
      location: 'pantry',
      category: 'spices',
      addedDate: oneWeekAgo.toISOString(),
      expirationDate: addDays(now, 1825)
    },
    {
      id: 'pantry-15',
      name: 'Black Pepper',
      amount: '1',
      unit: 'container',
      location: 'pantry',
      category: 'spices',
      addedDate: oneWeekAgo.toISOString(),
      expirationDate: addDays(now, 1095)
    },
    {
      id: 'pantry-16',
      name: 'Garlic',
      amount: '1',
      unit: 'bulb',
      location: 'pantry',
      category: 'aromatics',
      addedDate: threeDaysAgo.toISOString(),
      expirationDate: addDays(now, 90)
    },
    {
      id: 'pantry-17',
      name: 'Onions',
      amount: '3',
      unit: 'pieces',
      location: 'pantry',
      category: 'vegetables',
      addedDate: twoDaysAgo.toISOString(),
      expirationDate: addDays(now, 30)
    },
    {
      id: 'pantry-18',
      name: 'Potatoes',
      amount: '5',
      unit: 'lb',
      location: 'pantry',
      category: 'vegetables',
      addedDate: yesterday.toISOString(),
      expirationDate: addDays(now, 30)
    },

    // Freezer items
    {
      id: 'pantry-19',
      name: 'Frozen Peas',
      amount: '1',
      unit: 'bag',
      location: 'freezer',
      category: 'vegetables',
      addedDate: oneWeekAgo.toISOString(),
      expirationDate: addDays(now, 365)
    },
    {
      id: 'pantry-20',
      name: 'Ice Cream',
      amount: '1',
      unit: 'container',
      location: 'freezer',
      category: 'desserts',
      addedDate: threeDaysAgo.toISOString(),
      expirationDate: addDays(now, 180)
    }
  ]

  return [
    {
      id: 'refrigerator',
      name: 'Refrigerator',
      items: pantryItems.filter(item => item.location === 'refrigerator')
    },
    {
      id: 'pantry',
      name: 'Pantry',
      items: pantryItems.filter(item => item.location === 'pantry')
    },
    {
      id: 'freezer',
      name: 'Freezer',
      items: pantryItems.filter(item => item.location === 'freezer')
    }
  ]
}

// Sample grocery list data
export const generateSampleGroceryData = (): GroceryItem[] => {
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)

  return [
    {
      id: 'grocery-1',
      name: 'Bread',
      amount: '1',
      unit: 'loaf',
      category: 'grains',
      completed: false,
      addedDate: now.toISOString()
    },
    {
      id: 'grocery-2',
      name: 'Bananas',
      amount: '6',
      unit: 'pieces',
      category: 'vegetables',
      completed: false,
      addedDate: yesterday.toISOString()
    },
    {
      id: 'grocery-3',
      name: 'Greek Yogurt',
      amount: '1',
      unit: 'container',
      category: 'dairy',
      completed: false,
      addedDate: yesterday.toISOString()
    },
    {
      id: 'grocery-4',
      name: 'Salmon Fillets',
      amount: '1',
      unit: 'lb',
      category: 'meat',
      completed: false,
      addedDate: twoDaysAgo.toISOString()
    },
    {
      id: 'grocery-5',
      name: 'Broccoli',
      amount: '1',
      unit: 'head',
      category: 'vegetables',
      completed: false,
      addedDate: now.toISOString()
    },
    {
      id: 'grocery-6',
      name: 'Lemons',
      amount: '3',
      unit: 'pieces',
      category: 'vegetables',
      completed: true,
      addedDate: twoDaysAgo.toISOString()
    },
    {
      id: 'grocery-7',
      name: 'Butter',
      amount: '1',
      unit: 'stick',
      category: 'dairy',
      completed: true,
      addedDate: yesterday.toISOString()
    }
  ]
}

// Sample recipe data
export const generateSampleRecipes = () => {
  return [
    {
      id: 'recipe-1',
      name: 'Classic Spaghetti Carbonara',
      description: 'Creamy Italian pasta dish with eggs, cheese, and pancetta',
      prepTime: 15,
      cookTime: 20,
      totalTime: 35,
      servings: 4,
      imageUrl: 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=400',
      ingredients: [
        { id: '1', name: 'spaghetti', amount: '1', unit: 'lb' },
        { id: '2', name: 'pancetta', amount: '4', unit: 'oz' },
        { id: '3', name: 'eggs', amount: '3', unit: 'pieces' },
        { id: '4', name: 'parmesan cheese', amount: '1', unit: 'cup' },
        { id: '5', name: 'black pepper', amount: '1', unit: 'tsp' },
        { id: '6', name: 'salt', amount: '1', unit: 'tsp' }
      ],
      instructions: [
        { id: '1', step: 'Bring a large pot of salted water to boil. Cook spaghetti according to package directions.' },
        { id: '2', step: 'While pasta cooks, dice pancetta and cook in a large skillet until crispy.' },
        { id: '3', step: 'In a bowl, whisk together eggs, parmesan, and black pepper.' },
        { id: '4', step: 'Drain pasta, reserving 1 cup pasta water. Add hot pasta to pancetta.' },
        { id: '5', step: 'Remove from heat and quickly stir in egg mixture, adding pasta water as needed.' },
        { id: '6', step: 'Serve immediately with extra parmesan and black pepper.' }
      ]
    },
    {
      id: 'recipe-2',
      name: 'Chicken Stir Fry',
      description: 'Quick and healthy stir fry with fresh vegetables',
      prepTime: 10,
      cookTime: 15,
      totalTime: 25,
      servings: 3,
      imageUrl: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400',
      ingredients: [
        { id: '1', name: 'chicken breast', amount: '1', unit: 'lb' },
        { id: '2', name: 'bell peppers', amount: '2', unit: 'pieces' },
        { id: '3', name: 'broccoli', amount: '1', unit: 'head' },
        { id: '4', name: 'carrots', amount: '2', unit: 'pieces' },
        { id: '5', name: 'soy sauce', amount: '3', unit: 'tbsp' },
        { id: '6', name: 'garlic', amount: '3', unit: 'cloves' },
        { id: '7', name: 'ginger', amount: '1', unit: 'tbsp' },
        { id: '8', name: 'olive oil', amount: '2', unit: 'tbsp' }
      ],
      instructions: [
        { id: '1', step: 'Cut chicken into bite-sized pieces and season with salt and pepper.' },
        { id: '2', step: 'Chop all vegetables into uniform pieces.' },
        { id: '3', step: 'Heat oil in a large wok or skillet over high heat.' },
        { id: '4', step: 'Cook chicken until golden brown, about 5-6 minutes.' },
        { id: '5', step: 'Add vegetables and stir-fry for 3-4 minutes until crisp-tender.' },
        { id: '6', step: 'Add garlic, ginger, and soy sauce. Stir-fry for 1 more minute.' },
        { id: '7', step: 'Serve immediately over rice or noodles.' }
      ]
    },
    {
      id: 'recipe-3',
      name: 'Vegetarian Black Bean Tacos',
      description: 'Flavorful plant-based tacos with seasoned black beans',
      prepTime: 10,
      cookTime: 15,
      totalTime: 25,
      servings: 4,
      imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400',
      ingredients: [
        { id: '1', name: 'black beans', amount: '2', unit: 'cans' },
        { id: '2', name: 'corn tortillas', amount: '8', unit: 'pieces' },
        { id: '3', name: 'avocado', amount: '2', unit: 'pieces' },
        { id: '4', name: 'lime', amount: '2', unit: 'pieces' },
        { id: '5', name: 'red onion', amount: '1', unit: 'pieces' },
        { id: '6', name: 'cilantro', amount: '1/4', unit: 'cup' },
        { id: '7', name: 'cumin', amount: '1', unit: 'tsp' },
        { id: '8', name: 'chili powder', amount: '1', unit: 'tsp' }
      ],
      instructions: [
        { id: '1', step: 'Drain and rinse black beans.' },
        { id: '2', step: 'Heat beans in a pan with cumin, chili powder, and a splash of water.' },
        { id: '3', step: 'Warm tortillas in a dry skillet or microwave.' },
        { id: '4', step: 'Dice avocado, red onion, and chop cilantro.' },
        { id: '5', step: 'Fill tortillas with seasoned beans and toppings.' },
        { id: '6', step: 'Serve with lime wedges.' }
      ]
    }
  ]
}

// Function to initialize starter data for new users
export const initializeStarterData = () => {
  return {
    pantry: generateSamplePantryData(),
    groceries: generateSampleGroceryData(),
    recipes: generateSampleRecipes()
  }
}

// Function to check if user needs starter data
export const shouldShowStarterData = () => {
  const hasExistingPantry = localStorage.getItem('pantryData')
  const hasExistingGroceries = localStorage.getItem('groceryItems')
  
  return !hasExistingPantry && !hasExistingGroceries
}