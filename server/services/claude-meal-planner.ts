/**
 * Claude AI Meal Planning Service
 * Uses Anthropic's Claude to generate intelligent meal plans
 */

import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../lib/db'
import { addDays, startOfWeek, format } from 'date-fns'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

interface MealPlanRequest {
  userId: string
  weekStartDate: Date
  preferences?: {
    planningMode?: 'assisted' | 'yolo' | 'manual'
    servingsPerMeal?: number
    maxCookTimeMinutes?: number
    includeLeftovers?: boolean
  }
}

interface MealSuggestion {
  date: string
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'
  recipeName: string
  recipeId?: string
  servings: number
  cookTime?: number
  reason: string
  ingredients: string[]
  expectLeftovers: boolean
  leftoverUse?: string
}

export class ClaudeMealPlanner {
  async generateWeeklyPlan(request: MealPlanRequest) {
    // Get user's pantry inventory
    const pantryItems = await this.getPantryInventory(request.userId)
    
    // Get expiring items
    const expiringItems = await this.getExpiringItems(request.userId)
    
    // Get user's recipes
    const recipes = await this.getUserRecipes(request.userId)
    
    // Get user preferences
    const preferences = await this.getUserPreferences(request.userId)
    
    // Build context for Claude
    const context = this.buildContext({
      pantryItems,
      expiringItems,
      recipes,
      preferences: { ...preferences, ...request.preferences },
      weekStartDate: request.weekStartDate,
    })
    
    // Generate plan with Claude
    const suggestions = await this.callClaude(context, request.preferences?.planningMode)
    
    // Save plan to database
    const mealPlan = await this.saveMealPlan(request.userId, request.weekStartDate, suggestions)
    
    return mealPlan
  }
  
  private async getPantryInventory(userId: string) {
    return await prisma.pantryItem.findMany({
      where: { userId },
      include: {
        ingredient: {
          select: {
            name: true,
            category: true,
            calories: true,
          },
        },
      },
    })
  }
  
  private async getExpiringItems(userId: string) {
    return await prisma.pantryItem.findMany({
      where: {
        userId,
        expirationDate: {
          lte: addDays(new Date(), 7),
        },
      },
      include: {
        ingredient: true,
      },
      orderBy: { expirationDate: 'asc' },
    })
  }
  
  private async getUserRecipes(userId: string) {
    return await prisma.recipe.findMany({
      where: {
        OR: [
          { userId },
          { userId: null }, // Include public recipes
        ],
      },
      include: {
        ingredients: {
          include: {
            ingredient: true,
          },
        },
      },
      take: 50, // Limit to manageable number
    })
  }
  
  private async getUserPreferences(userId: string) {
    return await prisma.userPreferences.findUnique({
      where: { userId },
    })
  }
  
  private buildContext(data: any) {
    const { pantryItems, expiringItems, recipes, preferences, weekStartDate } = data
    
    return `You are a meal planning assistant helping to create a weekly meal plan.

USER PREFERENCES:
- Planning Mode: ${preferences?.planningMode || 'assisted'}
- Servings per meal: ${preferences?.servingsPerMeal || 2}
- Max cook time: ${preferences?.maxCookTimeMinutes || 45} minutes
- Include leftovers: ${preferences?.includeLeftovers !== false}
- Dietary restrictions: ${preferences?.dietaryRestrictions?.join(', ') || 'none'}
- Allergies: ${preferences?.allergies?.join(', ') || 'none'}
- Disliked ingredients: ${preferences?.dislikedIngredients?.join(', ') || 'none'}

PANTRY INVENTORY:
${pantryItems.map((item: any) => `- ${item.customName}: ${item.amount} ${item.unit} (${item.location})`).join('\n')}

EXPIRING SOON (use these first!):
${expiringItems.map((item: any) => `- ${item.customName}: expires ${item.expirationDate?.toLocaleDateString()} (${item.ingredient?.category})`).join('\n')}

AVAILABLE RECIPES:
${recipes.map((recipe: any) => `- ${recipe.name}: ${recipe.totalTime || 30} min, serves ${recipe.servings}, ingredients: ${recipe.ingredients.map((i: any) => i.originalText).join(', ')}`).join('\n')}

WEEK STARTING: ${format(weekStartDate, 'EEEE, MMMM d')}

Please create a meal plan for 7 days (21 meals: breakfast, lunch, dinner) that:
1. PRIORITIZES using expiring ingredients first
2. Minimizes food waste by planning leftovers
3. Stays within the cooking time limit
4. Respects dietary restrictions and preferences
5. Provides variety while being practical
6. Assumes leftovers from dinner can be lunch the next day
7. Includes 1-2 "eating out" or simple meals for flexibility

Format your response as JSON with this structure:
{
  "meals": [
    {
      "date": "2024-01-01",
      "mealType": "BREAKFAST",
      "recipeName": "Recipe name",
      "servings": 2,
      "cookTime": 15,
      "reason": "Uses expiring eggs and milk",
      "ingredients": ["eggs", "milk", "bread"],
      "expectLeftovers": false
    }
  ],
  "shoppingNeeded": ["items not in pantry"],
  "wasteSaved": ["list of expiring items that will be used"]
}`
  }
  
