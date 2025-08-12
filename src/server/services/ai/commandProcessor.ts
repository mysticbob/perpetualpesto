export enum CommandIntent {
  ADD_ITEM = 'ADD_ITEM',
  REMOVE_ITEM = 'REMOVE_ITEM',
  MOVE_ITEM = 'MOVE_ITEM',
  CHECK_AVAILABILITY = 'CHECK_AVAILABILITY',
  FIND_RECIPES = 'FIND_RECIPES',
  CHECK_EXPIRATION = 'CHECK_EXPIRATION',
  LIST_ITEMS = 'LIST_ITEMS',
  UPDATE_QUANTITY = 'UPDATE_QUANTITY',
  ADD_TO_GROCERY = 'ADD_TO_GROCERY',
  MEAL_PLAN = 'MEAL_PLAN',
  NUTRITION_INFO = 'NUTRITION_INFO',
  SUBSTITUTE_INGREDIENT = 'SUBSTITUTE_INGREDIENT',
  UNKNOWN = 'UNKNOWN',
}

export interface ExtractedEntity {
  type: 'ingredient' | 'quantity' | 'location' | 'recipe' | 'date' | 'action';
  value: string;
  normalized?: string;
  confidence: number;
}

export interface ProcessedCommand {
  intent: CommandIntent;
  entities: ExtractedEntity[];
  originalText: string;
  confidence: number;
  suggestedAction?: string;
  parameters?: Record<string, any>;
}

export interface IngredientEntity {
  name: string;
  quantity?: number;
  unit?: string;
  location?: 'fridge' | 'pantry' | 'freezer' | 'counter';
  expirationDate?: Date;
}

