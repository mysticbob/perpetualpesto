/**
 * Anthropic Claude 3.5 Sonnet Vision Provider
 */

import Anthropic from '@anthropic-ai/sdk';
import { BaseVisionProvider } from '../VisionProvider.interface';
import type { DetectedItem, ProviderCapabilities } from '../../../../types/camera-scanning';

export class ClaudeVisionProvider extends BaseVisionProvider {
  name = 'claude-3.5-sonnet';
  version = '3.5';

  private client: Anthropic;

  constructor(apiKey: string) {
    super();
    this.client = new Anthropic({ apiKey });
  }

  protected async callAPI(
    image: Buffer | string,
    prompt: string
  ): Promise<any> {
    const imageData = typeof image === 'string'
      ? image
      : image.toString('base64');

    const response = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: imageData
              }
            },
            {
              type: 'text',
              text: prompt
            }
          ]
        }
      ]
    });

    // Extract text content from response
    const textContent = response.content.find(block => block.type === 'text');
    return textContent && 'text' in textContent ? textContent.text : '';
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
      console.error('Failed to parse Claude response:', error);
      console.error('Response was:', response);
      throw new Error(`Failed to parse response: ${error.message}`);
    }
  }

  getCostEstimate(imageSize: number): number {
    // Claude 3.5 Sonnet pricing (as of 2024)
    // Input: $0.003 per 1k tokens
    // Output: $0.015 per 1k tokens
    // Images: ~1600 tokens for typical image
    const inputTokens = 1600 + 400; // Image + prompt
    const outputTokens = 500;

    const inputCost = (inputTokens / 1000) * 0.003;
    const outputCost = (outputTokens / 1000) * 0.015;

    return inputCost + outputCost;
  }

  getCapabilities(): ProviderCapabilities {
    return {
      maxImageSize: 5 * 1024 * 1024, // 5MB
      supportedFormats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      supportsVideo: false,
      supportsBatch: true,
      supportsNutrition: true,
      supportsOCR: true,
      avgResponseTime: 2500, // 2.5 seconds
      rateLimit: {
        requestsPerMinute: 50,
        tokensPerMinute: 40000
      }
    };
  }

  async validate(): Promise<boolean> {
    try {
      // Test with a simple message
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: 'Say "OK"'
          }
        ]
      });

      const textContent = response.content.find(block => block.type === 'text');
      return textContent && 'text' in textContent && textContent.text.includes('OK');
    } catch (error) {
      console.error('Claude validation failed:', error);
      return false;
    }
  }
}
