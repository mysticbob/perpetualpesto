interface ConversationTurn {
  id: string;
  userId: string;
  timestamp: Date;
  input: string;
  intent?: string;
  entities?: any[];
  response: string;
  action?: string;
  actionResult?: any;
  confidence: number;
}

interface UserContext {
  userId: string;
  currentSession: {
    startTime: Date;
    turns: ConversationTurn[];
    topics: string[];
    lastActivity: Date;
  };
  preferences: {
    communicationStyle: 'formal' | 'casual' | 'concise';
    responseLength: 'short' | 'medium' | 'detailed';
    useEmojis: boolean;
  };
  history: {
    frequentCommands: Map<string, number>;
    recentItems: string[];
    favoriteRecipes: string[];
    commonMealTimes: Record<string, Date>;
  };
  state: {
    currentRecipe?: string;
    shoppingMode: boolean;
    planningMeal?: string;
    awaitingConfirmation?: {
      action: string;
      data: any;
      expires: Date;
    };
  };
}

export class ConversationContextManager {
  private contexts: Map<string, UserContext> = new Map();
  private maxTurnsInMemory = 20;
  private sessionTimeout = 30 * 60 * 1000; // 30 minutes

  getContext(userId: string): UserContext {
    if (!this.contexts.has(userId)) {
      this.contexts.set(userId, this.createNewContext(userId));
    }
    
    const context = this.contexts.get(userId)!;
    
    // Check if session has expired
    if (this.isSessionExpired(context)) {
      this.startNewSession(context);
    }
    
    return context;
  }

  private createNewContext(userId: string): UserContext {
    return {
      userId,
      currentSession: {
        startTime: new Date(),
        turns: [],
        topics: [],
        lastActivity: new Date(),
      },
      preferences: {
        communicationStyle: 'casual',
        responseLength: 'medium',
        useEmojis: false,
      },
      history: {
        frequentCommands: new Map(),
        recentItems: [],
        favoriteRecipes: [],
        commonMealTimes: {},
      },
      state: {
        shoppingMode: false,
      },
    };
  }

  private isSessionExpired(context: UserContext): boolean {
    const now = new Date();
    const lastActivity = context.currentSession.lastActivity;
    return now.getTime() - lastActivity.getTime() > this.sessionTimeout;
  }

  private startNewSession(context: UserContext): void {
    // Archive important information from previous session
    this.archiveSession(context);
    
    // Reset session
    context.currentSession = {
      startTime: new Date(),
      turns: [],
      topics: [],
      lastActivity: new Date(),
    };
    
    // Clear temporary state
    context.state = {
      shoppingMode: false,
    };
  }

