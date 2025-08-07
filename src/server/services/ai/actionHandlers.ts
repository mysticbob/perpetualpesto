import { prisma } from '../../../server/lib/db';
import { CommandIntent, type ProcessedCommand } from './commandProcessor';
import { entityExtractor, type ExtractedIngredient } from './entityExtractor';
import type { PantryLocation } from '@prisma/client';

export interface ActionResult {
  success: boolean;
  message: string;
  data?: any;
  requiresConfirmation?: boolean;
  suggestedActions?: string[];
}

export class ActionHandlers {
  async handleCommand(
    command: ProcessedCommand,
    userId: string
  ): Promise<ActionResult> {
    switch (command.intent) {
      case CommandIntent.ADD_ITEM:
        return this.handleAddItem(command, userId);
      case CommandIntent.REMOVE_ITEM:
        return this.handleRemoveItem(command, userId);
      case CommandIntent.MOVE_ITEM:
        return this.handleMoveItem(command, userId);
      case CommandIntent.CHECK_AVAILABILITY:
        return this.handleCheckAvailability(command, userId);
      case CommandIntent.FIND_RECIPES:
        return this.handleFindRecipes(command, userId);
      case CommandIntent.CHECK_EXPIRATION:
        return this.handleCheckExpiration(command, userId);
      case CommandIntent.LIST_ITEMS:
        return this.handleListItems(command, userId);
      case CommandIntent.UPDATE_QUANTITY:
        return this.handleUpdateQuantity(command, userId);
      case CommandIntent.ADD_TO_GROCERY:
        return this.handleAddToGrocery(command, userId);
      case CommandIntent.MEAL_PLAN:
        return this.handleMealPlan(command, userId);
      default:
        return {
          success: false,
          message: "I'm not sure how to handle that request. Could you rephrase it?",
          suggestedActions: [
            "Add items to your pantry",
            "Check what ingredients you have",
            "Find recipes with available ingredients",
            "Check expiration dates",
          ],
        };
    }
  }

  private async handleAddItem(
    command: ProcessedCommand,
    userId: string
  ): Promise<ActionResult> {
    try {
      const items = command.parameters?.items || [];
      
      if (items.length === 0) {
        return {
          success: false,
          message: "I couldn't identify what items you want to add. Please specify the items.",
          requiresConfirmation: false,
        };
      }

      const addedItems = [];
      
      for (const item of items) {
        // Find or create location
        let location = await prisma.pantryLocation.findFirst({
          where: {
            userId,
            name: item.location || 'Pantry',
          },
        });

        if (!location) {
          location = await prisma.pantryLocation.create({
            data: {
              userId,
              name: item.location || 'Pantry',
              type: this.mapLocationToType(item.location || 'Pantry'),
            },
          });
        }

        // Calculate expiration date if not provided
        const expirationDate = item.expirationDate || this.estimateExpirationDate(item.name, item.location);

        // Add to pantry
        const pantryItem = await prisma.pantryItem.create({
          data: {
            name: item.name,
            quantity: item.quantity || 1,
            unit: item.unit || 'item',
            locationId: location.id,
            userId,
            expirationDate,
            addedDate: new Date(),
          },
        });

        addedItems.push(pantryItem);
      }

      return {
        success: true,
        message: `Added ${addedItems.length} item(s) to your pantry: ${addedItems.map(i => i.name).join(', ')}`,
        data: addedItems,
      };
    } catch (error) {
      console.error('Error adding items:', error);
      return {
        success: false,
        message: 'Failed to add items to pantry. Please try again.',
      };
    }
  }

  private async handleRemoveItem(
    command: ProcessedCommand,
    userId: string
  ): Promise<ActionResult> {
    try {
      const items = command.parameters?.items || [];
      
      if (items.length === 0) {
        return {
          success: false,
          message: "I couldn't identify what items you want to remove.",
          requiresConfirmation: false,
        };
      }

      const removedItems = [];
      
      for (const item of items) {
        const pantryItem = await prisma.pantryItem.findFirst({
          where: {
            userId,
            name: {
              contains: item.name,
              mode: 'insensitive',
            },
          },
        });

        if (pantryItem) {
          await prisma.pantryItem.delete({
            where: { id: pantryItem.id },
          });
          removedItems.push(pantryItem.name);
        }
      }

      if (removedItems.length === 0) {
        return {
          success: false,
          message: `Couldn't find any of the specified items in your pantry.`,
        };
      }

      return {
        success: true,
        message: `Removed ${removedItems.length} item(s): ${removedItems.join(', ')}`,
        data: removedItems,
      };
    } catch (error) {
      console.error('Error removing items:', error);
      return {
        success: false,
        message: 'Failed to remove items. Please try again.',
      };
    }
  }

