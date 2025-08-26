# 🏗️ NoChickenLeftBehind - Complete Architecture Refactor Plan

## 📋 Executive Summary

Transform the current recipe management app into an intelligent, AI-powered food ecosystem that manages recipes, pantry inventory, meal planning, and shopping with zero waste as a goal.

## 🎯 Core Objectives

1. **Zero Food Waste**: Track expiration dates, suggest recipes based on what needs to be used
2. **Intelligent Meal Planning**: AI-driven weekly planning based on preferences, inventory, and nutrition
3. **Automated Shopping**: Smart reordering and shopping list generation
4. **Seamless Integration**: MCP servers feeding AI, which orchestrates the entire system

## 📊 Database Architecture Enhancement

### New Schema Requirements

```prisma
// 1. INGREDIENT MASTER DATA
model Ingredient {
  id                String   @id @default(cuid())
  name              String   @unique
  alternativeNames  String[] // ["chicken breast", "chicken breasts", "boneless chicken"]
  category          String   // "protein", "vegetable", "dairy", etc.
  
  // Nutritional Information (per 100g)
  calories          Float?
  protein           Float?
  carbs             Float?
  fat               Float?
  fiber             Float?
  sugar             Float?
  sodium            Float?
  
  // Storage & Expiration
  shelfLifeCounter  Int?     // days at room temp
  shelfLifeFridge   Int?     // days in fridge
  shelfLifeFreezer  Int?     // days in freezer
  
  // Conversions
  densityGramsPerMl Float?   // for volume to weight conversion
  typicalUnitWeight Float?   // e.g., 1 egg = 50g
  
  // Relationships
  substitutions     IngredientSubstitution[] @relation("ingredient")
  pantryItems       PantryItem[]
  recipeIngredients RecipeIngredient[]
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

model IngredientSubstitution {
  id              String     @id @default(cuid())
  ingredientId    String
  substituteId    String
  ratio           Float      // 1.0 = 1:1 substitution
  notes           String?    // "may affect texture"
  
  ingredient      Ingredient @relation("ingredient", fields: [ingredientId], references: [id])
  substitute      Ingredient @relation("substitute", fields: [substituteId], references: [id])
}

// 2. ENHANCED PANTRY
model PantryItem {
  id                String    @id @default(cuid())
  userId            String
  ingredientId      String?   // Link to master ingredient
  customName        String    // User's name for the item
  
  // Quantity & Location
  amount            Float
  unit              String
  location          PantryLocation
  container         String?   // "ziplock", "tupperware", "original packaging"
  
  // Dates
  purchaseDate      DateTime  @default(now())
  expirationDate    DateTime?
  openedDate        DateTime? // When package was opened
  
  // Status
  isLeftover        Boolean   @default(false)
  leftoverFromRecipe String?  // Recipe ID if leftover
  packingPlan       String?   // "Monday lunch", "Tuesday dinner"
  
  // Cost tracking
  purchasePrice     Float?
  purchaseLocation  String?   // Store name
  
  // Relationships
  user              User      @relation(fields: [userId], references: [id])
  ingredient        Ingredient? @relation(fields: [ingredientId], references: [id])
  
  @@index([userId, expirationDate])
  @@index([userId, location])
}

enum PantryLocation {
  FRIDGE
  FREEZER
  PANTRY
  SPICE_RACK
  COUNTER
  WINE_RACK
}

// 3. ENHANCED RECIPE
model Recipe {
  id                String   @id @default(cuid())
  // ... existing fields ...
  
  // Nutritional rollup (calculated)
  totalCalories     Float?
  totalProtein      Float?
  totalCarbs        Float?
  totalFat          Float?
  
  // Planning metadata
  mealType          String[] // ["breakfast", "lunch", "dinner", "snack"]
  cuisine           String?
  difficulty        String?  // "easy", "medium", "hard"
  season            String[] // ["summer", "fall", "winter", "spring"]
  equipment         String[] // ["instant-pot", "oven", "grill"]
  
  // Leftover management
  typicalLeftoverDays Int?   // How long leftovers typically last
  leftoverUses      String[] // ["lunch", "freeze", "repurpose"]
}

// 4. MEAL PLANNING
model MealPlan {
  id            String   @id @default(cuid())
  userId        String
  weekStartDate DateTime
  status        String   // "draft", "confirmed", "completed"
  
  // Meals
  meals         PlannedMeal[]
  
  // Shopping
  shoppingList  ShoppingList?
  
  user          User     @relation(fields: [userId], references: [id])
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@unique([userId, weekStartDate])
}

model PlannedMeal {
  id           String    @id @default(cuid())
  mealPlanId   String
  recipeId     String?
  date         DateTime
  mealType     String    // "breakfast", "lunch", "dinner", "snack"
  servings     Int
  
  // Execution tracking
  isCooked     Boolean   @default(false)
  cookedAt     DateTime?
  leftoversId  String?   // Link to PantryItem if leftovers created
  
  // Flexibility
  isFlexible   Boolean   @default(false) // Can be moved
  isEatingOut  Boolean   @default(false)
  restaurant   String?
  
  mealPlan     MealPlan  @relation(fields: [mealPlanId], references: [id])
  recipe       Recipe?   @relation(fields: [recipeId], references: [id])
}

// 5. SHOPPING & REORDERING
model ShoppingList {
  id           String    @id @default(cuid())
  mealPlanId   String    @unique
  status       String    // "pending", "shopping", "completed"
  
  items        ShoppingItem[]
  
  // Fulfillment
  preferredStore String?
  scheduledDate  DateTime?
  estimatedCost  Float?
  
  mealPlan     MealPlan  @relation(fields: [mealPlanId], references: [id])
  createdAt    DateTime  @default(now())
}

model ShoppingItem {
  id              String       @id @default(cuid())
  shoppingListId  String
  ingredientId    String?
  
  name            String
  amount          Float
  unit            String
  category        String       // For store organization
  
  // Status
  isPurchased     Boolean      @default(false)
  actualPrice     Float?
  alternativeItem String?      // If substituted
  
  // Smart reordering
  isStaple        Boolean      @default(false)
  reorderPoint    Float?       // Auto-add when pantry drops below
  
  shoppingList    ShoppingList @relation(fields: [shoppingListId], references: [id])
  ingredient      Ingredient?  @relation(fields: [ingredientId], references: [id])
}

// 6. USER PREFERENCES ENHANCED
model UserPreferences {
  id                  String   @id @default(cuid())
  userId              String   @unique
  
  // Dietary
  dietaryRestrictions String[] // ["vegetarian", "gluten-free", "dairy-free"]
  allergies           String[] // ["peanuts", "shellfish"]
  dislikedIngredients String[] // ["cilantro", "olives"]
  
  // Cooking preferences
  maxCookTime         Int?     // minutes
  preferredCuisines   String[]
  skillLevel          String?  // "beginner", "intermediate", "advanced"
  
  // Meal planning
  mealsPerWeek        Int      @default(21)
  lunchStrategy       String   // "leftovers", "meal-prep", "fresh"
  weeklyBudget        Float?
  
  // Shopping
  preferredStores     String[]
  shoppingDay         String?  // "saturday", "sunday", etc.
  
  // Taste preferences
  spicinessLevel      Int      @default(5) // 1-10
  sweetnessPreference Int      @default(5) // 1-10
  
  user                User     @relation(fields: [userId], references: [id])
}
```

