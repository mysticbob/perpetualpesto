import { getOpenAIService } from './openai.service';
import type { ChatMessage } from './openai.service';

export interface ExtractedIngredient {
  name: string;
  quantity?: number;
  unit?: string;
  brand?: string;
  description?: string;
  category?: string;
}

export interface ExtractedLocation {
  type: 'fridge' | 'freezer' | 'pantry' | 'counter';
  specific?: string; // e.g., "top shelf", "vegetable drawer"
}

export interface ExtractedDate {
  type: 'absolute' | 'relative';
  value: Date;
  originalText: string;
}

export interface ExtractionResult {
  ingredients: ExtractedIngredient[];
  locations: ExtractedLocation[];
  dates: ExtractedDate[];
  quantities: Array<{ value: number; unit: string }>;
  actions: string[];
  confidence: number;
}

// Common cooking units and their conversions
const UNIT_CONVERSIONS: Record<string, string> = {
  'pounds': 'lb',
  'pound': 'lb',
  'lbs': 'lb',
  'ounces': 'oz',
  'ounce': 'oz',
  'kilograms': 'kg',
  'kilogram': 'kg',
  'grams': 'g',
  'gram': 'g',
  'liters': 'l',
  'liter': 'l',
  'milliliters': 'ml',
  'milliliter': 'ml',
  'cups': 'cup',
  'tablespoons': 'tbsp',
  'tablespoon': 'tbsp',
  'teaspoons': 'tsp',
  'teaspoon': 'tsp',
  'pieces': 'piece',
  'items': 'item',
  'packages': 'package',
  'bags': 'bag',
  'boxes': 'box',
  'cans': 'can',
  'jars': 'jar',
  'bottles': 'bottle',
};

// Food categories for better organization
const FOOD_CATEGORIES: Record<string, string[]> = {
  'produce': ['tomato', 'potato', 'carrot', 'onion', 'garlic', 'lettuce', 'spinach', 'apple', 'banana', 'orange'],
  'meat': ['chicken', 'beef', 'pork', 'turkey', 'lamb', 'fish', 'salmon', 'tuna', 'shrimp'],
  'dairy': ['milk', 'cheese', 'butter', 'yogurt', 'cream', 'eggs'],
  'grains': ['bread', 'pasta', 'rice', 'flour', 'cereal', 'oats'],
  'pantry': ['sugar', 'salt', 'pepper', 'oil', 'vinegar', 'sauce', 'spices'],
  'frozen': ['ice cream', 'frozen vegetables', 'frozen pizza', 'frozen meals'],
  'beverages': ['water', 'juice', 'soda', 'coffee', 'tea', 'beer', 'wine'],
  'snacks': ['chips', 'cookies', 'crackers', 'nuts', 'candy'],
};

export class EntityExtractor {
  private openAI = getOpenAIService();

  async extractEntities(text: string, useAI: boolean = true): Promise<ExtractionResult> {
    if (useAI) {
      return this.extractWithAI(text);
    }
    return this.extractWithPatterns(text);
  }

  private async extractWithAI(text: string): Promise<ExtractionResult> {
    const systemPrompt = `You are an expert at extracting structured information from natural language commands about food and cooking.
    Extract the following information and return it as JSON:
    - ingredients: array of {name, quantity, unit, brand?, description?, category}
    - locations: array of {type: 'fridge'|'freezer'|'pantry'|'counter', specific?}
    - dates: array of {type: 'absolute'|'relative', value: ISO date string, originalText}
    - quantities: array of {value: number, unit: string}
    - actions: array of action verbs (add, remove, move, check, etc.)
    
    Be precise with quantities and units. Normalize units (e.g., pounds -> lb).
    For relative dates like "tomorrow" or "in 3 days", calculate the actual date.
    Categorize ingredients into: produce, meat, dairy, grains, pantry, frozen, beverages, snacks.`;

    const messages: ChatMessage[] = [
      { role: 'user', content: `Extract entities from: "${text}"` }
    ];

    try {
      const response = await this.openAI.chat(messages, systemPrompt);
      const parsed = JSON.parse(response);
      
      return {
        ingredients: parsed.ingredients || [],
        locations: parsed.locations || [],
        dates: this.parseDates(parsed.dates || []),
        quantities: parsed.quantities || [],
        actions: parsed.actions || [],
        confidence: 0.9, // High confidence for AI extraction
      };
    } catch (error) {
      console.error('AI extraction failed, falling back to patterns:', error);
      return this.extractWithPatterns(text);
    }
  }

