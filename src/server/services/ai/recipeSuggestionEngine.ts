import { prisma } from '../../../server/lib/db';
import { getAIService } from './aiService';
import type { ChatMessage } from './openai.service';

interface IngredientMatch {
  ingredient: string;
  available: boolean;
  substitutable: boolean;
  substitutes?: string[];
}

interface RecipeSuggestion {
  id?: string;
  name: string;
  description: string;
  ingredients: IngredientMatch[];
  matchPercentage: number;
  missingIngredients: string[];
  substituteOptions: Record<string, string[]>;
  preparationTime?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  cuisine?: string;
  dietaryInfo?: string[];
  reason: string;
  score: number;
}

interface SuggestionCriteria {
  availableIngredients: string[];
  dietaryRestrictions?: string[];
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert';
  preparationTime?: number; // in minutes
  difficulty?: 'easy' | 'medium' | 'hard';
  cuisine?: string;
  servings?: number;
  includeExpiring?: boolean;
  minimizeWaste?: boolean;
}

export class RecipeSuggestionEngine {
  private aiService = getAIService();

  async suggestRecipes(
    userId: string,
    criteria: SuggestionCriteria
  ): Promise<RecipeSuggestion[]> {
    try {
      // Get user's pantry items
      const pantryItems = await this.getUserPantryItems(userId);
      
      // Get items expiring soon if requested
      const expiringItems = criteria.includeExpiring 
        ? await this.getExpiringItems(userId, 7) // 7 days
        : [];

      // Get user's dietary preferences
      const userPreferences = await this.getUserPreferences(userId);
      
      // Combine dietary restrictions
      const dietaryRestrictions = [
        ...(criteria.dietaryRestrictions || []),
        ...(userPreferences?.dietaryRestrictions || []),
      ];

      // Get existing recipes from database that match criteria
      const dbRecipes = await this.findMatchingRecipes(
        pantryItems.map(i => i.name),
        dietaryRestrictions
      );

      // Generate AI suggestions
      const aiSuggestions = await this.generateAISuggestions(
        pantryItems.map(i => i.name),
        expiringItems.map(i => i.name),
        criteria,
        dietaryRestrictions
      );

      // Combine and rank suggestions
      const allSuggestions = [
        ...this.convertDBRecipes(dbRecipes, pantryItems),
        ...aiSuggestions,
      ];

      // Score and sort suggestions
      const scoredSuggestions = this.scoreSuggestions(
        allSuggestions,
        pantryItems,
        expiringItems,
        criteria
      );

      // Return top suggestions
      return scoredSuggestions.slice(0, 10);
    } catch (error) {
      console.error('Recipe suggestion error:', error);
      return [];
    }
  }

  private async getUserPantryItems(userId: string) {
    return prisma.pantryItem.findMany({
      where: { 
        userId,
        quantity: { gt: 0 },
      },
      select: {
        id: true,
        name: true,
        quantity: true,
        unit: true,
        expirationDate: true,
        category: true,
      },
    });
  }

