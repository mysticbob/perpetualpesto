# Test Data Setup for NoChickenLeftBehind

## Overview
This directory contains scripts to seed comprehensive test data for the NoChickenLeftBehind application, enabling full testing of all features including AI chat interactions, meal planning, expiration management, and grocery list generation.

## Scripts

### 1. `seed-ingredients.ts`
Seeds base ingredients with USDA nutritional data (~43 common ingredients).

### 2. `seed-test-data.ts`
Creates comprehensive test data including:
- Test user account
- User preferences and dietary restrictions
- 25 diverse recipes
- 100+ pantry items
- Active meal plan for current week

### 3. `check-db-stats.ts`
Displays database statistics and test user details.

## Quick Start

```bash
# Seed all test data (ingredients + test data)
bun run seed:all

# Or run individually:
bun run seed:ingredients   # Base ingredients only
bun run seed:test-data     # Test user and content

# Check what was created
bun run db:stats
```

## Test Data Details

### Test User
- **Email**: test@nochickenleftbehind.com
- **Allergies**: Clams, shellfish
- **Dietary**: Lactose-intolerant (flexible - prefers soy milk)
- **Preferences**: Loves spicy food, intermediate cooking skills
- **Budget**: $150/week
- **Preferred Stores**: Whole Foods, Trader Joe's

### Recipes (25 total)
- **Breakfast** (5): Pancakes, Scrambled Eggs, Overnight Oats, Avocado Toast, Smoothie Bowl
- **Lunch** (8): Caesar Salad, Minestrone Soup, Club Sandwich, Asian Noodle Bowl, Buddha Bowl, etc.
- **Dinner** (8): Carbonara, Beef Stir Fry, Baked Salmon, Chicken Fajitas, Vegetable Lasagna, etc.
- **Snacks/Desserts** (4): Chocolate Chip Cookies, Fruit Salad, Hummus Platter, Banana Bread

### Pantry Items (109 total)
- **Fridge** (23): Dairy, proteins, vegetables with realistic expiration dates
- **Freezer** (20): Frozen proteins, vegetables, prepared foods
- **Pantry** (35): Grains, canned goods, oils, condiments
- **Counter** (13): Fresh produce, bread
- **Spice Rack** (18): Common spices and seasonings

### Special Features
- Some items expiring soon (1-3 days) to test expiration alerts
- Leftover tracking included
- Mix of fresh and long-term storage items
- Realistic quantities and units

### Meal Plan
- Active plan for current week
- Mix of recipes, leftovers, and eating out
- Shows system in realistic use

## Testing Scenarios

With this test data, you can test:
1. **AI Chat**: Ask about recipes based on available ingredients
2. **Expiration Management**: See items expiring soon
3. **Meal Planning**: View and modify the active meal plan
4. **Grocery Generation**: Create shopping lists from meal plans
5. **Dietary Restrictions**: System should avoid shellfish recipes
6. **Leftover Management**: Track and use leftovers
7. **Recipe Suggestions**: Get recommendations based on pantry contents

## Resetting Data

To start fresh:
```bash
# Reset database and reseed
bun run db:reset
bun run db:push
bun run seed:all
```

## Notes
- Some ingredients may show warnings during seeding if they're not in the base ingredient list
- The test data is designed to be realistic but comprehensive
- Expiration dates are calculated relative to the current date
- All recipes include full instructions and ingredient lists