  private extractWithPatterns(text: string): ExtractionResult {
    const result: ExtractionResult = {
      ingredients: [],
      locations: [],
      dates: [],
      quantities: [],
      actions: [],
      confidence: 0.7, // Lower confidence for pattern matching
    };

    // Extract quantities and units
    const quantityPattern = /(\d+(?:\.\d+)?)\s*([a-zA-Z]+)/g;
    let match;
    while ((match = quantityPattern.exec(text)) !== null) {
      const value = parseFloat(match[1]);
      const unit = this.normalizeUnit(match[2]);
      if (unit) {
        result.quantities.push({ value, unit });
      }
    }

    // Extract ingredients with quantities
    for (const [category, items] of Object.entries(FOOD_CATEGORIES)) {
      for (const item of items) {
        const regex = new RegExp(`\\b${item}s?\\b`, 'gi');
        if (regex.test(text)) {
          const ingredient: ExtractedIngredient = {
            name: item,
            category,
          };

          // Try to find associated quantity
          const quantityBefore = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*([a-zA-Z]+)?\\s*(?:of\\s+)?${item}`, 'i');
          const qMatch = text.match(quantityBefore);
          if (qMatch) {
            ingredient.quantity = parseFloat(qMatch[1]);
            if (qMatch[2]) {
              ingredient.unit = this.normalizeUnit(qMatch[2]);
            }
          }

          result.ingredients.push(ingredient);
        }
      }
    }

    // Extract locations
    const locationPatterns = {
      fridge: /fridge|refrigerator|cold storage/i,
      freezer: /freezer|frozen/i,
      pantry: /pantry|cupboard|cabinet|shelf/i,
      counter: /counter|countertop/i,
    };

    for (const [type, pattern] of Object.entries(locationPatterns)) {
      if (pattern.test(text)) {
        result.locations.push({ type: type as any });
      }
    }

    // Extract dates
    result.dates = this.extractDates(text);

    // Extract action verbs
    const actionPatterns = [
      /\b(add|store|put|place|save)\b/i,
      /\b(remove|delete|throw|toss|discard)\b/i,
      /\b(move|transfer|relocate)\b/i,
      /\b(check|verify|see)\b/i,
      /\b(find|search|look)\b/i,
      /\b(update|change|modify)\b/i,
    ];

    for (const pattern of actionPatterns) {
      const match = text.match(pattern);
      if (match) {
        result.actions.push(match[1].toLowerCase());
      }
    }

    return result;
  }

  private normalizeUnit(unit: string): string | undefined {
    const normalized = unit.toLowerCase();
    return UNIT_CONVERSIONS[normalized] || (UNIT_CONVERSIONS[normalized + 's'] ? UNIT_CONVERSIONS[normalized + 's'] : normalized);
  }

  private extractDates(text: string): ExtractedDate[] {
    const dates: ExtractedDate[] = [];
    const now = new Date();

    // Tomorrow
    if (/tomorrow/i.test(text)) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      dates.push({
        type: 'relative',
        value: tomorrow,
        originalText: 'tomorrow',
      });
    }

    // In X days
    const inDaysMatch = text.match(/in (\d+) days?/i);
    if (inDaysMatch) {
      const days = parseInt(inDaysMatch[1]);
      const futureDate = new Date(now);
      futureDate.setDate(futureDate.getDate() + days);
      dates.push({
        type: 'relative',
        value: futureDate,
        originalText: inDaysMatch[0],
      });
    }

    // Next week
    if (/next week/i.test(text)) {
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      dates.push({
        type: 'relative',
        value: nextWeek,
        originalText: 'next week',
      });
    }

    // Expires on/in
    const expiresMatch = text.match(/expires? (?:on|in) (.+?)(?:\.|,|$)/i);
    if (expiresMatch) {
      // Try to parse the date
      const dateStr = expiresMatch[1];
      const parsedDate = new Date(dateStr);
      if (!isNaN(parsedDate.getTime())) {
        dates.push({
          type: 'absolute',
          value: parsedDate,
          originalText: expiresMatch[0],
        });
      }
    }

    return dates;
  }

  private parseDates(dates: any[]): ExtractedDate[] {
    return dates.map(d => ({
      type: d.type || 'absolute',
      value: new Date(d.value),
      originalText: d.originalText || '',
    }));
  }

  // Helper method to enhance extraction with context
  async enhanceWithContext(
    extraction: ExtractionResult,
    context: { userId: string; currentPantry?: any[] }
  ): Promise<ExtractionResult> {
    // If we have ambiguous ingredients, try to match with user's common items
    if (context.currentPantry && extraction.ingredients.length > 0) {
      for (const ingredient of extraction.ingredients) {
        // Find similar items in pantry
        const similar = context.currentPantry.find(item => 
          item.name.toLowerCase().includes(ingredient.name.toLowerCase()) ||
          ingredient.name.toLowerCase().includes(item.name.toLowerCase())
        );
        
        if (similar) {
          // Use the exact name from pantry
          ingredient.name = similar.name;
          if (!ingredient.category && similar.category) {
            ingredient.category = similar.category;
          }
        }
      }
    }

    return extraction;
  }

  // Validate extracted entities
  validateExtraction(extraction: ExtractionResult): {
    valid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check for negative quantities
    for (const qty of extraction.quantities) {
      if (qty.value <= 0) {
        issues.push(`Invalid quantity: ${qty.value}`);
      }
    }

    // Check for duplicate ingredients
    const ingredientNames = extraction.ingredients.map(i => i.name.toLowerCase());
    const duplicates = ingredientNames.filter((name, index) => 
      ingredientNames.indexOf(name) !== index
    );
    if (duplicates.length > 0) {
      issues.push(`Duplicate ingredients: ${duplicates.join(', ')}`);
    }

    // Check for conflicting locations
    if (extraction.locations.length > 2) {
      issues.push('Too many locations specified');
    }

    // Check for invalid dates
    for (const date of extraction.dates) {
      if (isNaN(date.value.getTime())) {
        issues.push(`Invalid date: ${date.originalText}`);
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }
}

export const entityExtractor = new EntityExtractor();