  private async getExpiringItems(userId: string, daysAhead: number) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return prisma.pantryItem.findMany({
      where: {
        userId,
        quantity: { gt: 0 },
        expirationDate: {
          lte: futureDate,
          gte: new Date(),
        },
      },
      orderBy: {
        expirationDate: 'asc',
      },
    });
  }

  private async getUserPreferences(userId: string) {
    // This would fetch from a user preferences table
    // For now, return mock data
    return {
      dietaryRestrictions: [],
      favoriteCuisines: [],
      dislikedIngredients: [],
    };
  }

  private async findMatchingRecipes(
    ingredients: string[],
    dietaryRestrictions: string[]
  ) {
    // Find recipes where at least 50% of ingredients are available
    const recipes = await prisma.recipe.findMany({
      include: {
        ingredients: true,
      },
      take: 20,
    });

    return recipes.filter(recipe => {
      const recipeIngredients = recipe.ingredients.map(i => i.name.toLowerCase());
      const availableIngredients = ingredients.map(i => i.toLowerCase());
      
      const matchCount = recipeIngredients.filter(ri => 
        availableIngredients.some(ai => ai.includes(ri) || ri.includes(ai))
      ).length;
      
      const matchPercentage = (matchCount / recipeIngredients.length) * 100;
      return matchPercentage >= 50;
    });
  }

  private async generateAISuggestions(
    availableIngredients: string[],
    expiringIngredients: string[],
    criteria: SuggestionCriteria,
    dietaryRestrictions: string[]
  ): Promise<RecipeSuggestion[]> {
    const systemPrompt = `You are a helpful chef assistant that suggests recipes based on available ingredients.
    Consider dietary restrictions, expiring ingredients, and user preferences.
    Return suggestions as a JSON array with the following structure:
    {
      name: string,
      description: string,
      ingredients: Array<{ingredient: string, available: boolean, substitutable: boolean, substitutes?: string[]}>,
      preparationTime: number (minutes),
      difficulty: 'easy' | 'medium' | 'hard',
      cuisine: string,
      dietaryInfo: string[],
      reason: string (why this recipe is suggested)
    }`;

    const userPrompt = `
    Available ingredients: ${availableIngredients.join(', ')}
    ${expiringIngredients.length > 0 ? `Expiring soon: ${expiringIngredients.join(', ')}` : ''}
    ${dietaryRestrictions.length > 0 ? `Dietary restrictions: ${dietaryRestrictions.join(', ')}` : ''}
    ${criteria.mealType ? `Meal type: ${criteria.mealType}` : ''}
    ${criteria.preparationTime ? `Max preparation time: ${criteria.preparationTime} minutes` : ''}
    ${criteria.cuisine ? `Preferred cuisine: ${criteria.cuisine}` : ''}
    
    Suggest 5 recipes that:
    1. Use as many available ingredients as possible
    2. Prioritize using expiring ingredients
    3. Respect dietary restrictions
    4. Can suggest substitutes for missing ingredients
    5. Are practical and delicious
    `;

    const messages: ChatMessage[] = [
      { role: 'user', content: userPrompt }
    ];

    try {
      const response = await this.aiService.processChat('system', messages, systemPrompt);
      const suggestions = JSON.parse(response.response);
      
      return suggestions.map((s: any) => ({
        ...s,
        matchPercentage: this.calculateMatchPercentage(s.ingredients),
        missingIngredients: s.ingredients
          .filter((i: any) => !i.available && !i.substitutable)
          .map((i: any) => i.ingredient),
        substituteOptions: s.ingredients
          .filter((i: any) => i.substitutable)
          .reduce((acc: any, i: any) => {
            acc[i.ingredient] = i.substitutes || [];
            return acc;
          }, {}),
        score: 0, // Will be calculated later
      }));
    } catch (error) {
      console.error('AI suggestion error:', error);
      return [];
    }
  }

  private convertDBRecipes(recipes: any[], pantryItems: any[]): RecipeSuggestion[] {
    return recipes.map(recipe => {
      const ingredients = recipe.ingredients.map((ing: any) => {
        const available = pantryItems.some(
          p => p.name.toLowerCase().includes(ing.name.toLowerCase()) ||
               ing.name.toLowerCase().includes(p.name.toLowerCase())
        );
        
        return {
          ingredient: ing.name,
          available,
          substitutable: !available && this.canSubstitute(ing.name),
          substitutes: !available ? this.getSubstitutes(ing.name) : undefined,
        };
      });

      const matchPercentage = this.calculateMatchPercentage(ingredients);
      
      return {
        id: recipe.id,
        name: recipe.name,
        description: recipe.description || '',
        ingredients,
        matchPercentage,
        missingIngredients: ingredients
          .filter(i => !i.available && !i.substitutable)
          .map(i => i.ingredient),
        substituteOptions: ingredients
          .filter(i => i.substitutable)
          .reduce((acc, i) => {
            acc[i.ingredient] = i.substitutes || [];
            return acc;
          }, {} as Record<string, string[]>),
        preparationTime: recipe.totalTime,
        difficulty: this.estimateDifficulty(recipe),
        cuisine: recipe.cuisine,
        dietaryInfo: [],
        reason: `${matchPercentage.toFixed(0)}% of ingredients available`,
        score: 0,
      };
    });
  }

  private calculateMatchPercentage(ingredients: IngredientMatch[]): number {
    if (ingredients.length === 0) return 0;
    
    const availableCount = ingredients.filter(i => i.available || i.substitutable).length;
    return (availableCount / ingredients.length) * 100;
  }

  private canSubstitute(ingredient: string): boolean {
    const substitutableIngredients = [
      'butter', 'oil', 'milk', 'cream', 'flour', 'sugar',
      'eggs', 'cheese', 'yogurt', 'sour cream', 'vinegar',
    ];
    
    return substitutableIngredients.some(s => 
      ingredient.toLowerCase().includes(s)
    );
  }

  private getSubstitutes(ingredient: string): string[] {
    const substitutes: Record<string, string[]> = {
      'butter': ['oil', 'margarine', 'coconut oil'],
      'milk': ['almond milk', 'soy milk', 'oat milk', 'water + butter'],
      'eggs': ['flax eggs', 'chia eggs', 'applesauce', 'mashed banana'],
      'flour': ['almond flour', 'coconut flour', 'rice flour'],
      'sugar': ['honey', 'maple syrup', 'stevia', 'agave'],
      'cream': ['milk + butter', 'coconut cream', 'cashew cream'],
      'yogurt': ['sour cream', 'buttermilk', 'cream cheese'],
    };

    const key = Object.keys(substitutes).find(k => 
      ingredient.toLowerCase().includes(k)
    );
    
    return key ? substitutes[key] : [];
  }

  private estimateDifficulty(recipe: any): 'easy' | 'medium' | 'hard' {
    const steps = recipe.instructions?.length || 0;
    const ingredients = recipe.ingredients?.length || 0;
    const time = recipe.totalTime || 0;
    
    if (steps <= 5 && ingredients <= 8 && time <= 30) return 'easy';
    if (steps <= 10 && ingredients <= 15 && time <= 60) return 'medium';
    return 'hard';
  }

  private scoreSuggestions(
    suggestions: RecipeSuggestion[],
    pantryItems: any[],
    expiringItems: any[],
    criteria: SuggestionCriteria
  ): RecipeSuggestion[] {
    return suggestions.map(suggestion => {
      let score = 0;
      
      // Base score from match percentage
      score += suggestion.matchPercentage;
      
      // Bonus for using expiring ingredients
      if (expiringItems.length > 0) {
        const usesExpiring = suggestion.ingredients.some(i => 
          i.available && expiringItems.some(e => 
            e.name.toLowerCase().includes(i.ingredient.toLowerCase())
          )
        );
        if (usesExpiring) score += 20;
      }
      
      // Bonus for matching meal type
      if (criteria.mealType && suggestion.description.toLowerCase().includes(criteria.mealType)) {
        score += 10;
      }
      
      // Bonus for matching preparation time
      if (criteria.preparationTime && suggestion.preparationTime) {
        if (suggestion.preparationTime <= criteria.preparationTime) {
          score += 15;
        }
      }
      
      // Bonus for matching difficulty
      if (criteria.difficulty && suggestion.difficulty === criteria.difficulty) {
        score += 10;
      }
      
      // Penalty for missing ingredients
      score -= suggestion.missingIngredients.length * 5;
      
      // Bonus for having substitutes
      score += Object.keys(suggestion.substituteOptions).length * 3;
      
      return { ...suggestion, score };
    }).sort((a, b) => b.score - a.score);
  }

  // Get ingredient substitution suggestions
  async getSubstitutionSuggestions(ingredient: string): Promise<string[]> {
    const systemPrompt = `You are a culinary expert. Suggest practical substitutes for cooking ingredients.
    Return a JSON array of substitute ingredients.`;

    const messages: ChatMessage[] = [
      { role: 'user', content: `What can I substitute for ${ingredient}?` }
    ];

    try {
      const response = await this.aiService.processChat('system', messages, systemPrompt);
      return JSON.parse(response.response);
    } catch (error) {
      console.error('Substitution suggestion error:', error);
      return this.getSubstitutes(ingredient);
    }
  }

  // Generate a shopping list for missing ingredients
  async generateShoppingList(
    userId: string,
    recipeId: string
  ): Promise<{ ingredient: string; quantity?: string; store?: string }[]> {
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      include: { ingredients: true },
    });

    if (!recipe) return [];

    const pantryItems = await this.getUserPantryItems(userId);
    const pantryNames = pantryItems.map(i => i.name.toLowerCase());

    const missingIngredients = recipe.ingredients.filter(ing => 
      !pantryNames.some(p => p.includes(ing.name.toLowerCase()) || 
                             ing.name.toLowerCase().includes(p))
    );

    return missingIngredients.map(ing => ({
      ingredient: ing.name,
      quantity: ing.quantity,
      store: undefined, // Could be enhanced with store preferences
    }));
  }
}

export const recipeSuggestionEngine = new RecipeSuggestionEngine();