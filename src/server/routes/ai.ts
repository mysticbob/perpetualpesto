import { Hono } from 'hono';
import { getAIService } from '../services/ai/aiService';
import { getAIConfig } from '../services/ai/config';
import { AIError, AIErrorCode } from '../services/ai/errorHandler';
import type { ChatMessage } from '../services/ai/openai.service';
import aiCommandsRoute from './aiCommands';

const app = new Hono();
const aiService = getAIService();
const config = getAIConfig();

// Mount command processing routes
app.route('/commands', aiCommandsRoute);

// Middleware to check if AI features are enabled
app.use('*', async (c, next) => {
  if (!config.features.enabled) {
    return c.json({ error: 'AI features are not enabled' }, 503);
  }
  await next();
});

// Chat endpoint
app.post('/chat', async (c) => {
  try {
    const body = await c.req.json();
    const { messages, userId, systemPrompt } = body;

    if (!messages || !Array.isArray(messages)) {
      return c.json({ error: 'Messages array is required' }, 400);
    }

    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400);
    }

    // Validate messages format
    for (const msg of messages) {
      if (!msg.role || !msg.content) {
        return c.json({ error: 'Each message must have role and content' }, 400);
      }
      if (!['user', 'assistant', 'system'].includes(msg.role)) {
        return c.json({ error: 'Invalid message role' }, 400);
      }
    }

    const result = await aiService.processChat(
      userId,
      messages as ChatMessage[],
      systemPrompt
    );

    return c.json({
      success: true,
      response: result.response,
      usage: result.usage,
    });
  } catch (error) {
    if (error instanceof AIError) {
      return c.json(
        {
          error: error.message,
          code: error.code,
          retryable: error.retryable,
          retryAfter: error.retryAfter,
        },
        error.statusCode
      );
    }
    console.error('Chat endpoint error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Vision analysis endpoint
app.post('/vision', async (c) => {
  try {
    const body = await c.req.json();
    const { imageUrl, userId, prompt } = body;

    if (!imageUrl) {
      return c.json({ error: 'Image URL is required' }, 400);
    }

    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400);
    }

    // Validate image URL
    try {
      new URL(imageUrl);
    } catch {
      return c.json({ error: 'Invalid image URL' }, 400);
    }

    const result = await aiService.analyzeImage(userId, {
      imageUrl,
      prompt,
    });

    return c.json({
      success: true,
      items: result.items,
      rawDescription: result.rawDescription,
    });
  } catch (error) {
    if (error instanceof AIError) {
      return c.json(
        {
          error: error.message,
          code: error.code,
          retryable: error.retryable,
          retryAfter: error.retryAfter,
        },
        error.statusCode
      );
    }
    console.error('Vision endpoint error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Image upload endpoint (for base64 images)
app.post('/vision/upload', async (c) => {
  try {
    const body = await c.req.json();
    const { image, userId, prompt } = body;

    if (!image) {
      return c.json({ error: 'Image data is required' }, 400);
    }

    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400);
    }

    // Convert base64 to data URL if needed
    let imageUrl = image;
    if (!image.startsWith('data:')) {
      imageUrl = `data:image/jpeg;base64,${image}`;
    }

    const result = await aiService.analyzeImage(userId, {
      imageUrl,
      prompt,
    });

    return c.json({
      success: true,
      items: result.items,
      rawDescription: result.rawDescription,
    });
  } catch (error) {
    if (error instanceof AIError) {
      return c.json(
        {
          error: error.message,
          code: error.code,
          retryable: error.retryable,
          retryAfter: error.retryAfter,
        },
        error.statusCode
      );
    }
    console.error('Vision upload endpoint error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Recipe suggestion endpoint
app.post('/suggest-recipes', async (c) => {
  try {
    const body = await c.req.json();
    const { userId, ingredients, preferences, maxRecipes = 5 } = body;

    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400);
    }

    if (!ingredients || !Array.isArray(ingredients)) {
      return c.json({ error: 'Ingredients array is required' }, 400);
    }

    const systemPrompt = `You are a helpful chef assistant. Suggest recipes based on available ingredients.
    Consider dietary preferences and try to minimize additional ingredients needed.
    Return suggestions in JSON format with recipe names, missing ingredients, and brief descriptions.`;

    const userPrompt = `I have these ingredients: ${ingredients.join(', ')}.
    ${preferences ? `Dietary preferences: ${preferences}.` : ''}
    Suggest up to ${maxRecipes} recipes I can make.`;

    const messages: ChatMessage[] = [
      { role: 'user', content: userPrompt }
    ];

    const result = await aiService.processChat(userId, messages, systemPrompt);

    // Try to parse JSON response
    let suggestions;
    try {
      suggestions = JSON.parse(result.response);
    } catch {
      suggestions = { recipes: [], raw: result.response };
    }

    return c.json({
      success: true,
      suggestions,
      usage: result.usage,
    });
  } catch (error) {
    if (error instanceof AIError) {
      return c.json(
        {
          error: error.message,
          code: error.code,
          retryable: error.retryable,
          retryAfter: error.retryAfter,
        },
        error.statusCode
      );
    }
    console.error('Recipe suggestion endpoint error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    features: {
      enabled: config.features.enabled,
      cacheEnabled: config.features.cacheEnabled,
      retryEnabled: config.features.retryEnabled,
    },
    models: {
      chat: config.models.chat,
      vision: config.models.vision,
    },
    stats: aiService.getStats(),
  });
});

// Admin endpoints (should be protected in production)
app.post('/admin/reset-limit', async (c) => {
  try {
    const body = await c.req.json();
    const { userId } = body;

    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400);
    }

    aiService.resetUserLimit(userId);

    return c.json({
      success: true,
      message: `Rate limits reset for user ${userId}`,
    });
  } catch (error) {
    console.error('Reset limit error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/admin/clear-cache', (c) => {
  try {
    aiService.clearCache();
    return c.json({
      success: true,
      message: 'Cache cleared successfully',
    });
  } catch (error) {
    console.error('Clear cache error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default app;