  private async handleMoveItem(
    command: ProcessedCommand,
    userId: string
  ): Promise<ActionResult> {
    try {
      const { item, from, to } = command.parameters || {};
      
      if (!item || !to) {
        return {
          success: false,
          message: "Please specify what item to move and where to move it.",
          requiresConfirmation: false,
        };
      }

      // Find the item
      const pantryItem = await prisma.pantryItem.findFirst({
        where: {
          userId,
          name: {
            contains: item,
            mode: 'insensitive',
          },
        },
        include: { location: true },
      });

      if (!pantryItem) {
        return {
          success: false,
          message: `Couldn't find "${item}" in your pantry.`,
        };
      }

      // Find or create the target location
      let targetLocation = await prisma.pantryLocation.findFirst({
        where: {
          userId,
          name: to,
        },
      });

      if (!targetLocation) {
        targetLocation = await prisma.pantryLocation.create({
          data: {
            userId,
            name: to,
            type: this.mapLocationToType(to),
          },
        });
      }

      // Update the item's location
      await prisma.pantryItem.update({
        where: { id: pantryItem.id },
        data: { locationId: targetLocation.id },
      });

      return {
        success: true,
        message: `Moved ${item} from ${pantryItem.location.name} to ${targetLocation.name}`,
        data: { item, from: pantryItem.location.name, to: targetLocation.name },
      };
    } catch (error) {
      console.error('Error moving item:', error);
      return {
        success: false,
        message: 'Failed to move item. Please try again.',
      };
    }
  }

  private async handleCheckAvailability(
    command: ProcessedCommand,
    userId: string
  ): Promise<ActionResult> {
    try {
      const ingredients = command.parameters?.ingredients || [];
      
      if (ingredients.length === 0) {
        return {
          success: false,
          message: "Please specify which ingredients you want to check.",
          requiresConfirmation: false,
        };
      }

      const available = [];
      const missing = [];
      
      for (const ingredient of ingredients) {
        const item = await prisma.pantryItem.findFirst({
          where: {
            userId,
            name: {
              contains: ingredient,
              mode: 'insensitive',
            },
          },
        });

        if (item) {
          available.push(`${item.name} (${item.quantity} ${item.unit})`);
        } else {
          missing.push(ingredient);
        }
      }

      let message = '';
      if (available.length > 0) {
        message += `✓ Available: ${available.join(', ')}`;
      }
      if (missing.length > 0) {
        if (message) message += '\n';
        message += `✗ Missing: ${missing.join(', ')}`;
      }

      return {
        success: true,
        message,
        data: { available, missing },
        suggestedActions: missing.length > 0 
          ? [`Add ${missing.join(', ')} to grocery list`] 
          : undefined,
      };
    } catch (error) {
      console.error('Error checking availability:', error);
      return {
        success: false,
        message: 'Failed to check ingredient availability.',
      };
    }
  }

