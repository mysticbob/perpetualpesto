import { describe, it, expect, beforeEach } from 'vitest';
import { CommandProcessor, CommandIntent } from '../commandProcessor';
import type { ProcessedCommand } from '../commandProcessor';

describe('CommandProcessor', () => {
  let processor: CommandProcessor;

  beforeEach(() => {
    processor = new CommandProcessor();
  });

  describe('Intent Detection', () => {
    it('should detect ADD_ITEM intent', async () => {
      const commands = [
        'add 2 lbs chicken to the fridge',
        'store some milk in the refrigerator',
        'put 3 apples in the pantry',
        'I bought some eggs',
      ];

      for (const command of commands) {
        const result = await processor.processCommand(command);
        expect(result.intent).toBe(CommandIntent.ADD_ITEM);
      }
    });

    it('should detect REMOVE_ITEM intent', async () => {
      const commands = [
        'remove the milk from the fridge',
        'delete spoiled tomatoes',
        'throw away expired yogurt',
        'I used up all the chicken',
      ];

      for (const command of commands) {
        const result = await processor.processCommand(command);
        expect(result.intent).toBe(CommandIntent.REMOVE_ITEM);
      }
    });

    it('should detect MOVE_ITEM intent', async () => {
      const commands = [
        'move chicken from fridge to freezer',
        'transfer the beef from counter to fridge',
        'relocate milk from pantry to refrigerator',
      ];

      for (const command of commands) {
        const result = await processor.processCommand(command);
        expect(result.intent).toBe(CommandIntent.MOVE_ITEM);
      }
    });

    it('should detect CHECK_AVAILABILITY intent', async () => {
      const commands = [
        'do I have milk?',
        'is there enough chicken?',
        'check if we have eggs',
      ];

      for (const command of commands) {
        const result = await processor.processCommand(command);
        expect(result.intent).toBe(CommandIntent.CHECK_AVAILABILITY);
      }
    });

    it('should detect FIND_RECIPES intent', async () => {
      const commands = [
        'what can I make with chicken and rice?',
        'suggest a recipe using pasta',
        'recommend dinner ideas',
      ];

      for (const command of commands) {
        const result = await processor.processCommand(command);
        expect(result.intent).toBe(CommandIntent.FIND_RECIPES);
      }
    });

    it('should detect CHECK_EXPIRATION intent', async () => {
      const commands = [
        'is my milk expired?',
        'what will expire soon?',
        'check if eggs are still fresh',
      ];

      for (const command of commands) {
        const result = await processor.processCommand(command);
        expect(result.intent).toBe(CommandIntent.CHECK_EXPIRATION);
      }
    });

    it('should return UNKNOWN for unrecognized commands', async () => {
      const result = await processor.processCommand('random gibberish xyz123');
      expect(result.intent).toBe(CommandIntent.UNKNOWN);
    });
  });

  describe('Entity Extraction', () => {
    it('should extract quantities', async () => {
      const result = await processor.processCommand('add 2 lbs chicken');

      const quantityEntities = result.entities.filter(e => e.type === 'quantity');
      expect(quantityEntities.length).toBeGreaterThan(0);
      expect(quantityEntities[0].value).toContain('2');
      expect(quantityEntities[0].value).toContain('lb');
    });

    it('should extract locations', async () => {
      const result = await processor.processCommand('add chicken to the fridge');

      const locationEntities = result.entities.filter(e => e.type === 'location');
      expect(locationEntities.length).toBeGreaterThan(0);
      expect(locationEntities[0].normalized).toBe('fridge');
    });

    it('should extract ingredients', async () => {
      const result = await processor.processCommand('add chicken and tomato');

      const ingredientEntities = result.entities.filter(e => e.type === 'ingredient');
      expect(ingredientEntities.length).toBeGreaterThan(0);

      const ingredientNames = ingredientEntities.map(e => e.normalized);
      expect(ingredientNames).toContain('chicken');
      expect(ingredientNames).toContain('tomato');
    });

    it('should extract dates', async () => {
      const result = await processor.processCommand('add milk expires tomorrow');

      const dateEntities = result.entities.filter(e => e.type === 'date');
      expect(dateEntities.length).toBeGreaterThan(0);
      expect(dateEntities[0].value).toContain('tomorrow');
    });

    it('should normalize quantities correctly', async () => {
      const testCases = [
        { input: 'add 2 pounds chicken', expected: '2 lb' },
        { input: 'add 1 kilogram rice', expected: '1 kg' },
        { input: 'add 3 tablespoons oil', expected: '3 tbsp' },
      ];

      for (const testCase of testCases) {
        const result = await processor.processCommand(testCase.input);
        const quantityEntity = result.entities.find(e => e.type === 'quantity');

        expect(quantityEntity).toBeDefined();
        expect(quantityEntity!.normalized).toBe(testCase.expected);
      }
    });
  });

  describe('Parameter Generation', () => {
    it('should generate ADD_ITEM parameters', async () => {
      const result = await processor.processCommand('add 2 lbs chicken to fridge');

      expect(result.parameters).toBeDefined();
      expect(result.parameters!.items).toBeDefined();
      expect(Array.isArray(result.parameters!.items)).toBe(true);

      if (result.parameters!.items.length > 0) {
        const item = result.parameters!.items[0];
        expect(item.name).toBeDefined();
      }
    });

    it('should generate MOVE_ITEM parameters', async () => {
      const result = await processor.processCommand('move chicken from fridge to freezer');

      expect(result.parameters).toBeDefined();
      expect(result.parameters!.item).toBeDefined();
    });

    it('should generate FIND_RECIPES parameters', async () => {
      const result = await processor.processCommand('what can I make with chicken and rice?');

      expect(result.parameters).toBeDefined();
      expect(result.parameters!.ingredients).toBeDefined();
      expect(Array.isArray(result.parameters!.ingredients)).toBe(true);
    });
  });

  describe('Confidence Calculation', () => {
    it('should have high confidence for clear commands', async () => {
      const result = await processor.processCommand('add 2 lbs chicken to the fridge');

      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should have low confidence for UNKNOWN intent', async () => {
      const result = await processor.processCommand('random gibberish');

      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should have higher confidence with more entities', async () => {
      const vague = await processor.processCommand('add chicken');
      const detailed = await processor.processCommand('add 2 lbs chicken to the fridge');

      expect(detailed.confidence).toBeGreaterThanOrEqual(vague.confidence);
    });
  });

  describe('Suggested Actions', () => {
    it('should suggest clarification for low confidence', async () => {
      const result = await processor.processCommand('add');

      expect(result.suggestedAction).toBeDefined();
      expect(result.suggestedAction).toContain('item');
    });

    it('should provide helpful suggestions for UNKNOWN intent', async () => {
      const result = await processor.processCommand('random text');

      expect(result.suggestedAction).toBeDefined();
      expect(result.suggestedAction?.length).toBeGreaterThan(0);
    });

    it('should not suggest action for high confidence commands', async () => {
      const result = await processor.processCommand('add 2 lbs chicken to fridge');

      expect(result.suggestedAction).toBeUndefined();
    });
  });

  describe('parseIngredients', () => {
    it('should parse ingredient entities into structured format', () => {
      const entities = [
        { type: 'ingredient' as const, value: 'chicken', normalized: 'chicken', confidence: 0.9 },
        { type: 'quantity' as const, value: '2 lbs', normalized: '2 lb', confidence: 0.9 },
        { type: 'location' as const, value: 'fridge', normalized: 'fridge', confidence: 0.95 },
      ];

      const ingredients = processor.parseIngredients(entities);

      expect(ingredients).toHaveLength(1);
      expect(ingredients[0].name).toBe('chicken');
      expect(ingredients[0].quantity).toBe(2);
      expect(ingredients[0].unit).toBe('lb');
      expect(ingredients[0].location).toBe('fridge');
    });

    it('should handle multiple ingredients', () => {
      const entities = [
        { type: 'ingredient' as const, value: 'chicken', normalized: 'chicken', confidence: 0.9 },
        { type: 'ingredient' as const, value: 'rice', normalized: 'rice', confidence: 0.9 },
      ];

      const ingredients = processor.parseIngredients(entities);

      expect(ingredients).toHaveLength(2);
      expect(ingredients.map(i => i.name)).toContain('chicken');
      expect(ingredients.map(i => i.name)).toContain('rice');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty input', async () => {
      const result = await processor.processCommand('');

      expect(result.intent).toBe(CommandIntent.UNKNOWN);
      expect(result.entities).toHaveLength(0);
    });

    it('should handle very long input', async () => {
      const longCommand = 'add ' + 'chicken '.repeat(100);
      const result = await processor.processCommand(longCommand);

      expect(result.intent).toBe(CommandIntent.ADD_ITEM);
    });

    it('should be case insensitive', async () => {
      const lower = await processor.processCommand('add chicken');
      const upper = await processor.processCommand('ADD CHICKEN');
      const mixed = await processor.processCommand('AdD cHiCkEn');

      expect(lower.intent).toBe(CommandIntent.ADD_ITEM);
      expect(upper.intent).toBe(CommandIntent.ADD_ITEM);
      expect(mixed.intent).toBe(CommandIntent.ADD_ITEM);
    });

    it('should handle special characters', async () => {
      const result = await processor.processCommand('add 2.5 lbs chicken!');

      expect(result.intent).toBe(CommandIntent.ADD_ITEM);
    });
  });
});
