import { Hono } from 'hono';
import { commandProcessor } from '../services/ai/commandProcessor';
import { entityExtractor } from '../services/ai/entityExtractor';
import { actionHandlers } from '../services/ai/actionHandlers';
import { getAIService } from '../services/ai/aiService';
import type { ChatMessage } from '../services/ai/openai.service';

const app = new Hono();
const aiService = getAIService();

// Process natural language commands and execute actions
app.post('/process-command', async (c) => {
  try {
    const body = await c.req.json();
    const { command, userId } = body;

    if (!command) {
      return c.json({ 
        success: false, 
        message: 'Command is required' 
      }, 400);
    }

    if (!userId) {
      return c.json({ 
        success: false, 
        message: 'User ID is required' 
      }, 400);
    }

    // Step 1: Process the command to understand intent
    const processedCommand = await commandProcessor.processCommand(command);
    
    // Step 2: Extract entities with AI assistance
    const extraction = await entityExtractor.extractEntities(command, true);
    
    // Step 3: Enhance command with extracted entities
    processedCommand.entities = extraction.ingredients.map(ing => ({
      type: 'ingredient' as const,
      value: ing.name,
      normalized: ing.name,
      confidence: 0.9,
    }));
    
    // Add locations
    extraction.locations.forEach(loc => {
      processedCommand.entities.push({
        type: 'location' as const,
        value: loc.type,
        normalized: loc.type,
        confidence: 0.95,
      });
    });
    
    // Add quantities
    extraction.quantities.forEach(qty => {
      processedCommand.entities.push({
        type: 'quantity' as const,
        value: `${qty.value} ${qty.unit}`,
        normalized: `${qty.value} ${qty.unit}`,
        confidence: 0.9,
      });
    });

    // Step 4: Generate parameters from enhanced entities
    processedCommand.parameters = {
      items: extraction.ingredients.map(ing => ({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        location: extraction.locations[0]?.type || 'pantry',
        category: ing.category,
      })),
      location: extraction.locations[0]?.type,
      from: extraction.locations[0]?.type,
      to: extraction.locations[1]?.type,
      ingredients: extraction.ingredients.map(ing => ing.name),
    };

    // Step 5: Execute the action
    const result = await actionHandlers.handleCommand(processedCommand, userId);

    // Step 6: Generate conversational response
    let response = result.message;
    
    if (result.suggestedActions && result.suggestedActions.length > 0) {
      response += '\n\nYou might also want to:\n' + 
        result.suggestedActions.map(a => `• ${a}`).join('\n');
    }

    return c.json({
      success: result.success,
      message: response,
      data: result.data,
      intent: processedCommand.intent,
      confidence: processedCommand.confidence,
      requiresConfirmation: result.requiresConfirmation,
    });

  } catch (error) {
    console.error('Command processing error:', error);
    return c.json({
      success: false,
      message: 'I had trouble understanding that command. Could you try rephrasing it?',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// Get command suggestions based on context
app.post('/suggest-commands', async (c) => {
  try {
    const body = await c.req.json();
    const { context, userId } = body;

    const systemPrompt = `You are a helpful kitchen assistant. Based on the user's context, suggest 4 relevant commands they might want to use.
    Context: ${context || 'general kitchen management'}
    
    Return suggestions as a JSON array of strings, each being a natural language command.
    Make them specific and actionable.`;

    const messages: ChatMessage[] = [
      { 
        role: 'user', 
        content: 'Suggest 4 relevant commands for my current context' 
      }
    ];

    const response = await aiService.processChat(userId, messages, systemPrompt);
    
    let suggestions;
    try {
      suggestions = JSON.parse(response.response);
    } catch {
      // Fallback suggestions
      suggestions = [
        "What's in my fridge?",
        "Add milk to grocery list",
        "Find recipes with available ingredients",
        "Check what's expiring soon",
      ];
    }

    return c.json({
      success: true,
      suggestions,
    });

  } catch (error) {
    console.error('Suggestion error:', error);
    return c.json({
      success: false,
      suggestions: [
        "Add items to pantry",
        "Check available ingredients",
        "Find recipes",
        "View grocery list",
      ],
    });
  }
});

// Validate a command before execution
app.post('/validate-command', async (c) => {
  try {
    const body = await c.req.json();
    const { command } = body;

    if (!command) {
      return c.json({ 
        valid: false, 
        issues: ['Command is required'] 
      }, 400);
    }

    // Process the command
    const processedCommand = await commandProcessor.processCommand(command);
    
    // Extract entities
    const extraction = await entityExtractor.extractEntities(command, false);
    
    // Validate extraction
    const validation = entityExtractor.validateExtraction(extraction);
    
    // Check confidence
    if (processedCommand.confidence < 0.5) {
      validation.issues.push('Low confidence in understanding the command');
    }
    
    return c.json({
      valid: validation.valid && processedCommand.confidence >= 0.5,
      issues: validation.issues,
      intent: processedCommand.intent,
      confidence: processedCommand.confidence,
      entities: extraction,
    });

  } catch (error) {
    console.error('Validation error:', error);
    return c.json({
      valid: false,
      issues: ['Failed to validate command'],
    }, 500);
  }
});

// Get command history for a user
app.get('/history/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    
    // TODO: Implement command history storage in database
    // For now, return empty history
    return c.json({
      success: true,
      history: [],
      message: 'Command history feature coming soon',
    });

  } catch (error) {
    console.error('History error:', error);
    return c.json({
      success: false,
      history: [],
    }, 500);
  }
});

export default app;