const INTENT_PATTERNS = {
  [CommandIntent.ADD_ITEM]: [
    /add|store|put|place|save|stock/i,
    /bought|purchased|got/i,
    /leftover|remaining/i,
  ],
  [CommandIntent.REMOVE_ITEM]: [
    /remove|delete|throw|toss|discard|used up|finished/i,
    /ate|consumed|used/i,
  ],
  [CommandIntent.MOVE_ITEM]: [
    /move|transfer|relocate|shift/i,
    /from.*to/i,
  ],
  [CommandIntent.CHECK_AVAILABILITY]: [
    /do (i|we) have|is there|are there/i,
    /check (for|if)/i,
    /enough|sufficient/i,
  ],
  [CommandIntent.FIND_RECIPES]: [
    /what can (i|we) (make|cook|prepare)/i,
    /recipe|dish|meal/i,
    /suggest|recommend/i,
  ],
  [CommandIntent.CHECK_EXPIRATION]: [
    /expir|spoil|bad|fresh/i,
    /how long|when.*expire/i,
  ],
  [CommandIntent.LIST_ITEMS]: [
    /list|show|display|what('s| is)/i,
    /inventory|stock/i,
    /everything|all items/i,
  ],
  [CommandIntent.UPDATE_QUANTITY]: [
    /update|change|modify|adjust/i,
    /quantity|amount|number/i,
  ],
  [CommandIntent.ADD_TO_GROCERY]: [
    /grocery|shopping|buy|need to get/i,
    /add to list/i,
  ],
  [CommandIntent.MEAL_PLAN]: [
    /meal plan|plan meal|weekly menu/i,
    /what.*week|dinner.*tonight/i,
  ],
  [CommandIntent.NUTRITION_INFO]: [
    /calorie|nutrition|protein|carb|fat/i,
    /healthy|diet/i,
  ],
  [CommandIntent.SUBSTITUTE_INGREDIENT]: [
    /substitute|replace|instead of/i,
    /alternative|swap/i,
  ],
};

const LOCATION_KEYWORDS = {
  fridge: ['fridge', 'refrigerator', 'cold storage'],
  freezer: ['freezer', 'frozen'],
  pantry: ['pantry', 'cupboard', 'cabinet', 'shelf'],
  counter: ['counter', 'countertop', 'kitchen counter'],
};

const QUANTITY_PATTERNS = [
  /(\d+(?:\.\d+)?)\s*(lb|lbs|pound|pounds|kg|kilogram|g|gram|oz|ounce)/i,
  /(\d+(?:\.\d+)?)\s*(cup|cups|tbsp|tablespoon|tsp|teaspoon|ml|l|liter)/i,
  /(\d+(?:\.\d+)?)\s*(piece|pieces|item|items|unit|units)/i,
  /(\d+(?:\.\d+)?)\s*(dozen|pack|package|bag|box|can|jar|bottle)/i,
];

export class CommandProcessor {
  async processCommand(text: string): Promise<ProcessedCommand> {
    const lowercaseText = text.toLowerCase();
    
    // Detect intent
    const intent = this.detectIntent(lowercaseText);
    
    // Extract entities
    const entities = await this.extractEntities(text);
    
    // Calculate confidence
    const confidence = this.calculateConfidence(intent, entities);
    
    // Generate parameters based on intent and entities
    const parameters = this.generateParameters(intent, entities);
    
    // Suggest action if confidence is low
    const suggestedAction = confidence < 0.7 
      ? this.suggestClarification(intent, entities)
      : undefined;
    
    return {
      intent,
      entities,
      originalText: text,
      confidence,
      suggestedAction,
      parameters,
    };
  }
  
  private detectIntent(text: string): CommandIntent {
    for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          return intent as CommandIntent;
        }
      }
    }
    return CommandIntent.UNKNOWN;
  }
  
  private async extractEntities(text: string): Promise<ExtractedEntity[]> {
    const entities: ExtractedEntity[] = [];
    
    // Extract quantities
    for (const pattern of QUANTITY_PATTERNS) {
      const match = text.match(pattern);
      if (match) {
        entities.push({
          type: 'quantity',
          value: match[0],
          normalized: this.normalizeQuantity(match[1], match[2]),
          confidence: 0.9,
        });
      }
    }
    
    // Extract locations
    for (const [location, keywords] of Object.entries(LOCATION_KEYWORDS)) {
      for (const keyword of keywords) {
        if (text.toLowerCase().includes(keyword)) {
          entities.push({
            type: 'location',
            value: keyword,
            normalized: location,
            confidence: 0.95,
          });
        }
      }
    }
    
    // Extract ingredients (simplified - in production, use NER or GPT)
    const ingredientPatterns = [
      /\b(chicken|beef|pork|fish|tofu)\b/gi,
      /\b(tomato|potato|carrot|onion|garlic|lettuce|spinach)\b/gi,
      /\b(milk|cheese|butter|yogurt|cream)\b/gi,
      /\b(bread|pasta|rice|flour|sugar)\b/gi,
      /\b(apple|banana|orange|strawberry|grape)\b/gi,
    ];
    
    for (const pattern of ingredientPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          entities.push({
            type: 'ingredient',
            value: match,
            normalized: match.toLowerCase(),
            confidence: 0.85,
          });
        }
      }
    }
    
    // Extract dates
    const datePatterns = [
      /tomorrow/gi,
      /next week/gi,
      /in (\d+) days?/gi,
      /expires? (on|in) .+/gi,
    ];
    
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        entities.push({
          type: 'date',
          value: match[0],
          normalized: this.parseDate(match[0]),
          confidence: 0.8,
        });
      }
    }
    
    return entities;
  }
  
  private normalizeQuantity(amount: string, unit: string): string {
    const normalizedUnit = unit.toLowerCase()
      .replace(/s$/, '') // Remove plural
      .replace('pound', 'lb')
      .replace('ounce', 'oz')
      .replace('kilogram', 'kg')
      .replace('gram', 'g')
      .replace('liter', 'l')
      .replace('tablespoon', 'tbsp')
      .replace('teaspoon', 'tsp');
    
    return `${amount} ${normalizedUnit}`;
  }
  
  private parseDate(dateStr: string): string {
    const now = new Date();
    
    if (dateStr.includes('tomorrow')) {
      now.setDate(now.getDate() + 1);
      return now.toISOString();
    }
    
    if (dateStr.includes('next week')) {
      now.setDate(now.getDate() + 7);
      return now.toISOString();
    }
    
    const daysMatch = dateStr.match(/in (\d+) days?/i);
    if (daysMatch) {
      now.setDate(now.getDate() + parseInt(daysMatch[1]));
      return now.toISOString();
    }
    
    return new Date().toISOString();
  }
  
  private calculateConfidence(intent: CommandIntent, entities: ExtractedEntity[]): number {
    if (intent === CommandIntent.UNKNOWN) return 0.2;
    
    // Base confidence from intent detection
    let confidence = 0.7;
    
    // Boost confidence if we have relevant entities
    if (entities.length > 0) {
      confidence += 0.1 * Math.min(entities.length, 3);
    }
    
    // Average entity confidence
    if (entities.length > 0) {
      const avgEntityConfidence = entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length;
      confidence = (confidence + avgEntityConfidence) / 2;
    }
    
    return Math.min(confidence, 1.0);
  }
  
  private generateParameters(intent: CommandIntent, entities: ExtractedEntity[]): Record<string, any> {
    const params: Record<string, any> = {};
    
    // Extract relevant entities for each intent
    switch (intent) {
      case CommandIntent.ADD_ITEM:
      case CommandIntent.REMOVE_ITEM:
        params.items = entities
          .filter(e => e.type === 'ingredient')
          .map(e => ({
            name: e.normalized || e.value,
            quantity: entities.find(q => q.type === 'quantity')?.normalized,
            location: entities.find(l => l.type === 'location')?.normalized || 'pantry',
          }));
        break;
        
      case CommandIntent.MOVE_ITEM:
        params.item = entities.find(e => e.type === 'ingredient')?.normalized;
        const locations = entities.filter(e => e.type === 'location');
        if (locations.length >= 2) {
          params.from = locations[0].normalized;
          params.to = locations[1].normalized;
        }
        break;
        
      case CommandIntent.CHECK_AVAILABILITY:
      case CommandIntent.FIND_RECIPES:
        params.ingredients = entities
          .filter(e => e.type === 'ingredient')
          .map(e => e.normalized || e.value);
        break;
        
      case CommandIntent.CHECK_EXPIRATION:
      case CommandIntent.LIST_ITEMS:
        params.location = entities.find(e => e.type === 'location')?.normalized;
        break;
    }
    
    return params;
  }
  
  private suggestClarification(intent: CommandIntent, entities: ExtractedEntity[]): string {
    if (intent === CommandIntent.UNKNOWN) {
      return "I'm not sure what you want to do. Try saying something like 'Add chicken to the fridge' or 'What can I make for dinner?'";
    }
    
    switch (intent) {
      case CommandIntent.ADD_ITEM:
        if (!entities.find(e => e.type === 'ingredient')) {
          return "What item would you like to add?";
        }
        if (!entities.find(e => e.type === 'quantity')) {
          return "How much would you like to add?";
        }
        break;
        
      case CommandIntent.MOVE_ITEM:
        if (!entities.find(e => e.type === 'ingredient')) {
          return "What item would you like to move?";
        }
        if (entities.filter(e => e.type === 'location').length < 2) {
          return "Where would you like to move it from and to?";
        }
        break;
        
      case CommandIntent.CHECK_AVAILABILITY:
      case CommandIntent.FIND_RECIPES:
        if (!entities.find(e => e.type === 'ingredient')) {
          return "What ingredients are you looking for?";
        }
        break;
    }
    
    return "Could you provide more details?";
  }
  
  parseIngredients(entities: ExtractedEntity[]): IngredientEntity[] {
    const ingredients: IngredientEntity[] = [];
    const ingredientEntities = entities.filter(e => e.type === 'ingredient');
    
    for (const ingredientEntity of ingredientEntities) {
      const ingredient: IngredientEntity = {
        name: ingredientEntity.normalized || ingredientEntity.value,
      };
      
      // Find associated quantity
      const quantityEntity = entities.find(e => e.type === 'quantity');
      if (quantityEntity && quantityEntity.normalized) {
        const [amount, unit] = quantityEntity.normalized.split(' ');
        ingredient.quantity = parseFloat(amount);
        ingredient.unit = unit;
      }
      
      // Find associated location
      const locationEntity = entities.find(e => e.type === 'location');
      if (locationEntity) {
        ingredient.location = locationEntity.normalized as any;
      }
      
      // Find associated date
      const dateEntity = entities.find(e => e.type === 'date');
      if (dateEntity && dateEntity.normalized) {
        ingredient.expirationDate = new Date(dateEntity.normalized);
      }
      
      ingredients.push(ingredient);
    }
    
    return ingredients;
  }
}

export const commandProcessor = new CommandProcessor();