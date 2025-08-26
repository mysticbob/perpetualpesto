import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedBobData() {
  console.log('🌱 Seeding data for bobkuehne@gmail.com...');
  
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
      planningMode: 'assisted'
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
      planningMode: 'assisted'
    }
  });

  console.log('✅ User created/updated:', bob.email);

  // Clear existing data for Bob
  await prisma.pantryItem.deleteMany({ where: { userId: bob.id } });
  await prisma.recipe.deleteMany({ where: { userId: bob.id } });
  await prisma.mealPlan.deleteMany({ where: { userId: bob.id } });
  await prisma.groceryItem.deleteMany({ where: { userId: bob.id } });

  // Create 250 pantry items with varied categories and expiration dates
  const pantryItems = [
    // Proteins (35 items)
    { name: 'Chicken Breast', quantity: '3 lbs', category: 'Proteins', expiresIn: 3 },
    { name: 'Ground Beef', quantity: '2 lbs', category: 'Proteins', expiresIn: 2 },
    { name: 'Salmon Fillets', quantity: '1.5 lbs', category: 'Proteins', expiresIn: 2 },
    { name: 'Pork Chops', quantity: '2 lbs', category: 'Proteins', expiresIn: 3 },
    { name: 'Turkey Breast', quantity: '1 lb', category: 'Proteins', expiresIn: 4 },
    { name: 'Bacon', quantity: '1 lb', category: 'Proteins', expiresIn: 7 },
    { name: 'Italian Sausage', quantity: '1 lb', category: 'Proteins', expiresIn: 3 },
    { name: 'Shrimp', quantity: '1 lb', category: 'Proteins', expiresIn: 2 },
    { name: 'Tofu', quantity: '2 blocks', category: 'Proteins', expiresIn: 10 },
    { name: 'Tempeh', quantity: '8 oz', category: 'Proteins', expiresIn: 14 },
    { name: 'Ground Turkey', quantity: '1.5 lbs', category: 'Proteins', expiresIn: 2 },
    { name: 'Ham Slices', quantity: '12 oz', category: 'Proteins', expiresIn: 5 },
    { name: 'Chicken Thighs', quantity: '2 lbs', category: 'Proteins', expiresIn: 3 },
    { name: 'Beef Steak', quantity: '1.5 lbs', category: 'Proteins', expiresIn: 3 },
    { name: 'Lamb Chops', quantity: '1 lb', category: 'Proteins', expiresIn: 3 },
    { name: 'Duck Breast', quantity: '1 lb', category: 'Proteins', expiresIn: 3 },
    { name: 'Cod Fillets', quantity: '1 lb', category: 'Proteins', expiresIn: 2 },
    { name: 'Tuna Steaks', quantity: '1 lb', category: 'Proteins', expiresIn: 2 },
    { name: 'Crab Meat', quantity: '8 oz', category: 'Proteins', expiresIn: 1 },
    { name: 'Lobster Tail', quantity: '2 pieces', category: 'Proteins', expiresIn: 2 },
    { name: 'Eggs', quantity: '2 dozen', category: 'Proteins', expiresIn: 21 },
    { name: 'Egg Whites', quantity: '1 carton', category: 'Proteins', expiresIn: 10 },
    { name: 'Black Beans', quantity: '2 cans', category: 'Proteins', expiresIn: 730 },
    { name: 'Chickpeas', quantity: '2 cans', category: 'Proteins', expiresIn: 730 },
    { name: 'Lentils', quantity: '1 lb dry', category: 'Proteins', expiresIn: 365 },
    { name: 'Kidney Beans', quantity: '2 cans', category: 'Proteins', expiresIn: 730 },
    { name: 'Pinto Beans', quantity: '1 lb dry', category: 'Proteins', expiresIn: 365 },
    { name: 'White Beans', quantity: '2 cans', category: 'Proteins', expiresIn: 730 },
    { name: 'Edamame', quantity: '1 lb frozen', category: 'Proteins', expiresIn: 180 },
    { name: 'Seitan', quantity: '8 oz', category: 'Proteins', expiresIn: 14 },
    { name: 'Protein Powder', quantity: '2 lbs', category: 'Proteins', expiresIn: 365 },
    { name: 'Beef Jerky', quantity: '8 oz', category: 'Proteins', expiresIn: 90 },
    { name: 'Canned Tuna', quantity: '6 cans', category: 'Proteins', expiresIn: 730 },
    { name: 'Canned Chicken', quantity: '4 cans', category: 'Proteins', expiresIn: 730 },
    { name: 'Sardines', quantity: '4 cans', category: 'Proteins', expiresIn: 730 },

    // Dairy & Dairy Alternatives (35 items)
    { name: 'Soy Milk', quantity: '2 cartons', category: 'Dairy', expiresIn: 7 },
    { name: 'Almond Milk', quantity: '1 carton', category: 'Dairy', expiresIn: 7 },
    { name: 'Oat Milk', quantity: '1 carton', category: 'Dairy', expiresIn: 7 },
    { name: 'Greek Yogurt', quantity: '32 oz', category: 'Dairy', expiresIn: 14 },
    { name: 'Cheddar Cheese', quantity: '1 lb', category: 'Dairy', expiresIn: 30 },
    { name: 'Mozzarella', quantity: '1 lb', category: 'Dairy', expiresIn: 21 },
    { name: 'Parmesan', quantity: '8 oz', category: 'Dairy', expiresIn: 60 },
    { name: 'Butter', quantity: '1 lb', category: 'Dairy', expiresIn: 30 },
    { name: 'Cream Cheese', quantity: '8 oz', category: 'Dairy', expiresIn: 14 },
    { name: 'Sour Cream', quantity: '16 oz', category: 'Dairy', expiresIn: 14 },
    { name: 'Heavy Cream', quantity: '1 pint', category: 'Dairy', expiresIn: 7 },
    { name: 'Half and Half', quantity: '1 pint', category: 'Dairy', expiresIn: 7 },
    { name: 'Cottage Cheese', quantity: '24 oz', category: 'Dairy', expiresIn: 10 },
    { name: 'Ricotta', quantity: '15 oz', category: 'Dairy', expiresIn: 7 },
    { name: 'Feta Cheese', quantity: '8 oz', category: 'Dairy', expiresIn: 30 },
    { name: 'Swiss Cheese', quantity: '8 oz', category: 'Dairy', expiresIn: 30 },
    { name: 'Provolone', quantity: '8 oz', category: 'Dairy', expiresIn: 30 },
    { name: 'Goat Cheese', quantity: '4 oz', category: 'Dairy', expiresIn: 14 },
    { name: 'Blue Cheese', quantity: '4 oz', category: 'Dairy', expiresIn: 30 },
    { name: 'Brie', quantity: '8 oz', category: 'Dairy', expiresIn: 7 },
    { name: 'Coconut Milk', quantity: '2 cans', category: 'Dairy', expiresIn: 730 },
    { name: 'Cashew Milk', quantity: '1 carton', category: 'Dairy', expiresIn: 7 },
    { name: 'Vegan Butter', quantity: '8 oz', category: 'Dairy', expiresIn: 60 },
    { name: 'Vegan Cheese', quantity: '8 oz', category: 'Dairy', expiresIn: 30 },
    { name: 'Coconut Yogurt', quantity: '16 oz', category: 'Dairy', expiresIn: 14 },
    { name: 'Kefir', quantity: '32 oz', category: 'Dairy', expiresIn: 14 },
    { name: 'Mascarpone', quantity: '8 oz', category: 'Dairy', expiresIn: 7 },
    { name: 'Whipped Cream', quantity: '1 can', category: 'Dairy', expiresIn: 30 },
    { name: 'Ice Cream', quantity: '1 gallon', category: 'Dairy', expiresIn: 60 },
    { name: 'Frozen Yogurt', quantity: '1 quart', category: 'Dairy', expiresIn: 60 },
    { name: 'String Cheese', quantity: '12 pack', category: 'Dairy', expiresIn: 30 },
    { name: 'Babybel Cheese', quantity: '10 pack', category: 'Dairy', expiresIn: 60 },
    { name: 'Laughing Cow', quantity: '8 wedges', category: 'Dairy', expiresIn: 45 },
    { name: 'Evaporated Milk', quantity: '2 cans', category: 'Dairy', expiresIn: 365 },
    { name: 'Condensed Milk', quantity: '1 can', category: 'Dairy', expiresIn: 365 },

    // Vegetables (40 items)
    { name: 'Tomatoes', quantity: '2 lbs', category: 'Vegetables', expiresIn: 5 },
    { name: 'Onions', quantity: '3 lbs', category: 'Vegetables', expiresIn: 30 },
    { name: 'Garlic', quantity: '10 heads', category: 'Vegetables', expiresIn: 60 },
    { name: 'Bell Peppers', quantity: '6 pieces', category: 'Vegetables', expiresIn: 7 },
    { name: 'Carrots', quantity: '2 lbs', category: 'Vegetables', expiresIn: 21 },
    { name: 'Celery', quantity: '1 bunch', category: 'Vegetables', expiresIn: 14 },
    { name: 'Broccoli', quantity: '2 heads', category: 'Vegetables', expiresIn: 7 },
    { name: 'Cauliflower', quantity: '1 head', category: 'Vegetables', expiresIn: 7 },
    { name: 'Spinach', quantity: '1 lb', category: 'Vegetables', expiresIn: 5 },
    { name: 'Kale', quantity: '1 bunch', category: 'Vegetables', expiresIn: 7 },
    { name: 'Lettuce', quantity: '2 heads', category: 'Vegetables', expiresIn: 7 },
    { name: 'Cucumbers', quantity: '4 pieces', category: 'Vegetables', expiresIn: 7 },
    { name: 'Zucchini', quantity: '3 pieces', category: 'Vegetables', expiresIn: 7 },
    { name: 'Yellow Squash', quantity: '2 pieces', category: 'Vegetables', expiresIn: 7 },
    { name: 'Potatoes', quantity: '5 lbs', category: 'Vegetables', expiresIn: 30 },
    { name: 'Sweet Potatoes', quantity: '3 lbs', category: 'Vegetables', expiresIn: 30 },
    { name: 'Mushrooms', quantity: '1 lb', category: 'Vegetables', expiresIn: 7 },
    { name: 'Green Beans', quantity: '1 lb', category: 'Vegetables', expiresIn: 7 },
    { name: 'Asparagus', quantity: '1 lb', category: 'Vegetables', expiresIn: 5 },
    { name: 'Brussels Sprouts', quantity: '1 lb', category: 'Vegetables', expiresIn: 7 },
    { name: 'Cabbage', quantity: '1 head', category: 'Vegetables', expiresIn: 14 },
    { name: 'Bok Choy', quantity: '2 heads', category: 'Vegetables', expiresIn: 5 },
    { name: 'Eggplant', quantity: '2 pieces', category: 'Vegetables', expiresIn: 7 },
    { name: 'Corn', quantity: '6 ears', category: 'Vegetables', expiresIn: 5 },
    { name: 'Peas', quantity: '1 lb frozen', category: 'Vegetables', expiresIn: 180 },
    { name: 'Green Onions', quantity: '2 bunches', category: 'Vegetables', expiresIn: 7 },
    { name: 'Leeks', quantity: '3 pieces', category: 'Vegetables', expiresIn: 14 },
    { name: 'Radishes', quantity: '1 bunch', category: 'Vegetables', expiresIn: 14 },
    { name: 'Beets', quantity: '1 lb', category: 'Vegetables', expiresIn: 14 },
    { name: 'Turnips', quantity: '1 lb', category: 'Vegetables', expiresIn: 14 },
    { name: 'Parsnips', quantity: '1 lb', category: 'Vegetables', expiresIn: 14 },
    { name: 'Artichokes', quantity: '4 pieces', category: 'Vegetables', expiresIn: 7 },
    { name: 'Jalapeños', quantity: '10 pieces', category: 'Vegetables', expiresIn: 14 },
    { name: 'Serrano Peppers', quantity: '10 pieces', category: 'Vegetables', expiresIn: 14 },
    { name: 'Poblano Peppers', quantity: '4 pieces', category: 'Vegetables', expiresIn: 7 },
    { name: 'Cherry Tomatoes', quantity: '2 pints', category: 'Vegetables', expiresIn: 5 },
    { name: 'Roma Tomatoes', quantity: '1 lb', category: 'Vegetables', expiresIn: 5 },
    { name: 'Butternut Squash', quantity: '2 pieces', category: 'Vegetables', expiresIn: 30 },
    { name: 'Acorn Squash', quantity: '2 pieces', category: 'Vegetables', expiresIn: 30 },
    { name: 'Spaghetti Squash', quantity: '1 piece', category: 'Vegetables', expiresIn: 30 },

    // Fruits (30 items)
    { name: 'Apples', quantity: '3 lbs', category: 'Fruits', expiresIn: 21 },
    { name: 'Bananas', quantity: '2 bunches', category: 'Fruits', expiresIn: 5 },
    { name: 'Oranges', quantity: '2 lbs', category: 'Fruits', expiresIn: 14 },
    { name: 'Lemons', quantity: '10 pieces', category: 'Fruits', expiresIn: 21 },
    { name: 'Limes', quantity: '10 pieces', category: 'Fruits', expiresIn: 21 },
    { name: 'Grapes', quantity: '2 lbs', category: 'Fruits', expiresIn: 7 },
    { name: 'Strawberries', quantity: '2 lbs', category: 'Fruits', expiresIn: 3 },
    { name: 'Blueberries', quantity: '2 pints', category: 'Fruits', expiresIn: 5 },
    { name: 'Raspberries', quantity: '2 pints', category: 'Fruits', expiresIn: 3 },
    { name: 'Blackberries', quantity: '2 pints', category: 'Fruits', expiresIn: 3 },
    { name: 'Mangoes', quantity: '3 pieces', category: 'Fruits', expiresIn: 5 },
    { name: 'Pineapple', quantity: '1 whole', category: 'Fruits', expiresIn: 5 },
    { name: 'Watermelon', quantity: '1 whole', category: 'Fruits', expiresIn: 7 },
    { name: 'Cantaloupe', quantity: '1 whole', category: 'Fruits', expiresIn: 7 },
    { name: 'Honeydew', quantity: '1 whole', category: 'Fruits', expiresIn: 7 },
    { name: 'Peaches', quantity: '1 lb', category: 'Fruits', expiresIn: 5 },
    { name: 'Pears', quantity: '1 lb', category: 'Fruits', expiresIn: 7 },
    { name: 'Plums', quantity: '1 lb', category: 'Fruits', expiresIn: 5 },
    { name: 'Cherries', quantity: '1 lb', category: 'Fruits', expiresIn: 5 },
    { name: 'Grapefruit', quantity: '4 pieces', category: 'Fruits', expiresIn: 14 },
    { name: 'Kiwi', quantity: '6 pieces', category: 'Fruits', expiresIn: 7 },
    { name: 'Avocados', quantity: '6 pieces', category: 'Fruits', expiresIn: 5 },
    { name: 'Pomegranate', quantity: '2 pieces', category: 'Fruits', expiresIn: 14 },
    { name: 'Papaya', quantity: '1 piece', category: 'Fruits', expiresIn: 5 },
    { name: 'Dragon Fruit', quantity: '2 pieces', category: 'Fruits', expiresIn: 5 },
    { name: 'Star Fruit', quantity: '3 pieces', category: 'Fruits', expiresIn: 5 },
    { name: 'Passion Fruit', quantity: '4 pieces', category: 'Fruits', expiresIn: 7 },
    { name: 'Dates', quantity: '1 lb', category: 'Fruits', expiresIn: 180 },
    { name: 'Figs', quantity: '1 lb', category: 'Fruits', expiresIn: 5 },
    { name: 'Cranberries', quantity: '12 oz', category: 'Fruits', expiresIn: 30 },

    // Grains & Pasta (30 items)
    { name: 'White Rice', quantity: '5 lbs', category: 'Grains', expiresIn: 730 },
    { name: 'Brown Rice', quantity: '3 lbs', category: 'Grains', expiresIn: 365 },
    { name: 'Jasmine Rice', quantity: '2 lbs', category: 'Grains', expiresIn: 730 },
    { name: 'Basmati Rice', quantity: '2 lbs', category: 'Grains', expiresIn: 730 },
    { name: 'Wild Rice', quantity: '1 lb', category: 'Grains', expiresIn: 365 },
    { name: 'Quinoa', quantity: '2 lbs', category: 'Grains', expiresIn: 365 },
    { name: 'Couscous', quantity: '1 lb', category: 'Grains', expiresIn: 365 },
    { name: 'Bulgur', quantity: '1 lb', category: 'Grains', expiresIn: 365 },
    { name: 'Farro', quantity: '1 lb', category: 'Grains', expiresIn: 365 },
    { name: 'Barley', quantity: '1 lb', category: 'Grains', expiresIn: 365 },
    { name: 'Oats', quantity: '3 lbs', category: 'Grains', expiresIn: 365 },
    { name: 'Steel Cut Oats', quantity: '2 lbs', category: 'Grains', expiresIn: 365 },
    { name: 'Spaghetti', quantity: '2 lbs', category: 'Grains', expiresIn: 730 },
    { name: 'Penne', quantity: '2 lbs', category: 'Grains', expiresIn: 730 },
    { name: 'Rigatoni', quantity: '1 lb', category: 'Grains', expiresIn: 730 },
    { name: 'Fusilli', quantity: '1 lb', category: 'Grains', expiresIn: 730 },
    { name: 'Farfalle', quantity: '1 lb', category: 'Grains', expiresIn: 730 },
    { name: 'Linguine', quantity: '1 lb', category: 'Grains', expiresIn: 730 },
    { name: 'Fettuccine', quantity: '1 lb', category: 'Grains', expiresIn: 730 },
    { name: 'Angel Hair', quantity: '1 lb', category: 'Grains', expiresIn: 730 },
    { name: 'Lasagna Noodles', quantity: '1 lb', category: 'Grains', expiresIn: 730 },
    { name: 'Orzo', quantity: '1 lb', category: 'Grains', expiresIn: 730 },
    { name: 'Rice Noodles', quantity: '1 lb', category: 'Grains', expiresIn: 730 },
    { name: 'Udon Noodles', quantity: '1 lb', category: 'Grains', expiresIn: 365 },
    { name: 'Soba Noodles', quantity: '1 lb', category: 'Grains', expiresIn: 365 },
    { name: 'Ramen Noodles', quantity: '12 packs', category: 'Grains', expiresIn: 365 },
    { name: 'Bread', quantity: '2 loaves', category: 'Grains', expiresIn: 5 },
    { name: 'Tortillas', quantity: '2 packs', category: 'Grains', expiresIn: 14 },
    { name: 'Pita Bread', quantity: '1 pack', category: 'Grains', expiresIn: 7 },
    { name: 'Bagels', quantity: '6 pieces', category: 'Grains', expiresIn: 5 },

    // Pantry Staples & Condiments (50 items)
    { name: 'All-Purpose Flour', quantity: '5 lbs', category: 'Pantry', expiresIn: 365 },
    { name: 'Bread Flour', quantity: '5 lbs', category: 'Pantry', expiresIn: 365 },
    { name: 'Whole Wheat Flour', quantity: '3 lbs', category: 'Pantry', expiresIn: 180 },
    { name: 'Sugar', quantity: '5 lbs', category: 'Pantry', expiresIn: 730 },
    { name: 'Brown Sugar', quantity: '2 lbs', category: 'Pantry', expiresIn: 730 },
    { name: 'Powdered Sugar', quantity: '1 lb', category: 'Pantry', expiresIn: 730 },
    { name: 'Honey', quantity: '1 lb', category: 'Pantry', expiresIn: 730 },
    { name: 'Maple Syrup', quantity: '12 oz', category: 'Pantry', expiresIn: 365 },
    { name: 'Olive Oil', quantity: '1 liter', category: 'Pantry', expiresIn: 730 },
    { name: 'Vegetable Oil', quantity: '48 oz', category: 'Pantry', expiresIn: 730 },
    { name: 'Coconut Oil', quantity: '16 oz', category: 'Pantry', expiresIn: 730 },
    { name: 'Sesame Oil', quantity: '8 oz', category: 'Pantry', expiresIn: 365 },
    { name: 'Avocado Oil', quantity: '16 oz', category: 'Pantry', expiresIn: 365 },
    { name: 'Balsamic Vinegar', quantity: '16 oz', category: 'Pantry', expiresIn: 730 },
    { name: 'Apple Cider Vinegar', quantity: '16 oz', category: 'Pantry', expiresIn: 730 },
    { name: 'White Vinegar', quantity: '32 oz', category: 'Pantry', expiresIn: 730 },
    { name: 'Rice Vinegar', quantity: '12 oz', category: 'Pantry', expiresIn: 730 },
    { name: 'Soy Sauce', quantity: '16 oz', category: 'Pantry', expiresIn: 730 },
    { name: 'Worcestershire Sauce', quantity: '10 oz', category: 'Pantry', expiresIn: 730 },
    { name: 'Hot Sauce', quantity: '5 oz', category: 'Pantry', expiresIn: 730 },
    { name: 'Sriracha', quantity: '17 oz', category: 'Pantry', expiresIn: 730 },
    { name: 'Ketchup', quantity: '32 oz', category: 'Pantry', expiresIn: 365 },
    { name: 'Mustard', quantity: '16 oz', category: 'Pantry', expiresIn: 365 },
    { name: 'Mayonnaise', quantity: '30 oz', category: 'Pantry', expiresIn: 90 },
    { name: 'BBQ Sauce', quantity: '18 oz', category: 'Pantry', expiresIn: 365 },
    { name: 'Teriyaki Sauce', quantity: '12 oz', category: 'Pantry', expiresIn: 365 },
    { name: 'Fish Sauce', quantity: '12 oz', category: 'Pantry', expiresIn: 730 },
    { name: 'Oyster Sauce', quantity: '9 oz', category: 'Pantry', expiresIn: 730 },
    { name: 'Hoisin Sauce', quantity: '8 oz', category: 'Pantry', expiresIn: 730 },
    { name: 'Peanut Butter', quantity: '40 oz', category: 'Pantry', expiresIn: 180 },
    { name: 'Almond Butter', quantity: '16 oz', category: 'Pantry', expiresIn: 180 },
    { name: 'Tahini', quantity: '16 oz', category: 'Pantry', expiresIn: 365 },
    { name: 'Tomato Sauce', quantity: '4 cans', category: 'Pantry', expiresIn: 730 },
    { name: 'Tomato Paste', quantity: '4 cans', category: 'Pantry', expiresIn: 730 },
    { name: 'Crushed Tomatoes', quantity: '2 cans', category: 'Pantry', expiresIn: 730 },
    { name: 'Diced Tomatoes', quantity: '4 cans', category: 'Pantry', expiresIn: 730 },
    { name: 'Chicken Broth', quantity: '4 cartons', category: 'Pantry', expiresIn: 730 },
    { name: 'Vegetable Broth', quantity: '4 cartons', category: 'Pantry', expiresIn: 730 },
    { name: 'Beef Broth', quantity: '2 cartons', category: 'Pantry', expiresIn: 730 },
    { name: 'Vanilla Extract', quantity: '4 oz', category: 'Pantry', expiresIn: 730 },
    { name: 'Baking Soda', quantity: '1 lb', category: 'Pantry', expiresIn: 730 },
    { name: 'Baking Powder', quantity: '10 oz', category: 'Pantry', expiresIn: 365 },
    { name: 'Yeast', quantity: '4 oz', category: 'Pantry', expiresIn: 365 },
    { name: 'Cornstarch', quantity: '16 oz', category: 'Pantry', expiresIn: 730 },
    { name: 'Cocoa Powder', quantity: '8 oz', category: 'Pantry', expiresIn: 730 },
    { name: 'Chocolate Chips', quantity: '24 oz', category: 'Pantry', expiresIn: 365 },
    { name: 'Rolled Oats', quantity: '42 oz', category: 'Pantry', expiresIn: 365 },
    { name: 'Breadcrumbs', quantity: '15 oz', category: 'Pantry', expiresIn: 365 },
    { name: 'Panko', quantity: '8 oz', category: 'Pantry', expiresIn: 365 },
    { name: 'Corn Meal', quantity: '2 lbs', category: 'Pantry', expiresIn: 365 },

    // Herbs & Spices (30 items)
    { name: 'Salt', quantity: '2 lbs', category: 'Spices', expiresIn: 1095 },
    { name: 'Black Pepper', quantity: '4 oz', category: 'Spices', expiresIn: 1095 },
    { name: 'Garlic Powder', quantity: '3 oz', category: 'Spices', expiresIn: 1095 },
    { name: 'Onion Powder', quantity: '3 oz', category: 'Spices', expiresIn: 1095 },
    { name: 'Paprika', quantity: '3 oz', category: 'Spices', expiresIn: 1095 },
    { name: 'Cayenne Pepper', quantity: '2 oz', category: 'Spices', expiresIn: 1095 },
    { name: 'Chili Powder', quantity: '3 oz', category: 'Spices', expiresIn: 1095 },
    { name: 'Cumin', quantity: '3 oz', category: 'Spices', expiresIn: 1095 },
    { name: 'Coriander', quantity: '2 oz', category: 'Spices', expiresIn: 1095 },
    { name: 'Turmeric', quantity: '2 oz', category: 'Spices', expiresIn: 1095 },
    { name: 'Ginger Powder', quantity: '2 oz', category: 'Spices', expiresIn: 1095 },
    { name: 'Cinnamon', quantity: '3 oz', category: 'Spices', expiresIn: 1095 },
    { name: 'Nutmeg', quantity: '2 oz', category: 'Spices', expiresIn: 1095 },
    { name: 'Cloves', quantity: '2 oz', category: 'Spices', expiresIn: 1095 },
    { name: 'Oregano', quantity: '2 oz', category: 'Spices', expiresIn: 1095 },
    { name: 'Basil', quantity: '2 oz', category: 'Spices', expiresIn: 1095 },
    { name: 'Thyme', quantity: '2 oz', category: 'Spices', expiresIn: 1095 },
    { name: 'Rosemary', quantity: '2 oz', category: 'Spices', expiresIn: 1095 },
    { name: 'Sage', quantity: '1 oz', category: 'Spices', expiresIn: 1095 },
    { name: 'Bay Leaves', quantity: '1 oz', category: 'Spices', expiresIn: 1095 },
    { name: 'Italian Seasoning', quantity: '3 oz', category: 'Spices', expiresIn: 1095 },
    { name: 'Taco Seasoning', quantity: '3 oz', category: 'Spices', expiresIn: 1095 },
    { name: 'Curry Powder', quantity: '3 oz', category: 'Spices', expiresIn: 1095 },
    { name: 'Garam Masala', quantity: '2 oz', category: 'Spices', expiresIn: 1095 },
    { name: 'Chinese Five Spice', quantity: '2 oz', category: 'Spices', expiresIn: 1095 },
    { name: 'Smoked Paprika', quantity: '2 oz', category: 'Spices', expiresIn: 1095 },
    { name: 'Red Pepper Flakes', quantity: '2 oz', category: 'Spices', expiresIn: 1095 },
    { name: 'Mustard Seeds', quantity: '2 oz', category: 'Spices', expiresIn: 1095 },
    { name: 'Fennel Seeds', quantity: '2 oz', category: 'Spices', expiresIn: 1095 },
    { name: 'Cardamom', quantity: '1 oz', category: 'Spices', expiresIn: 1095 },
  ];

  // Create all pantry items
  const createdPantryItems = [];
  for (const item of pantryItems) {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + item.expiresIn);
    
    // Parse quantity into amount and unit
    const quantityParts = item.quantity.match(/^([\d.]+)\s*(.+)$/);
    const amount = quantityParts ? parseFloat(quantityParts[1]) : 1;
    const unit = quantityParts ? quantityParts[2] : item.quantity;
    
    const pantryItem = await prisma.pantryItem.create({
      data: {
        userId: bob.id,
        customName: item.name,
        amount,
        unit,
        expirationDate,
        location: item.category === 'Dairy' || item.category === 'Proteins' ? 'FRIDGE' : 'PANTRY',
        isLeftover: false,
        purchaseDate: new Date()
      }
    });
    createdPantryItems.push(pantryItem);
  }

  console.log(`✅ Created ${createdPantryItems.length} pantry items`);

  // Create 25 diverse recipes
  const recipes = [
    {
      name: 'Classic Spaghetti Carbonara',
      description: 'Authentic Italian pasta with eggs, bacon, and parmesan',
      prepTime: 10,
      cookTime: 20,
      totalTime: 30,
      servings: 4,
      difficulty: 'MEDIUM',
      mealType: ['lunch', 'dinner'],
      cuisine: 'Italian',
      ingredients: [
        { originalText: '400g spaghetti', amount: 400, unit: 'g' },
        { originalText: '4 eggs', amount: 4, unit: 'pieces' },
        { originalText: '200g bacon', amount: 200, unit: 'g' },
        { originalText: '100g parmesan', amount: 100, unit: 'g' },
        { originalText: 'black pepper to taste', amount: 1, unit: 'tsp' },
        { originalText: '2 cloves garlic', amount: 2, unit: 'cloves' }
      ],
      instructions: [
        { stepNumber: 1, instruction: 'Cook spaghetti according to package directions' },
        { stepNumber: 2, instruction: 'Fry bacon until crispy' },
        { stepNumber: 3, instruction: 'Mix eggs with parmesan' },
        { stepNumber: 4, instruction: 'Toss hot pasta with bacon and egg mixture' },
        { stepNumber: 5, instruction: 'Season with black pepper' }
      ]
    },
    {
      name: 'Mediterranean Quinoa Bowl',
      ingredients: ['1 cup quinoa', '200g chickpeas', '1 cucumber', '200g cherry tomatoes', '100g feta cheese', 'olives', 'lemon', 'olive oil', 'oregano'],
      instructions: '1. Cook quinoa according to package\n2. Dice vegetables\n3. Mix quinoa with vegetables and chickpeas\n4. Top with feta and olives\n5. Dress with lemon and olive oil',
      prepTime: 15,
      cookTime: 15,
      servings: 3,
      cuisine: 'Mediterranean',
      tags: ['healthy', 'vegetarian', 'bowl']
    },
    {
      name: 'Beef Tacos',
      ingredients: ['500g ground beef', '8 tortillas', 'lettuce', '2 tomatoes', 'cheddar cheese', 'sour cream', 'taco seasoning', 'onion', 'jalapeños'],
      instructions: '1. Brown ground beef with taco seasoning\n2. Warm tortillas\n3. Prep toppings\n4. Assemble tacos with beef and toppings',
      prepTime: 10,
      cookTime: 15,
      servings: 4,
      cuisine: 'Mexican',
      tags: ['tacos', 'quick', 'family-friendly']
    },
    {
      name: 'Grilled Salmon with Asparagus',
      ingredients: ['4 salmon fillets', '1 lb asparagus', 'lemon', 'garlic', 'olive oil', 'dill', 'salt', 'pepper'],
      instructions: '1. Season salmon with salt, pepper, and dill\n2. Grill salmon for 4-5 minutes per side\n3. Grill asparagus alongside\n4. Serve with lemon wedges',
      prepTime: 10,
      cookTime: 12,
      servings: 4,
      cuisine: 'American',
      tags: ['healthy', 'grilled', 'seafood']
    },
    {
      name: 'Chicken Stir Fry',
      ingredients: ['500g chicken thighs', 'broccoli', 'bell peppers', 'carrots', 'soy sauce', 'ginger', 'garlic', 'sesame oil', 'cornstarch'],
      instructions: '1. Cut chicken into bite-sized pieces\n2. Stir fry chicken until cooked\n3. Add vegetables and stir fry\n4. Add sauce and thicken with cornstarch\n5. Serve over rice',
      prepTime: 15,
      cookTime: 15,
      servings: 4,
      cuisine: 'Asian',
      tags: ['stir-fry', 'quick', 'vegetables']
    },
    {
      name: 'Margherita Pizza',
      ingredients: ['pizza dough', 'tomato sauce', 'fresh mozzarella', 'basil', 'olive oil', 'salt'],
      instructions: '1. Roll out pizza dough\n2. Spread tomato sauce\n3. Add mozzarella\n4. Bake at 475°F for 12-15 minutes\n5. Top with fresh basil',
      prepTime: 15,
      cookTime: 15,
      servings: 4,
      cuisine: 'Italian',
      tags: ['pizza', 'vegetarian', 'classic']
    },
    {
      name: 'Greek Salad',
      ingredients: ['romaine lettuce', 'cucumbers', 'tomatoes', 'red onion', 'feta cheese', 'olives', 'olive oil', 'lemon', 'oregano'],
      instructions: '1. Chop vegetables\n2. Combine in a bowl\n3. Add feta and olives\n4. Dress with olive oil, lemon, and oregano',
      prepTime: 15,
      cookTime: 0,
      servings: 4,
      cuisine: 'Greek',
      tags: ['salad', 'healthy', 'no-cook']
    },
    {
      name: 'Beef and Broccoli',
      ingredients: ['500g beef sirloin', '2 heads broccoli', 'soy sauce', 'oyster sauce', 'garlic', 'ginger', 'cornstarch', 'sesame oil'],
      instructions: '1. Slice beef thinly\n2. Marinate in soy sauce and cornstarch\n3. Stir fry beef\n4. Add broccoli and sauce\n5. Cook until tender',
      prepTime: 20,
      cookTime: 15,
      servings: 4,
      cuisine: 'Chinese',
      tags: ['stir-fry', 'beef', 'vegetables']
    },
    {
      name: 'Chicken Caesar Salad',
      ingredients: ['2 chicken breasts', 'romaine lettuce', 'caesar dressing', 'parmesan', 'croutons', 'lemon'],
      instructions: '1. Grill chicken breasts\n2. Chop romaine lettuce\n3. Toss with dressing\n4. Top with sliced chicken, parmesan, and croutons',
      prepTime: 10,
      cookTime: 15,
      servings: 2,
      cuisine: 'American',
      tags: ['salad', 'protein', 'classic']
    },
    {
      name: 'Vegetable Curry',
      ingredients: ['cauliflower', 'potatoes', 'carrots', 'peas', 'coconut milk', 'curry powder', 'onion', 'garlic', 'ginger'],
      instructions: '1. Sauté onion, garlic, and ginger\n2. Add curry powder\n3. Add vegetables and coconut milk\n4. Simmer until vegetables are tender\n5. Serve with rice',
      prepTime: 15,
      cookTime: 30,
      servings: 4,
      cuisine: 'Indian',
      tags: ['curry', 'vegetarian', 'comfort-food']
    },
    {
      name: 'Shrimp Scampi',
      ingredients: ['1 lb shrimp', 'linguine', 'white wine', 'butter', 'garlic', 'lemon', 'parsley'],
      instructions: '1. Cook linguine\n2. Sauté garlic in butter\n3. Add shrimp and white wine\n4. Cook until shrimp are pink\n5. Toss with pasta and parsley',
      prepTime: 10,
      cookTime: 15,
      servings: 4,
      cuisine: 'Italian',
      tags: ['seafood', 'pasta', 'elegant']
    },
    {
      name: 'Turkey Chili',
      ingredients: ['1 lb ground turkey', 'kidney beans', 'black beans', 'tomatoes', 'onion', 'bell peppers', 'chili powder', 'cumin'],
      instructions: '1. Brown turkey\n2. Add onions and peppers\n3. Add beans, tomatoes, and spices\n4. Simmer for 30 minutes\n5. Serve with toppings',
      prepTime: 15,
      cookTime: 40,
      servings: 6,
      cuisine: 'American',
      tags: ['chili', 'healthy', 'meal-prep']
    },
    {
      name: 'Caprese Sandwich',
      ingredients: ['ciabatta bread', 'fresh mozzarella', 'tomatoes', 'basil', 'balsamic vinegar', 'olive oil'],
      instructions: '1. Slice ciabatta\n2. Layer mozzarella, tomatoes, and basil\n3. Drizzle with balsamic and olive oil\n4. Grill or serve fresh',
      prepTime: 10,
      cookTime: 5,
      servings: 2,
      cuisine: 'Italian',
      tags: ['sandwich', 'vegetarian', 'quick']
    },
    {
      name: 'Teriyaki Chicken Bowl',
      ingredients: ['chicken thighs', 'teriyaki sauce', 'rice', 'broccoli', 'carrots', 'sesame seeds', 'green onions'],
      instructions: '1. Marinate chicken in teriyaki sauce\n2. Grill or bake chicken\n3. Steam vegetables\n4. Serve over rice\n5. Garnish with sesame seeds and green onions',
      prepTime: 30,
      cookTime: 20,
      servings: 4,
      cuisine: 'Japanese',
      tags: ['bowl', 'asian', 'meal-prep']
    },
    {
      name: 'Stuffed Bell Peppers',
      ingredients: ['4 bell peppers', 'ground beef', 'rice', 'onion', 'tomato sauce', 'cheese', 'garlic'],
      instructions: '1. Hollow out peppers\n2. Cook beef with onion and garlic\n3. Mix with rice and tomato sauce\n4. Stuff peppers and top with cheese\n5. Bake for 30 minutes',
      prepTime: 20,
      cookTime: 30,
      servings: 4,
      cuisine: 'American',
      tags: ['stuffed', 'comfort-food', 'family-friendly']
    },
    {
      name: 'Pad Thai',
      ingredients: ['rice noodles', 'shrimp', 'tofu', 'eggs', 'bean sprouts', 'peanuts', 'tamarind paste', 'fish sauce', 'lime'],
      instructions: '1. Soak rice noodles\n2. Stir fry shrimp and tofu\n3. Push to side, scramble eggs\n4. Add noodles and sauce\n5. Toss with bean sprouts\n6. Garnish with peanuts and lime',
      prepTime: 20,
      cookTime: 15,
      servings: 4,
      cuisine: 'Thai',
      tags: ['noodles', 'asian', 'street-food']
    },
    {
      name: 'BBQ Pulled Pork',
      ingredients: ['pork shoulder', 'bbq sauce', 'brown sugar', 'paprika', 'garlic powder', 'onion powder', 'buns'],
      instructions: '1. Rub pork with spices\n2. Slow cook for 8 hours\n3. Shred pork\n4. Mix with BBQ sauce\n5. Serve on buns',
      prepTime: 15,
      cookTime: 480,
      servings: 8,
      cuisine: 'American',
      tags: ['bbq', 'slow-cooker', 'sandwich']
    },
    {
      name: 'Mushroom Risotto',
      ingredients: ['arborio rice', 'mushrooms', 'white wine', 'vegetable broth', 'parmesan', 'butter', 'onion', 'garlic'],
      instructions: '1. Sauté mushrooms\n2. Cook onion and garlic\n3. Add rice and toast\n4. Add wine and broth gradually\n5. Stir until creamy\n6. Finish with butter and parmesan',
      prepTime: 10,
      cookTime: 30,
      servings: 4,
      cuisine: 'Italian',
      tags: ['risotto', 'vegetarian', 'elegant']
    },
    {
      name: 'Fish Tacos',
      ingredients: ['white fish', 'corn tortillas', 'cabbage slaw', 'avocado', 'lime', 'cilantro', 'hot sauce', 'sour cream'],
      instructions: '1. Season and grill fish\n2. Make cabbage slaw\n3. Warm tortillas\n4. Assemble tacos with fish, slaw, and toppings',
      prepTime: 15,
      cookTime: 10,
      servings: 4,
      cuisine: 'Mexican',
      tags: ['tacos', 'seafood', 'fresh']
    },
    {
      name: 'Breakfast Burrito',
      ingredients: ['eggs', 'bacon', 'potatoes', 'cheese', 'tortillas', 'salsa', 'sour cream', 'green onions'],
      instructions: '1. Scramble eggs\n2. Cook bacon and dice\n3. Hash brown potatoes\n4. Warm tortillas\n5. Fill with ingredients and roll',
      prepTime: 10,
      cookTime: 20,
      servings: 4,
      cuisine: 'Mexican',
      tags: ['breakfast', 'burrito', 'hearty']
    },
    {
      name: 'Lemon Herb Chicken',
      ingredients: ['chicken breasts', 'lemon', 'rosemary', 'thyme', 'garlic', 'olive oil', 'butter'],
      instructions: '1. Marinate chicken in lemon and herbs\n2. Sear in pan\n3. Finish in oven at 375°F\n4. Make pan sauce with butter and lemon',
      prepTime: 40,
      cookTime: 25,
      servings: 4,
      cuisine: 'Mediterranean',
      tags: ['chicken', 'herbs', 'elegant']
    },
    {
      name: 'Veggie Burger',
      ingredients: ['black beans', 'quinoa', 'breadcrumbs', 'egg', 'onion', 'garlic', 'spices', 'buns', 'toppings'],
      instructions: '1. Mash black beans\n2. Mix with quinoa, breadcrumbs, and egg\n3. Form into patties\n4. Pan fry or bake\n5. Serve on buns with toppings',
      prepTime: 20,
      cookTime: 15,
      servings: 4,
      cuisine: 'American',
      tags: ['vegetarian', 'burger', 'healthy']
    },
    {
      name: 'Chicken Fajitas',
      ingredients: ['chicken breasts', 'bell peppers', 'onions', 'fajita seasoning', 'tortillas', 'cheese', 'salsa', 'guacamole'],
      instructions: '1. Slice chicken and vegetables\n2. Season with fajita spices\n3. Sauté until cooked\n4. Serve with warm tortillas and toppings',
      prepTime: 15,
      cookTime: 15,
      servings: 4,
      cuisine: 'Mexican',
      tags: ['fajitas', 'quick', 'family-friendly']
    },
    {
      name: 'Soy-Ginger Glazed Tofu',
      ingredients: ['firm tofu', 'soy sauce', 'ginger', 'garlic', 'sesame oil', 'honey', 'rice', 'bok choy'],
      instructions: '1. Press and cube tofu\n2. Pan fry until golden\n3. Make glaze with soy sauce, ginger, and honey\n4. Toss tofu in glaze\n5. Serve with rice and bok choy',
      prepTime: 30,
      cookTime: 20,
      servings: 3,
      cuisine: 'Asian',
      tags: ['tofu', 'vegetarian', 'asian']
    }
  ];

  // Create all recipes
  const createdRecipes = [];
  for (const recipe of recipes) {
    const createdRecipe = await prisma.recipe.create({
      data: {
        userId: bob.id,
        name: recipe.name,
        description: recipe.description,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        totalTime: recipe.totalTime,
        servings: recipe.servings,
        difficulty: recipe.difficulty || 'MEDIUM',
        mealType: recipe.mealType,
        cuisine: recipe.cuisine
      }
    });
    
    // Create ingredients for this recipe
    if (recipe.ingredients) {
      for (const ing of recipe.ingredients) {
        await prisma.recipeIngredient.create({
          data: {
            recipeId: createdRecipe.id,
            originalText: ing.originalText,
            amount: ing.amount,
            unit: ing.unit,
            preparation: ing.preparation
          }
        });
      }
    }
    
    // Create instructions for this recipe
    if (recipe.instructions) {
      for (const inst of recipe.instructions) {
        await prisma.recipeInstruction.create({
          data: {
            recipeId: createdRecipe.id,
            stepNumber: inst.stepNumber,
            instruction: inst.instruction,
            timeMinutes: inst.timeMinutes
          }
        });
      }
    }
    
    createdRecipes.push(createdRecipe);
  }

  console.log(`✅ Created ${createdRecipes.length} recipes`);

  // Create an active meal plan for the current week
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay()); // Start on Sunday
  startOfWeek.setHours(0, 0, 0, 0);

  const mealPlan = await prisma.mealPlan.create({
    data: {
      userId: bob.id,
      weekStartDate: startOfWeek,
      meals: {
        sunday: {
          breakfast: 'Breakfast Burrito',
          lunch: 'Greek Salad',
          dinner: 'Grilled Salmon with Asparagus'
        },
        monday: {
          breakfast: 'Oatmeal with fruits',
          lunch: 'Caprese Sandwich',
          dinner: 'Thai Green Curry'
        },
        tuesday: {
          breakfast: 'Scrambled eggs and toast',
          lunch: 'Chicken Caesar Salad',
          dinner: 'Beef Tacos'
        },
        wednesday: {
          breakfast: 'Yogurt parfait',
          lunch: 'Leftover Thai Green Curry',
          dinner: 'Margherita Pizza'
        },
        thursday: {
          breakfast: 'Breakfast Burrito',
          lunch: 'Mediterranean Quinoa Bowl',
          dinner: 'Teriyaki Chicken Bowl'
        },
        friday: {
          breakfast: 'French toast',
          lunch: 'Fish Tacos',
          dinner: 'Pad Thai'
        },
        saturday: {
          breakfast: 'Pancakes',
          lunch: 'Veggie Burger',
          dinner: 'Stuffed Bell Peppers'
        }
      },
      shoppingList: [
        'Extra eggs for breakfast',
        'Maple syrup for pancakes',
        'Fresh berries',
        'Greek yogurt',
        'Granola',
        'Sandwich bread',
        'Extra vegetables for salads'
      ],
      notes: 'Remember Bob prefers soy milk for breakfast cereals and coffee. No shellfish or clams in any meals.',
      createdAt: new Date()
    }
  });

  console.log('✅ Created meal plan for current week');

  // Add some items to grocery list
  const groceryItems = [
    { name: 'Soy Milk', quantity: '2 cartons', category: 'Dairy', notes: 'Preferred brand: Silk' },
    { name: 'Eggs', quantity: '1 dozen', category: 'Proteins', notes: 'Free-range' },
    { name: 'Whole Wheat Bread', quantity: '1 loaf', category: 'Grains', notes: null },
    { name: 'Bananas', quantity: '1 bunch', category: 'Fruits', notes: 'For breakfast' },
    { name: 'Spinach', quantity: '1 bag', category: 'Vegetables', notes: 'For salads' },
    { name: 'Chicken Breast', quantity: '2 lbs', category: 'Proteins', notes: 'For meal prep' },
    { name: 'Brown Rice', quantity: '1 bag', category: 'Grains', notes: null },
    { name: 'Avocados', quantity: '4', category: 'Fruits', notes: 'For tacos and salads' }
  ];

  for (const item of groceryItems) {
    await prisma.groceryItem.create({
      data: {
        userId: bob.id,
        ...item,
        purchased: false,
        addedDate: new Date()
      }
    });
  }

  console.log('✅ Added items to grocery list');

  console.log('\n🎉 Successfully seeded data for bobkuehne@gmail.com!');
  console.log(`
  Summary:
  - User: ${bob.email}
  - Pantry Items: ${createdPantryItems.length}
  - Recipes: ${createdRecipes.length}
  - Meal Plan: Active for current week
  - Grocery Items: ${groceryItems.length}
  - User Preferences: No clams/shellfish, prefers soy milk
  `);
}

seedBobData()
  .catch((e) => {
    console.error('Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });