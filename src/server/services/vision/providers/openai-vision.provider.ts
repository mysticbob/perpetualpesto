/**
 * OpenAI GPT-4 Vision Provider
 */

import OpenAI from 'openai';
import { BaseVisionProvider } from '../VisionProvider.interface';
import type { DetectedItem, ProviderCapabilities } from '../../../../types/camera-scanning';

export class OpenAIVisionProvider extends BaseVisionProvider {
  name = 'gpt-4-vision';
  version = '4.0';

  private client: OpenAI;

  constructor(apiKey: string) {
    super();
    this.client = new OpenAI({ apiKey });
  }

  protected async callAPI(
    image: Buffer | string,
    prompt: string
  ): Promise<any> {
    const imageData = typeof image === 'string'
      ? `data:image/jpeg;base64,${image}`
      : `data:image/jpeg;base64,${image.toString('base64')}`;

    const response = await this.client.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            },
            {
              type: 'image_url',
              image_url: {
                url: imageData,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0
    });

    return response.choices[0].message.content || '';
  }

  protected parseResponse(response: any): DetectedItem[] {
    try {
      // Remove markdown code blocks if present
      let jsonStr = response.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```\n?/g, '').replace(/```\n?$/g, '');
      }

      const parsed = JSON.parse(jsonStr);
      const items = parsed.items || [];

      return this.normalizeResponse(items);
    } catch (error: any) {
      console.error('Failed to parse OpenAI response:', error);
      console.error('Response was:', response);
      throw new Error(`Failed to parse response: ${error.message}`);
    }
  }

  getCostEstimate(imageSize: number): number {
    // GPT-4 Vision pricing (as of 2024)
    // Depends on image size and detail level
    // For "high" detail:
    // - Base: 85 tokens
    // - Each 512x512 tile: 170 tokens
    // Estimate ~1500 tokens for image + ~500 for output
    const inputTokens = 1500;
    const outputTokens = 500;

    const inputCost = (inputTokens / 1000) * 0.01; // $0.01 per 1k tokens
    const outputCost = (outputTokens / 1000) * 0.03; // $0.03 per 1k tokens

    return inputCost + outputCost;
  }

  getCapabilities(): ProviderCapabilities {
    return {
      maxImageSize: 20 * 1024 * 1024, // 20MB
      supportedFormats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      supportsVideo: false,
      supportsBatch: false,
      supportsNutrition: true,
      supportsOCR: true,
      avgResponseTime: 3000, // 3 seconds
      rateLimit: {
        requestsPerMinute: 500,
        tokensPerMinute: 80000
      }
    };
  }

  async validate(): Promise<boolean> {
    try {
      // Test with a simple completion
      const response = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Say "OK"' }],
        max_tokens: 5
      });

      return response.choices[0].message.content?.includes('OK') || false;
    } catch (error) {
      console.error('OpenAI validation failed:', error);
      return false;
    }
  }
}