  private async handleFindRecipes(
    command: ProcessedCommand,
    userId: string
  ): Promise<ActionResult> {
    try {
      // Get all pantry items
      const pantryItems = await prisma.pantryItem.findMany({
        where: { userId },
      });

      if (pantryItems.length === 0) {
        return {
          success: false,
          message: "Your pantry is empty. Add some ingredients first!",
        };
      }

      const ingredientNames = pantryItems.map(item => item.name);
      
      // Find recipes that can be made with available ingredients
      // This is simplified - in production, you'd want more sophisticated matching
      const recipes = await prisma.recipe.findMany({
        where: {
          ingredients: {
            some: {
              name: {
                in: ingredientNames,
              },
            },
          },
        },
        include: {
          ingredients: true,
        },
        take: 5,
      });

      if (recipes.length === 0) {
        return {
          success: true,
          message: "I couldn't find any recipes with your current ingredients. Try adding more items to your pantry!",
          suggestedActions: ["Add more ingredients", "Check recipe suggestions"],
        };
      }

      const recipeList = recipes.map(r => {
        const available = r.ingredients.filter(i => 
          ingredientNames.some(name => name.toLowerCase().includes(i.name.toLowerCase()))
        );
        const missing = r.ingredients.filter(i => 
          !ingredientNames.some(name => name.toLowerCase().includes(i.name.toLowerCase()))
        );
        
        return `${r.name} (${available.length}/${r.ingredients.length} ingredients available)`;
      });

      return {
        success: true,
        message: `Found ${recipes.length} recipes you can make:\n${recipeList.join('\n')}`,
        data: recipes,
      };
    } catch (error) {
      console.error('Error finding recipes:', error);
      return {
        success: false,
        message: 'Failed to find recipes. Please try again.',
      };
    }
  }