## 🤖 MCP Server Architecture

### 1. **Ingredient MCP Server** (Port 4001)
```typescript
Resources:
- ingredient:lookup - Find ingredient by name/id
- ingredient:nutrition - Get nutritional info
- ingredient:substitutes - Find substitutions
- ingredient:expiration - Get storage life

Tools:
- ingredient:match - Fuzzy match ingredient names
- ingredient:convert - Convert between units
- ingredient:calculate-nutrition - Calculate for recipes
```

### 2. **Pantry MCP Server** (Port 4002)
```typescript
Resources:
- pantry:inventory - Current inventory by location
- pantry:expiring - Items expiring soon
- pantry:leftovers - Leftover tracking
- pantry:low-stock - Items below reorder point

Tools:
- pantry:add - Add items
- pantry:use - Mark items as used
- pantry:move - Move between locations
- pantry:check-availability - Can I make this recipe?
```

### 3. **Recipe MCP Server** (Port 4003)
```typescript
Resources:
- recipe:browse - All recipes
- recipe:search - Search with filters
- recipe:suggestions - Based on pantry
- recipe:nutrition - Nutritional analysis

Tools:
- recipe:create - Add new recipe
- recipe:scale - Adjust servings
- recipe:analyze - Nutritional/cost analysis
- recipe:match-pantry - What can I make?
```