  private async callClaude(context: string, mode?: string) {
    const systemPrompt = mode === 'yolo' 
      ? 'You are a spontaneous meal planner. Be creative and adventurous with combinations, but still practical. Prioritize fun and variety!'
      : 'You are a practical meal planner focused on minimizing waste and maximizing nutrition. Be sensible and efficient.'
    
    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307', // Fast and cost-effective for meal planning
        max_tokens: 2000,
        temperature: mode === 'yolo' ? 0.8 : 0.5,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: context,
          },
        ],
      })
      
      // Extract JSON from response
      const content = response.content[0].type === 'text' 
        ? response.content[0].text 
        : ''
      
      // Find JSON in response
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in Claude response')
      }
      
      const mealPlan = JSON.parse(jsonMatch[0])
      return mealPlan.meals || []
      
    } catch (error) {
      console.error('Claude API error:', error)
      // Fallback to simple plan
      return this.generateFallbackPlan()
    }
  }
  
  private generateFallbackPlan(): MealSuggestion[] {
    // Simple fallback plan if Claude fails
    const meals: MealSuggestion[] = []
    const weekStart = startOfWeek(new Date())
    
    for (let day = 0; day < 7; day++) {
      const date = format(addDays(weekStart, day), 'yyyy-MM-dd')
      
      meals.push({
        date,
        mealType: 'BREAKFAST',
        recipeName: 'Eggs and Toast',
        servings: 2,
        cookTime: 10,
        reason: 'Quick and nutritious start',
        ingredients: ['eggs', 'bread', 'butter'],
        expectLeftovers: false,
      })
      
      meals.push({
        date,
        mealType: 'LUNCH',
        recipeName: day > 0 ? 'Leftovers from dinner' : 'Sandwich',
        servings: 2,
        cookTime: 5,
        reason: day > 0 ? 'Use leftovers' : 'Quick lunch',
        ingredients: day > 0 ? [] : ['bread', 'cheese', 'lettuce'],
        expectLeftovers: false,
      })
      
      meals.push({
        date,
        mealType: 'DINNER',
        recipeName: this.getSimpleDinner(day),
        servings: 4, // Extra for leftovers
        cookTime: 30,
        reason: 'Balanced dinner with leftovers for lunch',
        ingredients: this.getDinnerIngredients(day),
        expectLeftovers: true,
        leftoverUse: 'Tomorrow\'s lunch',
      })
    }
    
    return meals
  }
  
  private getSimpleDinner(day: number): string {
    const dinners = [
      'Spaghetti with Marinara',
      'Chicken Stir-fry',
      'Tacos',
      'Baked Salmon with Vegetables',
      'Pizza Night',
      'Chicken Curry',
      'Burger Night',
    ]
    return dinners[day % dinners.length]
  }
  
  private getDinnerIngredients(day: number): string[] {
    const ingredients = [
      ['pasta', 'tomato sauce', 'ground beef'],
      ['chicken', 'vegetables', 'soy sauce', 'rice'],
      ['ground beef', 'tortillas', 'cheese', 'lettuce'],
      ['salmon', 'broccoli', 'potato'],
      ['pizza dough', 'cheese', 'tomato sauce'],
      ['chicken', 'curry sauce', 'rice'],
      ['ground beef', 'buns', 'cheese', 'lettuce'],
    ]
    return ingredients[day % ingredients.length]
  }
  
  private async saveMealPlan(userId: string, weekStartDate: Date, suggestions: MealSuggestion[]) {
    // Create meal plan
    const mealPlan = await prisma.mealPlan.create({
      data: {
        userId,
        weekStartDate,
        status: 'DRAFT',
        generatedBy: 'claude',
        meals: {
          create: suggestions.map(suggestion => ({
            date: new Date(suggestion.date),
            mealType: suggestion.mealType,
            simpleMealName: suggestion.recipeName,
            servings: suggestion.servings,
            expectLeftovers: suggestion.expectLeftovers,
            leftoverServings: suggestion.expectLeftovers ? suggestion.servings - 2 : 0,
          })),
        },
      },
      include: {
        meals: true,
      },
    })
    
    return mealPlan
  }
  
  async approvePlan(mealPlanId: string) {
    return await prisma.mealPlan.update({
      where: { id: mealPlanId },
      data: { status: 'APPROVED' },
    })
  }
  
  async getSuggestionsForExpiring(userId: string) {
    const expiringItems = await this.getExpiringItems(userId)
    
    if (expiringItems.length === 0) {
      return []
    }
    
    const context = `I have these ingredients expiring soon:
${expiringItems.map((item: any) => `- ${item.customName} (${item.ingredient?.category})`).join('\n')}

Suggest 3 quick recipes that would use these ingredients. Format as JSON:
{
  "suggestions": [
    {
      "name": "Recipe name",
      "uses": ["ingredient1", "ingredient2"],
      "time": 30,
      "instructions": "Brief instructions"
    }
  ]
}`
    
    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: context,
          },
        ],
      })
      
      const content = response.content[0].type === 'text' 
        ? response.content[0].text 
        : ''
      
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0])
        return result.suggestions || []
      }
    } catch (error) {
      console.error('Claude suggestions error:', error)
    }
    
    return []
  }
}

export const claudeMealPlanner = new ClaudeMealPlanner()