  private archiveSession(context: UserContext): void {
    // Update frequent commands
    context.currentSession.turns.forEach(turn => {
      if (turn.intent) {
        const count = context.history.frequentCommands.get(turn.intent) || 0;
        context.history.frequentCommands.set(turn.intent, count + 1);
      }
    });
    
    // Keep only top 10 frequent commands
    const sortedCommands = Array.from(context.history.frequentCommands.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    context.history.frequentCommands = new Map(sortedCommands);
  }

  addTurn(
    userId: string,
    turn: Omit<ConversationTurn, 'id' | 'userId' | 'timestamp'>
  ): void {
    const context = this.getContext(userId);
    
    const completeTurn: ConversationTurn = {
      ...turn,
      id: this.generateTurnId(),
      userId,
      timestamp: new Date(),
    };
    
    context.currentSession.turns.push(completeTurn);
    context.currentSession.lastActivity = new Date();
    
    // Extract topics from the turn
    this.extractTopics(completeTurn, context);
    
    // Update recent items if applicable
    this.updateRecentItems(completeTurn, context);
    
    // Trim turns if exceeding limit
    if (context.currentSession.turns.length > this.maxTurnsInMemory) {
      context.currentSession.turns = context.currentSession.turns.slice(-this.maxTurnsInMemory);
    }
  }

  private generateTurnId(): string {
    return `turn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private extractTopics(turn: ConversationTurn, context: UserContext): void {
    // Extract topics from entities
    if (turn.entities) {
      turn.entities.forEach(entity => {
        if (entity.type === 'ingredient' || entity.type === 'recipe') {
          const topic = entity.value.toLowerCase();
          if (!context.currentSession.topics.includes(topic)) {
            context.currentSession.topics.push(topic);
          }
        }
      });
    }
    
    // Keep only recent topics
    if (context.currentSession.topics.length > 10) {
      context.currentSession.topics = context.currentSession.topics.slice(-10);
    }
  }

  private updateRecentItems(turn: ConversationTurn, context: UserContext): void {
    if (turn.entities) {
      const items = turn.entities
        .filter(e => e.type === 'ingredient')
        .map(e => e.value);
      
      items.forEach(item => {
        // Remove if exists and add to front
        context.history.recentItems = context.history.recentItems.filter(i => i !== item);
        context.history.recentItems.unshift(item);
      });
      
      // Keep only 20 recent items
      context.history.recentItems = context.history.recentItems.slice(0, 20);
    }
  }

  getRecentTurns(userId: string, count: number = 5): ConversationTurn[] {
    const context = this.getContext(userId);
    return context.currentSession.turns.slice(-count);
  }

  getCurrentTopics(userId: string): string[] {
    const context = this.getContext(userId);
    return context.currentSession.topics;
  }

  setUserPreference(
    userId: string,
    preference: keyof UserContext['preferences'],
    value: any
  ): void {
    const context = this.getContext(userId);
    context.preferences[preference] = value;
  }

  setState(
    userId: string,
    state: Partial<UserContext['state']>
  ): void {
    const context = this.getContext(userId);
    context.state = { ...context.state, ...state };
  }

  getState(userId: string): UserContext['state'] {
    const context = this.getContext(userId);
    return context.state;
  }

  // Generate contextual prompt for AI
  generateContextPrompt(userId: string): string {
    const context = this.getContext(userId);
    const recentTurns = this.getRecentTurns(userId, 3);
    
    let prompt = `User Context:\n`;
    
    // Add conversation history
    if (recentTurns.length > 0) {
      prompt += `Recent conversation:\n`;
      recentTurns.forEach(turn => {
        prompt += `- User: ${turn.input}\n`;
        prompt += `- Assistant: ${turn.response}\n`;
      });
    }
    
    // Add current topics
    if (context.currentSession.topics.length > 0) {
      prompt += `Current topics: ${context.currentSession.topics.join(', ')}\n`;
    }
    
    // Add state information
    if (context.state.currentRecipe) {
      prompt += `Currently working with recipe: ${context.state.currentRecipe}\n`;
    }
    
    if (context.state.shoppingMode) {
      prompt += `User is in shopping mode\n`;
    }
    
    if (context.state.planningMeal) {
      prompt += `Planning meal for: ${context.state.planningMeal}\n`;
    }
    
    // Add preferences
    prompt += `Communication style: ${context.preferences.communicationStyle}\n`;
    prompt += `Response length: ${context.preferences.responseLength}\n`;
    
    return prompt;
  }

  // Suggest next actions based on context
  suggestNextActions(userId: string): string[] {
    const context = this.getContext(userId);
    const suggestions: string[] = [];
    
    // Based on recent commands
    const recentIntents = context.currentSession.turns
      .map(t => t.intent)
      .filter(Boolean);
    
    if (recentIntents.includes('ADD_ITEM')) {
      suggestions.push('Check what recipes you can make');
      suggestions.push('View your pantry inventory');
    }
    
    if (recentIntents.includes('FIND_RECIPES')) {
      suggestions.push('Add missing ingredients to grocery list');
      suggestions.push('Start cooking timer');
    }
    
    if (context.state.shoppingMode) {
      suggestions.push('Check off items as you shop');
      suggestions.push('Add items to pantry when done');
    }
    
    // Based on time of day
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 10) {
      suggestions.push('Plan breakfast');
    } else if (hour >= 11 && hour < 14) {
      suggestions.push('What\'s for lunch?');
    } else if (hour >= 16 && hour < 20) {
      suggestions.push('Plan dinner');
    }
    
    // Based on recent items
    if (context.history.recentItems.length > 0) {
      suggestions.push(`Find recipes with ${context.history.recentItems[0]}`);
    }
    
    return suggestions.slice(0, 4); // Return top 4 suggestions
  }

  // Clean up old contexts
  cleanup(): void {
    const now = new Date();
    
    this.contexts.forEach((context, userId) => {
      if (now.getTime() - context.currentSession.lastActivity.getTime() > 24 * 60 * 60 * 1000) {
        // Remove contexts older than 24 hours
        this.contexts.delete(userId);
      }
    });
  }
}

// Singleton instance
let contextManager: ConversationContextManager | null = null;

export function getContextManager(): ConversationContextManager {
  if (!contextManager) {
    contextManager = new ConversationContextManager();
    
    // Set up periodic cleanup
    setInterval(() => {
      contextManager?.cleanup();
    }, 60 * 60 * 1000); // Every hour
  }
  return contextManager;
}