### 4. **Meal Planning MCP Server** (Port 4004)
```typescript
Resources:
- planning:current-week - Active meal plan
- planning:suggestions - AI recommendations
- planning:history - Past meal plans
- planning:leftovers-schedule - Leftover consumption plan

Tools:
- planning:generate - Create weekly plan
- planning:adjust - Modify plan
- planning:confirm - Lock in plan
- planning:track - Mark meals as cooked
```

### 5. **Shopping MCP Server** (Port 4005)
```typescript
Resources:
- shopping:current-list - Active shopping list
- shopping:staples-status - Staple items needing reorder
- shopping:price-history - Historical prices

Tools:
- shopping:generate - Create from meal plan
- shopping:optimize - Organize by store layout
- shopping:order - Send to Instacart/delivery
- shopping:complete - Mark as purchased
```

## 🧠 AI Integration Strategy

### AI Orchestration Layer
```typescript
class FoodAI {
  // Core AI Model: GPT-4 or Claude 3
  private model: AIModel
  
  // MCP Connections
  private ingredientMCP: MCPClient
  private pantryMCP: MCPClient
  private recipeMCP: MCPClient
  private planningMCP: MCPClient
  private shoppingMCP: MCPClient
  
  // Key AI Functions
  async generateWeeklyPlan(userId: string): MealPlan
  async suggestRecipesForExpiring(): Recipe[]
  async optimizeShopping(list: ShoppingList): ShoppingList
  async suggestSubstitutions(missing: Ingredient[]): Substitution[]
  async planLeftoverUsage(leftovers: PantryItem[]): LeftoverPlan
  async analyzeNutritionalBalance(plan: MealPlan): NutritionReport
}
```

### AI Prompting Strategy
```typescript
const SYSTEM_PROMPT = `
You are an intelligent meal planning assistant with access to:
- Complete pantry inventory with expiration dates
- User's dietary preferences and restrictions
- Recipe database with nutritional information
- Shopping and budget constraints

Your goals:
1. Minimize food waste by using expiring items first
2. Maintain nutritional balance
3. Respect user preferences and budget
4. Suggest variety while using leftovers efficiently
`;
```

## 🎨 Frontend Architecture

### New Views Required

1. **Dashboard** (Home)
   - Week at a glance
   - Expiring items alert
   - Today's meals
   - Quick actions

2. **Pantry Manager**
   - Visual inventory by location
   - Expiration timeline
   - Quick add (barcode scan?)
   - Leftover tracking

3. **Meal Planner**
   - Calendar view
   - Drag-drop meals
   - AI suggestions panel
   - Nutritional summary

4. **Smart Shopping**
   - Organized list
   - Store map integration
   - Price tracking
   - One-click ordering

5. **Recipe Intelligence**
   - "What can I make now?"
   - Expiration-based suggestions
   - Scaled recipes
   - Leftover recipes

## 🚀 Implementation Roadmap

### Phase 1: Database & Core (Week 1-2)
- [ ] Implement enhanced schema
- [ ] Create ingredient master data
- [ ] Build data migration scripts
- [ ] Set up nutritional database

