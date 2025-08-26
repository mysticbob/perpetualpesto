// Test user data for consistent testing
export const TEST_USER_ID = 'user-123';

// Sample recipe data for testing
export const sampleRecipe = {
  title: 'Test Chocolate Chip Cookies',
  ingredients: [
    '2 cups all-purpose flour',
    '1 cup butter',
    '1/2 cup brown sugar',
    '1/2 cup granulated sugar',
    '2 large eggs',
    '1 tsp vanilla extract',
    '1 tsp baking soda',
    '1/2 tsp salt',
    '2 cups chocolate chips'
  ],
  instructions: [
    'Preheat oven to 375°F',
    'Mix dry ingredients in a bowl',
    'Cream butter and sugars',
    'Add eggs and vanilla',
    'Combine wet and dry ingredients',
    'Fold in chocolate chips',
    'Drop spoonfuls on baking sheet',
    'Bake for 9-11 minutes'
  ],
  servings: 24,
  prepTime: 15,
  cookTime: 11,
  tags: ['dessert', 'cookies', 'baking']
};

// Sample pantry items for testing
export const samplePantryItems = [
  {
    name: 'All-purpose flour',
    amount: '5',
    unit: 'cups',
    category: 'Baking',
    expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
  },
  {
    name: 'Butter',
    amount: '2',
    unit: 'sticks',
    category: 'Dairy',
    expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
  },
  {
    name: 'Brown sugar',
    amount: '1',
    unit: 'cup',
    category: 'Baking',
    expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year from now
  }
];

// Sample grocery list for testing
export const sampleGroceryItems = [
  { name: 'Eggs', quantity: '1 dozen', category: 'Dairy' },
  { name: 'Vanilla extract', quantity: '1 bottle', category: 'Baking' },
  { name: 'Chocolate chips', quantity: '2 bags', category: 'Baking' },
  { name: 'Milk', quantity: '1 gallon', category: 'Dairy' }
];

// API endpoints for testing
export const API_ENDPOINTS = {
  health: '/health',
  recipes: '/api/recipes',
  pantry: '/api/pantry',
  groceryList: '/api/grocery-list',
  users: '/api/users'
};