  private async handleCheckExpiration(
    command: ProcessedCommand,
    userId: string
  ): Promise<ActionResult> {
    try {
      const location = command.parameters?.location;
      
      const whereClause: any = { userId };
      if (location) {
        const loc = await prisma.pantryLocation.findFirst({
          where: { userId, name: location },
        });
        if (loc) {
          whereClause.locationId = loc.id;
        }
      }

      const items = await prisma.pantryItem.findMany({
        where: {
          ...whereClause,
          expirationDate: { not: null },
        },
        include: { location: true },
        orderBy: { expirationDate: 'asc' },
      });

      const now = new Date();
      const expired = [];
      const expiringSoon = [];
      const fresh = [];

      for (const item of items) {
        if (!item.expirationDate) continue;
        
        const daysUntilExpiration = Math.floor(
          (item.expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntilExpiration < 0) {
          expired.push(`${item.name} (expired ${Math.abs(daysUntilExpiration)} days ago)`);
        } else if (daysUntilExpiration <= 3) {
          expiringSoon.push(`${item.name} (expires in ${daysUntilExpiration} days)`);
        } else {
          fresh.push(`${item.name} (${daysUntilExpiration} days)`);
        }
      }

      let message = '';
      if (expired.length > 0) {
        message += `⚠️ Expired: ${expired.join(', ')}\n`;
      }
      if (expiringSoon.length > 0) {
        message += `⏰ Expiring soon: ${expiringSoon.join(', ')}\n`;
      }
      if (fresh.length > 0 && expired.length === 0 && expiringSoon.length === 0) {
        message += `✓ All items are fresh!`;
      }

      return {
        success: true,
        message: message || 'No items with expiration dates found.',
        data: { expired, expiringSoon, fresh },
        suggestedActions: expired.length > 0 
          ? ['Remove expired items', 'Use items expiring soon'] 
          : undefined,
      };
    } catch (error) {
      console.error('Error checking expiration:', error);
      return {
        success: false,
        message: 'Failed to check expiration dates.',
      };
    }
  }

  private async handleListItems(
    command: ProcessedCommand,
    userId: string
  ): Promise<ActionResult> {
    try {
      const location = command.parameters?.location;
      
      const whereClause: any = { userId };
      if (location) {
        const loc = await prisma.pantryLocation.findFirst({
          where: { userId, name: location },
        });
        if (loc) {
          whereClause.locationId = loc.id;
        }
      }

      const items = await prisma.pantryItem.findMany({
        where: whereClause,
        include: { location: true },
        orderBy: { name: 'asc' },
      });

      if (items.length === 0) {
        return {
          success: true,
          message: location 
            ? `No items found in ${location}.` 
            : 'Your pantry is empty.',
          suggestedActions: ['Add items to pantry'],
        };
      }

      // Group by location
      const grouped = items.reduce((acc, item) => {
        const loc = item.location.name;
        if (!acc[loc]) acc[loc] = [];
        acc[loc].push(`${item.name} (${item.quantity} ${item.unit})`);
        return acc;
      }, {} as Record<string, string[]>);

      const message = Object.entries(grouped)
        .map(([loc, items]) => `📍 ${loc}:\n${items.join('\n')}`)
        .join('\n\n');

      return {
        success: true,
        message: `Your pantry inventory:\n\n${message}`,
        data: items,
      };
    } catch (error) {
      console.error('Error listing items:', error);
      return {
        success: false,
        message: 'Failed to list items.',
      };
    }
  }

  private async handleUpdateQuantity(
    command: ProcessedCommand,
    userId: string
  ): Promise<ActionResult> {
    try {
      const { item, quantity } = command.parameters || {};
      
      if (!item || quantity === undefined) {
        return {
          success: false,
          message: "Please specify the item and new quantity.",
          requiresConfirmation: false,
        };
      }

      const pantryItem = await prisma.pantryItem.findFirst({
        where: {
          userId,
          name: {
            contains: item,
            mode: 'insensitive',
          },
        },
      });

      if (!pantryItem) {
        return {
          success: false,
          message: `Couldn't find "${item}" in your pantry.`,
        };
      }

      await prisma.pantryItem.update({
        where: { id: pantryItem.id },
        data: { quantity },
      });

      return {
        success: true,
        message: `Updated ${item} quantity to ${quantity} ${pantryItem.unit}`,
        data: { item, quantity, unit: pantryItem.unit },
      };
    } catch (error) {
      console.error('Error updating quantity:', error);
      return {
        success: false,
        message: 'Failed to update quantity.',
      };
    }
  }

  private async handleAddToGrocery(
    command: ProcessedCommand,
    userId: string
  ): Promise<ActionResult> {
    try {
      const items = command.parameters?.items || [];
      
      if (items.length === 0) {
        return {
          success: false,
          message: "Please specify what items to add to your grocery list.",
          requiresConfirmation: false,
        };
      }

      const addedItems = [];
      
      for (const item of items) {
        const groceryItem = await prisma.groceryItem.create({
          data: {
            userId,
            name: item.name,
            quantity: item.quantity || 1,
            unit: item.unit || 'item',
            checked: false,
          },
        });
        addedItems.push(groceryItem.name);
      }

      return {
        success: true,
        message: `Added ${addedItems.length} item(s) to grocery list: ${addedItems.join(', ')}`,
        data: addedItems,
      };
    } catch (error) {
      console.error('Error adding to grocery list:', error);
      return {
        success: false,
        message: 'Failed to add items to grocery list.',
      };
    }
  }

  private async handleMealPlan(
    command: ProcessedCommand,
    userId: string
  ): Promise<ActionResult> {
    // This would integrate with meal planning functionality
    return {
      success: true,
      message: "Meal planning feature is coming soon! For now, try finding recipes with your available ingredients.",
      suggestedActions: ["Find recipes", "Check available ingredients"],
    };
  }

  private mapLocationToType(locationName: string): PantryLocation['type'] {
    const name = locationName.toLowerCase();
    if (name.includes('fridge') || name.includes('refrigerator')) return 'FRIDGE';
    if (name.includes('freezer')) return 'FREEZER';
    if (name.includes('counter')) return 'COUNTER';
    return 'PANTRY';
  }

  private estimateExpirationDate(itemName: string, location: string): Date {
    const now = new Date();
    const name = itemName.toLowerCase();
    const loc = location.toLowerCase();
    
    // Rough estimates based on item type and storage location
    let daysToAdd = 7; // Default
    
    if (name.includes('milk') || name.includes('yogurt')) {
      daysToAdd = 7;
    } else if (name.includes('bread')) {
      daysToAdd = loc.includes('freezer') ? 30 : 5;
    } else if (name.includes('meat') || name.includes('chicken') || name.includes('beef')) {
      daysToAdd = loc.includes('freezer') ? 90 : 3;
    } else if (name.includes('vegetable') || name.includes('fruit')) {
      daysToAdd = loc.includes('fridge') ? 7 : 3;
    } else if (loc.includes('pantry')) {
      daysToAdd = 180; // Non-perishables
    }
    
    now.setDate(now.getDate() + daysToAdd);
    return now;
  }
}

export const actionHandlers = new ActionHandlers();