### Phase 2: MCP Servers (Week 3-4)
- [ ] Ingredient MCP server
- [ ] Enhanced Pantry MCP server
- [ ] Enhanced Recipe MCP server
- [ ] Meal Planning MCP server
- [ ] Shopping MCP server

### Phase 3: AI Integration (Week 5-6)
- [ ] Set up AI orchestration layer
- [ ] Implement meal planning AI
- [ ] Create waste-reduction algorithms
- [ ] Build substitution engine

### Phase 4: Frontend (Week 7-8)
- [ ] Dashboard implementation
- [ ] Pantry manager UI
- [ ] Meal planner interface
- [ ] Shopping list manager

### Phase 5: Testing & Optimization (Week 9-10)
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] User testing
- [ ] Documentation

## 🔧 Technical Stack

### Backend
- **Database**: PostgreSQL with Prisma
- **MCP Servers**: TypeScript + Hono
- **AI**: OpenAI GPT-4 / Anthropic Claude
- **Queue**: Bull for background jobs

### Frontend
- **Framework**: React + TypeScript
- **State**: React Query + Zustand
- **UI**: Chakra UI
- **Calendar**: FullCalendar
- **Charts**: Recharts

### Infrastructure
- **Hosting**: Google Cloud Run
- **Database**: Cloud SQL
- **Storage**: Cloud Storage (images)
- **Monitoring**: Cloud Monitoring

## 📝 Key Algorithms

### 1. Expiration-Based Recipe Suggestion
```typescript
function suggestRecipesForExpiring(pantry: PantryItem[], recipes: Recipe[]) {
  // Sort pantry by expiration
  const expiringSoon = pantry
    .filter(item => item.expirationDate < addDays(now, 3))
    .sort((a, b) => a.expirationDate - b.expirationDate)
  
  // Find recipes using these ingredients
  return recipes.filter(recipe => 
    recipe.ingredients.some(ing => 
      expiringSoon.some(item => item.ingredientId === ing.id)
    )
  ).sort((a, b) => {
    // Prioritize recipes using more expiring items
    const aCount = countExpiringInRecipe(a, expiringSoon)
    const bCount = countExpiringInRecipe(b, expiringSoon)
    return bCount - aCount
  })
}
```

### 2. Leftover Planning
```typescript
function planLeftoverUsage(meal: PlannedMeal) {
  const typicalLeftovers = meal.servings - averageServingsConsumed
  
  if (typicalLeftovers > 0) {
    return {
      expectedLeftovers: typicalLeftovers,
      suggestedUses: [
        { day: 'next-day', meal: 'lunch', servings: Math.min(2, typicalLeftovers) },
        { day: 'day-after', meal: 'dinner-side', servings: typicalLeftovers - 2 }
      ],
      freezeIfMoreThan: 4
    }
  }
}
```

## 📊 Success Metrics

1. **Food Waste Reduction**: < 5% of purchased food wasted
2. **Planning Efficiency**: < 10 min weekly planning time
3. **Budget Optimization**: 15% reduction in grocery spending
4. **Nutritional Balance**: Meet daily targets 90% of time
5. **User Satisfaction**: > 4.5/5 rating

## ❓ Questions for Implementation

1. **AI Model Selection**: OpenAI GPT-4 or Anthropic Claude for planning?
2. **Nutritional Database**: Use USDA database or commercial API?
3. **Barcode Scanning**: Integrate for pantry management?
4. **Store Integration**: Direct integration with grocery chains?
5. **Mobile App**: Progressive Web App or native?

## 🔗 External Integrations Needed

1. **Nutritional Data**: USDA FoodData Central API
2. **Recipe Import**: Schema.org recipe scraping enhancement
3. **Shopping**: Instacart, Amazon Fresh, Walmart APIs
4. **Barcode**: OpenFoodFacts API
5. **Meal Images**: Unsplash/Pexels for recipe suggestions

---

## Next Steps

1. Review and approve this plan
2. Set up development environment
3. Begin Phase 1 implementation
4. Create test data sets
5. Build prototype for user testing