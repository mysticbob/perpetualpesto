import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

interface AIConfig {
  apiKey: string;
  organization?: string;
  model: {
    chat: string;
    vision: string;
    embedding: string;
  };
  maxTokens: {
    chat: number;
    vision: number;
  };
  temperature: number;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface VisionAnalysisRequest {
  imageUrl: string;
  prompt?: string;
}

interface VisionAnalysisResult {
  items: Array<{
    name: string;
    quantity?: string;
    category?: string;
    location?: string;
    expirationDate?: string;
    confidence: number;
  }>;
  rawDescription: string;
}

class OpenAIService {
  private client: OpenAI;
  private config: AIConfig;

  constructor() {
    this.config = {
      apiKey: process.env.OPENAI_API_KEY || '',
      organization: process.env.OPENAI_ORG_ID,
      model: {
        chat: process.env.AI_MODEL_CHAT || 'gpt-4-turbo-preview',
        vision: process.env.AI_MODEL_VISION || 'gpt-4-vision-preview',
        embedding: process.env.AI_MODEL_EMBEDDING || 'text-embedding-3-small',
      },
      maxTokens: {
        chat: 2000,
        vision: 4000,
      },
      temperature: 0.7,
    };

    if (!this.config.apiKey) {
      throw new Error('OpenAI API key is required. Please set OPENAI_API_KEY environment variable.');
    }

    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      organization: this.config.organization,
    });
  }

  async chat(messages: ChatMessage[], systemPrompt?: string): Promise<string> {
    try {
      const formattedMessages: ChatCompletionMessageParam[] = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      if (systemPrompt) {
        formattedMessages.unshift({
          role: 'system',
          content: systemPrompt,
        });
      }

      const completion = await this.client.chat.completions.create({
        model: this.config.model.chat,
        messages: formattedMessages,
        max_tokens: this.config.maxTokens.chat,
        temperature: this.config.temperature,
      });

      return completion.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('OpenAI chat error:', error);
      throw new Error('Failed to process chat request');
    }
  }

  async analyzeImage(request: VisionAnalysisRequest): Promise<VisionAnalysisResult> {
    try {
      const systemPrompt = `You are a helpful assistant that identifies food items, ingredients, and groceries in images. 
      Analyze the image and provide a structured list of items you can identify.
      For each item, try to determine:
      - Name of the item
      - Approximate quantity (if visible)
      - Category (produce, dairy, meat, pantry, etc.)
      - Suggested storage location (fridge, freezer, pantry, counter)
      - Estimated expiration timeframe if it's a perishable item
      
      Respond in JSON format with an array of items.`;

      const userPrompt = request.prompt || 'What food items do you see in this image?';

      const response = await this.client.chat.completions.create({
        model: this.config.model.vision,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: userPrompt },
              { type: 'image_url', image_url: { url: request.imageUrl } },
            ],
          },
        ],
        max_tokens: this.config.maxTokens.vision,
        temperature: 0.3, // Lower temperature for more consistent extraction
      });

      const content = response.choices[0]?.message?.content || '{}';
      
      try {
        const parsed = JSON.parse(content);
        return {
          items: parsed.items || [],
          rawDescription: content,
        };
      } catch {
        // Fallback if JSON parsing fails
        return {
          items: [],
          rawDescription: content,
        };
      }
    } catch (error) {
      console.error('OpenAI vision analysis error:', error);
      throw new Error('Failed to analyze image');
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: this.config.model.embedding,
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('OpenAI embedding error:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  async moderateContent(text: string): Promise<boolean> {
    try {
      const response = await this.client.moderations.create({
        input: text,
      });

      return !response.results[0].flagged;
    } catch (error) {
      console.error('OpenAI moderation error:', error);
      // Default to safe if moderation fails
      return true;
    }
  }

  getTokenEstimate(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  isWithinTokenLimit(text: string, limit: number = this.config.maxTokens.chat): boolean {
    return this.getTokenEstimate(text) <= limit;
  }
}

// Singleton instance
let openAIService: OpenAIService | null = null;

export function getOpenAIService(): OpenAIService {
  if (!openAIService) {
    openAIService = new OpenAIService();
  }
  return openAIService;
}

export type { 
  ChatMessage, 
  VisionAnalysisRequest, 
  VisionAnalysisResult,
  AIConfig 
};